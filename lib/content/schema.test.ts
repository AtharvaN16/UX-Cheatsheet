import { expect, test, describe } from 'bun:test';
import { frontmatterSchema, REQUIRED_SECTIONS } from './schema';

const valid = {
  id: 'tree-testing',
  title: 'Tree Testing',
  category: 'ia-structure',
  kind: 'evaluative',
  gives: 'quantitative',
  effort: 'low',
  timeframe: 'days',
  useInstead: [{ when: 'No structure yet', method: 'card-sorting' }],
  sources: [
    { title: 'A', author: 'B', url: 'https://a.test', type: 'article' },
    { title: 'C', author: 'D', url: 'https://c.test', type: 'book' },
  ],
};

describe('frontmatterSchema', () => {
  test('accepts a valid entry and defaults optional arrays', () => {
    const r = frontmatterSchema.parse(valid);
    expect(r.id).toBe('tree-testing');
    expect(r.aka).toEqual([]);
    expect(r.alsoIn).toEqual([]);
    expect(r.related.before).toEqual([]);
    expect(r.sources[0].seminal).toBe(false);
  });

  test('rejects a non-kebab-case id', () => {
    expect(() => frontmatterSchema.parse({ ...valid, id: 'Tree_Testing' })).toThrow();
  });

  test('rejects fewer than two sources', () => {
    expect(() =>
      frontmatterSchema.parse({ ...valid, sources: [valid.sources[0]] }),
    ).toThrow();
  });

  test('rejects an empty useInstead', () => {
    expect(() => frontmatterSchema.parse({ ...valid, useInstead: [] })).toThrow();
  });

  test('rejects an unknown kind', () => {
    expect(() => frontmatterSchema.parse({ ...valid, kind: 'vibes' })).toThrow();
  });

  test('rejects a malformed source url', () => {
    const bad = { ...valid, sources: [{ ...valid.sources[0], url: 'not-a-url' }, valid.sources[1]] };
    expect(() => frontmatterSchema.parse(bad)).toThrow();
  });
});

describe('REQUIRED_SECTIONS', () => {
  test('is the seven spec sections in order', () => {
    expect([...REQUIRED_SECTIONS]).toEqual([
      'What is it',
      'Purpose',
      'When to use',
      'How to do it',
      'Common mistakes',
      'Tips',
      'Using AI',
    ]);
  });
});
