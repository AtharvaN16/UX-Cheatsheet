import { expect, test, describe } from 'bun:test';
import { scanLinesWithFenceState } from './scan';

describe('scanLinesWithFenceState', () => {
  test('marks a top-level heading', () => {
    const out = [...scanLinesWithFenceState('## Purpose\nbody')];
    expect(out[0].isHeading).toBe(true);
    expect(out[0].headingText).toBe('Purpose');
    expect(out[1].isHeading).toBe(false);
  });

  test('does not mark a heading inside a fenced block', () => {
    const body = ['## Real', '```md', '## Fake', '```', '## Also Real'].join('\n');
    const headings = [...scanLinesWithFenceState(body)]
      .filter((s) => s.isHeading)
      .map((s) => s.headingText);
    expect(headings).toEqual(['Real', 'Also Real']);
  });

  test('a longer closing fence closes a shorter opening one', () => {
    const body = ['````', '## Fake', '`````', '## Real'].join('\n');
    const headings = [...scanLinesWithFenceState(body)]
      .filter((s) => s.isHeading)
      .map((s) => s.headingText);
    expect(headings).toEqual(['Real']);
  });
});
