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

import snapshot from './taxonomy.snapshot.json';
import { TAXONOMY } from './taxonomy';

describe('taxonomy JSON migration', () => {
  test('TAXONOMY is unchanged by the move to JSON', () => {
    expect(JSON.parse(JSON.stringify(TAXONOMY))).toEqual(snapshot);
  });

  // DEVIATION FROM PLAN: the plan asserted global id uniqueness, but 13 ids are
  // deliberately cross-listed in two domains (e.g. `tree-testing` under both
  // ia-structure and evaluation, the whole strategic-thinking/Behavioral Strategy
  // group mirroring ux-psychology). Each still has exactly one written .mdx, so
  // the invariant that actually holds -- and the one that protects
  // insertTaxonomyItem -- is that a repeated id is the same card surfaced twice,
  // never two different entries colliding.
  test('an id is never listed twice within one domain', () => {
    for (const domain of TAXONOMY) {
      const ids = domain.groups.flatMap((g) => g.items.map((i) => i.id));
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  test('a cross-listed id always carries the same title', () => {
    const titlesById = new Map<string, Set<string>>();
    for (const domain of TAXONOMY) {
      for (const group of domain.groups) {
        for (const item of group.items) {
          const titles = titlesById.get(item.id) ?? new Set<string>();
          titles.add(item.title);
          titlesById.set(item.id, titles);
        }
      }
    }
    const conflicting = [...titlesById].filter(([, titles]) => titles.size > 1).map(([id]) => id);
    expect(conflicting).toEqual([]);
  });
});

import { resolveKind } from './taxonomy';

describe('resolveKind', () => {
  test('an explicit item kind wins over the heuristic', () => {
    // inferKind would call this a concept, because the title contains "law"
    expect(resolveKind({ id: 'moores-law', title: "Moore's Law", kind: 'method' }, 'evaluation'))
      .toBe('method');
  });

  test('falls back to the heuristic when no kind is set', () => {
    expect(resolveKind({ id: 'moores-law', title: "Moore's Law" }, 'evaluation'))
      .toBe('concept');
  });

  test('a written method kind wins over both', () => {
    expect(resolveKind({ id: 'moores-law', title: "Moore's Law", kind: 'method' }, 'evaluation', 'framework'))
      .toBe('framework');
  });
});
