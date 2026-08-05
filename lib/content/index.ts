import { join } from 'node:path';
import { loadMethods, type Method } from './load';
import type { ScorableMethod } from '../search/score';

const CONTENT_DIR = join(process.cwd(), 'content', 'methods');

let cache: Method[] | null = null;

/** All valid methods. Throws at build time if any entry is invalid. */
export function getAllMethods(): Method[] {
  if (cache) return cache;
  const { methods, errors } = loadMethods(CONTENT_DIR);
  if (errors.length > 0) {
    throw new Error(`Invalid content:\n${errors.map((e) => `  ${e}`).join('\n')}`);
  }
  cache = methods;
  return cache;
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
