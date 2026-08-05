import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, basename } from 'node:path';
import matter from 'gray-matter';
import { frontmatterSchema, type Frontmatter } from './schema';
import { parseSections, missingSections, duplicateSections } from './sections';

export type Method = Frontmatter & {
  body: string;
  sections: Record<string, string>;
};

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('.mdx')) out.push(full);
  }
  return out;
}

interface ParsedFile {
  rel: string;
  data: Record<string, unknown>;
  content: string;
}

/**
 * Read every .mdx under `dir`, validate it, and resolve cross-references.
 * Returns both the parsed methods and a list of human-readable errors.
 * The caller decides whether errors are fatal.
 *
 * Id registration happens in its own pass over the *raw* frontmatter,
 * before full schema validation runs. That decouples "does this id exist,
 * for cross-reference and duplicate-id purposes" from "does this file's
 * frontmatter fully validate" — a file with an unrelated schema error
 * (e.g. an invalid `kind`) still contributes its id, so every other file
 * that legitimately references it is not falsely reported as having an
 * unresolved reference, and a duplicate id is still caught even when one
 * of the two copies also happens to have an unrelated schema error.
 */
export function loadMethods(dir: string): { methods: Method[]; errors: string[] } {
  const errors: string[] = [];
  const parsedFiles: ParsedFile[] = [];
  const idOwners = new Map<string, string>(); // raw id -> first-seen rel path

  // Pass 1: read every file and register its raw id, independent of
  // whether the rest of its frontmatter is schema-valid.
  for (const file of walk(dir).sort()) {
    const rel = relative(dir, file);
    const raw = readFileSync(file, 'utf8');
    const { data, content } = matter(raw);
    parsedFiles.push({ rel, data, content });

    const rawId = typeof data.id === 'string' && data.id.length > 0 ? data.id : null;
    if (rawId !== null) {
      const expectedFile = `${rawId}.mdx`;
      if (basename(file) !== expectedFile) {
        errors.push(`${rel}: id — must match filename (expected ${expectedFile})`);
      }
      if (idOwners.has(rawId)) {
        errors.push(`${rel}: id — duplicate of ${idOwners.get(rawId)}`);
      }
      idOwners.set(rawId, rel);
    }
  }

  const ids = new Set(idOwners.keys());

  // Pass 2: full schema validation and section checks.
  const built: { method: Method; rel: string }[] = [];
  for (const { rel, data, content } of parsedFiles) {
    const parsed = frontmatterSchema.safeParse(data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push(`${rel}: ${issue.path.join('.') || '(root)'} — ${issue.message}`);
      }
      continue;
    }

    const fm = parsed.data;

    const sections = parseSections(content);
    const missing = missingSections(sections);
    if (missing.length > 0) {
      errors.push(`${rel}: sections — missing ${missing.join(', ')}`);
    }

    const dups = duplicateSections(content);
    if (dups.length > 0) {
      errors.push(`${rel}: sections — duplicate heading(s) ${dups.join(', ')}`);
    }

    built.push({ method: { ...fm, body: content, sections }, rel });
  }

  // Pass 3: cross-references resolve against every id seen in pass 1,
  // regardless of whether that target file's own schema validated.
  // A reference to a file's own id is always nonsensical, so it is
  // reported as a self-reference rather than as an unresolved one.
  for (const { method: m, rel } of built) {
    const check = (id: string, field: string) => {
      if (id === m.id) {
        errors.push(`${rel}: ${field} — self-reference "${id}"`);
      } else if (!ids.has(id)) {
        errors.push(`${rel}: ${field} — unresolved reference "${id}"`);
      }
    };
    m.useInstead.forEach((u, i) => check(u.method, `useInstead.${i}.method`));
    m.related.before.forEach((id) => check(id, 'related.before'));
    m.related.after.forEach((id) => check(id, 'related.after'));
    m.related.alongside.forEach((id) => check(id, 'related.alongside'));
  }

  return { methods: built.map((b) => b.method), errors };
}
