'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CATEGORIES, CATEGORY_GROUPS, getCategoryGroup } from '@/lib/categories';
import { getCategoryColor } from '@/lib/colors';
import { getCategoryIcon } from '@/lib/categoryIcons';

export function CategoryDashboardGrid() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeGroups, setActiveGroups] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<'default' | 'a-z' | 'z-a'>('default');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

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
      CATEGORIES.map((c) => {
        const group = getCategoryGroup(c.id);
        const colorHex = getCategoryColor(c.id).hex;
        return {
          ...c,
          group,
          colorHex,
          icon: getCategoryIcon(c.id),
        };
      }),
    [],
  );

  const filteredCards = useMemo(() => {
    let result = cards;

    // Filter by active category group checkboxes
    if (activeGroups.size > 0) {
      result = result.filter(
        (c) => c.group && activeGroups.has(c.group.title),
      );
    }

    // Filter by search query
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          (c.group && c.group.title.toLowerCase().includes(q)),
      );
    }

    // Sort order
    if (sortOrder === 'a-z') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortOrder === 'z-a') {
      result = [...result].sort((a, b) => b.title.localeCompare(a.title));
    }

    return result;
  }, [cards, activeGroups, searchQuery, sortOrder]);

  return (
    <div className="mt-8 space-y-8">
      {/* Control Bar: Filter & Sort Popover Dropdown & Grid/List View Toggle */}
      <div className="flex items-center justify-end gap-3">
        {/* Filter & Sort Popover Trigger */}
        <div className="relative">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`inline-flex items-center gap-2 rounded-full border border-[#E5E2D9] px-4 py-2.5 text-sm font-medium transition-colors ${
              isFilterOpen || activeGroups.size > 0 || sortOrder !== 'default'
                ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                : 'bg-white text-[#1A1A1A] hover:bg-[#F0EDE6]'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.707 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span>Filter and sort</span>
            {activeGroups.size > 0 && (
              <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
                {activeGroups.size}
              </span>
            )}
          </button>

          {/* Floating Popover Dropdown Overlay */}
          {isFilterOpen && (
            <>
              {/* Backdrop overlay to catch outside clicks */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsFilterOpen(false)}
              />

              {/* Floating Card Modal Overlay */}
              <div className="absolute right-0 sm:right-auto sm:left-0 mt-3 z-50 w-80 sm:w-96 rounded-2xl border border-[#E5E2D9] bg-[#FAF8F5] p-6 shadow-2xl space-y-5 text-[#1A1A1A]">
                {/* Header Title */}
                <div className="flex items-center justify-between border-b border-[#E6E3DA] pb-3">
                  <h3 className="text-xl font-bold text-[#1A1A1A] tracking-tight">Filter and sort</h3>
                  {(activeGroups.size > 0 || sortOrder !== 'default') && (
                    <button
                      onClick={() => {
                        setActiveGroups(new Set());
                        setSortOrder('default');
                      }}
                      className="text-xs font-semibold text-[#737067] hover:text-[#1A1A1A] underline"
                    >
                      Reset all
                    </button>
                  )}
                </div>

                {/* Section 1: Sort by Dropdown Accordion */}
                <div className="border-b border-[#E6E3DA] pb-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-[#3A3834]">Sort by</span>
                    <svg className="w-4 h-4 text-[#737067]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* Styled Pill Select Input */}
                  <div className="relative">
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as 'default' | 'a-z' | 'z-a')}
                      className="w-full appearance-none rounded-2xl border border-[#E6E3DA] bg-white px-5 py-3 text-base font-medium text-[#1A1A1A] pr-10 focus:outline-none focus:ring-1 focus:ring-black cursor-pointer shadow-xs"
                    >
                      <option value="default">Default Order</option>
                      <option value="a-z">Alphabetical (A – Z)</option>
                      <option value="z-a">Alphabetical (Z – A)</option>
                    </select>
                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#1A1A1A]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Section 2: Category Group Checkboxes */}
                <div className="pb-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-[#3A3834]">Category</span>
                    <svg className="w-4 h-4 text-[#737067]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {CATEGORY_GROUPS.map((g) => {
                      const isChecked = activeGroups.has(g.title);
                      return (
                        <label
                          key={g.title}
                          className="flex items-center gap-3 cursor-pointer group text-base font-medium text-[#1A1A1A] hover:text-black"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleGroup(g.title)}
                            className="w-5 h-5 rounded-md border-[#D1CEC4] text-[#1A1A1A] focus:ring-0 cursor-pointer"
                          />
                          <span>{g.title}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Grid / List Capsule View Toggle */}
        <div className="inline-flex items-center gap-1 rounded-full border border-[#E5E2D9] bg-[#F0EDE6] p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
              viewMode === 'grid'
                ? 'bg-white text-[#1A1A1A] shadow-xs'
                : 'text-[#737067] hover:text-[#1A1A1A]'
            }`}
            aria-label="Grid view"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
              <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z" />
            </svg>
            <span>Grid</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
              viewMode === 'list'
                ? 'bg-white text-[#1A1A1A] shadow-xs'
                : 'text-[#737067] hover:text-[#1A1A1A]'
            }`}
            aria-label="List view"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z" />
            </svg>
            <span>List</span>
          </button>
        </div>
      </div>

      {/* Cards Output Grid / List View */}
      {filteredCards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E5E2D9] bg-[#F0EDE6] p-12 text-center text-[#737067]">
          No categories found matching your search.
        </div>
      ) : viewMode === 'grid' ? (
        /* Taller 4-Column Grid View */
        <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCards.map((c) => (
            <Link
              key={c.id}
              href={`/c/${c.id}`}
              className="group flex flex-col justify-between rounded-2xl overflow-hidden bg-[#F0EDE6] border border-[#E5E2D9] transition-all duration-200 hover:shadow-md min-h-[320px] sm:min-h-[350px] focus:outline-none"
            >
              {/* Top Vector Line Art Header Block */}
              <div
                className="h-56 sm:h-60 w-full rounded-t-2xl relative flex items-center justify-center p-6 overflow-hidden transition-opacity group-hover:opacity-95 shrink-0"
                style={{ backgroundColor: c.colorHex }}
              >
                <div>{c.icon}</div>
              </div>

              {/* Bottom Card Content Body */}
              <div className="p-6 sm:p-7 flex flex-col justify-center flex-1 bg-[#F0EDE6] rounded-b-2xl">
                <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A1A] leading-snug tracking-tight group-hover:text-black transition-colors">
                  {c.title}
                </h2>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="space-y-4">
          {filteredCards.map((c) => (
            <Link
              key={c.id}
              href={`/c/${c.id}`}
              className="group flex items-center gap-6 p-4 sm:p-5 rounded-2xl bg-[#F0EDE6] border border-[#E5E2D9] transition-colors hover:bg-[#EAE6DD]"
            >
              <div className="flex items-center gap-6">
                <div
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg shrink-0 flex items-center justify-center overflow-hidden"
                  style={{ backgroundColor: c.colorHex }}
                >
                  <div className="scale-[0.42] flex items-center justify-center">{c.icon}</div>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A1A] group-hover:text-black">
                    {c.title}
                  </h2>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
