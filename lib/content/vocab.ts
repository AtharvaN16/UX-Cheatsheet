import { USE_CASES } from '../useCases';
import type { Method } from './load';

/**
 * Check that every `useCases` id resolves to the canonical vocabulary.
 *
 * The schema can only check the *shape* of these ids (kebab-case), not their
 * membership: `lib/useCases.ts` is the site-wide vocabulary and importing it
 * into the Zod schema would couple content validation to presentation data.
 * Without this check an invented-but-well-formed id passes the build and then
 * silently fails to match any filter in the UI — a defect with no visible
 * symptom at author time, which is exactly the kind worth catching in CI.
 */
export function checkUseCases(methods: Method[]): string[] {
  const valid = new Set(USE_CASES.map((u) => u.id));

  return methods.flatMap((m) =>
    m.useCases
      .filter((u) => !valid.has(u))
      .map((u) => `${m.id}.mdx: useCases — "${u}" is not in lib/useCases.ts`),
  );
}
