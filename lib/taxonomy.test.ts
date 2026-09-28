import { expect, test, describe } from 'bun:test';
import { getTaxonomyEntryCount, getTaxonomyForDomain } from './taxonomy';

// lib/taxonomy.json is no longer a static file: the add-card feature writes to
// it at runtime. So nothing here may assert an exact entry count or a whole-file
// equality -- adding one card through the app would turn the suite red and the
// obvious "fix" (regenerating the snapshot) would quietly destroy the migration
// guarantee. Every assertion below is written to survive growth.
describe('getTaxonomyEntryCount', () => {
  test('sums items across every group in a multi-group domain', () => {
    const tax = getTaxonomyForDomain('evaluation');
    const expected = tax!.groups.reduce((sum: number, g) => sum + g.items.length, 0);
    expect(getTaxonomyEntryCount('evaluation')).toBe(expected);
    expect(getTaxonomyEntryCount('evaluation')).toBeGreaterThan(0);
  });

  test('sums items across a domain with multiple named subgroups', () => {
    const tax = getTaxonomyForDomain('ux-psychology');
    expect(tax!.groups.length).toBeGreaterThan(1);
    const expected = tax!.groups.reduce((sum: number, g) => sum + g.items.length, 0);
    expect(getTaxonomyEntryCount('ux-psychology')).toBe(expected);
  });

  test('returns 0 for an unknown domain id', () => {
    expect(getTaxonomyEntryCount('not-a-real-domain')).toBe(0);
  });
});

import snapshot from './taxonomy.snapshot.json';
import { TAXONOMY } from './taxonomy';

describe('taxonomy JSON migration', () => {
  // The snapshot is the pre-migration TypeScript literal, frozen. Its job is to
  // prove the move to JSON lost nothing -- NOT to pin the file's current
  // contents, which the app now appends to. So: every entry that existed before
  // the migration must still exist, in the same domain and group, with the same
  // title. Additions are allowed; losses and mutations are not.
  test('the migration lost nothing: every pre-migration entry survives intact', () => {
    const live = new Map<string, string>();
    for (const domain of TAXONOMY) {
      for (const group of domain.groups) {
        for (const item of group.items) {
          live.set(`${domain.domainId}|${group.title}|${item.id}`, item.title);
        }
      }
    }

    const missing: string[] = [];
    const renamed: string[] = [];
    for (const domain of snapshot) {
      for (const group of domain.groups) {
        for (const item of group.items) {
          const key = `${domain.domainId}|${group.title}|${item.id}`;
          if (!live.has(key)) missing.push(key);
          else if (live.get(key) !== item.title) renamed.push(key);
        }
      }
    }

    expect(missing).toEqual([]);
    expect(renamed).toEqual([]);
  });

  test('the snapshot is not empty, so the check above cannot pass vacuously', () => {
    const count = snapshot.reduce(
      (n, d) => n + d.groups.reduce((m, g) => m + g.items.length, 0),
      0,
    );
    expect(count).toBeGreaterThan(300);
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
