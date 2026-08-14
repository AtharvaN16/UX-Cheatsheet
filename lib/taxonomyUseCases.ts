/**
 * Use-case tags for taxonomy items that have no MDX content yet (see
 * `taxonomyDescriptions.ts` for the same pattern applied to descriptions).
 * Once an item gets written, its real `useCases` frontmatter field takes over —
 * see `CategoryTopicGrid`, which prefers `written.useCases` and falls back to
 * this map only for unwritten stubs.
 */
export const TAXONOMY_USE_CASES: Record<string, string[]> = {
  // Quantitative Research — Product Analytics
  analytics: ['understand-behavior', 'identify-problems'],
  'funnel-analysis': ['understand-behavior', 'identify-problems'],
  'retention-analysis': ['understand-behavior', 'identify-problems'],
  'cohort-analysis': ['understand-behavior', 'identify-problems'],
  heatmaps: ['understand-behavior', 'identify-problems'],
  'session-recordings': ['understand-behavior', 'identify-problems'],
  'click-tracking': ['understand-behavior', 'identify-problems'],
  'tracking-plan-and-instrumentation': [],

  // Quantitative Research — Quantitative Usability
  'benchmark-studies': ['measure-usability', 'compare-alternatives'],
  'task-success-rate': ['measure-usability', 'validate-design'],
  'time-on-task': ['measure-usability', 'validate-design'],
  'error-rate': ['measure-usability', 'identify-problems'],
  'first-click-testing': ['measure-usability', 'validate-design'],
  '5-second-test': ['measure-usability', 'validate-design'],

  // Quantitative Research — Surveys & Scales
  surveys: ['measure-attitudes'],
  sus: ['measure-usability', 'compare-alternatives'],
  umux: ['measure-usability'],
  'umux-lite': ['measure-usability'],
  'supr-q': ['measure-usability', 'measure-attitudes'],
  'nasa-tlx': ['measure-usability'],
  nps: ['measure-attitudes'],
  ces: ['measure-attitudes'],
  'desirability-testing': ['measure-attitudes', 'compare-alternatives'],

  // Quantitative Research — Experimentation
  'multivariate-testing': ['compare-alternatives', 'validate-design'],
  'preference-testing': ['compare-alternatives', 'validate-design'],

  // Quantitative Research — Prioritization & Strategy
  maxdiff: ['prioritize-decisions', 'understand-preferences'],
  'conjoint-analysis': ['prioritize-decisions', 'understand-preferences', 'determine-pricing'],
  'kano-survey': ['prioritize-decisions', 'understand-preferences'],
  'turf-analysis': ['prioritize-decisions', 'understand-preferences'],
  'top-task-analysis': ['prioritize-decisions', 'understand-behavior'],

  // Quantitative Research — Pricing
  'van-westendorp': ['determine-pricing'],

  // Qualitative Research — Interview Research
  'expert-interviews': ['discover-needs', 'understand-mental-models'],
  'focus-groups': ['understand-users', 'generate-ideas'],

  // Qualitative Research — Contextual Research
  ethnography: ['understand-behavior', 'understand-mental-models'],
  observation: ['understand-behavior'],
  shadowing: ['understand-behavior', 'discover-needs'],
  'fly-on-the-wall-observation': ['understand-behavior'],
  'diary-studies': ['understand-behavior', 'discover-needs'],

  // Qualitative Research — Participatory Research
  'participatory-design': ['generate-ideas', 'understand-users', 'change-behavior'],
  'co-design-workshops': ['generate-ideas', 'understand-users', 'change-behavior'],
  'cultural-probes': ['understand-behavior', 'discover-needs'],

  // Qualitative Research — Behavioral Science
  'think-aloud': ['understand-mental-models'],
  'retrospective-think-aloud': ['understand-mental-models'],

  // Qualitative Research — Research Analysis
  'grounded-theory': ['analyze-findings'],

  // Qualitative Research — Research Rigor
  triangulation: ['validate-research', 'reduce-bias'],
  'mixed-methods-design': ['validate-research', 'reduce-bias'],
  'inter-rater-reliability': ['reduce-bias', 'validate-research'],
};

export function getStubUseCases(id: string): string[] {
  return TAXONOMY_USE_CASES[id] ?? [];
}
