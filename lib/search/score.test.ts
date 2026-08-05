import { expect, test, describe } from 'bun:test';
import { scoreMethods, type ScorableMethod } from './score';

const methods: ScorableMethod[] = [
  {
    id: 'tree-testing',
    title: 'Tree Testing',
    aka: ['reverse card sorting'],
    whenToUse: 'You want to know whether people find things in an existing navigation',
    rest: 'Participants click through a text-only tree.',
  },
  {
    id: 'card-sorting',
    title: 'Card Sorting',
    aka: [],
    whenToUse: 'You are building a structure and need to know how people group things',
    rest: 'Participants group content into piles.',
  },
  {
    id: 'usability-testing',
    title: 'Usability Testing',
    aka: [],
    whenToUse: 'You need to know why people fail a task',
    rest: 'Watch someone attempt a task and narrate.',
  },
];

describe('scoreMethods', () => {
  test('ranks an exact title match first', () => {
    const r = scoreMethods('tree testing', methods);
    expect(r[0].id).toBe('tree-testing');
    expect(r[0].matchedOn).toBe('title');
  });

  test('matches on an alias', () => {
    const r = scoreMethods('reverse card sorting', methods);
    expect(r[0].id).toBe('tree-testing');
  });

  test('matches situationally on "when to use" text', () => {
    const r = scoreMethods('people find things', methods);
    expect(r[0].id).toBe('tree-testing');
    expect(r[0].matchedOn).toBe('whenToUse');
  });

  test('title match outranks a whenToUse match for the same query', () => {
    const scoped: ScorableMethod[] = [
      { id: 'a', title: 'Some Method With Widgets', aka: [], whenToUse: 'irrelevant', rest: '' },
      { id: 'b', title: 'Other Method', aka: [], whenToUse: 'You need widgets to succeed', rest: '' },
    ];
    const r = scoreMethods('widgets', scoped);
    expect(r[0].id).toBe('a');
    expect(r[0].matchedOn).toBe('title');
    expect(r.find((x) => x.id === 'b')!.score).toBeLessThan(r[0].score);
  });

  test('falls back to body text with the lowest weight', () => {
    const r = scoreMethods('piles', methods);
    expect(r[0].id).toBe('card-sorting');
    expect(r[0].matchedOn).toBe('body');
  });

  test('returns empty for a query that matches nothing', () => {
    expect(scoreMethods('quantum tunnelling', methods)).toEqual([]);
  });

  test('returns empty for a blank query', () => {
    expect(scoreMethods('   ', methods)).toEqual([]);
  });

  test('is case and punctuation insensitive', () => {
    const r = scoreMethods('TREE-TESTING!', methods);
    expect(r[0].id).toBe('tree-testing');
  });
});
