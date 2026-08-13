import type { SearchSource, SearchableItem } from '@astryxdesign/core/Typeahead';
import { scoreMethods, type ScorableMethod, type MatchField } from './score';

export interface MethodAux {
  category: string;
  kind: string;
  /** CommandPalette auto-groups on this. */
  group: string;
  /** Route to navigate to on selection. */
  href?: string;
  /** Distinguishes a category entry from a method entry. */
  type?: 'method' | 'category';
  matchedOn?: MatchField;
  matchedSnippet?: string;
}

export interface MethodItem extends SearchableItem<MethodAux> {
  id: string;
  label: string;
  auxiliaryData: MethodAux;
}

const POPULAR_DEFAULTS = [
  'ux-psychology',
  'hicks-law',
  'fitts-law',
  'strategic-thinking',
  'research-synthesis',
  'kano-model',
  'jobs-to-be-done',
  'ia-structure',
  'interaction-design',
  'evaluation',
];

/**
 * Adapts the pure scorer to Astryx's SearchSource interface.
 */
export function createMethodSource(
  items: MethodItem[],
  scorables: ScorableMethod[],
  recent: string[] = [],
): SearchSource<MethodItem> {
  const byId = new Map(items.map((i) => [i.id, i]));

  return {
    search(query: string): MethodItem[] {
      return scoreMethods(query, scorables).flatMap((s) => {
        const item = byId.get(s.id);
        if (!item) return [];

        const group = item.auxiliaryData.type === 'category' ? 'CATEGORIES' : 'CHEATSHEETS';

        return [
          {
            ...item,
            auxiliaryData: {
              ...item.auxiliaryData,
              group,
              matchedOn: s.matchedOn,
              matchedSnippet: s.matchedOn !== 'title' ? s.matchedSnippet : undefined,
            },
          },
        ];
      });
    },
    bootstrap(): MethodItem[] {
      const seen = new Set<string>();
      const list: MethodItem[] = [];

      // 1. Add recent visits / searches
      recent.forEach((id) => {
        if (!seen.has(id)) {
          seen.add(id);
          const item = byId.get(id);
          if (item) {
            list.push({ ...item, auxiliaryData: { ...item.auxiliaryData, group: 'RECENT & BOOKMARKED' } });
          }
        }
      });

      // 2. Add bookmarked items from localStorage
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('ux_cheatsheet_bookmarks');
          if (stored) {
            const bIds: string[] = JSON.parse(stored);
            bIds.forEach((id) => {
              if (!seen.has(id)) {
                seen.add(id);
                const item = byId.get(id);
                if (item) {
                  list.push({ ...item, auxiliaryData: { ...item.auxiliaryData, group: 'RECENT & BOOKMARKED' } });
                }
              }
            });
          }
        } catch (e) {}
      }

      // 3. Always fill up to 8 items with popular cheatsheet suggestions
      POPULAR_DEFAULTS.forEach((id) => {
        if (list.length < 8 && !seen.has(id)) {
          seen.add(id);
          const item = byId.get(id);
          if (item) {
            const groupName = list.length === 0 ? 'SUGGESTED CHEATSHEETS' : 'POPULAR CHEATSHEETS';
            list.push({ ...item, auxiliaryData: { ...item.auxiliaryData, group: groupName } });
          }
        }
      });

      return list;
    },
  };
}
