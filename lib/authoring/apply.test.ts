import { expect, test, describe } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { applyEdits } from './apply';
import { validateMethodText } from './validate';
import type { ContentStore } from './store';
import type { PendingEdit } from './pending';

const REAL = readFileSync(
  join(import.meta.dir, '../../content/methods/ia-structure/tree-testing.mdx'),
  'utf8',
);
const TAX = readFileSync(join(import.meta.dir, '../taxonomy.json'), 'utf8');

function fakeStore(overrides: Record<string, string> = {}): ContentStore {
  return {
    async read(path: string) {
      if (path in overrides) return { text: overrides[path], version: 'v1' };
      if (path.endsWith('tree-testing.mdx')) return { text: REAL, version: 'v1' };
      if (path === 'lib/taxonomy.json') return { text: TAX, version: 'v2' };
      throw new Error(`unexpected read: ${path}`);
    },
    async commit() {
      throw new Error('applyEdits must never commit');
    },
  };
}

describe('applyEdits', () => {
  test('a single section edit produces one file write', async () => {
    const edits: PendingEdit[] = [
      { kind: 'section', id: 'tree-testing', heading: 'Tips', markdown: 'Fresh tips.' },
    ];
    const { files, errors } = await applyEdits(fakeStore(), edits);
    expect(errors).toEqual([]);
    expect(files.length).toBe(1);
    expect(String(files[0].content)).toContain('Fresh tips.');
    expect(files[0].version).toBe('v1');
  });

  // Review Focus 4
  test('two sections of one card collapse into a single file write with both applied', async () => {
    const edits: PendingEdit[] = [
      { kind: 'section', id: 'tree-testing', heading: 'Tips', markdown: 'Tips text.' },
      { kind: 'section', id: 'tree-testing', heading: 'Purpose', markdown: 'Purpose text.' },
    ];
    const { files, errors } = await applyEdits(fakeStore(), edits);
    expect(errors).toEqual([]);
    expect(files.length).toBe(1);
    expect(String(files[0].content)).toContain('Tips text.');
    expect(String(files[0].content)).toContain('Purpose text.');
  });

  test('a section edit and a frontmatter edit on one card also collapse', async () => {
    const edits: PendingEdit[] = [
      { kind: 'section', id: 'tree-testing', heading: 'Tips', markdown: 'Tips text.' },
      { kind: 'frontmatter', id: 'tree-testing', field: 'effort', value: 'high' },
    ];
    const { files } = await applyEdits(fakeStore(), edits);
    expect(files.length).toBe(1);
    expect(String(files[0].content)).toContain('effort: high');
    expect(String(files[0].content)).toContain('Tips text.');
  });

  test('an invalid edit reports an error and produces no files at all', async () => {
    const edits: PendingEdit[] = [
      { kind: 'section', id: 'tree-testing', heading: 'Tips', markdown: 'ok' },
      { kind: 'section', id: 'tree-testing', heading: 'Nope', markdown: 'x' },
    ];
    const { files, errors } = await applyEdits(fakeStore(), edits);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('Nope');
    expect(files).toEqual([]);
  });

  test('an unclosed fence is still refused through this path', async () => {
    const edits: PendingEdit[] = [
      { kind: 'section', id: 'tree-testing', heading: 'Tips', markdown: 'a\n\n```\nopen' },
    ];
    const { errors, files } = await applyEdits(fakeStore(), edits);
    expect(errors.some((e) => e.includes('unclosed code fence'))).toBe(true);
    expect(files).toEqual([]);
  });

  test('a new card produces a taxonomy.json write', async () => {
    const edits: PendingEdit[] = [
      { kind: 'card', title: 'Applied Test Card', cardKind: 'method', domainId: 'ia-structure', groupTitle: null },
    ];
    const { files, errors } = await applyEdits(fakeStore(), edits);
    expect(errors).toEqual([]);
    expect(files.length).toBe(1);
    expect(files[0].path).toBe('lib/taxonomy.json');
    expect(String(files[0].content)).toContain('applied-test-card');
  });

  test('two new cards produce one taxonomy write containing both', async () => {
    const edits: PendingEdit[] = [
      { kind: 'card', title: 'Card One Here', cardKind: 'method', domainId: 'ia-structure', groupTitle: null },
      { kind: 'card', title: 'Card Two Here', cardKind: 'concept', domainId: 'ia-structure', groupTitle: null },
    ];
    const { files, errors } = await applyEdits(fakeStore(), edits);
    expect(errors).toEqual([]);
    expect(files.length).toBe(1);
    expect(String(files[0].content)).toContain('card-one-here');
    expect(String(files[0].content)).toContain('card-two-here');
  });

  test('an image edit produces both the binary and the patched mdx', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>').toString('base64');
    const withImage = REAL.replace(
      '---\n\n##',
      'image:\n  src: /images/methods/tree-testing.svg\n---\n\n##',
    );
    const store = fakeStore({ 'content/methods/ia-structure/tree-testing.mdx': withImage });
    const edits: PendingEdit[] = [
      { kind: 'image', id: 'tree-testing', filename: 'new.svg', base64: svg },
    ];
    const { files, errors } = await applyEdits(store, edits);
    expect(errors).toEqual([]);
    expect(files.map((f) => f.path).sort()).toEqual([
      'content/methods/ia-structure/tree-testing.mdx',
      'public/images/methods/tree-testing.svg',
    ]);
  });

  test('an image whose bytes are not an image is refused', async () => {
    const edits: PendingEdit[] = [
      { kind: 'image', id: 'tree-testing', filename: 'x.png', base64: Buffer.from('nope').toString('base64') },
    ];
    const { errors, files } = await applyEdits(fakeStore(), edits);
    expect(errors.some((e) => e.includes('not a PNG'))).toBe(true);
    expect(files).toEqual([]);
  });
});

describe('applyEdits rejects what the UI would never send', () => {
  // Regression: the per-field route enforced this allowlist, and folding those
  // routes into applyEdits dropped it. A session holder could then rewrite any
  // frontmatter line — including `id`, which commits cleanly and then breaks
  // every later deploy in a way the authoring UI cannot undo.
  test('refuses a frontmatter field that is not an editable enum', async () => {
    for (const field of ['title', 'id', 'domain', '  url', 'aka']) {
      const { errors, files } = await applyEdits(fakeStore(), [
        { kind: 'frontmatter', id: 'tree-testing', field, value: 'anything' },
      ]);
      expect(errors.some((e) => e.includes('is not editable'))).toBe(true);
      expect(files).toEqual([]);
    }
  });

  test('refuses a value outside the enum, including newline injection', async () => {
    for (const value of ['enormous', 'low\ninjected: yes', '']) {
      const { errors, files } = await applyEdits(fakeStore(), [
        { kind: 'frontmatter', id: 'tree-testing', field: 'effort', value },
      ]);
      expect(errors.some((e) => e.includes('must be one of'))).toBe(true);
      expect(files).toEqual([]);
    }
  });

  test('accepts a legitimate enum change', async () => {
    const { errors, files } = await applyEdits(fakeStore(), [
      { kind: 'frontmatter', id: 'tree-testing', field: 'effort', value: 'high' },
    ]);
    expect(errors).toEqual([]);
    expect(String(files[0].content)).toContain('effort: high');
  });

  test('refuses a card kind outside the three real kinds', async () => {
    const { errors, files } = await applyEdits(fakeStore(), [
      { kind: 'card', title: 'Bad Kind Card', cardKind: 'NOT_A_KIND', domainId: 'ia-structure', groupTitle: null },
    ]);
    expect(errors.some((e) => e.includes('must be one of'))).toBe(true);
    expect(files).toEqual([]);
  });

  test('one bad edit discards the whole batch, including the good edits', async () => {
    const { errors, files } = await applyEdits(fakeStore(), [
      { kind: 'section', id: 'tree-testing', heading: 'Tips', markdown: 'perfectly fine' },
      { kind: 'frontmatter', id: 'tree-testing', field: 'title', value: 'PWNED' },
    ]);
    expect(errors.length).toBeGreaterThan(0);
    expect(files).toEqual([]);
  });
});

describe('validateMethodText guards id against filename', () => {
  test('an id that no longer matches its filename is refused', async () => {
    // Belt and braces: even if the field allowlist were bypassed, this is the
    // check that stops a committed file from bricking every later deploy.
    const { validateMethodText } = await import('./validate');
    const renamed = REAL.replace('id: tree-testing', 'id: usability-testing');
    const errors = validateMethodText(renamed, 'tree-testing.mdx');
    expect(errors.some((e) => e.includes('must match filename'))).toBe(true);
  });
});

describe('applyEdits creating a first image', () => {
  const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>').toString('base64');

  // The gap this closes: adding an image used to require an `image:` block to
  // already exist, so only the fourteen cards that had one were reachable.
  test('a card with no image block gets one, plus the binary write', async () => {
    expect(REAL).not.toContain('image:');
    const edits: PendingEdit[] = [
      { kind: 'image', id: 'tree-testing', filename: 'drop.svg', base64: SVG },
    ];
    const { files, errors } = await applyEdits(fakeStore(), edits);
    expect(errors).toEqual([]);
    expect(files.map((f) => f.path).sort()).toEqual([
      'content/methods/ia-structure/tree-testing.mdx',
      'public/images/methods/tree-testing.svg',
    ]);

    const mdx = files.find((f) => f.path.endsWith('.mdx'))!;
    expect(String(mdx.content)).toContain('image:\n  src: /images/methods/tree-testing.svg\n---');
    expect(mdx.version).toBe('v1');

    const binary = files.find((f) => f.path.startsWith('public/'))!;
    expect(binary.content).toBeInstanceOf(Uint8Array);
  });

  test('the created block still validates', async () => {
    const { files } = await applyEdits(fakeStore(), [
      { kind: 'image', id: 'tree-testing', filename: 'drop.svg', base64: SVG },
    ]);
    const mdx = String(files.find((f) => f.path.endsWith('.mdx'))!.content);
    expect(mdx).not.toContain('alt:');
    expect(validateMethodText(mdx, 'tree-testing.mdx')).toEqual([]);
  });

  test('replacing an image on a card that has one still rewrites src in place', async () => {
    const withImage = REAL.replace(
      '---\n\n##',
      'image:\n  src: /images/methods/tree-testing.png\n---\n\n##',
    );
    const store = fakeStore({ 'content/methods/ia-structure/tree-testing.mdx': withImage });
    const { files, errors } = await applyEdits(store, [
      { kind: 'image', id: 'tree-testing', filename: 'new.svg', base64: SVG },
    ]);
    expect(errors).toEqual([]);
    const mdx = String(files.find((f) => f.path.endsWith('.mdx'))!.content);
    expect(mdx).toContain('  src: /images/methods/tree-testing.svg');
    expect(mdx).not.toContain('  src: /images/methods/tree-testing.png');
    // The block is edited in place, not duplicated, and nothing else in the
    // frontmatter is disturbed.
    expect(mdx.match(/^image:$/gm)?.length).toBe(1);
    expect(mdx).toContain('id: tree-testing');
    expect(mdx).toContain('effort: low');
  });

  test('a card with no frontmatter at all is reported, not silently patched', async () => {
    const store = fakeStore({ 'content/methods/ia-structure/tree-testing.mdx': '## Tips\nx\n' });
    const { errors, files } = await applyEdits(store, [
      { kind: 'image', id: 'tree-testing', filename: 'drop.svg', base64: SVG },
    ]);
    expect(errors.some((e) => e.includes('no frontmatter block'))).toBe(true);
    expect(files).toEqual([]);
  });
});
