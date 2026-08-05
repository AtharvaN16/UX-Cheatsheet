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

/**
 * Read every .mdx under `dir`, validate it, and resolve cross-references.
 * Returns both the parsed methods and a list of human-readable errors.
 * The caller decides whether errors are fatal.
 */
export function loadMethods(dir: string): { methods: Method[]; errors: string[] } {
  const errors: string[] = [];
  const methods: Method[] = [];
  const seen = new Map<string, string>();

  for (const file of walk(dir).sort()) {
    const rel = relative(dir, file);
    const raw = readFileSync(file, 'utf8');
    const { data, content } = matter(raw);

    const parsed = frontmatterSchema.safeParse(data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push(`${rel}: ${issue.path.join('.') || '(root)'} — ${issue.message}`);
      }
      continue;
    }

    const fm = parsed.data;
    const expectedFile = `${fm.id}.mdx`;
    if (basename(file) !== expectedFile) {
      errors.push(`${rel}: id — must match filename (expected ${expectedFile})`);
    }
    if (seen.has(fm.id)) {
      errors.push(`${rel}: id — duplicate of ${seen.get(fm.id)}`);
    }
    seen.set(fm.id, rel);

    const sections = parseSections(content);
    const missing = missingSections(sections);
    if (missing.length > 0) {
      errors.push(`${rel}: sections — missing ${missing.join(', ')}`);
    }

    const dups = duplicateSections(content);
    if (dups.length > 0) {
      errors.push(`${rel}: sections — duplicate heading(s) ${dups.join(', ')}`);
    }

    methods.push({ ...fm, body: content, sections });
  }

  // Cross-references resolve only once every id is known.
  const ids = new Set(methods.map((m) => m.id));
  for (const m of methods) {
    const rel = seen.get(m.id)!;
    const check = (id: string, field: string) => {
      if (!ids.has(id)) errors.push(`${rel}: ${field} — unresolved reference "${id}"`);
    };
    m.useInstead.forEach((u, i) => check(u.method, `useInstead[${i}].method`));
    m.related.before.forEach((id) => check(id, 'related.before'));
    m.related.after.forEach((id) => check(id, 'related.after'));
    m.related.alongside.forEach((id) => check(id, 'related.alongside'));
  }

  return { methods, errors };
}
