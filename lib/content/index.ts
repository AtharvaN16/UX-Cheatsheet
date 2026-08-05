import { join } from 'node:path';
import { loadMethods, type Method } from './load';
import type { ScorableMethod } from '../search/score';

const CONTENT_DIR = join(process.cwd(), 'content', 'methods');

let cache: { dir: string; methods: Method[] } | null = null;

/**
 * All valid methods. Throws at build time if any entry is invalid.
 *
 * `dir` defaults to the real `content/methods` directory; it is overridable
 * so tests can point this at a fixture directory. The cache is keyed on
 * `dir` so a failed load (which never populates the cache) can't be masked
 * by a previously cached successful load of a different directory, and a
 * successful load of the same directory is only ever read from disk once.
 */
export function getAllMethods(dir: string = CONTENT_DIR): Method[] {
  if (cache && cache.dir === dir) return cache.methods;
  const { methods, errors } = loadMethods(dir);
  if (errors.length > 0) {
    throw new Error(`Invalid content:\n${errors.map((e) => `  ${e}`).join('\n')}`);
  }
  cache = { dir, methods };
  return cache.methods;
}

export function getMethod(id: string): Method | undefined {
  return getAllMethods().find((m) => m.id === id);
}

/** Methods whose primary home is `category`, plus those listing it in alsoIn. */
export function getMethodsByCategory(category: string): {
  primary: Method[];
  secondary: Method[];
} {
  const all = getAllMethods();
  return {
    primary: all.filter((m) => m.category === category),
    secondary: all.filter((m) => m.alsoIn.includes(category)),
  };
}

export function toScorable(m: Method): ScorableMethod {
  const { 'When to use': whenToUse = '', ...others } = m.sections;
  return {
    id: m.id,
    title: m.title,
    aka: m.aka,
    whenToUse,
    rest: Object.values(others).join('\n'),
  };
}

export type { Method };
