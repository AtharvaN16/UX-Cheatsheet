// lib/authoring/store.ts
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, sep } from 'node:path';
import { GitHubStore } from './github';

export interface FileWrite {
  /** Repo-relative, POSIX-style. */
  path: string;
  content: string | Uint8Array;
  /** Opaque version captured at read time. Ignored by DiskStore. */
  version: string;
}

/**
 * Where content bytes live. `DiskStore` is the whole implementation in
 * development; Plan B adds `GitHubStore` behind this same interface, so nothing
 * above this line needs to know which is in play.
 *
 * `commit` takes many files and is atomic-per-call by contract, because the
 * live-site sync commits a whole batch as one revision.
 */
export interface ContentStore {
  read(path: string): Promise<{ text: string; version: string }>;
  commit(files: FileWrite[], message: string): Promise<void>;
}

export class DiskStore implements ContentStore {
  constructor(private readonly root: string) {}

  private absolute(relPath: string): string {
    const abs = resolve(this.root, relPath);
    if (abs !== this.root && !abs.startsWith(this.root + sep)) {
      throw new Error('path escapes the repository');
    }
    return abs;
  }

  async read(relPath: string): Promise<{ text: string; version: string }> {
    return { text: readFileSync(this.absolute(relPath), 'utf8'), version: '' };
  }

  async commit(files: FileWrite[], _message: string): Promise<void> {
    for (const f of files) {
      const abs = this.absolute(f.path);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, f.content);
    }
  }
}

/**
 * Disk in development, GitHub everywhere else. This is the only place the two
 * differ; nothing above this line knows which is in play.
 */
export function getStore(): ContentStore {
  if (process.env.NODE_ENV === 'development') return new DiskStore(process.cwd());
  return new GitHubStore();
}
