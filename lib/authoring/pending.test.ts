// lib/authoring/pending.test.ts
import { expect, test, describe } from 'bun:test';
import { addEdit, describeEdit, type PendingEdit } from './pending';

const sec = (id: string, heading: string, markdown: string): PendingEdit => ({
  kind: 'section', id, heading, markdown,
});

describe('addEdit', () => {
  // Review Focus 4
  test('two edits to different sections of one card are both kept, in order', () => {
    const list = addEdit(addEdit([], sec('a', 'Tips', 'one')), sec('a', 'Purpose', 'two'));
    expect(list).toEqual([sec('a', 'Tips', 'one'), sec('a', 'Purpose', 'two')]);
  });

  test('re-editing the same section replaces rather than stacks', () => {
    const list = addEdit(addEdit([], sec('a', 'Tips', 'first')), sec('a', 'Tips', 'second'));
    expect(list).toEqual([sec('a', 'Tips', 'second')]);
  });

  test('re-editing keeps its original position in the queue', () => {
    let list = addEdit([], sec('a', 'Tips', 'one'));
    list = addEdit(list, sec('b', 'Tips', 'two'));
    list = addEdit(list, sec('a', 'Tips', 'one-updated'));
    expect(list.map((e) => (e.kind === 'section' ? e.id : ''))).toEqual(['a', 'b']);
    expect(list[0]).toEqual(sec('a', 'Tips', 'one-updated'));
  });

  test('a frontmatter field replaces only itself', () => {
    let list = addEdit([], { kind: 'frontmatter', id: 'a', field: 'effort', value: 'low' });
    list = addEdit(list, { kind: 'frontmatter', id: 'a', field: 'kind', value: 'method' });
    list = addEdit(list, { kind: 'frontmatter', id: 'a', field: 'effort', value: 'high' });
    expect(list.length).toBe(2);
    expect(list[0]).toEqual({ kind: 'frontmatter', id: 'a', field: 'effort', value: 'high' });
  });

  test('a second image for one card replaces the first', () => {
    let list = addEdit([], { kind: 'image', id: 'a', filename: 'x.svg', base64: 'AA' });
    list = addEdit(list, { kind: 'image', id: 'a', filename: 'y.png', base64: 'BB' });
    expect(list.length).toBe(1);
    expect(list[0]).toMatchObject({ filename: 'y.png' });
  });

  test('two new cards both queue', () => {
    let list = addEdit([], { kind: 'card', title: 'A', cardKind: 'method', domainId: 'd', groupTitle: null });
    list = addEdit(list, { kind: 'card', title: 'B', cardKind: 'method', domainId: 'd', groupTitle: null });
    expect(list.length).toBe(2);
  });
});

describe('describeEdit', () => {
  test('names what changed in words a person can scan', () => {
    expect(describeEdit(sec('tree-testing', 'Tips', 'x'))).toBe('tree-testing — Tips');
    expect(describeEdit({ kind: 'frontmatter', id: 'a', field: 'effort', value: 'high' }))
      .toBe('a — effort: high');
    expect(describeEdit({ kind: 'image', id: 'a', filename: 'x.svg', base64: '' }))
      .toBe('a — image');
    expect(describeEdit({ kind: 'card', title: 'New Thing', cardKind: 'method', domainId: 'd', groupTitle: null }))
      .toBe('new card — New Thing');
  });
});
