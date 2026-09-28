// lib/authoring/github.test.ts
import { expect, test, describe, beforeEach, afterEach } from 'bun:test';
import { GitHubStore, githubConfig } from './github';

const env = process.env as Record<string, string | undefined>;
const saved = { t: env.GITHUB_TOKEN, r: env.GITHUB_REPO, b: env.GITHUB_BRANCH };
const realFetch = globalThis.fetch;

beforeEach(() => {
  env.GITHUB_TOKEN = 'ghp_test';
  env.GITHUB_REPO = 'AtharvaN16/UX-Cheatsheet';
  env.GITHUB_BRANCH = 'main';
});
afterEach(() => {
  env.GITHUB_TOKEN = saved.t;
  env.GITHUB_REPO = saved.r;
  env.GITHUB_BRANCH = saved.b;
  globalThis.fetch = realFetch;
});

const cfg = () => ({ token: 't', owner: 'o', repo: 'r', branch: 'main' });

/** Record every call and answer from a scripted table keyed by method+path. */
function stubFetch(table: Record<string, unknown>) {
  const calls: { method: string; url: string; body: unknown }[] = [];
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, url: u, body });
    const key = Object.keys(table).find((k) => u.includes(k.split(' ')[1]) && k.startsWith(method));
    if (!key) return new Response('not scripted: ' + method + ' ' + u, { status: 500 });
    return new Response(JSON.stringify(table[key]), { status: 200 });
  }) as typeof fetch;
  return calls;
}

describe('githubConfig', () => {
  // Review Focus 5
  test('throws naming the variable when the token is missing', () => {
    delete env.GITHUB_TOKEN;
    expect(() => githubConfig()).toThrow('GITHUB_TOKEN');
  });

  test('throws naming the variable when the repo is malformed', () => {
    env.GITHUB_REPO = 'no-slash-here';
    expect(() => githubConfig()).toThrow('GITHUB_REPO');
  });

  test('parses owner and repo', () => {
    expect(githubConfig()).toEqual({
      token: 'ghp_test',
      owner: 'AtharvaN16',
      repo: 'UX-Cheatsheet',
      branch: 'main',
    });
  });
});

describe('GitHubStore.read', () => {
  test('returns decoded text and the blob sha as version', async () => {
    stubFetch({
      'GET /contents/': {
        content: Buffer.from('hello world\n').toString('base64'),
        sha: 'blob-sha-1',
      },
    });
    const store = new GitHubStore(cfg());
    expect(await store.read('content/methods/x/a.mdx')).toEqual({
      text: 'hello world\n',
      version: 'blob-sha-1',
    });
  });
});

describe('GitHubStore.commit', () => {
  const script = {
    'GET /git/ref/': { object: { sha: 'base-commit' } },
    'GET /git/commits/': { tree: { sha: 'base-tree' } },
    'POST /git/blobs': { sha: 'new-blob' },
    'POST /git/trees': { sha: 'new-tree' },
    'POST /git/commits': { sha: 'new-commit' },
    'PATCH /git/refs/': { object: { sha: 'new-commit' } },
  };

  test('many files produce exactly one commit', async () => {
    const calls = stubFetch(script);
    await new GitHubStore(cfg()).commit(
      [
        { path: 'a.mdx', content: 'A', version: '' },
        { path: 'b.mdx', content: 'B', version: '' },
        { path: 'lib/taxonomy.json', content: '[]', version: '' },
      ],
      'content: batch',
    );
    expect(calls.filter((c) => c.url.includes('/git/commits') && c.method === 'POST').length).toBe(1);
    expect(calls.filter((c) => c.url.includes('/git/blobs')).length).toBe(3);
    expect(calls.filter((c) => c.method === 'PATCH').length).toBe(1);
  });

  test('the tree is built on base_tree so untouched files survive', async () => {
    const calls = stubFetch(script);
    await new GitHubStore(cfg()).commit([{ path: 'a.mdx', content: 'A', version: '' }], 'msg');
    const tree = calls.find((c) => c.url.includes('/git/trees'))!;
    expect((tree.body as { base_tree: string }).base_tree).toBe('base-tree');
  });

  test('binary content is sent base64 and text as utf-8', async () => {
    const calls = stubFetch(script);
    await new GitHubStore(cfg()).commit(
      [
        { path: 'x.png', content: new Uint8Array([1, 2, 3]), version: '' },
        { path: 'y.mdx', content: 'text', version: '' },
      ],
      'msg',
    );
    const blobs = calls.filter((c) => c.url.includes('/git/blobs')).map((c) => c.body as { encoding: string });
    expect(blobs.map((b) => b.encoding).sort()).toEqual(['base64', 'utf-8']);
  });

  test('the ref update is not forced', async () => {
    const calls = stubFetch(script);
    await new GitHubStore(cfg()).commit([{ path: 'a.mdx', content: 'A', version: '' }], 'msg');
    const patch = calls.find((c) => c.method === 'PATCH')!;
    expect((patch.body as { force?: boolean }).force).toBe(false);
  });

  test('a failed ref update surfaces rather than being retried', async () => {
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const u = String(url);
      if ((init?.method ?? 'GET') === 'PATCH') {
        return new Response(JSON.stringify({ message: 'Update is not a fast forward' }), { status: 422 });
      }
      const table: Record<string, unknown> = {
        '/git/ref/': { object: { sha: 'base-commit' } },
        '/git/commits/': { tree: { sha: 'base-tree' } },
        '/git/blobs': { sha: 'new-blob' },
        '/git/trees': { sha: 'new-tree' },
        '/git/commits': { sha: 'new-commit' },
      };
      const key = Object.keys(table).find((k) => u.includes(k))!;
      return new Response(JSON.stringify(table[key]), { status: 200 });
    }) as typeof fetch;

    await expect(
      new GitHubStore(cfg()).commit([{ path: 'a.mdx', content: 'A', version: '' }], 'msg'),
    ).rejects.toThrow('fast forward');
  });
});
