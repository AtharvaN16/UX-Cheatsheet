import { expect, test, describe } from 'bun:test';
import { imageTargetFor } from './imageName';

describe('imageTargetFor', () => {
  test('names the file after the method, not the upload', () => {
    expect(imageTargetFor('tree-testing', 'Screenshot 2026.svg')).toEqual({
      rel: 'public/images/methods/tree-testing.svg',
      src: '/images/methods/tree-testing.svg',
    });
  });

  // Review Focus 4
  test('lower-cases the extension so it matches the schema regex', () => {
    expect(imageTargetFor('tree-testing', 'DIAGRAM.PNG').src).toBe('/images/methods/tree-testing.png');
  });

  test('uses only the final extension of a double-extension upload', () => {
    expect(imageTargetFor('tree-testing', 'evil.svg.png').src).toBe('/images/methods/tree-testing.png');
  });

  test.each([['x.gif'], ['x.pdf'], ['x'], ['x.']])('rejects %p', (name) => {
    expect(() => imageTargetFor('tree-testing', name)).toThrow('unsupported image type');
  });
});
