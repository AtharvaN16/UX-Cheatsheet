import { expect, test, describe } from 'bun:test';
import { parseSections, missingSections, duplicateSections } from './sections';
import { REQUIRED_SECTIONS } from './schema';

const body = `
## What is it
A guided conversation.

## Purpose
To learn why.

## When to use
- You need depth

## How to do it
1. Write a guide

## Common mistakes
- **Leading questions** — ask about the past

## Tips
Record everything.

## Using AI
**Where it helps**
- Transcription

**Where it fails**
- Synthetic participants
`;

describe('parseSections', () => {
  test('extracts every section keyed by heading', () => {
    const s = parseSections(body);
    expect(Object.keys(s)).toContain('What is it');
    expect(Object.keys(s)).toContain('Using AI');
    expect(s['Purpose'].trim()).toBe('To learn why.');
  });

  test('keeps multi-line section content intact', () => {
    const s = parseSections(body);
    expect(s['Using AI']).toContain('Where it helps');
    expect(s['Using AI']).toContain('Where it fails');
  });

  test('ignores h3 and deeper headings', () => {
    const s = parseSections('## Tips\ntext\n### Subhead\nmore\n');
    expect(Object.keys(s)).toEqual(['Tips']);
    expect(s['Tips']).toContain('Subhead');
  });
});

describe('parseSections', () => {
  test('preserves content in fenced code blocks with ## lines', () => {
    const withFence = `
## How to do it
1. Run the script

\`\`\`bash
## Step 1: install deps
npm install
\`\`\`

## Common mistakes
- Forgetting to seed data
`;
    const s = parseSections(withFence);
    expect(s['How to do it']).toContain('Step 1: install deps');
    expect(s['How to do it']).toContain('npm install');
    expect(Object.keys(s)).toEqual(['How to do it', 'Common mistakes']);
  });

  test('preserves markdown fence with literal ## content', () => {
    const withMarkdown = `
## Getting started
Read the docs.

\`\`\`markdown
## Using AI
This is example text.
\`\`\`

## Tips
Always test.
`;
    const s = parseSections(withMarkdown);
    expect(s['Getting started']).toContain('Using AI');
    expect(s['Getting started']).toContain('This is example text');
    expect(Object.keys(s)).toEqual(['Getting started', 'Tips']);
  });

  test('treats ~~~ fences same as ``` fences', () => {
    const withTilde = `
## Section
Text before

~~~js
## Fake header
code here
~~~

More text
`;
    const s = parseSections(withTilde);
    expect(Object.keys(s)).toEqual(['Section']);
    expect(s['Section']).toContain('Fake header');
    expect(s['Section']).toContain('code here');
  });

  test('closing fence must match opening fence char and length', () => {
    const withLongFence = `
## Section
Text

\`\`\`\`
## Inner triple backticks
\`\`\`
not closed yet
\`\`\`\`

After fence
`;
    const s = parseSections(withLongFence);
    expect(Object.keys(s)).toEqual(['Section']);
    expect(s['Section']).toContain('Inner triple backticks');
    expect(s['Section']).toContain('not closed yet');
  });
});

describe('missingSections', () => {
  test('returns empty for a complete body', () => {
    expect(missingSections(parseSections(body))).toEqual([]);
  });

  test('names each missing required section', () => {
    const s = parseSections('## What is it\nx\n');
    const missing = missingSections(s);
    expect(missing).toContain('Purpose');
    expect(missing).toContain('Using AI');
    expect(missing).not.toContain('What is it');
  });

  test('returns required sections in spec order', () => {
    const s = parseSections('## What is it\nx\n');
    const missing = missingSections(s);
    // Missing sections should be in REQUIRED_SECTIONS order
    const expected = REQUIRED_SECTIONS.filter((sec) => sec !== 'What is it');
    expect(missing).toEqual(expected);
  });

  test('never reports optional sections as missing', () => {
    const withoutNotes = `
## What is it
A test.

## Purpose
For testing.

## When to use
Always.

## How to do it
Do it.

## Common mistakes
Don't do this.

## Tips
Tips here.

## Using AI
AI info.
`;
    const s = parseSections(withoutNotes);
    const missing = missingSections(s);
    expect(missing).not.toContain('Notes');
    expect(missing).toEqual([]);
  });

  test('drops preamble before first section heading', () => {
    const withPreamble = `This is introductory text before any section.

More preamble here.

## What is it
The actual content starts here.
`;
    const s = parseSections(withPreamble);
    expect(Object.keys(s)).toEqual(['What is it']);
    expect(s['What is it']).toBe('The actual content starts here.');
  });
});

describe('duplicateSections', () => {
  test('returns duplicate heading names in first-appearance order', () => {
    const withDuplicates = `
## Tips
First tips

## How to do it
Steps

## Tips
Second tips
`;
    const dups = duplicateSections(withDuplicates);
    expect(dups).toEqual(['Tips']);
  });

  test('returns empty array for clean body', () => {
    expect(duplicateSections(body)).toEqual([]);
  });

  test('handles multiple duplicates in order', () => {
    const multiDupe = `
## Tips
First

## Purpose
Something

## Tips
Second

## Purpose
Again

## When to use
Use it
`;
    const dups = duplicateSections(multiDupe);
    expect(dups).toContain('Tips');
    expect(dups).toContain('Purpose');
    expect(dups[0]).toBe('Tips'); // First appearance order
  });

  test('respects fences when counting duplicates', () => {
    const withFencedDupe = `
## Tips
Real tips

\`\`\`
## Tips
Fake tips in code
\`\`\`

## How to do it
Instructions
`;
    const dups = duplicateSections(withFencedDupe);
    expect(dups).toEqual([]); // No real duplicates
  });
});
