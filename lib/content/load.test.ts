import { expect, test, describe } from 'bun:test';
import { join } from 'node:path';
import { loadMethods } from './load';

const FIX = join(import.meta.dir, 'fixtures');

describe('loadMethods', () => {
  test('loads valid methods with no errors', () => {
    const { methods, errors } = loadMethods(join(FIX, 'valid'));
    expect(errors).toEqual([]);
    expect(methods.map((m) => m.id).sort()).toEqual(['card-sorting', 'tree-testing']);
  });

  test('exposes parsed sections on each method', () => {
    const { methods } = loadMethods(join(FIX, 'valid'));
    const tree = methods.find((m) => m.id === 'tree-testing')!;
    expect(tree.sections['When to use']).toContain('existing navigation');
    expect(tree.sections['Using AI']).toContain('confident garbage');
  });

  test('reports an unresolved useInstead reference', () => {
    const { errors } = loadMethods(join(FIX, 'broken-ref'));
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('tree-testing.mdx');
    expect(errors[0]).toContain('does-not-exist');
  });

  test('reports a duplicate section heading', () => {
    const { errors } = loadMethods(join(FIX, 'duplicate-section'));
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('tree-testing.mdx');
    expect(errors[0]).toContain('Tips');
  });
});
