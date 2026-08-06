import { expect, test, describe } from 'bun:test';
import { join } from 'node:path';
import { getAllMethods } from './index';

const FIXTURES = join(__dirname, 'fixtures');

describe('getAllMethods', () => {
  test('throws on invalid content, naming the file and field', () => {
    let error: Error | undefined;
    try {
      getAllMethods(join(FIXTURES, 'broken-ref'));
    } catch (e) {
      error = e as Error;
    }
    expect(error).toBeDefined();
    expect(error!.message).toContain('tree-testing.mdx');
    expect(error!.message).toContain('useInstead.0.method');
  });

  test('caches successful loads: repeated calls return the identical array reference', () => {
    const dir = join(FIXTURES, 'valid');
    const a = getAllMethods(dir);
    const b = getAllMethods(dir);
    expect(a).toBe(b);
  });

  test('caches per directory: loading a different directory in between does not evict the first', () => {
    const dirA = join(FIXTURES, 'valid');
    const dirB = join(FIXTURES, 'forward-ref');
    const first = getAllMethods(dirA);
    getAllMethods(dirB);
    const third = getAllMethods(dirA);
    expect(third).toBe(first);
  });
});
