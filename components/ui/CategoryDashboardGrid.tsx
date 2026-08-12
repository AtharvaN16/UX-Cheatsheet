'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Kbd } from '@astryxdesign/core/Kbd';
import { CATEGORIES, CATEGORY_GROUPS, getCategoryGroup } from '@/lib/categories';
import { getTaxonomyEntryCount } from '@/lib/taxonomy';
import { usePaletteControls } from '@/components/ui/PaletteProvider';

export function CategoryDashboardGrid() {
  const { open } = usePaletteControls();
  const [activeGroups, setActiveGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (title: string) => {
    setActiveGroups((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const cards = useMemo(
    () =>
      CATEGORIES.map((c) => ({
        ...c,
        count: getTaxonomyEntryCount(c.id),
        group: getCategoryGroup(c.id),
      })),
    [],
  );

  const visibleCards =
    activeGroups.size === 0
      ? cards
      : cards.filter((c) => c.group && activeGroups.has(c.group.title));

  return (
    <div className="mt-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={open}
          className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm text-secondary transition-colors hover:border-primary/40 hover:text-primary sm:max-w-xs"
        >
          <span>Search categories, methods…</span>
          <Kbd keys="mod+k" />
        </button>

        <div className="flex flex-wrap gap-2">
          {CATEGORY_GROUPS.map((g) => {
            const isActive = activeGroups.has(g.title);
            const dimmed = activeGroups.size > 0 && !isActive;
            return (
              <button
                key={g.title}
                type="button"
                onClick={() => toggleGroup(g.title)}
                aria-pressed={isActive}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-opacity ${g.fillClass} ${dimmed ? 'opacity-40' : 'opacity-100'}`}
              >
                {g.title}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {visibleCards.map((c) => (
          <Link
            key={c.id}
            href={`/c/${c.id}`}
            className={`flex flex-col justify-between rounded-xl p-5 shadow-sm transition-transform hover:scale-[1.02] ${c.group?.fillClass ?? 'bg-card text-primary'}`}
          >
            <span className="font-mono text-xs opacity-70">{c.number}</span>
            <div className="mt-6">
              <h2 className="text-lg font-semibold tracking-tight">{c.title}</h2>
              <p className="mt-1 text-xs opacity-80">{c.count} entries</p>
            </div>
          </Link>
        ))}
      </div>

      {visibleCards.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-secondary">
          No categories in the selected groups.
        </div>
      )}
    </div>
  );
}
