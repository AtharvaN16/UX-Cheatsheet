# Authoring Mode (Dev) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Edit card text, frontmatter and images, add taxonomy stubs, and open a terminal — all from inside the running app, writing to the working tree, in development only.

**Architecture:** All text transformation is pure `(fileText, edit) => fileText` in `lib/content/patch.ts`, with no I/O, so the risky logic is unit-testable without a filesystem. Writes go through a `ContentStore` interface whose only implementation here is `DiskStore`; Plan B adds `GitHubStore` behind the same interface without touching anything above it. Route handlers accept a method `id`, never a path.

**Tech Stack:** Next.js 16.3 App Router, React 19, TypeScript (strict), Zod 4, gray-matter, `bun:test`, Astryx design system.

**Spec:** `docs/superpowers/specs/2026-09-28-authoring-mode-design.md`

## Global Constraints

- **Development only.** Every route under `app/api/authoring/` returns `404` unless `process.env.NODE_ENV === 'development'`. Every UI affordance renders only under the same condition. Plan B replaces this guard with auth; do not design around that yet.
- **No filesystem path ever crosses the wire.** Endpoints accept a method `id`, resolved server-side via `getAllMethods()`. An id not in that set is rejected with `400`.
- **Card bodies are not MDX.** `FormattedText` supports only `**bold**`, `*italic*`, `### `/`#### `, and `- `/`* ` bullets. Editors expose raw markdown in a `<textarea>`; never build a rich-text editor.
- **Never create an `.mdx` file.** Adding a card writes a taxonomy stub only. An `.mdx` without `sources` ≥ 2 and `useInstead` ≥ 1 fails `bun run validate` and breaks `bun run build`.
- **Never re-serialize frontmatter.** Patch single lines inside the `---` block. `matter.stringify` reformats YAML quoting across the whole block and the authoring brief documents traps that have already broken a file once.
- **Validate before writing.** A write happens only if the proposed full file text passes `frontmatterSchema` + `missingSections` + `duplicateSections`. Report failures using the same strings `loadMethods` produces.
- **Test command:** `bun test <path>`. Tests are colocated as `<name>.test.ts` using `import { expect, test, describe } from 'bun:test'`.
- **Validation command:** `bun run validate` must print `✓ N methods valid` after every task.

## Wiring owned by the orchestrator, not by tasks

Two files are touched by many tasks and are therefore **excluded from every task
below**, to keep parallel work from colliding in them:

- `app/providers.tsx` — mounting `AuthoringProvider`, `AuthorDock`, `AddCardPalette`
- `components/ui/index.ts` — barrel exports

Create your components; do not mount or export them. The orchestrator applies both
files once, after the components exist, and runs the end-to-end verification.

## Review Focus

Input classes the spec implies but which no task's happy path exercises. Each has a test pinned to the task that owns the code.

1. **A title whose kebab-case id is empty or malformed** (`"???"`, `"   "`, `"2026"`). Taxonomy ids are validated by no schema at all, so a bad id silently creates a card that no route can reach. Must be rejected at creation. — Task 8.
2. **A frontmatter field name that also appears in the body** (a line `kind: method` inside a `How to do it` section). `patchFrontmatterScalar` must only ever touch the leading `---` block. — Task 5.
3. **A `## ` heading inside a fenced code block.** `patchSection` must not treat it as a section boundary, or it will truncate a card. — Task 4.
4. **An image uploaded with an uppercase or double extension** (`.PNG`, `.svg.png`). The schema's `LOCAL_IMAGE` regex is lowercase-only, so an accepted-then-invalid file orphans a binary in `public/` and fails the next build. — Task 14.
5. **A method id that does not exist**, posted directly to a save route. Must return `400` before any file is read. — Task 10.

---

## File Structure

**Create:**
- `lib/content/scan.ts` — fence-aware line scanner, shared by the section parser and patcher
- `lib/content/patch.ts` — pure `(fileText, edit) => fileText` transforms
- `lib/authoring/validate.ts` — validate a proposed method file without writing
- `lib/authoring/store.ts` — `ContentStore` interface + `DiskStore`
- `lib/authoring/taxonomyEdit.ts` — pure taxonomy-JSON insert
- `lib/authoring/devOnly.ts` — the `404`-unless-dev guard
- `lib/taxonomy.json` — migrated taxonomy data
- `app/api/authoring/terminal/route.ts`
- `app/api/authoring/section/route.ts`
- `app/api/authoring/frontmatter/route.ts`
- `app/api/authoring/image/route.ts`
- `app/api/authoring/card/route.ts`
- `components/ui/AuthoringProvider.tsx` — edit-mode state + context
- `components/ui/AuthorDock.tsx`
- `components/ui/EditableSection.tsx`
- `components/ui/FrontmatterPanel.tsx`
- `components/ui/AddCardPalette.tsx`

**Modify:**
- `lib/content/sections.ts` — consume the extracted scanner
- `lib/taxonomy.ts` — becomes a thin typed re-export
- `components/ui/DomainTopicGrid.tsx:712,741` — kind resolution
- `components/ui/DomainDashboardGrid.tsx:218,238` — kind resolution
- `app/layout.tsx:39,58` — kind resolution
- `components/ui/ConceptSheetModal.tsx` — render `EditableSection` + `FrontmatterPanel`
- `app/providers.tsx` — mount `AuthoringProvider`
- `components/ui/index.ts` — barrel exports

---

## Task 1: Extract the fence-aware line scanner

`sections.ts` already scans lines while tracking code-fence depth. The patcher needs identical behaviour — if the two implementations drift, a card can be parsed one way and patched another. Extract it so there is one.

**Files:**
- Create: `lib/content/scan.ts`
- Create: `lib/content/scan.test.ts`
- Modify: `lib/content/sections.ts` (remove the local generator, import instead)

**Interfaces:**
- Consumes: nothing
- Produces: `export interface ScanLine { line: string; isHeading: boolean; headingText?: string }` and `export function* scanLinesWithFenceState(body: string): Generator<ScanLine>`

- [ ] **Step 1: Write the failing test**

```ts
// lib/content/scan.test.ts
import { expect, test, describe } from 'bun:test';
import { scanLinesWithFenceState } from './scan';

describe('scanLinesWithFenceState', () => {
  test('marks a top-level heading', () => {
    const out = [...scanLinesWithFenceState('## Purpose\nbody')];
    expect(out[0].isHeading).toBe(true);
    expect(out[0].headingText).toBe('Purpose');
    expect(out[1].isHeading).toBe(false);
  });

  test('does not mark a heading inside a fenced block', () => {
    const body = ['## Real', '```md', '## Fake', '```', '## Also Real'].join('\n');
    const headings = [...scanLinesWithFenceState(body)]
      .filter((s) => s.isHeading)
      .map((s) => s.headingText);
    expect(headings).toEqual(['Real', 'Also Real']);
  });

  test('a longer closing fence closes a shorter opening one', () => {
    const body = ['````', '## Fake', '`````', '## Real'].join('\n');
    const headings = [...scanLinesWithFenceState(body)]
      .filter((s) => s.isHeading)
      .map((s) => s.headingText);
    expect(headings).toEqual(['Real']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/content/scan.test.ts`
Expected: FAIL — `Cannot find module './scan'`

- [ ] **Step 3: Create the module by moving the existing code**

Move `ScanLine` and `scanLinesWithFenceState` verbatim out of `lib/content/sections.ts` into `lib/content/scan.ts`, adding `export` to both:

```ts
// lib/content/scan.ts
export interface ScanLine {
  line: string;
  isHeading: boolean;
  headingText?: string;
}

/** Scan lines with fence awareness. Yields info about each line. */
export function* scanLinesWithFenceState(body: string): Generator<ScanLine> {
  const lines = body.split('\n');
  let inFence = false;
  let fenceChar: string | null = null;
  let fenceLength = 0;

  for (const line of lines) {
    const fenceMatch = /^(`{3,}|~{3,})/.exec(line);

    if (fenceMatch) {
      const marker = fenceMatch[1];
      const char = marker[0];
      const length = marker.length;

      if (!inFence) {
        inFence = true;
        fenceChar = char;
        fenceLength = length;
      } else if (char === fenceChar && length >= fenceLength) {
        inFence = false;
        fenceChar = null;
        fenceLength = 0;
      }
    }

    const headingMatch = !inFence ? /^##\s+(.+?)\s*$/.exec(line) : null;

    yield { line, isHeading: !!headingMatch, headingText: headingMatch?.[1] };
  }
}
```

- [ ] **Step 4: Point `sections.ts` at it**

Delete the `ScanLine` interface and `scanLinesWithFenceState` generator from `lib/content/sections.ts` and add at the top, below the existing `REQUIRED_SECTIONS` import:

```ts
import { scanLinesWithFenceState } from './scan';
```

- [ ] **Step 5: Run the new and existing tests**

Run: `bun test lib/content/scan.test.ts lib/content/sections.test.ts`
Expected: PASS — all tests in both files

- [ ] **Step 6: Verify content still loads**

Run: `bun run validate`
Expected: `✓ 148 methods valid (9 with an image)`

- [ ] **Step 7: Commit**

```bash
git add lib/content/scan.ts lib/content/scan.test.ts lib/content/sections.ts
git commit -m "refactor: extract fence-aware line scanner for reuse"
```

---

## Task 2: Migrate the taxonomy to JSON

Inserting a card means editing this file. String surgery on a 27 KB TypeScript literal fails silently when it fails; JSON cannot be malformed by a structured insert. The migration is mechanical and guarded by a deep-equality snapshot taken before the change.

**Files:**
- Create: `lib/taxonomy.json`
- Create: `lib/taxonomy.snapshot.json` (test fixture, committed)
- Modify: `lib/taxonomy.ts`
- Modify: `lib/taxonomy.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `lib/taxonomy.json` — a JSON array of `{ domainId: string, groups: { title: string | null, items: { id: string, title: string }[] }[] }`. `TAXONOMY`, `TaxonomyDomain`, `TaxonomyGroup`, `TaxonomyItem`, `getTaxonomyForDomain`, `getTaxonomyEntryCount` keep their current names and signatures.

- [ ] **Step 1: Capture the pre-migration snapshot**

Run from the repo root:

```bash
bun -e "import { TAXONOMY } from './lib/taxonomy'; await Bun.write('lib/taxonomy.snapshot.json', JSON.stringify(TAXONOMY, null, 2) + '\n')"
```

- [ ] **Step 2: Write the failing test**

```ts
// append to lib/taxonomy.test.ts
import snapshot from './taxonomy.snapshot.json';
import { TAXONOMY } from './taxonomy';

describe('taxonomy JSON migration', () => {
  test('TAXONOMY is unchanged by the move to JSON', () => {
    expect(JSON.parse(JSON.stringify(TAXONOMY))).toEqual(snapshot);
  });

  test('every item id is unique across the whole taxonomy', () => {
    const ids = TAXONOMY.flatMap((d) => d.groups.flatMap((g) => g.items.map((i) => i.id)));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

- [ ] **Step 3: Run the test to confirm it passes before the migration**

Run: `bun test lib/taxonomy.test.ts`
Expected: PASS — this is the baseline that must survive the change

- [ ] **Step 4: Generate the data file**

```bash
bun -e "import { TAXONOMY } from './lib/taxonomy'; await Bun.write('lib/taxonomy.json', JSON.stringify(TAXONOMY, null, 2) + '\n')"
```

- [ ] **Step 5: Replace the literal in `lib/taxonomy.ts`**

Keep the file's doc comment and the three interfaces. Delete the entire `export const TAXONOMY: readonly TaxonomyDomain[] = [ … ];` literal and put this in its place, leaving the two helper functions at the bottom untouched:

```ts
import data from './taxonomy.json';

export const TAXONOMY: readonly TaxonomyDomain[] = data as readonly TaxonomyDomain[];
```

- [ ] **Step 6: Run the test to verify the migration preserved everything**

Run: `bun test lib/taxonomy.test.ts`
Expected: PASS — including `TAXONOMY is unchanged by the move to JSON`

- [ ] **Step 7: Verify the app still builds**

Run: `bun run validate && bunx tsc --noEmit`
Expected: `✓ 148 methods valid` and no type errors

- [ ] **Step 8: Commit**

```bash
git add lib/taxonomy.ts lib/taxonomy.json lib/taxonomy.snapshot.json lib/taxonomy.test.ts
git commit -m "refactor: move taxonomy data to JSON so inserts cannot corrupt it"
```

---

## Task 3: Give taxonomy items an optional `kind`

Unwritten cards get their kind from `inferKind`, a keyword heuristic with ~55 hardcoded exceptions. Add-card needs somewhere to record an explicit choice. The field is optional, so every existing entry keeps today's behaviour exactly.

**Files:**
- Modify: `lib/taxonomy.ts` (the `TaxonomyItem` interface)
- Modify: `components/ui/DomainTopicGrid.tsx:712,741`
- Modify: `components/ui/DomainDashboardGrid.tsx:218,238`
- Modify: `app/layout.tsx:39,58`
- Modify: `lib/taxonomy.test.ts`

**Interfaces:**
- Consumes: `TaxonomyItem` from Task 2
- Produces: `interface TaxonomyItem { id: string; title: string; kind?: 'concept' | 'framework' | 'method' }`

- [ ] **Step 1: Write the failing test**

```ts
// append to lib/taxonomy.test.ts
import { resolveKind } from './taxonomy';

describe('resolveKind', () => {
  test('an explicit item kind wins over the heuristic', () => {
    // inferKind would call this a concept, because the title contains "law"
    expect(resolveKind({ id: 'moores-law', title: "Moore's Law", kind: 'method' }, 'evaluation'))
      .toBe('method');
  });

  test('falls back to the heuristic when no kind is set', () => {
    expect(resolveKind({ id: 'moores-law', title: "Moore's Law" }, 'evaluation'))
      .toBe('concept');
  });

  test('a written method kind wins over both', () => {
    expect(resolveKind({ id: 'moores-law', title: "Moore's Law", kind: 'method' }, 'evaluation', 'framework'))
      .toBe('framework');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/taxonomy.test.ts`
Expected: FAIL — `resolveKind` is not exported

- [ ] **Step 3: Add the field and the resolver**

In `lib/taxonomy.ts`, extend the interface and add the helper beside the existing ones:

```ts
export interface TaxonomyItem {
  id: string;
  title: string;
  /** Explicit kind, set when a card is added through the app. Absent on
   *  entries predating that feature, which fall back to the heuristic. */
  kind?: 'concept' | 'framework' | 'method';
}

/**
 * The single place kind is decided for a card. Priority: what the written
 * .mdx says, then what the author picked when adding the entry, then the
 * `inferKind` heuristic. Callers must not re-implement this order.
 */
export function resolveKind(
  item: TaxonomyItem,
  domainId: string,
  writtenKind?: string,
): 'method' | 'framework' | 'concept' {
  if (writtenKind) return writtenKind as 'method' | 'framework' | 'concept';
  if (item.kind) return item.kind;
  return inferKind(item.title, domainId, item.id);
}
```

Add the import at the top of `lib/taxonomy.ts`:

```ts
import { inferKind } from './inferKind';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test lib/taxonomy.test.ts`
Expected: PASS

- [ ] **Step 5: Route the six call sites through `resolveKind`**

`components/ui/DomainTopicGrid.tsx` line 712:

```ts
const itemKind = resolveKind(item, domainId, written?.kind);
```

`components/ui/DomainTopicGrid.tsx` line 741:

```ts
kind: resolveKind({ id: written.id, title: written.title }, domainId, written.kind),
```

`components/ui/DomainDashboardGrid.tsx` line 218:

```ts
kind: resolveKind(item, domainTax.domainId, written?.kind),
```

`components/ui/DomainDashboardGrid.tsx` line 238:

```ts
kind: resolveKind({ id: written.id, title: written.title }, written.domain, written.kind),
```

`app/layout.tsx` line 39:

```ts
kind: resolveKind({ id: m.id, title: m.title }, domainId, m.kind),
```

`app/layout.tsx` line 58:

```ts
const kind = resolveKind(item, domainTax.domainId);
```

In each of the three files, add `resolveKind` to the existing `@/lib/taxonomy` import and remove the now-unused `inferKind` import.

- [ ] **Step 6: Verify nothing changed for existing cards**

Run: `bun test lib/ && bunx tsc --noEmit && bun run validate`
Expected: all tests pass, no type errors, `✓ 148 methods valid`

- [ ] **Step 7: Commit**

```bash
git add lib/taxonomy.ts lib/taxonomy.test.ts components/ui/DomainTopicGrid.tsx components/ui/DomainDashboardGrid.tsx app/layout.tsx
git commit -m "feat: let taxonomy entries carry an explicit kind"
```

---

## Task 4: `patchSection`

Replace one `## ` section's body in a method file, leaving every other byte untouched.

**Files:**
- Create: `lib/content/patch.ts`
- Create: `lib/content/patch.test.ts`

**Interfaces:**
- Consumes: `scanLinesWithFenceState` from Task 1
- Produces: `export function patchSection(fileText: string, heading: string, markdown: string): string` — throws `Error` with message `unknown section "<heading>"` if the heading is absent.

- [ ] **Step 1: Write the failing test**

```ts
// lib/content/patch.test.ts
import { expect, test, describe } from 'bun:test';
import { patchSection } from './patch';

const FILE = [
  '---',
  'id: tree-testing',
  'title: Tree Testing',
  '---',
  '',
  '## What is it',
  'Old first body.',
  '',
  '## How to do it',
  '- step one',
  '',
  '## Tips',
  'Old last body.',
  '',
].join('\n');

describe('patchSection', () => {
  test('replaces a middle section without touching its neighbours', () => {
    const out = patchSection(FILE, 'How to do it', '- brand new step');
    expect(out).toContain('## What is it\nOld first body.');
    expect(out).toContain('## How to do it\n- brand new step');
    expect(out).toContain('## Tips\nOld last body.');
    expect(out).not.toContain('- step one');
  });

  test('replaces the last section and keeps the trailing newline', () => {
    const out = patchSection(FILE, 'Tips', 'Brand new tips.');
    expect(out.endsWith('Brand new tips.\n')).toBe(true);
    expect(out).toContain('## How to do it\n- step one');
  });

  test('leaves frontmatter completely untouched', () => {
    const out = patchSection(FILE, 'What is it', 'New.');
    expect(out.startsWith('---\nid: tree-testing\ntitle: Tree Testing\n---\n')).toBe(true);
  });

  // Review Focus 3
  test('does not split on a ## inside a fenced code block', () => {
    const fenced = [
      '## What is it',
      'Intro.',
      '```md',
      '## Not A Heading',
      '```',
      'Still the same section.',
      '',
      '## Tips',
      'Tips body.',
      '',
    ].join('\n');
    const out = patchSection(fenced, 'What is it', 'Replaced.');
    expect(out).toBe(['## What is it', 'Replaced.', '', '## Tips', 'Tips body.', ''].join('\n'));
    expect(out).not.toContain('Not A Heading');
  });

  test('throws a named error for a heading that does not exist', () => {
    expect(() => patchSection(FILE, 'Nonexistent', 'x')).toThrow('unknown section "Nonexistent"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/content/patch.test.ts`
Expected: FAIL — `Cannot find module './patch'`

- [ ] **Step 3: Write the implementation**

```ts
// lib/content/patch.ts
import { scanLinesWithFenceState } from './scan';

/**
 * Replace the body of one `## ` section, leaving every other byte of the file
 * as it was.
 *
 * Section bounds are found with the same fence-aware scanner the parser uses,
 * so a `## ` inside a code block is never mistaken for a boundary. The body is
 * written back with one blank line before the next heading, matching how every
 * existing card is laid out.
 */
export function patchSection(fileText: string, heading: string, markdown: string): string {
  const lines = fileText.split('\n');
  let start = -1;
  let end = -1;
  let i = 0;

  for (const scan of scanLinesWithFenceState(fileText)) {
    if (scan.isHeading) {
      if (scan.headingText === heading && start === -1) {
        start = i;
      } else if (start !== -1 && end === -1) {
        end = i;
      }
    }
    i++;
  }

  if (start === -1) throw new Error(`unknown section "${heading}"`);

  const body = markdown.replace(/\s+$/, '');

  if (end === -1) {
    // Last section: keep exactly one trailing newline at end of file.
    return [...lines.slice(0, start + 1), body, ''].join('\n');
  }

  return [...lines.slice(0, start + 1), body, '', ...lines.slice(end)].join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test lib/content/patch.test.ts`
Expected: PASS — 5 tests

- [ ] **Step 5: Commit**

```bash
git add lib/content/patch.ts lib/content/patch.test.ts
git commit -m "feat: add patchSection for targeted section rewrites"
```

---

## Task 5: `patchFrontmatterScalar`

Replace one scalar frontmatter field on one line. Must never touch the body, and must never re-serialize the YAML.

**Files:**
- Modify: `lib/content/patch.ts`
- Modify: `lib/content/patch.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `export function patchFrontmatterScalar(fileText: string, field: string, value: string): string` — throws `Error` with message `no frontmatter block` or `unknown frontmatter field "<field>"`.

- [ ] **Step 1: Write the failing test**

```ts
// append to lib/content/patch.test.ts
import { patchFrontmatterScalar } from './patch';

const FM = [
  '---',
  'id: tree-testing',
  'kind: method',
  'effort: medium',
  'timeframe: days',
  '---',
  '',
  '## How to do it',
  'Write the line `kind: method` in your notes.',
  'effort: high',
  '',
].join('\n');

describe('patchFrontmatterScalar', () => {
  test('replaces the named field', () => {
    const out = patchFrontmatterScalar(FM, 'effort', 'high');
    expect(out).toContain('\neffort: high\n');
    expect(out).toContain('kind: method');
  });

  // Review Focus 2
  test('only touches the frontmatter block, never the body', () => {
    const out = patchFrontmatterScalar(FM, 'effort', 'low');
    const [, frontmatter, body] = out.split('---\n');
    expect(frontmatter).toContain('effort: low');
    expect(body).toContain('effort: high');
    expect(body).toContain('Write the line `kind: method` in your notes.');
  });

  test('changes exactly one line', () => {
    const before = FM.split('\n');
    const after = patchFrontmatterScalar(FM, 'kind', 'concept').split('\n');
    const differing = after.filter((l, i) => l !== before[i]);
    expect(differing).toEqual(['kind: concept']);
  });

  test('throws for a field that is not present', () => {
    expect(() => patchFrontmatterScalar(FM, 'gives', 'mixed'))
      .toThrow('unknown frontmatter field "gives"');
  });

  test('throws when there is no frontmatter block', () => {
    expect(() => patchFrontmatterScalar('## Only a body\n', 'kind', 'method'))
      .toThrow('no frontmatter block');
  });

  // Task 14 replaces an image by patching the nested `  src:` line under
  // `image:`. The field name carries its own indentation, so that has to work.
  test('patches an indented nested key by its exact indented name', () => {
    const withImage = [
      '---',
      'id: kano-model',
      'image:',
      '  src: /images/methods/old.svg',
      '  alt: A description that is comfortably over twenty characters long',
      '---',
      '',
      '## What is it',
      'Body.',
      '',
    ].join('\n');
    const out = patchFrontmatterScalar(withImage, '  src', '/images/methods/new.png');
    expect(out).toContain('  src: /images/methods/new.png');
    expect(out).toContain('  alt: A description that is comfortably over twenty characters long');
  });

  test('throws for a nested key that is absent, so a card with no image is reported', () => {
    expect(() => patchFrontmatterScalar(FM, '  src', '/images/methods/x.png'))
      .toThrow('unknown frontmatter field "  src"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/content/patch.test.ts`
Expected: FAIL — `patchFrontmatterScalar is not a function`

- [ ] **Step 3: Write the implementation**

```ts
// append to lib/content/patch.ts

/**
 * Replace one scalar field on one line inside the leading `---` block.
 *
 * Deliberately not `matter.stringify`: re-serializing reformats quoting across
 * the whole block, and the authoring brief documents YAML traps (an unquoted
 * scalar containing ": " parses as a mapping) that have already broken a file.
 * A one-line replacement produces a one-line diff and cannot disturb a field
 * nobody edited.
 *
 * `field` is matched as a literal line prefix, indentation included, so a nested
 * key is addressed as `"  src"`. That is how the image replacer reaches
 * `image.src` without a YAML round-trip.
 *
 * Only ever used for closed-enum fields and paths, so `value` needs no quoting.
 */
export function patchFrontmatterScalar(fileText: string, field: string, value: string): string {
  const lines = fileText.split('\n');
  if (lines[0] !== '---') throw new Error('no frontmatter block');

  const close = lines.indexOf('---', 1);
  if (close === -1) throw new Error('no frontmatter block');

  const pattern = new RegExp(`^${field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s`);
  const target = lines.slice(1, close).findIndex((l) => pattern.test(l));
  if (target === -1) throw new Error(`unknown frontmatter field "${field}"`);

  lines[target + 1] = `${field}: ${value}`;
  return lines.join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test lib/content/patch.test.ts`
Expected: PASS — 10 tests

- [ ] **Step 5: Commit**

```bash
git add lib/content/patch.ts lib/content/patch.test.ts
git commit -m "feat: add patchFrontmatterScalar with one-line diffs"
```

---

## Task 6: Validate a proposed file without writing it

The gate that keeps a bad edit off disk and out of a build.

**Files:**
- Create: `lib/authoring/validate.ts`
- Create: `lib/authoring/validate.test.ts`

**Interfaces:**
- Consumes: `frontmatterSchema` from `lib/content/schema`, `parseSections`/`missingSections`/`duplicateSections` from `lib/content/sections`
- Produces: `export function validateMethodText(fileText: string, rel: string): string[]` — returns human-readable errors in the same format `loadMethods` emits (`"<rel>: <path> — <message>"`), empty array when valid.

- [ ] **Step 1: Write the failing test**

```ts
// lib/authoring/validate.test.ts
import { expect, test, describe } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateMethodText } from './validate';
import { patchSection } from '../content/patch';

const REAL = readFileSync(
  join(import.meta.dir, '../content/fixtures/valid/ia-structure/card-sorting.mdx'),
  'utf8',
);

describe('validateMethodText', () => {
  test('accepts a known-good file', () => {
    expect(validateMethodText(REAL, 'card-sorting.mdx')).toEqual([]);
  });

  test('accepts a valid section edit', () => {
    const edited = patchSection(REAL, 'Purpose', 'A completely rewritten purpose.');
    expect(validateMethodText(edited, 'card-sorting.mdx')).toEqual([]);
  });

  test('reports a missing required section', () => {
    const gutted = REAL.replace('## Common mistakes', '## Renamed Heading');
    const errors = validateMethodText(gutted, 'card-sorting.mdx');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('card-sorting.mdx');
    expect(errors[0]).toContain('Common mistakes');
  });

  test('reports a duplicate heading', () => {
    const doubled = `${REAL}\n## Tips\nA second tips section.\n`;
    const errors = validateMethodText(doubled, 'card-sorting.mdx');
    expect(errors.some((e) => e.includes('duplicate'))).toBe(true);
  });

  test('reports an invalid enum value in frontmatter', () => {
    const bad = REAL.replace('effort: medium', 'effort: enormous');
    const errors = validateMethodText(bad, 'card-sorting.mdx');
    expect(errors.some((e) => e.includes('effort'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/authoring/validate.test.ts`
Expected: FAIL — `Cannot find module './validate'`

- [ ] **Step 3: Write the implementation**

```ts
// lib/authoring/validate.ts
import matter from 'gray-matter';
import { frontmatterSchema } from '../content/schema';
import { parseSections, missingSections, duplicateSections } from '../content/sections';

/**
 * Validate a *proposed* method file without writing it anywhere.
 *
 * This is the same set of checks `loadMethods` runs per file, in the same
 * order, emitting the same strings — so an error shown in the editing panel
 * reads identically to one from `bun run validate`. Cross-reference checks are
 * deliberately absent: no editable field can change a cross-reference, since
 * `useInstead` and `related` are not editable in the app.
 */
export function validateMethodText(fileText: string, rel: string): string[] {
  const errors: string[] = [];

  let data: Record<string, unknown>;
  let content: string;
  try {
    const parsed = matter(fileText);
    data = parsed.data;
    content = parsed.content;
  } catch (e) {
    return [`${rel}: frontmatter — ${(e as Error).message}`];
  }

  const parsed = frontmatterSchema.safeParse(data);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`${rel}: ${issue.path.join('.') || '(root)'} — ${issue.message}`);
    }
    return errors;
  }

  const sections = parseSections(content);
  const missing = missingSections(sections, parsed.data.kind);
  if (missing.length > 0) errors.push(`${rel}: sections — missing ${missing.join(', ')}`);

  const dups = duplicateSections(content);
  if (dups.length > 0) errors.push(`${rel}: sections — duplicate heading(s) ${dups.join(', ')}`);

  return errors;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test lib/authoring/validate.test.ts`
Expected: PASS — 5 tests

- [ ] **Step 5: Commit**

```bash
git add lib/authoring/validate.ts lib/authoring/validate.test.ts
git commit -m "feat: validate a proposed method file without writing it"
```

---

## Task 7: `ContentStore` and `DiskStore`

The seam Plan B slots `GitHubStore` into. Nothing above this interface knows where bytes live.

**Files:**
- Create: `lib/authoring/store.ts`
- Create: `lib/authoring/store.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:

```ts
export interface FileWrite { path: string; content: string | Uint8Array; version: string }
export interface ContentStore {
  read(path: string): Promise<{ text: string; version: string }>;
  commit(files: FileWrite[], message: string): Promise<void>;
}
export class DiskStore implements ContentStore { constructor(root: string) }
export function getStore(): ContentStore
```

`path` is always repo-relative and POSIX-style, e.g. `content/methods/ia-structure/tree-testing.mdx`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/authoring/store.test.ts
import { expect, test, describe, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DiskStore } from './store';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'store-'));
  mkdirSync(join(root, 'content', 'methods', 'ia-structure'), { recursive: true });
  writeFileSync(join(root, 'content', 'methods', 'ia-structure', 'a.mdx'), 'original\n');
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('DiskStore', () => {
  test('reads a file relative to the root', async () => {
    const store = new DiskStore(root);
    const { text } = await store.read('content/methods/ia-structure/a.mdx');
    expect(text).toBe('original\n');
  });

  test('commits several files at once', async () => {
    const store = new DiskStore(root);
    await store.commit(
      [
        { path: 'content/methods/ia-structure/a.mdx', content: 'changed\n', version: '' },
        { path: 'lib/taxonomy.json', content: '[]\n', version: '' },
      ],
      'test',
    );
    expect(readFileSync(join(root, 'content/methods/ia-structure/a.mdx'), 'utf8')).toBe('changed\n');
    expect(readFileSync(join(root, 'lib/taxonomy.json'), 'utf8')).toBe('[]\n');
  });

  test('writes binary content unchanged', async () => {
    const store = new DiskStore(root);
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    await store.commit([{ path: 'public/images/methods/x.png', content: bytes, version: '' }], 'img');
    expect(new Uint8Array(readFileSync(join(root, 'public/images/methods/x.png')))).toEqual(bytes);
  });

  test('refuses a path that escapes the root', async () => {
    const store = new DiskStore(root);
    await expect(store.read('../../../etc/passwd')).rejects.toThrow('path escapes the repository');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/authoring/store.test.ts`
Expected: FAIL — `Cannot find module './store'`

- [ ] **Step 3: Write the implementation**

```ts
// lib/authoring/store.ts
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname, sep } from 'node:path';

export interface FileWrite {
  /** Repo-relative, POSIX-style. */
  path: string;
  content: string | Uint8Array;
  /** Opaque version captured at read time. Ignored by DiskStore. */
  version: string;
}

/**
 * Where content bytes live. `DiskStore` is the whole implementation in
 * development; Plan B adds `GitHubStore` behind this same interface, so nothing
 * above this line needs to know which is in play.
 *
 * `commit` takes many files and is atomic-per-call by contract, because the
 * live-site sync commits a whole batch as one revision.
 */
export interface ContentStore {
  read(path: string): Promise<{ text: string; version: string }>;
  commit(files: FileWrite[], message: string): Promise<void>;
}

export class DiskStore implements ContentStore {
  constructor(private readonly root: string) {}

  private absolute(relPath: string): string {
    const abs = resolve(this.root, relPath);
    if (abs !== this.root && !abs.startsWith(this.root + sep)) {
      throw new Error('path escapes the repository');
    }
    return abs;
  }

  async read(relPath: string): Promise<{ text: string; version: string }> {
    return { text: readFileSync(this.absolute(relPath), 'utf8'), version: '' };
  }

  async commit(files: FileWrite[], _message: string): Promise<void> {
    for (const f of files) {
      const abs = this.absolute(f.path);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, f.content);
    }
  }
}

export function getStore(): ContentStore {
  return new DiskStore(process.cwd());
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test lib/authoring/store.test.ts`
Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add lib/authoring/store.ts lib/authoring/store.test.ts
git commit -m "feat: add ContentStore interface and DiskStore"
```

---

## Task 8: Insert a taxonomy stub

A pure transform over the taxonomy JSON text, including the id rules nothing else enforces.

**Files:**
- Create: `lib/authoring/taxonomyEdit.ts`
- Create: `lib/authoring/taxonomyEdit.test.ts`

**Interfaces:**
- Consumes: `TaxonomyDomain`, `TaxonomyItem` from `lib/taxonomy`
- Produces:

```ts
export function toId(title: string): string
export function insertTaxonomyItem(
  json: string,
  entry: { title: string; kind: 'concept' | 'framework' | 'method'; domainId: string; groupTitle: string | null },
): string
```

Throws `Error` for: an id that is empty or not kebab-case, a duplicate id, an unknown domain, an unknown group.

- [ ] **Step 1: Write the failing test**

```ts
// lib/authoring/taxonomyEdit.test.ts
import { expect, test, describe } from 'bun:test';
import { toId, insertTaxonomyItem } from './taxonomyEdit';

const JSON_IN = JSON.stringify(
  [
    {
      domainId: 'ia-structure',
      groups: [
        { title: 'Research & Testing', items: [{ id: 'tree-testing', title: 'Tree Testing' }] },
      ],
    },
  ],
  null,
  2,
);

describe('toId', () => {
  test('kebab-cases a normal title', () => {
    expect(toId('Card Sorting Lite')).toBe('card-sorting-lite');
  });

  test('strips punctuation and collapses separators', () => {
    expect(toId("Miller's Law")).toBe('millers-law');
    expect(toId('Jobs   to  be Done')).toBe('jobs-to-be-done');
    expect(toId('A/B Testing')).toBe('a-b-testing');
  });
});

describe('insertTaxonomyItem', () => {
  test('adds the entry to the named group with its kind', () => {
    const out = JSON.parse(
      insertTaxonomyItem(JSON_IN, {
        title: 'Card Sorting Lite',
        kind: 'method',
        domainId: 'ia-structure',
        groupTitle: 'Research & Testing',
      }),
    );
    expect(out[0].groups[0].items).toEqual([
      { id: 'tree-testing', title: 'Tree Testing' },
      { id: 'card-sorting-lite', title: 'Card Sorting Lite', kind: 'method' },
    ]);
  });

  test('produces valid, re-parseable, newline-terminated JSON', () => {
    const out = insertTaxonomyItem(JSON_IN, {
      title: 'New Thing',
      kind: 'concept',
      domainId: 'ia-structure',
      groupTitle: 'Research & Testing',
    });
    expect(out.endsWith('\n')).toBe(true);
    expect(() => JSON.parse(out)).not.toThrow();
  });

  test('rejects a duplicate id', () => {
    expect(() =>
      insertTaxonomyItem(JSON_IN, {
        title: 'Tree Testing',
        kind: 'method',
        domainId: 'ia-structure',
        groupTitle: 'Research & Testing',
      }),
    ).toThrow('id "tree-testing" already exists');
  });

  // Review Focus 1
  test.each([['???'], ['   '], ['---'], ['']])('rejects the untitled input %p', (title) => {
    expect(() =>
      insertTaxonomyItem(JSON_IN, {
        title,
        kind: 'method',
        domainId: 'ia-structure',
        groupTitle: 'Research & Testing',
      }),
    ).toThrow('title must contain at least one letter or number');
  });

  test('rejects an unknown domain', () => {
    expect(() =>
      insertTaxonomyItem(JSON_IN, {
        title: 'X',
        kind: 'method',
        domainId: 'nope',
        groupTitle: 'Research & Testing',
      }),
    ).toThrow('unknown domain "nope"');
  });

  test('rejects an unknown group', () => {
    expect(() =>
      insertTaxonomyItem(JSON_IN, {
        title: 'X',
        kind: 'method',
        domainId: 'ia-structure',
        groupTitle: 'Nope',
      }),
    ).toThrow('unknown group "Nope"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/authoring/taxonomyEdit.test.ts`
Expected: FAIL — `Cannot find module './taxonomyEdit'`

- [ ] **Step 3: Write the implementation**

```ts
// lib/authoring/taxonomyEdit.ts
import type { TaxonomyDomain, TaxonomyItem } from '../taxonomy';

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Derive a card id from its title, matching the kebab-case ids already in use. */
export function toId(title: string): string {
  return title
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Add one entry to the taxonomy JSON and hand back the new text.
 *
 * Structured rather than textual: the whole reason the taxonomy moved to JSON
 * is that `JSON.parse` → mutate → `JSON.stringify` cannot emit a syntactically
 * broken file, whereas string surgery on the old TypeScript literal could —
 * quietly.
 *
 * Nothing else validates taxonomy ids. There is no Zod schema over this file,
 * so an id like "" or "---" would be accepted everywhere and simply produce a
 * card no route could ever reach. These checks are the only ones there are.
 */
export function insertTaxonomyItem(
  json: string,
  entry: {
    title: string;
    kind: 'concept' | 'framework' | 'method';
    domainId: string;
    groupTitle: string | null;
  },
): string {
  const id = toId(entry.title);
  if (id === '' || !KEBAB.test(id)) {
    throw new Error('title must contain at least one letter or number');
  }

  const data = JSON.parse(json) as TaxonomyDomain[];

  for (const d of data) {
    for (const g of d.groups) {
      if (g.items.some((i) => i.id === id)) {
        throw new Error(`id "${id}" already exists`);
      }
    }
  }

  const domain = data.find((d) => d.domainId === entry.domainId);
  if (!domain) throw new Error(`unknown domain "${entry.domainId}"`);

  const group = domain.groups.find((g) => g.title === entry.groupTitle);
  if (!group) throw new Error(`unknown group "${entry.groupTitle}"`);

  const item: TaxonomyItem = { id, title: entry.title.trim(), kind: entry.kind };
  (group.items as TaxonomyItem[]).push(item);

  return `${JSON.stringify(data, null, 2)}\n`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test lib/authoring/taxonomyEdit.test.ts`
Expected: PASS — 11 tests

- [ ] **Step 5: Commit**

```bash
git add lib/authoring/taxonomyEdit.ts lib/authoring/taxonomyEdit.test.ts
git commit -m "feat: add validated taxonomy stub insertion"
```

---

## Task 9: Dev-only guard and the terminal route

Smallest end-to-end slice: proves the route layering before anything can write content.

**Files:**
- Create: `lib/authoring/devOnly.ts`
- Create: `lib/authoring/devOnly.test.ts`
- Create: `app/api/authoring/terminal/route.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `export function devOnlyGuard(): Response | null` — returns a `404` `Response` outside development, `null` in development. Every authoring route calls it first and returns its result when non-null.

- [ ] **Step 1: Write the failing test**

```ts
// lib/authoring/devOnly.test.ts
import { expect, test, describe, afterEach } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { devOnlyGuard } from './devOnly';

const original = process.env.NODE_ENV;
afterEach(() => {
  process.env.NODE_ENV = original;
});

describe('devOnlyGuard', () => {
  test('returns null in development', () => {
    process.env.NODE_ENV = 'development';
    expect(devOnlyGuard()).toBeNull();
  });

  test('returns a 404 in production', () => {
    process.env.NODE_ENV = 'production';
    expect(devOnlyGuard()?.status).toBe(404);
  });
});

describe('authoring routes', () => {
  test('every route file calls devOnlyGuard', () => {
    const base = join(import.meta.dir, '../../app/api/authoring');
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((e) => {
        const full = join(dir, e);
        return statSync(full).isDirectory() ? walk(full) : e === 'route.ts' ? [full] : [];
      });

    const routes = walk(base);
    expect(routes.length).toBeGreaterThan(0);
    for (const r of routes) {
      expect(readFileSync(r, 'utf8')).toContain('devOnlyGuard()');
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/authoring/devOnly.test.ts`
Expected: FAIL — `Cannot find module './devOnly'`

- [ ] **Step 3: Write the guard**

```ts
// lib/authoring/devOnly.ts

/**
 * Authoring endpoints mutate the working tree, so they must not exist outside
 * development. This is the server-side half of that guarantee; the client half
 * is that the UI renders nothing. Neither is sufficient alone — hiding a button
 * does not protect a route, which is why this guard is the real boundary.
 *
 * Plan B replaces this with an auth check when editing goes to the live site.
 */
export function devOnlyGuard(): Response | null {
  if (process.env.NODE_ENV !== 'development') {
    return new Response(null, { status: 404 });
  }
  return null;
}
```

- [ ] **Step 4: Write the terminal route**

```ts
// app/api/authoring/terminal/route.ts
import { execFile } from 'node:child_process';
import { devOnlyGuard } from '@/lib/authoring/devOnly';

/**
 * Open a terminal at the repo root so Claude Code is one keystroke away.
 *
 * No part of the command comes from the request: the path is process.cwd() and
 * the body is ignored. Combined with the dev guard, the entire input space of
 * this shell-executing endpoint is "was it called".
 */
export async function POST(): Promise<Response> {
  const blocked = devOnlyGuard();
  if (blocked) return blocked;

  if (process.platform !== 'darwin') {
    return Response.json(
      { error: `opening a terminal is only wired up for macOS, not ${process.platform}` },
      { status: 501 },
    );
  }

  return new Promise((resolve) => {
    execFile('open', ['-a', 'Terminal', process.cwd()], (err) => {
      resolve(
        err
          ? Response.json({ error: err.message }, { status: 500 })
          : Response.json({ ok: true }),
      );
    });
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test lib/authoring/devOnly.test.ts`
Expected: PASS — 3 tests

- [ ] **Step 6: Verify against the running app**

Run `bun dev`, then in another shell:

```bash
curl -X POST -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/api/authoring/terminal
```

Expected: `200`, and Terminal.app opens at the repo root.

- [ ] **Step 7: Commit**

```bash
git add lib/authoring/devOnly.ts lib/authoring/devOnly.test.ts app/api/authoring/terminal/route.ts
git commit -m "feat: add dev-only route guard and terminal opener"
```

---

## Task 10: Save routes for sections and frontmatter

**Files:**
- Create: `app/api/authoring/section/route.ts`
- Create: `app/api/authoring/frontmatter/route.ts`
- Create: `lib/authoring/resolve.ts`
- Create: `lib/authoring/resolve.test.ts`

**Interfaces:**
- Consumes: `getAllMethods` from `lib/content`, `patchSection`/`patchFrontmatterScalar` from Task 4–5, `validateMethodText` from Task 6, `getStore` from Task 7
- Produces: `export function relPathForMethod(id: string): string` — throws `Error` `unknown method "<id>"`. Routes respond `{ ok: true }` on success or `{ errors: string[] }` with status `400`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/authoring/resolve.test.ts
import { expect, test, describe } from 'bun:test';
import { relPathForMethod } from './resolve';

describe('relPathForMethod', () => {
  test('builds the repo-relative path from the method domain and id', () => {
    expect(relPathForMethod('tree-testing')).toBe('content/methods/ia-structure/tree-testing.mdx');
  });

  // Review Focus 5
  test('throws for an id that does not exist', () => {
    expect(() => relPathForMethod('not-a-real-method')).toThrow('unknown method "not-a-real-method"');
  });

  test('throws for an id that looks like a path', () => {
    expect(() => relPathForMethod('../../etc/passwd')).toThrow('unknown method');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/authoring/resolve.test.ts`
Expected: FAIL — `Cannot find module './resolve'`

- [ ] **Step 3: Write the resolver**

```ts
// lib/authoring/resolve.ts
import { getAllMethods } from '../content';

/**
 * Turn a method id into its repo-relative file path.
 *
 * This is why no endpoint accepts a path. An id is looked up in the set of
 * methods that actually exist, so traversal is not something to sanitize
 * against — an attacker-supplied string simply is not in the set.
 */
export function relPathForMethod(id: string): string {
  const method = getAllMethods().find((m) => m.id === id);
  if (!method) throw new Error(`unknown method "${id}"`);
  return `content/methods/${method.domain}/${method.id}.mdx`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test lib/authoring/resolve.test.ts`
Expected: PASS — 3 tests

- [ ] **Step 5: Write the section route**

```ts
// app/api/authoring/section/route.ts
import { devOnlyGuard } from '@/lib/authoring/devOnly';
import { relPathForMethod } from '@/lib/authoring/resolve';
import { validateMethodText } from '@/lib/authoring/validate';
import { getStore } from '@/lib/authoring/store';
import { patchSection } from '@/lib/content/patch';

export async function POST(request: Request): Promise<Response> {
  const blocked = devOnlyGuard();
  if (blocked) return blocked;

  const { id, heading, markdown } = (await request.json()) as {
    id?: string;
    heading?: string;
    markdown?: string;
  };

  if (!id || !heading || typeof markdown !== 'string') {
    return Response.json({ errors: ['id, heading and markdown are required'] }, { status: 400 });
  }

  let rel: string;
  try {
    rel = relPathForMethod(id);
  } catch (e) {
    return Response.json({ errors: [(e as Error).message] }, { status: 400 });
  }

  const store = getStore();
  const { text, version } = await store.read(rel);

  let next: string;
  try {
    next = patchSection(text, heading, markdown);
  } catch (e) {
    return Response.json({ errors: [(e as Error).message] }, { status: 400 });
  }

  const errors = validateMethodText(next, `${id}.mdx`);
  if (errors.length > 0) return Response.json({ errors }, { status: 400 });

  await store.commit([{ path: rel, content: next, version }], `content: edit ${id} — ${heading}`);
  return Response.json({ ok: true });
}
```

- [ ] **Step 6: Write the frontmatter route**

```ts
// app/api/authoring/frontmatter/route.ts
import { devOnlyGuard } from '@/lib/authoring/devOnly';
import { relPathForMethod } from '@/lib/authoring/resolve';
import { validateMethodText } from '@/lib/authoring/validate';
import { getStore } from '@/lib/authoring/store';
import { patchFrontmatterScalar } from '@/lib/content/patch';
import { KIND, GIVES, EFFORT, TIMEFRAME } from '@/lib/content/schema';

/** Only closed-enum scalars are editable, so a value can never need quoting. */
const EDITABLE: Record<string, readonly string[]> = {
  kind: KIND,
  gives: GIVES,
  effort: EFFORT,
  timeframe: TIMEFRAME,
};

export async function POST(request: Request): Promise<Response> {
  const blocked = devOnlyGuard();
  if (blocked) return blocked;

  const { id, field, value } = (await request.json()) as {
    id?: string;
    field?: string;
    value?: string;
  };

  if (!id || !field || !value) {
    return Response.json({ errors: ['id, field and value are required'] }, { status: 400 });
  }

  const allowed = EDITABLE[field];
  if (!allowed) {
    return Response.json({ errors: [`field "${field}" is not editable`] }, { status: 400 });
  }
  if (!allowed.includes(value)) {
    return Response.json(
      { errors: [`${field} must be one of ${allowed.join(', ')}`] },
      { status: 400 },
    );
  }

  let rel: string;
  try {
    rel = relPathForMethod(id);
  } catch (e) {
    return Response.json({ errors: [(e as Error).message] }, { status: 400 });
  }

  const store = getStore();
  const { text, version } = await store.read(rel);

  let next: string;
  try {
    next = patchFrontmatterScalar(text, field, value);
  } catch (e) {
    return Response.json({ errors: [(e as Error).message] }, { status: 400 });
  }

  const errors = validateMethodText(next, `${id}.mdx`);
  if (errors.length > 0) return Response.json({ errors }, { status: 400 });

  await store.commit([{ path: rel, content: next, version }], `content: ${id} ${field}=${value}`);
  return Response.json({ ok: true });
}
```

- [ ] **Step 7: Verify the guard test still covers the new routes**

Run: `bun test lib/authoring/`
Expected: PASS — including `every route file calls devOnlyGuard`, now over three routes

- [ ] **Step 8: Verify against the running app**

With `bun dev` running:

```bash
curl -s -X POST http://localhost:3000/api/authoring/section \
  -H 'content-type: application/json' \
  -d '{"id":"nope","heading":"Tips","markdown":"x"}'
```

Expected: `{"errors":["unknown method \"nope\""]}` with status `400`

```bash
curl -s -X POST http://localhost:3000/api/authoring/frontmatter \
  -H 'content-type: application/json' \
  -d '{"id":"tree-testing","field":"effort","value":"enormous"}'
```

Expected: `{"errors":["effort must be one of low, medium, high"]}`

- [ ] **Step 9: Commit**

```bash
git add lib/authoring/resolve.ts lib/authoring/resolve.test.ts app/api/authoring/section/route.ts app/api/authoring/frontmatter/route.ts
git commit -m "feat: add section and frontmatter save routes"
```

---

## Task 11: `AuthoringProvider` and `AuthorDock`

**Files:**
- Create: `components/ui/AuthoringProvider.tsx`
- Create: `components/ui/AuthorDock.tsx`
- Modify: `app/providers.tsx`
- Modify: `components/ui/index.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces: `export function useAuthoring(): { isEditing: boolean; toggleEditing: () => void; isAddOpen: boolean; setAddOpen: (v: boolean) => void }`, `export function AuthoringProvider({ children }: { children: React.ReactNode })`, `export function AuthorDock()`

- [ ] **Step 1: Write the provider**

```tsx
// components/ui/AuthoringProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface Authoring {
  isEditing: boolean;
  toggleEditing: () => void;
  isAddOpen: boolean;
  setAddOpen: (v: boolean) => void;
}

const AuthoringContext = createContext<Authoring | null>(null);

/**
 * Editing state, shared by the dock and every editable surface.
 *
 * `IS_DEV` is a compile-time constant, so in a production build this whole
 * module's interactive branches are gated off at runtime. Note this does NOT
 * dead-code-eliminate: exporting `IS_DEV` defeats constant folding, so these
 * components ship inert rather than being dropped. The real boundary is
 * `devOnlyGuard` on the server.
 */
export const IS_DEV = process.env.NODE_ENV === 'development';

export function useAuthoring(): Authoring {
  const ctx = useContext(AuthoringContext);
  if (!ctx) throw new Error('useAuthoring must be used within an AuthoringProvider');
  return ctx;
}

export function AuthoringProvider({ children }: { children: React.ReactNode }) {
  const [isEditing, setEditing] = useState(false);
  const [isAddOpen, setAddOpen] = useState(false);

  useEffect(() => {
    if (!IS_DEV) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'e' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setEditing((v) => !v);
      }
      if (e.key === 'K' && e.shiftKey && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setAddOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <AuthoringContext
      value={{ isEditing, toggleEditing: () => setEditing((v) => !v), isAddOpen, setAddOpen }}
    >
      {children}
    </AuthoringContext>
  );
}
```

- [ ] **Step 2: Write the dock**

Colours are the committed theme tokens from `lib/theme.ts` — card `#FFFFFF`, border `#E4DED2`, primary text `#23211D`, and the Astryx method blue `#5A92C6` for the active state.

```tsx
// components/ui/AuthorDock.tsx
'use client';

import { IS_DEV, useAuthoring } from './AuthoringProvider';

const ICON = 'flex h-[25px] w-[25px] items-center justify-center rounded-[7px] border text-[12px] transition-colors';
const IDLE = 'border-[#E4DED2] bg-[#faf9f5] text-[#5C574A] hover:bg-[#EAE6DD]';
const ACTIVE = 'border-[#5A92C6] bg-[#5A92C6] text-white';

export function AuthorDock() {
  const { isEditing, toggleEditing, setAddOpen } = useAuthoring();

  if (!IS_DEV) return null;

  const openTerminal = () => {
    void fetch('/api/authoring/terminal', { method: 'POST' });
  };

  return (
    <div
      className="fixed bottom-[14px] left-[14px] z-50 flex items-center gap-[7px] rounded-[11px] border border-[#E4DED2] bg-white px-[9px] py-[7px] shadow-[0_6px_20px_rgba(35,33,29,0.11)]"
      role="toolbar"
      aria-label="Authoring controls"
    >
      <span className="h-[7px] w-[7px] rounded-full bg-[#2E8A75]" aria-hidden />
      <span className="text-[11px] font-semibold tracking-[0.03em] text-[#23211D]">DEV</span>
      <button
        type="button"
        onClick={toggleEditing}
        aria-pressed={isEditing}
        title="Toggle editing (⌘E)"
        className={`${ICON} ${isEditing ? ACTIVE : IDLE}`}
      >
        ✎
      </button>
      <button
        type="button"
        onClick={() => setAddOpen(true)}
        title="Add card (⌘⇧K)"
        className={`${ICON} ${IDLE}`}
      >
        ＋
      </button>
      <button type="button" onClick={openTerminal} title="Open terminal here" className={`${ICON} ${IDLE}`}>
        ▶_
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Mount it**

In `app/providers.tsx`, import both and wrap the existing tree inside `<MotionConfig>`:

```tsx
import { AuthoringProvider } from '@/components/ui/AuthoringProvider';
import { AuthorDock } from '@/components/ui/AuthorDock';
```

Replace `<MotionConfig reducedMotion="user">{children}</MotionConfig>` with:

```tsx
<MotionConfig reducedMotion="user">
  <AuthoringProvider>
    {children}
    <AuthorDock />
  </AuthoringProvider>
</MotionConfig>
```

- [ ] **Step 4: Add the barrel exports**

In `components/ui/index.ts`:

```ts
export { AuthorDock } from './AuthorDock';
export { AuthoringProvider, useAuthoring, IS_DEV } from './AuthoringProvider';
```

- [ ] **Step 5: Verify in the browser**

Run `bun dev` and open `http://localhost:3000`.
Expected: the dock appears bottom-left; `⌘E` highlights the pencil; the `▶_` button opens Terminal.

- [ ] **Step 6: Verify it is absent from a production build**

```bash
bun run build
grep -c "Authoring controls" .next/server/app/index.html   # expect 0
bun run start &
sleep 8
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:3000/api/authoring/section
```

Expected: `0` occurrences in the prerendered HTML, and `404` from the route.

Do NOT assert the strings are absent from `.next/static`. They are present: the
components ship in a ~40K chunk and are gated at runtime, because exporting
`IS_DEV` prevents the minifier folding it to a constant. What matters is that
nothing renders and no route answers — both of which this checks directly.

- [ ] **Step 7: Commit**

```bash
git add components/ui/AuthoringProvider.tsx components/ui/AuthorDock.tsx components/ui/index.ts app/providers.tsx
git commit -m "feat: add dev authoring dock and editing state"
```

---

## Task 12: Editable sections in the sheet

**Files:**
- Create: `components/ui/EditableSection.tsx`
- Modify: `components/ui/ConceptSheetModal.tsx`
- Modify: `components/ui/index.ts`

**Interfaces:**
- Consumes: `useAuthoring`, `IS_DEV` from Task 11; `POST /api/authoring/section` from Task 10
- Produces: `export function EditableSection({ methodId, heading, markdown, children }: { methodId: string; heading: string; markdown: string; children: React.ReactNode })`

- [ ] **Step 1: Write the component**

```tsx
// components/ui/EditableSection.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IS_DEV, useAuthoring } from './AuthoringProvider';

/**
 * Wraps one `## ` section. With editing off — or in production — it renders its
 * children and nothing else.
 *
 * The editor is a plain textarea holding the section's *source* markdown, not a
 * conversion of the rendered output. Card bodies are parsed by FormattedText,
 * which understands only bold, italic, ### and bullets; a rich-text editor
 * would have to serialize back into that four-primitive subset and would inject
 * markup that renders as literal text the moment anything was pasted in.
 */
export function EditableSection({
  methodId,
  heading,
  markdown,
  children,
}: {
  methodId: string;
  heading: string;
  markdown: string;
  children: React.ReactNode;
}) {
  const { isEditing } = useAuthoring();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(markdown);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  if (!IS_DEV || !isEditing) return <>{children}</>;

  const save = async () => {
    setSaving(true);
    setErrors([]);
    const res = await fetch('/api/authoring/section', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: methodId, heading, markdown: draft }),
    });
    setSaving(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      const body = (await res.json()) as { errors?: string[] };
      setErrors(body.errors ?? ['save failed']);
    }
  };

  if (!open) {
    return (
      <div className="relative">
        {children}
        <button
          type="button"
          onClick={() => {
            setDraft(markdown);
            setOpen(true);
          }}
          title={`Edit "${heading}"`}
          className="absolute -top-1 right-0 flex h-6 w-6 items-center justify-center rounded-[7px] border border-[#DCD7CC] bg-[#EAE6DD] text-[12px] text-[#6E6A5E] hover:bg-[#DCD7CC]"
        >
          ✎
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void save();
          }
          if (e.key === 'Escape') {
            e.stopPropagation();
            setOpen(false);
          }
        }}
        rows={Math.max(6, draft.split('\n').length + 2)}
        spellCheck
        autoFocus
        className="w-full rounded-[9px] border-[1.5px] border-[#5A92C6] bg-white p-3 font-mono text-[14px] leading-[1.7] text-[#3A3730] shadow-[0_0_0_3px_rgba(90,146,198,0.13)] outline-none"
      />
      {errors.length > 0 && (
        <ul className="rounded-[7px] bg-[#FDF2F2] p-3 text-[14px] text-[#A33]">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-[8px] bg-[#5A92C6] px-3.5 py-1.5 text-[14px] font-semibold text-white disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save section'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-[14px] text-[#5C574A]">
          Cancel
        </button>
        <span className="text-[14px] text-[#8C887E]">⌘S to save · Esc to cancel</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wrap the sheet's section bodies**

In `components/ui/ConceptSheetModal.tsx`, add the import:

```tsx
import { EditableSection } from '@/components/ui/EditableSection';
```

Find the `<FormattedText content={content} … />` call inside the collapsible section body (around line 268) and wrap it, passing the section's heading and the method id already available on the item:

```tsx
<EditableSection methodId={methodId} heading={title} markdown={content}>
  <FormattedText
    content={content}
    style={{ fontSize: '20px', fontWeight: 400, lineHeight: '1.6' }}
    className="text-secondary"
  />
</EditableSection>
```

Thread `methodId` down to that component from `item.method?.id` at the point the section list is rendered, alongside the existing `title` and `content` props.

- [ ] **Step 3: Export it**

In `components/ui/index.ts`:

```ts
export { EditableSection } from './EditableSection';
```

- [ ] **Step 4: Verify the round trip by hand**

With `bun dev` running: open a written card, press `⌘E`, click a pencil, change a word, press `⌘S`.
Expected: the sheet re-renders with the new text, and `git diff` shows a one-section change to that `.mdx`.

- [ ] **Step 5: Verify a bad edit is refused**

Delete an entire required section's body and replace the heading text in the textarea with prose, then save.
Expected: red error list naming the missing section, and `git diff` shows no change to the file.

- [ ] **Step 6: Confirm content still validates**

Run: `bun run validate`
Expected: `✓ 148 methods valid (9 with an image)`

- [ ] **Step 7: Commit**

```bash
git add components/ui/EditableSection.tsx components/ui/ConceptSheetModal.tsx components/ui/index.ts
git commit -m "feat: edit card sections inline in dev"
```

---

## Task 13: Frontmatter panel

**Files:**
- Create: `components/ui/FrontmatterPanel.tsx`
- Modify: `components/ui/ConceptSheetModal.tsx`
- Modify: `components/ui/index.ts`

**Interfaces:**
- Consumes: `useAuthoring`, `IS_DEV` from Task 11; `POST /api/authoring/frontmatter` from Task 10; `Method` from `lib/content`
- Produces: `export function FrontmatterPanel({ method }: { method: Method })`

- [ ] **Step 1: Write the component**

```tsx
// components/ui/FrontmatterPanel.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Method } from '@/lib/content';
import { IS_DEV, useAuthoring } from './AuthoringProvider';

const FIELDS = [
  { field: 'kind', label: 'Kind', options: ['concept', 'framework', 'method'] },
  { field: 'gives', label: 'Gives', options: ['quantitative', 'qualitative', 'mixed', 'conceptual'] },
  { field: 'effort', label: 'Effort', options: ['low', 'medium', 'high'] },
  { field: 'timeframe', label: 'Timeframe', options: ['hours', 'days', 'weeks', 'months', 'ongoing'] },
] as const;

/**
 * The closed-enum frontmatter fields, as segmented controls.
 *
 * Only enums are here on purpose. Free-text and array fields (`sources`,
 * `useInstead`, `related`, `useCases`) carry cross-reference and minimum-count
 * rules checked across the whole content set, and editing them a field at a
 * time invites build breaks a small panel cannot explain. A segmented control
 * over a closed list cannot produce an invalid value at all.
 */
export function FrontmatterPanel({ method }: { method: Method }) {
  const { isEditing } = useAuthoring();
  const router = useRouter();
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  if (!IS_DEV || !isEditing) return null;

  const set = async (field: string, value: string) => {
    setBusy(field);
    setErrors([]);
    const res = await fetch('/api/authoring/frontmatter', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: method.id, field, value }),
    });
    setBusy(null);
    if (res.ok) router.refresh();
    else setErrors(((await res.json()) as { errors?: string[] }).errors ?? ['save failed']);
  };

  return (
    <aside className="rounded-[10px] border border-[#E4DED2] bg-[#faf9f5] p-4">
      <p className="mb-3 text-[14px] font-medium uppercase tracking-[0.08em] text-[#8C887E]">
        Frontmatter
      </p>

      {FIELDS.map(({ field, label, options }) => {
        const current = method[field as 'kind' | 'gives' | 'effort' | 'timeframe'];
        return (
          <div key={field} className="mb-3">
            <label className="mb-1.5 block text-[14px] font-medium uppercase tracking-[0.06em] text-[#8C887E]">
              {label}
            </label>
            <div className="flex gap-1">
              {options.map((o) => (
                <button
                  key={o}
                  type="button"
                  disabled={busy === field}
                  onClick={() => set(field, o)}
                  className={`flex-1 rounded-[7px] border px-2 py-1.5 text-[14px] ${
                    current === o
                      ? 'border-[#5A92C6] bg-[#5A92C6] font-semibold text-white'
                      : 'border-[#E4DED2] bg-white text-[#6E6A5E] hover:bg-[#EAE6DD]'
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {errors.length > 0 && (
        <ul className="rounded-[7px] bg-[#FDF2F2] p-3 text-[14px] text-[#A33]">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </aside>
  );
}
```

- [ ] **Step 2: Render it in the sheet**

In `components/ui/ConceptSheetModal.tsx`, import it and render it directly below the sheet header, inside the scrolling body, guarded on the method existing:

```tsx
import { FrontmatterPanel } from '@/components/ui/FrontmatterPanel';
```

```tsx
{item.method && <FrontmatterPanel method={item.method} />}
```

- [ ] **Step 3: Export it**

In `components/ui/index.ts`:

```ts
export { FrontmatterPanel } from './FrontmatterPanel';
```

- [ ] **Step 4: Verify by hand**

With `bun dev`: open a written card, press `⌘E`, click a different `effort`.
Expected: the chip updates, and `git diff` shows exactly one changed line in that `.mdx`.

- [ ] **Step 5: Verify the kind guard**

On a `method` card, switch `kind` to `concept`.
Expected: a red error naming the sections a concept requires, and no change in `git diff`.

- [ ] **Step 6: Commit**

```bash
git add components/ui/FrontmatterPanel.tsx components/ui/ConceptSheetModal.tsx components/ui/index.ts
git commit -m "feat: edit closed-enum frontmatter fields from the sheet"
```

---

## Task 14: Replace a card's image

**Files:**
- Create: `app/api/authoring/image/route.ts`
- Create: `lib/authoring/imageName.ts`
- Create: `lib/authoring/imageName.test.ts`
- Modify: `components/ui/FrontmatterPanel.tsx`

**Interfaces:**
- Consumes: `relPathForMethod`, `validateMethodText`, `getStore`, `patchFrontmatterScalar`
- Produces: `export function imageTargetFor(methodId: string, filename: string): { rel: string; src: string }` — throws `Error` `unsupported image type "<ext>"`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/authoring/imageName.test.ts
import { expect, test, describe } from 'bun:test';
import { imageTargetFor } from './imageName';

describe('imageTargetFor', () => {
  test('names the file after the method, not the upload', () => {
    expect(imageTargetFor('tree-testing', 'Screenshot 2026.svg')).toEqual({
      rel: 'public/images/methods/tree-testing.svg',
      src: '/images/methods/tree-testing.svg',
    });
  });

  // Review Focus 4
  test('lower-cases the extension so it matches the schema regex', () => {
    expect(imageTargetFor('tree-testing', 'DIAGRAM.PNG').src).toBe('/images/methods/tree-testing.png');
  });

  test('uses only the final extension of a double-extension upload', () => {
    expect(imageTargetFor('tree-testing', 'evil.svg.png').src).toBe('/images/methods/tree-testing.png');
  });

  test.each([['x.gif'], ['x.pdf'], ['x'], ['x.']])('rejects %p', (name) => {
    expect(() => imageTargetFor('tree-testing', name)).toThrow('unsupported image type');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/authoring/imageName.test.ts`
Expected: FAIL — `Cannot find module './imageName'`

- [ ] **Step 3: Write the implementation**

```ts
// lib/authoring/imageName.ts

/** Mirrors the LOCAL_IMAGE regex in lib/content/schema.ts, which is lowercase-only. */
const ALLOWED = ['png', 'jpg', 'jpeg', 'svg', 'webp'];

/**
 * Decide where an uploaded image goes.
 *
 * The name comes from the method id, never from the upload: it keeps the
 * one-image-per-card convention, and it means an uploaded filename is data
 * that is read and discarded rather than data that becomes a path.
 *
 * The extension is lower-cased because the schema's LOCAL_IMAGE pattern only
 * accepts lowercase — accepting `.PNG` verbatim would write the binary and then
 * fail validation, leaving an orphan in public/ and a broken build.
 */
export function imageTargetFor(methodId: string, filename: string): { rel: string; src: string } {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (!filename.includes('.') || !ALLOWED.includes(ext)) {
    throw new Error(`unsupported image type "${ext}" — use one of ${ALLOWED.join(', ')}`);
  }
  return {
    rel: `public/images/methods/${methodId}.${ext}`,
    src: `/images/methods/${methodId}.${ext}`,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test lib/authoring/imageName.test.ts`
Expected: PASS — 7 tests

- [ ] **Step 5: Write the route**

```ts
// app/api/authoring/image/route.ts
import { devOnlyGuard } from '@/lib/authoring/devOnly';
import { relPathForMethod } from '@/lib/authoring/resolve';
import { validateMethodText } from '@/lib/authoring/validate';
import { getStore } from '@/lib/authoring/store';
import { imageTargetFor } from '@/lib/authoring/imageName';
import { patchFrontmatterScalar } from '@/lib/content/patch';

export async function POST(request: Request): Promise<Response> {
  const blocked = devOnlyGuard();
  if (blocked) return blocked;

  const form = await request.formData();
  const id = form.get('id');
  const file = form.get('file');

  if (typeof id !== 'string' || !(file instanceof File)) {
    return Response.json({ errors: ['id and file are required'] }, { status: 400 });
  }

  let mdxRel: string;
  let target: { rel: string; src: string };
  try {
    mdxRel = relPathForMethod(id);
    target = imageTargetFor(id, file.name);
  } catch (e) {
    return Response.json({ errors: [(e as Error).message] }, { status: 400 });
  }

  const store = getStore();
  const { text, version } = await store.read(mdxRel);

  // Replacing only: creating a first image would need `alt` of >= 20 chars,
  // which is prose and does not belong in a drop target.
  let next: string;
  try {
    next = patchFrontmatterScalar(text, '  src', target.src);
  } catch {
    return Response.json(
      { errors: ['this card has no image block yet — add the first one in Claude Code'] },
      { status: 400 },
    );
  }

  const errors = validateMethodText(next, `${id}.mdx`);
  if (errors.length > 0) return Response.json({ errors }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  await store.commit(
    [
      { path: target.rel, content: bytes, version: '' },
      { path: mdxRel, content: next, version },
    ],
    `content: replace ${id} image`,
  );

  return Response.json({ ok: true, src: target.src });
}
```

- [ ] **Step 6: Add the drop slot to the panel**

In `components/ui/FrontmatterPanel.tsx`, add below the `FIELDS` loop:

```tsx
{method.image && (
  <div className="mb-3">
    <label className="mb-1.5 block text-[14px] font-medium uppercase tracking-[0.06em] text-[#8C887E]">
      Image
    </label>
    <label
      className="block cursor-pointer rounded-[9px] border-[1.5px] border-dashed border-[#CFC8B8] bg-white p-4 text-center text-[14px] text-[#8C887E] hover:border-[#5A92C6]"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const f = e.dataTransfer.files[0];
        if (f) void upload(f);
      }}
    >
      ⇪ Drop or choose a replacement
      <input
        type="file"
        accept=".png,.jpg,.jpeg,.svg,.webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
        }}
      />
    </label>
  </div>
)}
```

And the handler beside `set`:

```tsx
const upload = async (file: File) => {
  setBusy('image');
  setErrors([]);
  const body = new FormData();
  body.set('id', method.id);
  body.set('file', file);
  const res = await fetch('/api/authoring/image', { method: 'POST', body });
  setBusy(null);
  if (res.ok) router.refresh();
  else setErrors(((await res.json()) as { errors?: string[] }).errors ?? ['upload failed']);
};
```

- [ ] **Step 7: Verify by hand**

With `bun dev`: open `kano-model` (it has an image), press `⌘E`, drop a different SVG.
Expected: the diagram updates, and `git status` shows the changed file under `public/images/methods/`.

- [ ] **Step 8: Confirm validation still passes**

Run: `bun run validate`
Expected: `✓ 148 methods valid (9 with an image)`

- [ ] **Step 9: Commit**

```bash
git add lib/authoring/imageName.ts lib/authoring/imageName.test.ts app/api/authoring/image/route.ts components/ui/FrontmatterPanel.tsx
git commit -m "feat: replace a card image from the frontmatter panel"
```

---

## Task 15: Add-card palette

**Files:**
- Create: `app/api/authoring/card/route.ts`
- Create: `components/ui/AddCardPalette.tsx`
- Modify: `app/providers.tsx`
- Modify: `components/ui/index.ts`

**Interfaces:**
- Consumes: `insertTaxonomyItem`, `toId` from Task 8; `getStore` from Task 7; `useAuthoring` from Task 11; `TAXONOMY`, `DOMAINS` data
- Produces: `POST /api/authoring/card` accepting `{ title, kind, domainId, groupTitle }`, responding `{ ok: true, id }` or `{ errors: string[] }` with `400`. `export function AddCardPalette()`

- [ ] **Step 1: Write the route**

```ts
// app/api/authoring/card/route.ts
import { devOnlyGuard } from '@/lib/authoring/devOnly';
import { getStore } from '@/lib/authoring/store';
import { insertTaxonomyItem, toId } from '@/lib/authoring/taxonomyEdit';

const KINDS = ['concept', 'framework', 'method'];

export async function POST(request: Request): Promise<Response> {
  const blocked = devOnlyGuard();
  if (blocked) return blocked;

  const { title, kind, domainId, groupTitle } = (await request.json()) as {
    title?: string;
    kind?: string;
    domainId?: string;
    groupTitle?: string | null;
  };

  if (!title || !kind || !domainId || groupTitle === undefined) {
    return Response.json(
      { errors: ['title, kind, domainId and groupTitle are required'] },
      { status: 400 },
    );
  }
  if (!KINDS.includes(kind)) {
    return Response.json({ errors: [`kind must be one of ${KINDS.join(', ')}`] }, { status: 400 });
  }

  const store = getStore();
  const rel = 'lib/taxonomy.json';
  const { text, version } = await store.read(rel);

  let next: string;
  try {
    next = insertTaxonomyItem(text, {
      title,
      kind: kind as 'concept' | 'framework' | 'method',
      domainId,
      groupTitle,
    });
  } catch (e) {
    return Response.json({ errors: [(e as Error).message] }, { status: 400 });
  }

  await store.commit([{ path: rel, content: next, version }], `content: add ${toId(title)} stub`);
  return Response.json({ ok: true, id: toId(title) });
}
```

- [ ] **Step 2: Write the palette**

```tsx
// components/ui/AddCardPalette.tsx
'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TAXONOMY } from '@/lib/taxonomy';
import { DOMAINS } from '@/lib/domains';
import { inferKind } from '@/lib/inferKind';
import { toId } from '@/lib/authoring/taxonomyEdit';
import { IS_DEV, useAuthoring } from './AuthoringProvider';

const KINDS = [
  { key: 'concept', label: 'Concept', hint: 'an idea you understand' },
  { key: 'framework', label: 'Framework', hint: 'a structure you fill in' },
  { key: 'method', label: 'Method', hint: 'an activity you perform' },
] as const;

/**
 * Adds a taxonomy stub, never an .mdx file: an .mdx without two sources and a
 * useInstead rule fails `bun run validate` and breaks the build. The stub
 * renders immediately as an unwritten card, exactly like the 188 that already
 * exist, and Claude Code writes the real content later.
 *
 * Flow is name -> kind -> group, so the title is known before the kind step and
 * `inferKind` can pre-select its guess.
 */
export function AddCardPalette() {
  const { isAddOpen, setAddOpen } = useAuthoring();
  const router = useRouter();
  const params = useParams<{ category?: string }>();

  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const existing = useMemo(
    () => new Set(TAXONOMY.flatMap((d) => d.groups.flatMap((g) => g.items.map((i) => i.id)))),
    [],
  );

  if (!IS_DEV || !isAddOpen) return null;

  const id = toId(title);
  const collision = id !== '' && existing.has(id);
  const currentDomain = params?.category ?? DOMAINS[0].id;
  const guess = title ? inferKind(title, currentDomain, id) : 'method';

  const close = () => {
    setAddOpen(false);
    setTitle('');
    setKind(null);
    setErrors([]);
  };

  const create = async (domainId: string, groupTitle: string | null) => {
    const res = await fetch('/api/authoring/card', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title, kind: kind ?? guess, domainId, groupTitle }),
    });
    if (res.ok) {
      close();
      router.refresh();
    } else {
      setErrors(((await res.json()) as { errors?: string[] }).errors ?? ['could not create card']);
    }
  };

  const groupsFor = (domainId: string) =>
    TAXONOMY.find((d) => d.domainId === domainId)?.groups ?? [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add a card"
      data-authoring
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 pt-[12vh]"
      onClick={close}
    >
      <div
        className="w-full max-w-[560px] overflow-hidden rounded-[14px] border border-[#DCD7CC] bg-[#FAF8F5] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-[52px] items-center gap-3 border-b border-[#DCD7CC] bg-[#EAE6DD] px-5">
          <span className="rounded-[6px] bg-[#2E8A75]/15 px-2 py-0.5 text-[14px] font-bold uppercase tracking-[0.07em] text-[#2E8A75]">
            New
          </span>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') close();
              if (kind === null && ['1', '2', '3'].includes(e.key)) {
                e.preventDefault();
                setKind(KINDS[Number(e.key) - 1].key);
              }
            }}
            placeholder="Name the card…"
            className="flex-1 bg-transparent text-[17px] text-[#1A1A1A] outline-none"
          />
        </div>

        <div className="max-h-[360px] overflow-y-auto py-3">
          {title && (
            <p className="px-5 pb-2 font-mono text-[14px] text-[#737067]">
              id: <b className={collision ? 'text-[#A33]' : 'text-[#2D2B28]'}>{id || '—'}</b>
              {collision && ' · already exists'}
            </p>
          )}

          {kind === null ? (
            <>
              <p className="px-5 py-2 text-[14px] font-medium uppercase tracking-[0.08em] text-[#8C887E]">
                Pick a kind
              </p>
              {KINDS.map((k, i) => (
                <button
                  key={k.key}
                  type="button"
                  disabled={!title || collision}
                  onClick={() => setKind(k.key)}
                  className={`flex w-full items-center gap-3 px-5 py-2 text-left disabled:opacity-40 ${
                    k.key === guess ? 'bg-[#F0EDE4]' : ''
                  }`}
                >
                  <span className="flex h-[21px] w-[21px] items-center justify-center rounded-[5px] bg-[#EAE6DD] font-mono text-[14px]">
                    {i + 1}
                  </span>
                  <span className="text-[15px] font-semibold text-[#2D2B28]">{k.label}</span>
                  <span className="text-[14px] text-[#737067]">{k.hint}</span>
                  {k.key === guess && <span className="ml-auto text-[14px] italic text-[#8C887E]">suggested</span>}
                </button>
              ))}
            </>
          ) : (
            DOMAINS.filter((d) => groupsFor(d.id).length > 0).map((d) => (
              <div key={d.id}>
                <p className="px-5 py-2 text-[14px] font-medium uppercase tracking-[0.08em] text-[#8C887E]">
                  {d.title}
                  {d.id === currentDomain && ' · current page'}
                </p>
                {groupsFor(d.id).map((g) => (
                  <button
                    key={`${d.id}-${g.title}`}
                    type="button"
                    onClick={() => create(d.id, g.title)}
                    className="flex w-full items-center justify-between px-5 py-2 text-left hover:bg-[#F0EDE4]"
                  >
                    <span className="text-[15px] font-semibold text-[#2D2B28]">{g.title ?? d.title}</span>
                    <span className="text-[14px] text-[#737067]">{g.items.length} cards</span>
                  </button>
                ))}
              </div>
            ))
          )}

          {errors.length > 0 && (
            <ul className="mx-5 mt-2 rounded-[7px] bg-[#FDF2F2] p-3 text-[14px] text-[#A33]">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex h-[42px] items-center justify-center gap-6 border-t border-[#E5E2D9] text-[14px] text-[#8C887E]">
          <span>1 2 3 — kind</span>
          <span>↵ — create</span>
          <span>Esc — cancel</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Exempt this dialog from the global 500px rule**

`app/globals.css` forces `height: 500px !important` on `div[role="dialog"]` and
its first two levels of children. Those rules exist to pin the Astryx command
palette but were written unscoped, so the palette above — which correctly carries
`role="dialog"` for screen readers — would be squashed to a fixed 500px full-screen
overlay.

Exempt it rather than rewriting the selectors. Rewriting them to target the
command palette positively risks breaking the palette if its internal markup is
not what the selector assumes; an exemption cannot affect existing behaviour at
all. In `app/globals.css`, in **both** the `dialog, dialog[open], …` block and the
`dialog [data-astryx-component=…], div[role="dialog"] …` blocks, replace every
occurrence of the bare selector `div[role="dialog"]` with
`div[role="dialog"]:not([data-authoring])`:

```css
/* before */
div[role="dialog"],
div[role="dialog"] > div,
div[role="dialog"] > div > div {

/* after */
div[role="dialog"]:not([data-authoring]),
div[role="dialog"]:not([data-authoring]) > div,
div[role="dialog"]:not([data-authoring]) > div > div {
```

Apply the same `:not([data-authoring])` qualifier to the `div[role="dialog"]`
prefix in the header, content, listbox and footer rule groups further down the
file. Do not change any declaration, only the selectors.

- [ ] **Step 4: Confirm the existing command palette is unaffected**

With `bun dev`, press `⌘K`.
Expected: the search palette still renders at exactly 500px tall with its beige
52px header and 42px footer, visually identical to before the change.

- [ ] **Step 5: Verify by hand**

With `bun dev`: on `/c/ia-structure` press `⌘⇧K`, type `Card Sorting Lite`, press `3`, click a group.
Expected: the palette closes, a new unwritten card appears in that group, and `git diff lib/taxonomy.json` shows exactly one added entry carrying `"kind": "method"`.

- [ ] **Step 6: Verify collision and bad-title handling**

Type `Tree Testing` — expected: the id shows in red with "already exists" and the kind buttons are disabled.
Type `???` — expected: the id shows `—` and the kind buttons stay disabled.

- [ ] **Step 7: Confirm the build is still green**

Run: `bun test && bun run validate && bunx tsc --noEmit`
Expected: all pass

- [ ] **Step 8: Commit**

```bash
git add app/api/authoring/card/route.ts components/ui/AddCardPalette.tsx components/ui/index.ts app/providers.tsx
git commit -m "feat: add cards to the taxonomy from a keyboard palette"
```
