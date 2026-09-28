import { expect, test, describe } from 'bun:test';
import { computeCoverage, domainCoverage } from './coverage';
import { TAXONOMY } from './taxonomy';
import { DOMAINS } from './domains';

const allTaxonomyIds = () => {
  const s = new Set<string>();
  for (const d of TAXONOMY) for (const g of d.groups) for (const i of g.items) s.add(i.id);
  return s;
};

describe('computeCoverage', () => {
  test('reports zero written for an empty id set', () => {
    const c = computeCoverage([]);
    expect(c.written).toBe(0);
    expect(c.planned).toBeGreaterThan(300);
    expect(c.domains.every((d) => d.written === 0)).toBe(true);
  });

  test('reports full coverage when every taxonomy id has a card', () => {
    const c = computeCoverage(allTaxonomyIds());
    expect(c.written).toBe(c.planned);
    expect(c.domains.every((d) => d.written === d.planned)).toBe(true);
  });

  test('totals dedupe ids listed in more than one domain', () => {
    const c = computeCoverage(allTaxonomyIds());
    const summed = c.domains.reduce((a, d) => a + d.planned, 0);
    // 337 per-domain slots vs 324 distinct entries — shared ids counted once here.
    expect(c.planned).toBeLessThan(summed);
  });

  test('ignores written ids that are not in the taxonomy', () => {
    const c = computeCoverage(['not-a-real-method', 'also-not-real']);
    expect(c.written).toBe(0);
  });

  test('one domain emits one row per declared domain, in order', () => {
    const c = computeCoverage([]);
    expect(c.domains.map((d) => d.domainId)).toEqual(DOMAINS.map((d) => d.id));
  });

  test('counts a single written id against its domain only', () => {
    const c = computeCoverage(['card-sorting']);
    const ia = c.domains.find((d) => d.domainId === 'ia-structure')!;
    expect(ia.written).toBe(1);
    expect(c.written).toBe(1);
  });
});

describe('domainCoverage', () => {
  test('returns the row for a known domain', () => {
    const d = domainCoverage('ia-structure', ['card-sorting', 'tree-testing']);
    expect(d?.written).toBe(2);
    expect(d?.planned).toBe(10);
  });

  test('returns undefined for an unknown domain', () => {
    expect(domainCoverage('not-a-domain', [])).toBeUndefined();
  });
});
