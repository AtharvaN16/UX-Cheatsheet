export type MatchField = 'title' | 'whenToUse' | 'body';

export interface ScorableMethod {
  id: string;
  title: string;
  aka: string[];
  whenToUse: string;
  rest: string;
}

export interface ScoredMethod {
  id: string;
  score: number;
  matchedOn: MatchField;
}

/** Spec §6.1 field weights. */
const WEIGHTS: Record<MatchField, number> = {
  title: 1.0,
  whenToUse: 0.6,
  body: 0.25,
};

const normalize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim();

const terms = (s: string) => normalize(s).split(' ').filter(Boolean);

/** Fraction of query terms present anywhere in `text`. */
function coverage(queryTerms: string[], text: string): number {
  if (queryTerms.length === 0) return 0;
  const hay = normalize(text);
  const hit = queryTerms.filter((t) => hay.includes(t)).length;
  return hit / queryTerms.length;
}

/**
 * Rank methods against a query across three weighted fields.
 * A method scores on its best field; `matchedOn` reports which one,
 * so the palette can group results by why they matched.
 */
export function scoreMethods(query: string, methods: ScorableMethod[]): ScoredMethod[] {
  const qt = terms(query);
  if (qt.length === 0) return [];

  const scored: ScoredMethod[] = [];

  for (const m of methods) {
    const fields: Array<[MatchField, string]> = [
      ['title', [m.title, ...m.aka].join(' ')],
      ['whenToUse', m.whenToUse],
      ['body', m.rest],
    ];

    let best: ScoredMethod | null = null;
    for (const [field, text] of fields) {
      const score = coverage(qt, text) * WEIGHTS[field];
      if (score > 0 && (best === null || score > best.score)) {
        best = { id: m.id, score, matchedOn: field };
      }
    }
    if (best) scored.push(best);
  }

  return scored.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
