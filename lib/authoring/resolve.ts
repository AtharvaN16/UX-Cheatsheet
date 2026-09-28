import { getAllMethods } from '../content';

/**
 * Turn a method id into its repo-relative file path.
 *
 * This is why no endpoint accepts a path. An id is looked up in the set of
 * methods that actually exist, so traversal is not something to sanitize
 * against — an attacker-supplied string simply is not in the set.
 */
export function relPathForMethod(id: string): string {
  const method = getAllMethods().find((m) => m.id === id);
  if (!method) throw new Error(`unknown method "${id}"`);
  return `content/methods/${method.domain}/${method.id}.mdx`;
}
