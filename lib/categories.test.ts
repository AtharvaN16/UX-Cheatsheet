import { expect, test, describe } from 'bun:test';
import { getCategoryGroup, CATEGORY_GROUPS } from './categories';

describe('getCategoryGroup', () => {
  test('finds the group containing a given category id', () => {
    const group = getCategoryGroup('quantitative-research');
    expect(group?.title).toBe('Research');
  });

  test('returns undefined for an unknown category id', () => {
    expect(getCategoryGroup('not-a-real-category')).toBeUndefined();
  });

  test('every category in CATEGORY_GROUPS resolves back to its own group', () => {
    for (const group of CATEGORY_GROUPS) {
      for (const id of group.categoryIds) {
        expect(getCategoryGroup(id)?.title).toBe(group.title);
      }
    }
  });
});
