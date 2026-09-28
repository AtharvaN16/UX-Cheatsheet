import { expect, test, describe } from 'bun:test';
import { join } from 'node:path';
import { loadMethods } from './load';
import { checkUseCases } from './vocab';
import { USE_CASES } from '../useCases';
import type { Method } from './load';

const FIX = join(import.meta.dir, 'fixtures');

function withUseCases(ids: string[]): Method[] {
  const { methods } = loadMethods(join(FIX, 'valid'));
  return [{ ...methods[0], useCases: ids }];
}

describe('checkUseCases', () => {
  test('passes ids that exist in the vocabulary', () => {
    expect(checkUseCases(withUseCases([USE_CASES[0].id]))).toEqual([]);
  });

  test('passes a method with no useCases', () => {
    expect(checkUseCases(withUseCases([]))).toEqual([]);
  });

  test('reports a well-formed id that is not in the vocabulary', () => {
    const errs = checkUseCases(withUseCases(['improve-navigation']));
    expect(errs.length).toBe(1);
    expect(errs[0]).toContain('improve-navigation');
    expect(errs[0]).toContain('lib/useCases.ts');
  });

  test('reports every unknown id, not just the first', () => {
    expect(checkUseCases(withUseCases(['not-real-one', 'not-real-two'])).length).toBe(2);
  });

  test('the real content set has no unknown useCases', () => {
    const { methods } = loadMethods(join(import.meta.dir, '..', '..', 'content', 'methods'));
    expect(checkUseCases(methods)).toEqual([]);
  });
});
