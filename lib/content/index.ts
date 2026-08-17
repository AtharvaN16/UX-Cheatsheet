import { join } from 'node:path';
import { loadMethods, type Method } from './load';
import type { ScorableMethod } from '../search/score';

const CONTENT_DIR = join(process.cwd(), 'content', 'methods');

const cache = new Map<string, Method[]>();

/**
 * All valid methods. Throws at build time if any entry is invalid.
 *
 * `dir` defaults to the real `content/methods` directory; it is overridable
 * so tests can point this at a fixture directory. The cache is a genuine
 * per-directory map: each distinct `dir` that has successfully loaded gets
 * its own entry and is only ever read from disk once, no matter how many
 * other directories are loaded in between. A failed load never populates
 * the cache, so it can't be masked by a previously cached successful load
 * of a different directory.
 */
export function getAllMethods(dir: string = CONTENT_DIR): Method[] {
  if (process.env.NODE_ENV === 'development') {
    cache.delete(dir);
  }
  const cached = cache.get(dir);
  if (cached) return cached;

  const { methods, errors } = loadMethods(dir);
  if (errors.length > 0) {
    throw new Error(`Invalid content:\n${errors.map((e) => `  ${e}`).join('\n')}`);
  }
  cache.set(dir, methods);
  return methods;
}

export function getMethod(id: string): Method | undefined {
  return getAllMethods().find((m) => m.id === id);
}

/** Methods whose primary home is `domain`, plus those listing it in alsoIn. */
export function getMethodsByDomain(domain: string): {
  primary: Method[];
  secondary: Method[];
} {
  const all = getAllMethods();
  return {
    primary: all.filter((m) => m.domain === domain),
    secondary: all.filter((m) => m.alsoIn.includes(domain)),
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
