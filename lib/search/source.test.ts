import { expect, test, describe } from 'bun:test';
import { createMethodSource, type MethodItem } from './source';
import type { ScorableMethod } from './score';

const items: MethodItem[] = [
  { id: 'tree-testing', label: 'Tree Testing', auxiliaryData: { category: 'ia-structure', kind: 'method', group: '' } },
  { id: 'card-sorting', label: 'Card Sorting', auxiliaryData: { category: 'ia-structure', kind: 'method', group: '' } },
];

const scorables: ScorableMethod[] = [
  { id: 'tree-testing', title: 'Tree Testing', aka: [], whenToUse: 'people find things in navigation', rest: '' },
  { id: 'card-sorting', title: 'Card Sorting', aka: [], whenToUse: 'building a structure', rest: '' },
];

describe('createMethodSource', () => {
  test('search returns items ranked by the scorer', async () => {
    const src = createMethodSource(items, scorables);
    const r = await src.search('tree testing');
    expect(r[0].id).toBe('tree-testing');
  });

  test('tags title matches with the METHODS group', async () => {
    const src = createMethodSource(items, scorables);
    const r = await src.search('tree testing');
    expect(r[0].auxiliaryData.group).toBe('METHODS');
  });

  test('tags situational matches with the WHEN TO USE group', async () => {
    const src = createMethodSource(items, scorables);
    const r = await src.search('people find things');
    expect(r[0].id).toBe('tree-testing');
    expect(r[0].auxiliaryData.group).toBe('MATCHED ON WHEN TO USE');
  });

  test('bootstrap returns an empty list when there is no history', async () => {
    const src = createMethodSource(items, scorables);
    expect(await src.bootstrap()).toEqual([]);
  });

  test('search silently drops scorable ids with no matching item, without crashing', async () => {
    const partialItems: MethodItem[] = [
      { id: 'tree-testing', label: 'Tree Testing', auxiliaryData: { category: 'ia-structure', kind: 'method', group: '' } },
    ];
    const bothScorables: ScorableMethod[] = [
      ...scorables,
      { id: 'no-item-for-this-id', title: 'Ghost Method', aka: [], whenToUse: '', rest: '' },
    ];
    const src = createMethodSource(partialItems, bothScorables);
    const r = await src.search('tree testing card sorting ghost method');
    expect(r.map((x) => x.id)).toEqual(['tree-testing']);
  });

  test('bootstrap silently drops recent ids with no matching item, without crashing', async () => {
    const src = createMethodSource(items, scorables, ['does-not-exist', 'tree-testing']);
    const r = await src.bootstrap();
    expect(r.map((x) => x.id)).toEqual(['tree-testing']);
  });

  test('bootstrap dedupes a recent id repeated in the history list', async () => {
    const src = createMethodSource(items, scorables, ['tree-testing', 'tree-testing', 'tree-testing']);
    const r = await src.bootstrap();
    expect(r.map((x) => x.id)).toEqual(['tree-testing']);
  });

  test('search on empty items/scorables returns [] without crashing', async () => {
    const src = createMethodSource([], []);
    expect(await src.search('anything')).toEqual([]);
  });

  test('bootstrap on empty items/scorables returns [] without crashing', async () => {
    const src = createMethodSource([], [], ['tree-testing']);
    expect(await src.bootstrap()).toEqual([]);
  });

  test('search does not mutate the caller-supplied items array', async () => {
    const src = createMethodSource(items, scorables);
    await src.search('tree testing');
    expect(items[0].auxiliaryData.group).toBe('');
    expect(items[1].auxiliaryData.group).toBe('');
  });
});
