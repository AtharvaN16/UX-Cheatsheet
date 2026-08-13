/**
 * Pure utility function to infer kind ('method' | 'framework' | 'concept')
 * based on item title, category, and ID.
 * Safe to import from both Server Components (app/layout.tsx) and Client Components.
 *
 * Core Distinctions:
 * - Method: An activity you perform ("How do I do this?")
 * - Framework: A structure/scaffolding you use ("How is this structured?")
 * - Concept: An idea, principle, law, or mechanism you understand ("What does this mean?")
 */
export function inferKind(title: string, categoryId: string, itemId: string): 'method' | 'framework' | 'concept' {
  const cat = categoryId.toLowerCase().trim();
  const t = title.toLowerCase().trim();
  const id = itemId.toLowerCase().trim();

  // Explicit ID overrides for precise classification
  const CONCEPT_IDS = new Set([
    'cognitive-accessibility',
    'cognitive-walkthrough',
    'motion-principles',
    'color-theory',
    'gestalt-principles',
    'grounded-theory',
    'novelty-effect',
    'second-order-effects',
    'emergent-behavior',
    'first-principles',
    'pareto-principle',
    'expected-value',
    'opportunity-cost',
    'stocks-and-flows',
    'leverage-points',
    'feedback-loops',
  ]);

  const FRAMEWORK_IDS = new Set([
    'pirate-metrics-aarrr',
    'heart',
    'okrs',
    'kano-model',
    'rice',
    'ice',
    'moscow',
    'wsjf',
    'daci',
    'rapid',
    'ooda-loop',
    'kpi-trees',
    'governance-models',
    'contribution-model',
    'content-modelling',
    'site-maps',
    'tree-testing',
    'heatmaps',
    'funnel-analysis',
    'stakeholder-maps',
    'ecosystem-maps',
    'backstage-mapping',
    'constraints-mapping',
    'affinity-mapping',
    'journey-mapping',
    'experience-mapping',
    'empathy-maps',
    'jtbd-statements',
    'grid-systems',
    'morphological-matrix',
    'risk-matrix',
    'eisenhower-matrix',
    'impact-effort-matrix',
    'value-proposition-canvas',
    'business-model-canvas',
    'opportunity-solution-tree',
    'cynefin-framework',
    'double-diamond',
    'story-mapping',
  ]);

  if (CONCEPT_IDS.has(id)) return 'concept';
  if (FRAMEWORK_IDS.has(id)) return 'framework';

  // Category rule: UX Psychology items are all concepts
  if (cat === 'ux-psychology') return 'concept';

  // Concepts: Laws, effects, biases, rules, theories, fallacies, thresholds, principles, paradoxes, mental models
  if (
    t.includes('law') ||
    t.includes('effect') ||
    t.includes('bias') ||
    t.includes('rule') ||
    t.includes('theory') ||
    t.includes('fallacy') ||
    t.includes('threshold') ||
    t.includes('principle') ||
    t.includes('paradox') ||
    t.includes('mental model') ||
    t.includes('cognitive')
  ) {
    return 'concept';
  }

  // Frameworks: Framework, model, canvas, matrix, tree, funnel, grid, system map, blueprint, taxonomy
  if (
    t.includes('framework') ||
    t.includes('model') ||
    t.includes('canvas') ||
    t.includes('matrix') ||
    t.includes('tree') ||
    t.includes('funnel') ||
    t.includes('grid') ||
    t.includes('blueprint') ||
    t.includes('taxonomy') ||
    id.includes('mapping') ||
    id.includes('maps') ||
    id.includes('matrix') ||
    id.includes('canvas') ||
    id.includes('tree')
  ) {
    return 'framework';
  }

  // Default: Methods are activities performed by practitioners
  return 'method';
}

