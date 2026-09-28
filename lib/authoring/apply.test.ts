import { expect, test, describe } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { applyEdits } from './apply';
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
      'image:\n  src: /images/methods/tree-testing.svg\n  alt: A tree test diagram showing nesting\n---\n\n##',
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
