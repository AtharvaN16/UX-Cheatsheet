'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CATEGORY_GROUPS, getCategory, type Category } from '@/lib/categories';
import { getCategoryColor } from '@/lib/colors';

export function CategoryGroupList({
  counts,
}: {
  counts: Record<string, number>;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="mt-12 space-y-10" onMouseLeave={() => setHoveredId(null)}>
      {CATEGORY_GROUPS.map((group) => {
        const groupCategories = group.categoryIds
          .map((id) => getCategory(id))
          .filter((c): c is Category => c !== undefined);

        // A group wrapping exactly one category, titled the same as that
        // category, would show its own name twice (header, then item).
        // Collapse header + item into a single pill instead of duplicating text.
        if (groupCategories.length === 1 && groupCategories[0].title === group.title) {
          const c = groupCategories[0];
          const isHovered = hoveredId === c.id;
          const isAnyHovered = hoveredId !== null;

          return (
            <section key={group.title}>
              <Link
                href={`/c/${c.id}`}
                onMouseEnter={() => setHoveredId(c.id)}
                className={`flex items-baseline justify-between gap-4 rounded-lg px-4 py-3.5 transition-opacity ease-out ${group.fillClass}`}
                style={{
                  opacity: isAnyHovered && !isHovered ? 0.6 : 1,
                  transitionDuration: '600ms',
                }}
              >
                <span className="text-base font-semibold tracking-[-0.01em]">{c.title}</span>
                <span className="text-sm font-medium opacity-80">{counts[c.id] ?? 0}</span>
              </Link>
            </section>
          );
        }

        return (
          <section key={group.title}>
            <div className={`mb-3.5 rounded-lg px-4 py-3.5 ${group.fillClass}`}>
              <h2 className="text-base font-semibold tracking-[-0.01em]">
                {group.title}
              </h2>
            </div>
            <ul className="space-y-1">
              {groupCategories.map((c) => {
                const isHovered = hoveredId === c.id;
                const isAnyHovered = hoveredId !== null;
                const catColor = getCategoryColor(c.id);

                return (
                  <li key={c.id}>
                    <Link
                      href={`/c/${c.id}`}
                      onMouseEnter={() => setHoveredId(c.id)}
                      className="flex items-center justify-between gap-4 px-4 py-2.5 transition-opacity ease-out hover:text-primary"
                      style={{
                        opacity: isAnyHovered && !isHovered ? 0.3 : 1,
                        transitionDuration: '600ms',
                      }}
                    >
                      <div
                        className="flex flex-1 items-center gap-3 transition-transform ease-out"
                        style={{
                          transform: isHovered ? 'translateX(24px)' : 'translateX(0px)',
                          transitionDuration: '600ms',
                        }}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: catColor.hex }}
                          aria-hidden="true"
                        />
                        <span className="text-primary">{c.title}</span>
                      </div>
                      <span className="text-sm font-medium text-secondary">
                        {counts[c.id] ?? 0}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
