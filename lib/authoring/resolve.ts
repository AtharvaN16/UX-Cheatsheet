import manifest from '../content/manifest.json';

/**
 * Turn a method id into its repo-relative file path.
 *
 * This is why no endpoint accepts a path: an id is looked up in a fixed set, so
 * traversal is not something to sanitize against — an attacker-supplied string
 * simply is not in the set.
 *
 * The lookup is a committed manifest rather than `getAllMethods()`, which reads
 * `content/` from disk. That directory is not traced into the serverless bundle
 * (the path is constructed at runtime, so Next cannot see it), so on the live
 * site the filesystem answer does not exist. A statically imported JSON file
 * does. `bun run validate` regenerates it, and a test asserts it matches the
 * real tree, so it cannot silently drift.
 */
export function relPathForMethod(id: string): string {
  const domain = (manifest as Record<string, string>)[id];
  if (!domain) throw new Error(`unknown method "${id}"`);
  return `content/methods/${domain}/${id}.mdx`;
}
