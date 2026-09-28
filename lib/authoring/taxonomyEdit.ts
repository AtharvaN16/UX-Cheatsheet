import type { TaxonomyDomain, TaxonomyItem } from '../taxonomy';

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Derive a card id from its title, matching the kebab-case ids already in use. */
export function toId(title: string): string {
  return title
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Add one entry to the taxonomy JSON and hand back the new text.
 *
 * Structured rather than textual: the whole reason the taxonomy moved to JSON
 * is that `JSON.parse` → mutate → `JSON.stringify` cannot emit a syntactically
 * broken file, whereas string surgery on the old TypeScript literal could —
 * quietly.
 *
 * Nothing else validates taxonomy ids. There is no Zod schema over this file,
 * so an id like "" or "---" would be accepted everywhere and simply produce a
 * card no route could ever reach. These checks are the only ones there are.
 */
export function insertTaxonomyItem(
  json: string,
  entry: {
    title: string;
    kind: 'concept' | 'framework' | 'method';
    domainId: string;
    groupTitle: string | null;
  },
): string {
  const id = toId(entry.title);
  if (id === '' || !KEBAB.test(id)) {
    throw new Error('title must contain at least one letter or number');
  }

  const data = JSON.parse(json) as TaxonomyDomain[];

  for (const d of data) {
    for (const g of d.groups) {
      if (g.items.some((i) => i.id === id)) {
        throw new Error(`id "${id}" already exists`);
      }
    }
  }

  const domain = data.find((d) => d.domainId === entry.domainId);
  if (!domain) throw new Error(`unknown domain "${entry.domainId}"`);

  const group = domain.groups.find((g) => g.title === entry.groupTitle);
  if (!group) throw new Error(`unknown group "${entry.groupTitle}"`);

  const item: TaxonomyItem = { id, title: entry.title.trim(), kind: entry.kind };
  (group.items as TaxonomyItem[]).push(item);

  return `${JSON.stringify(data, null, 2)}\n`;
}
