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
