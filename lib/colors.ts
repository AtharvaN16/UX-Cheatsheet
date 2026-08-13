import { getCategoryGroup } from '@/lib/categories';

export interface LawsOfUXColor {
  hex: string;
  name: string;
}

/**
 * Muted solid colors shared 1-to-1 by category cards & topic page banners
 */
export const GROUP_MUTED_COLORS: Record<string, LawsOfUXColor> = {
  'UX Psychology': { hex: '#D97757', name: 'Terracotta' },
  'Strategic Thinking': { hex: '#5B9A82', name: 'Sage Teal' },
  'Research': { hex: '#5A92C6', name: 'Sky Blue' },
  'Design & Craft': { hex: '#8C77B8', name: 'Dusk Violet' },
  'Evaluation & Optimization': { hex: '#C85A32', name: 'Warm Copper' },
  'Systems & Professional Practice': { hex: '#D99B43', name: 'Warm Ochre' },
};

export const DEFAULT_FALLBACK_COLOR: LawsOfUXColor = {
  hex: '#D97757',
  name: 'Terracotta',
};

export function getCategoryColor(categoryId: string): LawsOfUXColor {
  const group = getCategoryGroup(categoryId);
  if (group && GROUP_MUTED_COLORS[group.title]) {
    return GROUP_MUTED_COLORS[group.title];
  }
  return DEFAULT_FALLBACK_COLOR;
}

export function getGroupColor(index: number): LawsOfUXColor {
  const values = Object.values(GROUP_MUTED_COLORS);
  return values[index % values.length];
}
