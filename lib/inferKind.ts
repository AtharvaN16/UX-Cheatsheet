/**
 * Pure utility function to infer kind ('method' | 'framework' | 'concept')
 * based on item title, category, and ID.
 * Safe to import from both Server Components (app/layout.tsx) and Client Components.
 */
export function inferKind(title: string, categoryId: string, itemId: string): 'method' | 'framework' | 'concept' {
  const cat = categoryId.toLowerCase().trim();
  const t = title.toLowerCase().trim();
  const id = itemId.toLowerCase().trim();

  if (cat === 'ux-psychology') return 'concept';

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

  if (
    t.includes('framework') ||
    t.includes('model') ||
    t.includes('canvas') ||
    t.includes('matrix') ||
    t.includes('tree') ||
    t.includes('funnel') ||
    t.includes('grid') ||
    t.includes('map') ||
    id.includes('jtbd') ||
    id.includes('rice') ||
    id.includes('kano') ||
    id.includes('aarrr') ||
    id.includes('heart') ||
    id.includes('okrs')
  ) {
    return 'framework';
  }

  return 'method';
}
