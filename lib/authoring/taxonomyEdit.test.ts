import { expect, test, describe } from 'bun:test';
import { toId, insertTaxonomyItem } from './taxonomyEdit';

const JSON_IN = JSON.stringify(
  [
    {
      domainId: 'ia-structure',
      groups: [
        { title: 'Research & Testing', items: [{ id: 'tree-testing', title: 'Tree Testing' }] },
      ],
    },
  ],
  null,
  2,
);

describe('toId', () => {
  test('kebab-cases a normal title', () => {
    expect(toId('Card Sorting Lite')).toBe('card-sorting-lite');
  });

  test('strips punctuation and collapses separators', () => {
    expect(toId("Miller's Law")).toBe('millers-law');
    expect(toId('Jobs   to  be Done')).toBe('jobs-to-be-done');
    expect(toId('A/B Testing')).toBe('a-b-testing');
  });

  test('folds accents to their base letter rather than deleting them', () => {
    expect(toId('Émpathy Mapping')).toBe('empathy-mapping');
    expect(toId('Ünïcödé Ideas')).toBe('unicode-ideas');
  });

  test('still rejects a title with nothing id-able in it', () => {
    expect(toId('???')).toBe('');
    expect(toId('   ')).toBe('');
  });
});

describe('insertTaxonomyItem', () => {
  test('adds the entry to the named group with its kind', () => {
    const out = JSON.parse(
      insertTaxonomyItem(JSON_IN, {
        title: 'Card Sorting Lite',
        kind: 'method',
        domainId: 'ia-structure',
        groupTitle: 'Research & Testing',
      }),
    );
    expect(out[0].groups[0].items).toEqual([
      { id: 'tree-testing', title: 'Tree Testing' },
      { id: 'card-sorting-lite', title: 'Card Sorting Lite', kind: 'method' },
    ]);
  });

  test('produces valid, re-parseable, newline-terminated JSON', () => {
    const out = insertTaxonomyItem(JSON_IN, {
      title: 'New Thing',
      kind: 'concept',
      domainId: 'ia-structure',
      groupTitle: 'Research & Testing',
    });
    expect(out.endsWith('\n')).toBe(true);
    expect(() => JSON.parse(out)).not.toThrow();
  });

  test('rejects a duplicate id', () => {
    expect(() =>
      insertTaxonomyItem(JSON_IN, {
        title: 'Tree Testing',
        kind: 'method',
        domainId: 'ia-structure',
        groupTitle: 'Research & Testing',
      }),
    ).toThrow('id "tree-testing" already exists');
  });

  // Review Focus 1
  test.each([['???'], ['   '], ['---'], ['']])('rejects the untitled input %p', (title) => {
    expect(() =>
      insertTaxonomyItem(JSON_IN, {
        title,
        kind: 'method',
        domainId: 'ia-structure',
        groupTitle: 'Research & Testing',
      }),
    ).toThrow('title must contain at least one letter or number');
  });

  test('rejects an unknown domain', () => {
    expect(() =>
      insertTaxonomyItem(JSON_IN, {
        title: 'X',
        kind: 'method',
        domainId: 'nope',
        groupTitle: 'Research & Testing',
      }),
    ).toThrow('unknown domain "nope"');
  });

  test('rejects an unknown group', () => {
    expect(() =>
      insertTaxonomyItem(JSON_IN, {
        title: 'X',
        kind: 'method',
        domainId: 'ia-structure',
        groupTitle: 'Nope',
      }),
    ).toThrow('unknown group "Nope"');
  });
});
