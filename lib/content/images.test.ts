import { expect, test, describe } from 'bun:test';
import { join } from 'node:path';
import { loadMethods } from './load';
import { checkImageFiles } from './images';

const FIX = join(import.meta.dir, 'fixtures');
const PUB = join(FIX, 'image-public');

describe('checkImageFiles', () => {
  test('passes a local image whose file exists', () => {
    const { methods, errors } = loadMethods(join(FIX, 'image-ok'));
    expect(errors).toEqual([]);
    expect(checkImageFiles(methods, PUB)).toEqual([]);
    const tree = methods.find((m) => m.id === 'tree-testing')!;
    expect(tree.image?.src).toBe('/images/methods/tree-testing.png');
    expect(tree.image?.caption).toBe('Findability scores per task');
  });

  test('reports a local image whose file is absent', () => {
    const { methods } = loadMethods(join(FIX, 'image-missing'));
    const errs = checkImageFiles(methods, PUB);
    expect(errs.length).toBe(1);
    expect(errs[0]).toContain('tree-testing.mdx');
    expect(errs[0]).toContain('image.src');
    expect(errs[0]).toContain('does-not-exist.png');
  });

  test('skips the existence check for a remote image', () => {
    const { methods, errors } = loadMethods(join(FIX, 'image-remote'));
    expect(errors).toEqual([]);
    expect(checkImageFiles(methods, PUB)).toEqual([]);
    expect(methods.find((m) => m.id === 'tree-testing')!.image?.credit?.title).toBe('Tree Testing');
  });

  test('methods with no image pass and expose undefined', () => {
    const { methods, errors } = loadMethods(join(FIX, 'valid'));
    expect(errors).toEqual([]);
    expect(methods.every((m) => m.image === undefined)).toBe(true);
    expect(checkImageFiles(methods, PUB)).toEqual([]);
  });

  test('loadMethods itself does not touch the filesystem for images', () => {
    // A missing asset is not a *content* error — the loader stays pure so it
    // can be imported by Server Components without pulling public/ into the
    // server bundle. See lib/content/images.ts.
    const { errors } = loadMethods(join(FIX, 'image-missing'));
    expect(errors).toEqual([]);
  });
});
