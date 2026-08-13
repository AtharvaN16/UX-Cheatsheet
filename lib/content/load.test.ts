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
    expect(tree.sections['Using AI']).toContain('Where it fails');
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

  test('does not cascade a schema error on one file into a false unresolved-reference error on its dependents', () => {
    const { errors } = loadMethods(join(FIX, 'cascade'));
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('aaa-broken.mdx');
    expect(errors[0]).toContain('kind');
    expect(errors.some((e) => e.includes('unresolved reference'))).toBe(false);
  });

  test('reports a duplicate id across two directories, naming both paths', () => {
    const { errors } = loadMethods(join(FIX, 'duplicate-id'));
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('dir-a/foo.mdx');
    expect(errors[0]).toContain('dir-b/foo.mdx');
    expect(errors[0]).toContain('duplicate of');
  });

  test('reports a filename/id mismatch with the expected filename', () => {
    const { errors } = loadMethods(join(FIX, 'filename-mismatch'));
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('wrong-name.mdx');
    expect(errors[0]).toContain('right-name.mdx');
  });

  test('resolves a forward reference to a file later in sort order', () => {
    const { errors } = loadMethods(join(FIX, 'forward-ref'));
    expect(errors).toEqual([]);
  });

  test('reports a self-reference', () => {
    const { errors } = loadMethods(join(FIX, 'self-reference'));
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('self-ref.mdx');
    expect(errors[0]).toContain('self-reference');
    expect(errors[0]).toContain('self-ref');
  });

  test('still detects a duplicate id when one copy also has an unrelated schema error', () => {
    const { errors } = loadMethods(join(FIX, 'duplicate-id-broken'));
    expect(errors.length).toBe(2);
    expect(errors.some((e) => e.includes('duplicate of'))).toBe(true);
    expect(errors.some((e) => e.includes('kind'))).toBe(true);
  });
});
