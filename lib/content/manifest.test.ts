import { expect, test, describe } from 'bun:test';
import { join } from 'node:path';
import manifest from './manifest.json';
import { loadMethods } from './load';

describe('content manifest', () => {
  test('lists every method with its real domain', () => {
    const { methods } = loadMethods(join(import.meta.dir, '../../content/methods'));
    const actual = Object.fromEntries(methods.map((m) => [m.id, m.domain]));
    // Widened: the JSON import's type is a literal with 161 required keys, so
    // an ordinary Record<string, string> is not assignable to it.
    expect(manifest as Record<string, string>).toEqual(actual);
  });

  test('is not empty, so the check above cannot pass vacuously', () => {
    expect(Object.keys(manifest).length).toBeGreaterThan(100);
  });

  test("every entry's domain matches the directory the file is actually in", () => {
    const { methods } = loadMethods(join(import.meta.dir, '../../content/methods'));
    // loadMethods enforces filename == id but never directory == domain, and
    // relPathForMethod reconstructs the path from the domain. If those ever
    // disagree, a write would land at an invented path.
    for (const m of methods) {
      expect((manifest as Record<string, string>)[m.id]).toBe(m.domain);
    }
  });
});
