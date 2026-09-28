// lib/authoring/apply.ts
import type { ContentStore, FileWrite } from './store';
import type { PendingEdit } from './pending';
import { patchSection, patchFrontmatterScalar } from '../content/patch';
import { validateMethodText } from './validate';
import { relPathForMethod } from './resolve';
import { insertTaxonomyItem } from './taxonomyEdit';
import { imageTargetFor, sniffImage } from './imageName';

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
          text = patchFrontmatterScalar(text, '  src', target.src);
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
          kind: c.cardKind as 'concept' | 'framework' | 'method',
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
