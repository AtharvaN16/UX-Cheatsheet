import { expect, test, describe } from 'bun:test';
import { parseSections, missingSections } from './sections';

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

**Where it produces confident garbage**
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
    expect(s['Using AI']).toContain('confident garbage');
  });

  test('ignores h3 and deeper headings', () => {
    const s = parseSections('## Tips\ntext\n### Subhead\nmore\n');
    expect(Object.keys(s)).toEqual(['Tips']);
    expect(s['Tips']).toContain('Subhead');
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
});
