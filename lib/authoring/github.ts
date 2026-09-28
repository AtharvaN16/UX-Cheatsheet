// lib/authoring/github.ts
import type { ContentStore, FileWrite } from './store';

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

/**
 * Read the GitHub settings, failing loudly and by name.
 *
 * A missing variable must not degrade into a sync that quietly does nothing —
 * the user would believe their edits were published.
 */
export function githubConfig(): GitHubConfig {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is not set');

  const repo = process.env.GITHUB_REPO;
  if (!repo || !repo.includes('/')) {
    throw new Error('GITHUB_REPO must be set as "owner/repo"');
  }

  const [owner, name] = repo.split('/');
  if (!owner || !name) throw new Error('GITHUB_REPO must be set as "owner/repo"');

  return { token, owner, repo: name, branch: process.env.GITHUB_BRANCH || 'main' };
}

/**
 * Content storage backed by a GitHub repository.
 *
 * Reads come from GitHub rather than disk because `content/` is not traced into
 * the serverless bundle (the path is built at runtime, so Next cannot see it),
 * and because patching the currently committed text is the correct thing to do
 * anyway.
 *
 * Writes use the **Git Data API**, not the simpler contents API, because the
 * contents endpoint commits one file per call: N edits would mean N commits and
 * N rebuilds, which is exactly what batching exists to avoid. The sequence is
 * ref -> commit -> blobs -> tree -> commit -> move ref: six requests regardless
 * of file count, and atomic — either every edit lands or none does.
 */
export class GitHubStore implements ContentStore {
  private readonly cfg: GitHubConfig;

  constructor(cfg?: GitHubConfig) {
    this.cfg = cfg ?? githubConfig();
  }

  private get base(): string {
    return `https://api.github.com/repos/${this.cfg.owner}/${this.cfg.repo}`;
  }

  private async api<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${this.cfg.token}`,
        accept: 'application/vnd.github+json',
        'content-type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    const text = await res.text();
    if (!res.ok) {
      let message = text;
      try {
        message = (JSON.parse(text) as { message?: string }).message ?? text;
      } catch {
        /* keep the raw body */
      }
      throw new Error(`GitHub ${init?.method ?? 'GET'} ${path} failed (${res.status}): ${message}`);
    }
    return JSON.parse(text) as T;
  }

  async read(path: string): Promise<{ text: string; version: string }> {
    const data = await this.api<{ content: string; sha: string }>(
      `/contents/${path}?ref=${encodeURIComponent(this.cfg.branch)}`,
    );
    return {
      text: Buffer.from(data.content, 'base64').toString('utf8'),
      version: data.sha,
    };
  }

  /** The blob sha a path currently has, for detecting a file that moved. */
  async versionOf(path: string): Promise<string> {
    return (await this.read(path)).version;
  }

  async commit(files: FileWrite[], message: string): Promise<void> {
    const branch = encodeURIComponent(this.cfg.branch);

    const ref = await this.api<{ object: { sha: string } }>(`/git/ref/heads/${branch}`);
    const baseCommit = ref.object.sha;

    const commit = await this.api<{ tree: { sha: string } }>(`/git/commits/${baseCommit}`);
    const baseTree = commit.tree.sha;

    const blobs = await Promise.all(
      files.map(async (f) => {
        const isBinary = typeof f.content !== 'string';
        const blob = await this.api<{ sha: string }>('/git/blobs', {
          method: 'POST',
          body: JSON.stringify({
            content: isBinary
              ? Buffer.from(f.content as Uint8Array).toString('base64')
              : (f.content as string),
            encoding: isBinary ? 'base64' : 'utf-8',
          }),
        });
        return { path: f.path, mode: '100644' as const, type: 'blob' as const, sha: blob.sha };
      }),
    );

    const tree = await this.api<{ sha: string }>('/git/trees', {
      method: 'POST',
      body: JSON.stringify({ base_tree: baseTree, tree: blobs }),
    });

    const created = await this.api<{ sha: string }>('/git/commits', {
      method: 'POST',
      body: JSON.stringify({ message, tree: tree.sha, parents: [baseCommit] }),
    });

    // force:false so a branch that moved between the read above and now is
    // rejected rather than clobbered.
    await this.api(`/git/refs/heads/${branch}`, {
      method: 'PATCH',
      body: JSON.stringify({ sha: created.sha, force: false }),
    });
  }
}
