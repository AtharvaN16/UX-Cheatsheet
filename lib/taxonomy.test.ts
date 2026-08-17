import { expect, test, describe } from 'bun:test';
import { getTaxonomyEntryCount, getTaxonomyForDomain } from './taxonomy';

describe('getTaxonomyEntryCount', () => {
  test('sums items across every group in a multi-group domain', () => {
    const tax = getTaxonomyForDomain('evaluation');
    const expected = tax!.groups.reduce((sum: number, g) => sum + g.items.length, 0);
    expect(getTaxonomyEntryCount('evaluation')).toBe(expected);
    expect(getTaxonomyEntryCount('evaluation')).toBe(14);
  });

  test('sums items across a domain with multiple named subgroups', () => {
    // ux-psychology has two groups: Human Behavior + Motivation Models
    expect(getTaxonomyEntryCount('ux-psychology')).toBe(40);
  });

  test('returns 0 for an unknown domain id', () => {
    expect(getTaxonomyEntryCount('not-a-real-domain')).toBe(0);
  });
});
