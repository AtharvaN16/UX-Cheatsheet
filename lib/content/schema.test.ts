import { expect, test, describe } from 'bun:test';
import { frontmatterSchema, REQUIRED_SECTIONS } from './schema';

const valid = {
  id: 'tree-testing',
  title: 'Tree Testing',
  domain: 'ia-structure',
  kind: 'method',
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
    expect(r.related).toEqual({ before: [], after: [], alongside: [] });
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

  test('rejects a non-kebab-case domain', () => {
    expect(() => frontmatterSchema.parse({ ...valid, domain: 'IA_Structure' })).toThrow();
  });

  test('rejects a non-kebab-case item in alsoIn', () => {
    expect(() => frontmatterSchema.parse({ ...valid, alsoIn: ['valid-item', 'Invalid_Item'] })).toThrow();
  });

  test('rejects a non-kebab-case method in useInstead', () => {
    const bad = { ...valid, useInstead: [{ when: 'No structure yet', method: 'Card_Sorting' }] };
    expect(() => frontmatterSchema.parse(bad)).toThrow();
  });

  test('rejects a non-kebab-case item in related.before', () => {
    const bad = { ...valid, related: { before: ['Invalid_Item'], after: [], alongside: [] } };
    expect(() => frontmatterSchema.parse(bad)).toThrow();
  });

  test('rejects a non-kebab-case item in related.after', () => {
    const bad = { ...valid, related: { before: [], after: ['Invalid_Item'], alongside: [] } };
    expect(() => frontmatterSchema.parse(bad)).toThrow();
  });

  test('rejects a non-kebab-case item in related.alongside', () => {
    const bad = { ...valid, related: { before: [], after: [], alongside: ['Invalid_Item'] } };
    expect(() => frontmatterSchema.parse(bad)).toThrow();
  });

  test('rejects an unknown gives value', () => {
    expect(() => frontmatterSchema.parse({ ...valid, gives: 'vibes' })).toThrow();
  });

  test('rejects an unknown effort value', () => {
    expect(() => frontmatterSchema.parse({ ...valid, effort: 'extreme' })).toThrow();
  });

  test('rejects an unknown timeframe value', () => {
    expect(() => frontmatterSchema.parse({ ...valid, timeframe: 'years' })).toThrow();
  });

  test('rejects an unknown source type', () => {
    const bad = { ...valid, sources: [{ ...valid.sources[0], type: 'podcast' }, valid.sources[1]] };
    expect(() => frontmatterSchema.parse(bad)).toThrow();
  });

  test('rejects sources[].year below 1900', () => {
    const bad = { ...valid, sources: [{ ...valid.sources[0], year: 1899 }, valid.sources[1]] };
    expect(() => frontmatterSchema.parse(bad)).toThrow();
  });

  test('rejects sources[].year above 2100', () => {
    const bad = { ...valid, sources: [{ ...valid.sources[0], year: 2101 }, valid.sources[1]] };
    expect(() => frontmatterSchema.parse(bad)).toThrow();
  });

  test('accepts sources[].year within valid range', () => {
    const good = { ...valid, sources: [{ ...valid.sources[0], year: 2024 }, valid.sources[1]] };
    const r = frontmatterSchema.parse(good);
    expect(r.sources[0].year).toBe(2024);
  });

  test('sources[].seminal explicitly set to true survives parsing', () => {
    const good = { ...valid, sources: [{ ...valid.sources[0], seminal: true }, valid.sources[1]] };
    const r = frontmatterSchema.parse(good);
    expect(r.sources[0].seminal).toBe(true);
  });
});

describe('imageSchema', () => {
  const localImage = {
    src: '/images/methods/tree-testing.png',
    alt: 'A tree-testing task list beside the navigation hierarchy under test',
  };

  test('the field is optional — every existing method stays valid without it', () => {
    const r = frontmatterSchema.parse(valid);
    expect(r.image).toBeUndefined();
  });

  test('accepts a local image with alt text', () => {
    const r = frontmatterSchema.parse({ ...valid, image: localImage });
    expect(r.image?.src).toBe('/images/methods/tree-testing.png');
  });

  test('accepts an optional caption', () => {
    const image = { ...localImage, caption: 'Findability scores per task' };
    const r = frontmatterSchema.parse({ ...valid, image });
    expect(r.image?.caption).toBe('Findability scores per task');
  });

  test('accepts a remote image when credited', () => {
    const image = {
      src: 'https://example.test/kano.png',
      alt: 'Kano curves plotting customer satisfaction against feature investment',
      credit: { title: 'Kano Model', url: 'https://example.test/paper' },
    };
    const r = frontmatterSchema.parse({ ...valid, image });
    expect(r.image?.credit?.title).toBe('Kano Model');
  });

  test('rejects a remote image with no credit', () => {
    const image = {
      src: 'https://example.test/kano.png',
      alt: 'Kano curves plotting customer satisfaction against feature investment',
    };
    expect(() => frontmatterSchema.parse({ ...valid, image })).toThrow();
  });

  test('rejects a local path outside /images/methods', () => {
    const image = { ...localImage, src: '/uploads/tree-testing.png' };
    expect(() => frontmatterSchema.parse({ ...valid, image })).toThrow();
  });

  test('rejects an unsupported file extension', () => {
    const image = { ...localImage, src: '/images/methods/tree-testing.gif' };
    expect(() => frontmatterSchema.parse({ ...valid, image })).toThrow();
  });

  test('rejects a non-kebab-case filename', () => {
    const image = { ...localImage, src: '/images/methods/Tree_Testing.png' };
    expect(() => frontmatterSchema.parse({ ...valid, image })).toThrow();
  });

  test('rejects a missing alt', () => {
    expect(() => frontmatterSchema.parse({ ...valid, image: { src: localImage.src } })).toThrow();
  });

  test('rejects placeholder alt text that is too short to describe anything', () => {
    const image = { ...localImage, alt: 'diagram' };
    expect(() => frontmatterSchema.parse({ ...valid, image })).toThrow();
  });

  test('rejects a malformed credit url', () => {
    const image = {
      src: 'https://example.test/kano.png',
      alt: 'Kano curves plotting customer satisfaction against feature investment',
      credit: { title: 'Kano Model', url: 'not-a-url' },
    };
    expect(() => frontmatterSchema.parse({ ...valid, image })).toThrow();
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
