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
