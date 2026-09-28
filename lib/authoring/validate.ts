// lib/authoring/validate.ts
import matter from 'gray-matter';
import { frontmatterSchema } from '../content/schema';
import { parseSections, missingSections, duplicateSections } from '../content/sections';

/**
 * Validate a *proposed* method file without writing it anywhere.
 *
 * This is the same set of checks `loadMethods` runs per file, in the same
 * order, emitting the same strings — so an error shown in the editing panel
 * reads identically to one from `bun run validate`. Cross-reference checks are
 * deliberately absent: no editable field can change a cross-reference, since
 * `useInstead` and `related` are not editable in the app.
 */
export function validateMethodText(fileText: string, rel: string): string[] {
  const errors: string[] = [];

  let data: Record<string, unknown>;
  let content: string;
  try {
    const parsed = matter(fileText);
    data = parsed.data;
    content = parsed.content;
  } catch (e) {
    return [`${rel}: frontmatter — ${(e as Error).message}`];
  }

  const parsed = frontmatterSchema.safeParse(data);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`${rel}: ${issue.path.join('.') || '(root)'} — ${issue.message}`);
    }
    return errors;
  }

  const sections = parseSections(content);
  const missing = missingSections(sections, parsed.data.kind);
  if (missing.length > 0) errors.push(`${rel}: sections — missing ${missing.join(', ')}`);

  const dups = duplicateSections(content);
  if (dups.length > 0) errors.push(`${rel}: sections — duplicate heading(s) ${dups.join(', ')}`);

  return errors;
}
