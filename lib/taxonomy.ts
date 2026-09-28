/**
 * The full ~310-entry taxonomy from docs/superpowers/specs/2026-08-05-ux-methods-cheatsheet-design.md §4,
 * transcribed as structured data so domain pages can render every planned
 * entry as a card — written or not — instead of only what has content today.
 * Source of truth for entry lists remains §4; keep this in sync with it.
 */

export interface TaxonomyItem {
  id: string;
  title: string;
  /** Explicit kind, set when a card is added through the app. Absent on
   *  entries predating that feature, which fall back to the heuristic. */
  kind?: 'concept' | 'framework' | 'method';
}

export interface TaxonomyGroup {
  /** null for domains with no named subgroups (a single flat list) */
  title: string | null;
  items: readonly TaxonomyItem[];
}

export interface TaxonomyDomain {
  domainId: string;
  groups: readonly TaxonomyGroup[];
}

import data from './taxonomy.json';
import { inferKind } from './inferKind';

export const TAXONOMY: readonly TaxonomyDomain[] = data as readonly TaxonomyDomain[];

export function getTaxonomyForDomain(domainId: string): TaxonomyDomain | undefined {
  return TAXONOMY.find((d) => d.domainId === domainId);
}

export function getTaxonomyEntryCount(domainId: string): number {
  const tax = getTaxonomyForDomain(domainId);
  if (!tax) return 0;
  return tax.groups.reduce((sum: number, g) => sum + g.items.length, 0);
}

/**
 * The single place kind is decided for a card. Priority: what the written
 * .mdx says, then what the author picked when adding the entry, then the
 * `inferKind` heuristic. Callers must not re-implement this order.
 */
export function resolveKind(
  item: TaxonomyItem,
  domainId: string,
  writtenKind?: string,
): 'method' | 'framework' | 'concept' {
  if (writtenKind) return writtenKind as 'method' | 'framework' | 'concept';
  if (item.kind) return item.kind;
  return inferKind(item.title, domainId, item.id);
}
