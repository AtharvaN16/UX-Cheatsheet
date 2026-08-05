import type { SearchSource, SearchableItem } from '@astryxdesign/core/Typeahead';
import { scoreMethods, type ScorableMethod, type MatchField } from './score';

export interface MethodAux {
  category: string;
  kind: string;
  /** CommandPalette auto-groups on this. */
  group: string;
}

export interface MethodItem extends SearchableItem<MethodAux> {
  id: string;
  label: string;
  auxiliaryData: MethodAux;
}

const GROUP_LABEL: Record<MatchField, string> = {
  title: 'METHODS',
  whenToUse: 'MATCHED ON WHEN TO USE',
  body: 'ALSO MENTIONS',
};

/**
 * Adapts the pure scorer to Astryx's SearchSource interface.
 * `recent` ids are returned by bootstrap() when the query is empty.
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
        return [{ ...item, auxiliaryData: { ...item.auxiliaryData, group: GROUP_LABEL[s.matchedOn] } }];
      });
    },
    bootstrap(): MethodItem[] {
      const seen = new Set<string>();
      return recent.flatMap((id) => {
        if (seen.has(id)) return [];
        seen.add(id);
        const item = byId.get(id);
        if (!item) return [];
        return [{ ...item, auxiliaryData: { ...item.auxiliaryData, group: 'RECENT' } }];
      });
    },
  };
}
