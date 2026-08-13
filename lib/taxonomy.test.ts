import { expect, test, describe } from 'bun:test';
import { getTaxonomyEntryCount, getTaxonomyForCategory } from './taxonomy';

describe('getTaxonomyEntryCount', () => {
  test('sums items across every group in a multi-group category', () => {
    const tax = getTaxonomyForCategory('evaluation');
    const expected = tax!.groups.reduce((sum, g) => sum + g.items.length, 0);
    expect(getTaxonomyEntryCount('evaluation')).toBe(expected);
    expect(getTaxonomyEntryCount('evaluation')).toBe(12);
  });

  test('sums items across a category with multiple named subgroups', () => {
    // ux-psychology has two groups: Human Behavior (34) + Motivation Models (5)
    expect(getTaxonomyEntryCount('ux-psychology')).toBe(39);
  });

  test('returns 0 for an unknown category id', () => {
    expect(getTaxonomyEntryCount('not-a-real-category')).toBe(0);
  });
});
