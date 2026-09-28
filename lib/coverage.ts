import { TAXONOMY } from './taxonomy';
import { DOMAINS } from './domains';

export interface DomainCoverage {
  domainId: string;
  title: string;
  written: number;
  planned: number;
}

export interface Coverage {
  domains: DomainCoverage[];
  /** Distinct taxonomy entries with a card, across all domains. */
  written: number;
  /** Distinct taxonomy entries, deduped — 13 ids are listed in two domains. */
  planned: number;
}

/**
 * Written-vs-planned coverage, derived from `lib/taxonomy.ts` and the set of
 * ids that actually have a card.
 *
 * Per-domain counts use that domain's own entry list, so an id listed in two
 * domains counts once in each — which is what you want when reading a single
 * domain page. The totals dedupe by id instead, so they answer "how much of
 * the taxonomy exists" rather than double-counting shared entries.
 */
export function computeCoverage(writtenIds: Iterable<string>): Coverage {
  const written = writtenIds instanceof Set ? writtenIds : new Set(writtenIds);

  const domains: DomainCoverage[] = [];
  const allIds = new Set<string>();

  for (const domain of DOMAINS) {
    const entry = TAXONOMY.find((t) => t.domainId === domain.id);
    const items = entry ? entry.groups.flatMap((g) => g.items) : [];
    for (const i of items) allIds.add(i.id);

    domains.push({
      domainId: domain.id,
      title: domain.title,
      written: items.filter((i) => written.has(i.id)).length,
      planned: items.length,
    });
  }

  return {
    domains,
    written: [...allIds].filter((id) => written.has(id)).length,
    planned: allIds.size,
  };
}

/** Coverage for one domain, or undefined if the id isn't a known domain. */
export function domainCoverage(
  domainId: string,
  writtenIds: Iterable<string>,
): DomainCoverage | undefined {
  return computeCoverage(writtenIds).domains.find((d) => d.domainId === domainId);
}
