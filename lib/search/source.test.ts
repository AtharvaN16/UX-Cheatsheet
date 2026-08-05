import { expect, test, describe } from 'bun:test';
import { createMethodSource, type MethodItem } from './source';
import type { ScorableMethod } from './score';

const items: MethodItem[] = [
  { id: 'tree-testing', label: 'Tree Testing', auxiliaryData: { category: 'ia-structure', kind: 'evaluative', group: '' } },
  { id: 'card-sorting', label: 'Card Sorting', auxiliaryData: { category: 'ia-structure', kind: 'generative', group: '' } },
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
});
