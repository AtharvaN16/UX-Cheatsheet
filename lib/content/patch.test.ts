import { expect, test, describe } from 'bun:test';
import { patchSection } from './patch';

const FILE = [
  '---',
  'id: tree-testing',
  'title: Tree Testing',
  '---',
  '',
  '## What is it',
  'Old first body.',
  '',
  '## How to do it',
  '- step one',
  '',
  '## Tips',
  'Old last body.',
  '',
].join('\n');

describe('patchSection', () => {
  test('replaces a middle section without touching its neighbours', () => {
    const out = patchSection(FILE, 'How to do it', '- brand new step');
    expect(out).toContain('## What is it\nOld first body.');
    expect(out).toContain('## How to do it\n- brand new step');
    expect(out).toContain('## Tips\nOld last body.');
    expect(out).not.toContain('- step one');
  });

  test('replaces the last section and keeps the trailing newline', () => {
    const out = patchSection(FILE, 'Tips', 'Brand new tips.');
    expect(out.endsWith('Brand new tips.\n')).toBe(true);
    expect(out).toContain('## How to do it\n- step one');
  });

  test('leaves frontmatter completely untouched', () => {
    const out = patchSection(FILE, 'What is it', 'New.');
    expect(out.startsWith('---\nid: tree-testing\ntitle: Tree Testing\n---\n')).toBe(true);
  });

  // Review Focus 3
  test('does not split on a ## inside a fenced code block', () => {
    const fenced = [
      '## What is it',
      'Intro.',
      '```md',
      '## Not A Heading',
      '```',
      'Still the same section.',
      '',
      '## Tips',
      'Tips body.',
      '',
    ].join('\n');
    const out = patchSection(fenced, 'What is it', 'Replaced.');
    expect(out).toBe(['## What is it', 'Replaced.', '', '## Tips', 'Tips body.', ''].join('\n'));
    expect(out).not.toContain('Not A Heading');
  });

  // Every section in content/ separates its heading from its body with a blank
  // line. Losing it would reformat the file on every edit.
  test('preserves the blank line after a heading when the section had one', () => {
    const spaced = [
      '## What is it',
      '',
      'Old body.',
      '',
      '## Tips',
      '',
      'Old tips.',
      '',
    ].join('\n');
    expect(patchSection(spaced, 'What is it', 'New body.')).toBe(
      ['## What is it', '', 'New body.', '', '## Tips', '', 'Old tips.', ''].join('\n'),
    );
    expect(patchSection(spaced, 'Tips', 'New tips.')).toBe(
      ['## What is it', '', 'Old body.', '', '## Tips', '', 'New tips.', ''].join('\n'),
    );
  });

  test('does not invent a blank line for a section that had none', () => {
    expect(patchSection(FILE, 'How to do it', '- only step')).toContain(
      '## How to do it\n- only step',
    );
  });

  // Reproduced end-to-end before this guard existed: an unclosed fence hid the
  // following headings from the scanner, then the NEXT save to the same section
  // concluded it was the last one and rewrote everything to EOF, deleting
  // `## Using AI`. Both saves returned 200 and `bun run validate` stayed green.
  test('refuses markdown containing an unclosed code fence', () => {
    expect(() => patchSection(FILE, 'How to do it', 'Intro.\n\n```\nnever closed')).toThrow(
      'unclosed code fence',
    );
  });

  test('accepts a properly closed fence', () => {
    const out = patchSection(FILE, 'How to do it', 'Intro.\n\n```\nclosed\n```');
    expect(out).toContain('```\nclosed\n```');
  });

  test('refuses a body that would inject a new top-level heading', () => {
    expect(() => patchSection(FILE, 'How to do it', 'Text.\n\n## Injected\n\nmore')).toThrow(
      'would restructure the card',
    );
  });

  test('a normal edit leaves the heading list identical', () => {
    const headings = (t: string) => t.match(/^## .+$/gm) ?? [];
    const out = patchSection(FILE, 'How to do it', 'Completely different steps.');
    expect(headings(out)).toEqual(headings(FILE));
  });

  test('throws a named error for a heading that does not exist', () => {
    expect(() => patchSection(FILE, 'Nonexistent', 'x')).toThrow('unknown section "Nonexistent"');
  });
});

import { patchFrontmatterScalar } from './patch';

const FM = [
  '---',
  'id: tree-testing',
  'kind: method',
  'effort: medium',
  'timeframe: days',
  '---',
  '',
  '## How to do it',
  'Write the line `kind: method` in your notes.',
  'effort: high',
  '',
].join('\n');

describe('patchFrontmatterScalar', () => {
  test('replaces the named field', () => {
    const out = patchFrontmatterScalar(FM, 'effort', 'high');
    expect(out).toContain('\neffort: high\n');
    expect(out).toContain('kind: method');
  });

  // Review Focus 2
  test('only touches the frontmatter block, never the body', () => {
    const out = patchFrontmatterScalar(FM, 'effort', 'low');
    const [, frontmatter, body] = out.split('---\n');
    expect(frontmatter).toContain('effort: low');
    expect(body).toContain('effort: high');
    expect(body).toContain('Write the line `kind: method` in your notes.');
  });

  test('changes exactly one line', () => {
    const before = FM.split('\n');
    const after = patchFrontmatterScalar(FM, 'kind', 'concept').split('\n');
    const differing = after.filter((l, i) => l !== before[i]);
    expect(differing).toEqual(['kind: concept']);
  });

  test('throws for a field that is not present', () => {
    expect(() => patchFrontmatterScalar(FM, 'gives', 'mixed'))
      .toThrow('unknown frontmatter field "gives"');
  });

  test('throws when there is no frontmatter block', () => {
    expect(() => patchFrontmatterScalar('## Only a body\n', 'kind', 'method'))
      .toThrow('no frontmatter block');
  });

  // Task 14 replaces an image by patching the nested `  src:` line under
  // `image:`. The field name carries its own indentation, so that has to work.
  test('patches an indented nested key by its exact indented name', () => {
    const withImage = [
      '---',
      'id: kano-model',
      'image:',
      '  src: /images/methods/old.svg',
      '  alt: A description that is comfortably over twenty characters long',
      '---',
      '',
      '## What is it',
      'Body.',
      '',
    ].join('\n');
    const out = patchFrontmatterScalar(withImage, '  src', '/images/methods/new.png');
    expect(out).toContain('  src: /images/methods/new.png');
    expect(out).toContain('  alt: A description that is comfortably over twenty characters long');
  });

  test('throws for a nested key that is absent, so a card with no image is reported', () => {
    expect(() => patchFrontmatterScalar(FM, '  src', '/images/methods/x.png'))
      .toThrow('unknown frontmatter field "  src"');
  });
});

import { insertImageBlock, hasImageBlock } from './patch';
import { validateMethodText } from '../authoring/validate';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REAL_NO_IMAGE = readFileSync(
  join(import.meta.dir, '../../content/methods/ia-structure/tree-testing.mdx'),
  'utf8',
);

describe('insertImageBlock', () => {
  test('adds the block at the end of the frontmatter, matching the two-space style', () => {
    const out = insertImageBlock(FM, '/images/methods/tree-testing.svg');
    expect(out.split('\n').slice(0, 8)).toEqual([
      '---',
      'id: tree-testing',
      'kind: method',
      'effort: medium',
      'timeframe: days',
      'image:',
      '  src: /images/methods/tree-testing.svg',
      '---',
    ]);
  });

  test('leaves the body untouched', () => {
    const out = insertImageBlock(FM, '/images/methods/tree-testing.svg');
    expect(out).toContain('Write the line `kind: method` in your notes.');
    expect(out.split('\n').length).toBe(FM.split('\n').length + 2);
  });

  test('the result still parses and passes validateMethodText', () => {
    const out = insertImageBlock(REAL_NO_IMAGE, '/images/methods/tree-testing.svg');
    expect(out).toContain('image:\n  src: /images/methods/tree-testing.svg\n---');
    expect(validateMethodText(out, 'tree-testing.mdx')).toEqual([]);
  });

  // The src it writes has to be reachable by the replacer, or the first edit
  // would create a block that the second could never update.
  test('the block it writes can then be re-pointed by patchFrontmatterScalar', () => {
    const once = insertImageBlock(REAL_NO_IMAGE, '/images/methods/tree-testing.svg');
    const twice = patchFrontmatterScalar(once, '  src', '/images/methods/tree-testing.png');
    expect(twice).toContain('  src: /images/methods/tree-testing.png');
    expect(validateMethodText(twice, 'tree-testing.mdx')).toEqual([]);
  });

  test('throws when the card already has an image block', () => {
    const once = insertImageBlock(FM, '/images/methods/a.svg');
    expect(() => insertImageBlock(once, '/images/methods/b.svg')).toThrow(
      'already has an image block',
    );
  });

  test('throws when there is no frontmatter block', () => {
    expect(() => insertImageBlock('## Only a body\n', '/images/methods/a.svg')).toThrow(
      'no frontmatter block',
    );
    expect(() => insertImageBlock('---\nid: x\n', '/images/methods/a.svg')).toThrow(
      'no frontmatter block',
    );
  });

  test('an `image:` word in the body is not mistaken for a block', () => {
    const body = ['---', 'id: x', '---', '', '## Tips', 'image: not frontmatter', ''].join('\n');
    expect(hasImageBlock(body)).toBe(false);
    expect(insertImageBlock(body, '/images/methods/a.svg')).toContain('image:\n  src:');
  });
});
