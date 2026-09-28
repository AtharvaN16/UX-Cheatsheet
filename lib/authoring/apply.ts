// lib/authoring/apply.ts
import type { ContentStore, FileWrite } from './store';
import type { PendingEdit } from './pending';
import { patchSection, patchFrontmatterScalar, insertImageBlock, hasImageBlock } from '../content/patch';
import { validateMethodText } from './validate';
import { relPathForMethod } from './resolve';
import { insertTaxonomyItem } from './taxonomyEdit';
import { imageTargetFor, sniffImage } from './imageName';
import { KIND, GIVES, EFFORT, TIMEFRAME } from '../content/schema';

/**
 * The only frontmatter fields an edit may touch, and the only values each may
 * take. All four are closed enums.
 *
 * This lived in the per-field route before those were folded into applyEdits,
 * and losing it was a real regression: without it a pending edit could rewrite
 * ANY frontmatter line — `title`, a source `url`, or `id`. Rewriting `id` is
 * the worst of them, because `validateMethodText` does not check id against
 * filename, so it commits cleanly and then every later deploy fails on
 * `bun run validate` with a duplicate id and unresolved cross-references. The
 * authoring UI cannot undo that; it takes a hand-edit and a push.
 *
 * `image.src` is patched through the same primitive but is never client
 * supplied — applyEdits constructs it from imageTargetFor — so it is
 * deliberately absent here.
 */
const EDITABLE_FIELDS: Record<string, readonly string[]> = {
  kind: KIND,
  gives: GIVES,
  effort: EFFORT,
  timeframe: TIMEFRAME,
};

/**
 * Reject an edit the UI would never produce.
 *
 * applyEdits is reachable by anyone holding a session, not only by this app's
 * own components, so every constraint the UI enforces must also exist here.
 */
function rejectEdit(edit: PendingEdit): string | null {
  if (edit.kind === 'frontmatter') {
    const allowed = EDITABLE_FIELDS[edit.field];
    if (!allowed) return `field "${edit.field}" is not editable`;
    if (typeof edit.value !== 'string' || !allowed.includes(edit.value)) {
      return `${edit.field} must be one of ${allowed.join(', ')}`;
    }
  }

  if (edit.kind === 'section') {
    if (typeof edit.heading !== 'string' || typeof edit.markdown !== 'string') {
      return 'section edits need a heading and markdown';
    }
  }

  if (edit.kind === 'card') {
    if (!KIND.includes(edit.cardKind as (typeof KIND)[number])) {
      return `kind must be one of ${KIND.join(', ')}`;
    }
    if (typeof edit.title !== 'string') return 'a new card needs a title';
  }

  if (edit.kind === 'image') {
    if (typeof edit.filename !== 'string' || typeof edit.base64 !== 'string') {
      return 'image edits need a filename and base64 content';
    }
  }

  return null;
}

export interface ApplyResult {
  files: FileWrite[];
  errors: string[];
}

const TAXONOMY_PATH = 'lib/taxonomy.json';

/**
 * Turn a set of pending edits into the file writes they imply.
 *
 * Never writes anything. The same function backs both the validate endpoint
 * (which throws the result away) and sync (which commits it), so what you are
 * told at save time is produced by the identical code path that later runs.
 *
 * Edits are grouped by target file and applied in queue order, so two edits to
 * one card become one write with both changes — not two writes where the last
 * one wins.
 *
 * All-or-nothing: any error returns zero files. A partial sync would leave the
 * pending set in a state neither the user nor the code could reason about.
 */
export async function applyEdits(store: ContentStore, edits: PendingEdit[]): Promise<ApplyResult> {
  const errors: string[] = [];
  const files: FileWrite[] = [];

  // Shape and allowlist checks first, before a single file is read.
  for (const e of edits) {
    const bad = rejectEdit(e);
    if (bad) errors.push(e.kind === 'card' ? bad : `${e.id}.mdx: ${bad}`);
  }
  if (errors.length > 0) return { files: [], errors };

  // --- method files: group every section/frontmatter/image edit by card ---
  // Typed as the non-card variants so the branch below narrows: the `continue`
  // that drops cards is invisible to the checker, but the map's type is not.
  const byMethod = new Map<string, Exclude<PendingEdit, { kind: 'card' }>[]>();
  for (const e of edits) {
    if (e.kind === 'card') continue;
    byMethod.set(e.id, [...(byMethod.get(e.id) ?? []), e]);
  }

  for (const [id, group] of byMethod) {
    let rel: string;
    try {
      rel = relPathForMethod(id);
    } catch (err) {
      errors.push((err as Error).message);
      continue;
    }

    let current: { text: string; version: string };
    try {
      current = await store.read(rel);
    } catch (err) {
      errors.push(`${id}.mdx: ${(err as Error).message}`);
      continue;
    }

    let text = current.text;
    let failed = false;

    for (const e of group) {
      try {
        if (e.kind === 'section') {
          text = patchSection(text, e.heading, e.markdown);
        } else if (e.kind === 'frontmatter') {
          text = patchFrontmatterScalar(text, e.field, e.value);
        } else {
          const bytes = new Uint8Array(Buffer.from(e.base64, 'base64'));
          const target = imageTargetFor(id, e.filename);
          const bad = sniffImage(bytes, target.rel.split('.').pop()!);
          if (bad) throw new Error(bad);
          // A card with no `image:` block gets one created. Requiring it to
          // already exist meant the drop target could only ever replace an
          // image, so 147 of the 161 cards were unreachable from the UI.
          text = hasImageBlock(text)
            ? patchFrontmatterScalar(text, '  src', target.src)
            : insertImageBlock(text, target.src);
          files.push({ path: target.rel, content: bytes, version: '' });
        }
      } catch (err) {
        errors.push(`${id}.mdx: ${(err as Error).message}`);
        failed = true;
        break;
      }
    }

    if (failed) continue;

    const invalid = validateMethodText(text, `${id}.mdx`);
    if (invalid.length > 0) {
      errors.push(...invalid);
      continue;
    }

    files.push({ path: rel, content: text, version: current.version });
  }

  // --- taxonomy: every new card folds into one write ---
  const cards = edits.filter((e): e is Extract<PendingEdit, { kind: 'card' }> => e.kind === 'card');
  if (cards.length > 0) {
    try {
      const current = await store.read(TAXONOMY_PATH);
      let json = current.text;
      for (const c of cards) {
        json = insertTaxonomyItem(json, {
          title: c.title,
            kind: c.cardKind as 'concept' | 'framework' | 'method', // allowlisted in rejectEdit
          domainId: c.domainId,
          groupTitle: c.groupTitle,
        });
      }
      files.push({ path: TAXONOMY_PATH, content: json, version: current.version });
    } catch (err) {
      errors.push((err as Error).message);
    }
  }

  return errors.length > 0 ? { files: [], errors } : { files, errors: [] };
}
