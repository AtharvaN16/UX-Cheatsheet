// lib/authoring/validate.test.ts
import { expect, test, describe } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateMethodText } from './validate';
import { patchSection } from '../content/patch';

const REAL = readFileSync(
  join(import.meta.dir, '../content/fixtures/valid/ia-structure/card-sorting.mdx'),
  'utf8',
);

describe('validateMethodText', () => {
  test('accepts a known-good file', () => {
    expect(validateMethodText(REAL, 'card-sorting.mdx')).toEqual([]);
  });

  test('accepts a valid section edit', () => {
    const edited = patchSection(REAL, 'Purpose', 'A completely rewritten purpose.');
    expect(validateMethodText(edited, 'card-sorting.mdx')).toEqual([]);
  });

  test('reports a missing required section', () => {
    const gutted = REAL.replace('## Common mistakes', '## Renamed Heading');
    const errors = validateMethodText(gutted, 'card-sorting.mdx');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('card-sorting.mdx');
    expect(errors[0]).toContain('Common mistakes');
  });

  test('reports a duplicate heading', () => {
    const doubled = `${REAL}\n## Tips\nA second tips section.\n`;
    const errors = validateMethodText(doubled, 'card-sorting.mdx');
    expect(errors.some((e) => e.includes('duplicate'))).toBe(true);
  });

  test('reports an invalid enum value in frontmatter', () => {
    const bad = REAL.replace('effort: medium', 'effort: enormous');
    const errors = validateMethodText(bad, 'card-sorting.mdx');
    expect(errors.some((e) => e.includes('effort'))).toBe(true);
  });
});
