/**
 * Canonical, site-wide "use case" vocabulary — a cross-cutting facet ("why would I
 * use this?") layered on top of the category taxonomy ("what is it?"). A method can
 * carry any number of these, unlike `category`/`kind` which are mutually exclusive.
 *
 * Started with Quantitative Research; extend this list as other categories adopt
 * the use-case filter — one shared vocabulary so tags compose across categories
 * instead of each one inventing its own.
 */
export interface UseCase {
  id: string;
  label: string;
}

export const USE_CASES: readonly UseCase[] = [
  // Quantitative Research
  { id: 'understand-behavior', label: 'Understand behavior' },
  { id: 'identify-problems', label: 'Identify problems' },
  { id: 'measure-usability', label: 'Measure usability' },
  { id: 'measure-attitudes', label: 'Measure attitudes' },
  { id: 'compare-alternatives', label: 'Compare alternatives' },
  { id: 'prioritize-decisions', label: 'Prioritize decisions' },
  { id: 'validate-design', label: 'Validate a design' },
  { id: 'understand-preferences', label: "Understand users' preferences" },
  { id: 'determine-pricing', label: 'Determine pricing' },

  // Qualitative Research (understand-behavior above is shared/reused, not duplicated)
  { id: 'understand-users', label: 'Understand users' },
  { id: 'discover-needs', label: 'Discover needs' },
  { id: 'understand-mental-models', label: 'Understand mental models' },
  { id: 'generate-ideas', label: 'Generate ideas' },
  { id: 'change-behavior', label: 'Change behavior' },
  { id: 'analyze-findings', label: 'Analyze findings' },
  { id: 'validate-research', label: 'Validate research' },
  { id: 'reduce-bias', label: 'Reduce bias' },

  // Evaluation (measure-usability and validate-design above are shared/reused)
  { id: 'diagnose-usability', label: 'Diagnose usability' },
  { id: 'compare-designs', label: 'Compare designs' },
  { id: 'evaluate-accessibility', label: 'Evaluate accessibility' },
  { id: 'evaluate-navigation', label: 'Evaluate navigation' },
  { id: 'predict-performance', label: 'Predict performance' },
  { id: 'track-usability-over-time', label: 'Track usability over time' },
] as const;

const USE_CASE_MAP = new Map(USE_CASES.map((u) => [u.id, u]));

export function getUseCase(id: string): UseCase | undefined {
  return USE_CASE_MAP.get(id);
}

export function getUseCaseLabel(id: string): string {
  return USE_CASE_MAP.get(id)?.label ?? id;
}
