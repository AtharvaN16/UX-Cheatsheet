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
  matchedSnippet?: string;
}

/** Common English stop words that should not trigger loose description matching when searched alone */
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'were', 'will', 'with',
]);

/** Normalize query string handling straight/curly apostrophes and non-alphanumeric punctuation */
const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const terms = (s: string) => normalize(s).split(' ').filter(Boolean);

/**
 * Checks if text contains query terms using strict word-prefix matching.
 * Filters out single stop words (e.g. 'for', 'in', 'the') from description matching.
 */
function evaluateFieldMatch(queryTerms: string[], text: string): { hitRatio: number; snippet?: string } {
  if (queryTerms.length === 0 || !text) return { hitRatio: 0 };

  // If query is a single stop word (e.g., "for", "in"), skip description search to prevent false positives
  const activeTerms =
    queryTerms.length === 1 && STOP_WORDS.has(queryTerms[0])
      ? []
      : queryTerms.filter((t) => !STOP_WORDS.has(t) || queryTerms.length > 1);

  if (activeTerms.length === 0) return { hitRatio: 0 };

  const normText = normalize(text);
  const words = normText.split(' ').filter(Boolean);

  let hits = 0;
  let firstMatchSnippet: string | undefined;

  for (const t of activeTerms) {
    const matchingWordIdx = words.findIndex((w) => w.startsWith(t) || (t.length >= 4 && w.includes(t)));
    if (matchingWordIdx !== -1) {
      hits++;
      if (!firstMatchSnippet) {
        const start = Math.max(0, matchingWordIdx - 2);
        const end = Math.min(words.length, matchingWordIdx + 6);
        firstMatchSnippet = words.slice(start, end).join(' ');
      }
    }
  }

  return {
    hitRatio: hits / activeTerms.length,
    snippet: firstMatchSnippet,
  };
}

/**
 * Rank methods against a query across fields with strict word-prefix matching.
 */
export function scoreMethods(query: string, methods: ScorableMethod[]): ScoredMethod[] {
  const qt = terms(query);
  if (qt.length === 0) return [];

  const rawQuery = query.toLowerCase().trim();
  const normQuery = normalize(query);
  const scored: ScoredMethod[] = [];

  for (const m of methods) {
    const titleText = [m.title, ...m.aka].join(' ');
    const normTitle = normalize(titleText);
    const titleWords = normTitle.split(' ');

    // 1. Check Title Matches first (comparing normalized query against normalized title/aliases)
    const isTitleExact =
      normTitle === normQuery ||
      titleWords.some((w) => w === normQuery) ||
      m.aka.some((a) => normalize(a) === normQuery) ||
      normalize(m.title) === normQuery;

    const isTitlePrefix =
      titleWords.some((w) => w.startsWith(normQuery)) ||
      normTitle.includes(normQuery) ||
      m.aka.some((a) => normalize(a).includes(normQuery));

    if (isTitleExact) {
      scored.push({ id: m.id, score: 100, matchedOn: 'title' });
      continue;
    }

    if (isTitlePrefix) {
      scored.push({ id: m.id, score: 50, matchedOn: 'title' });
      continue;
    }


    // 2. Check Description & Content fields with strict word-prefix matching
    const whenToUseRes = evaluateFieldMatch(qt, m.whenToUse);
    if (whenToUseRes.hitRatio > 0) {
      scored.push({
        id: m.id,
        score: whenToUseRes.hitRatio * 10,
        matchedOn: 'whenToUse',
        matchedSnippet: whenToUseRes.snippet,
      });
      continue;
    }

    const bodyRes = evaluateFieldMatch(qt, m.rest);
    if (bodyRes.hitRatio > 0) {
      scored.push({
        id: m.id,
        score: bodyRes.hitRatio * 2,
        matchedOn: 'body',
        matchedSnippet: bodyRes.snippet,
      });
    }
  }

  return scored.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
