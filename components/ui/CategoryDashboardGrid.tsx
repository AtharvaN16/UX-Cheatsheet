'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CATEGORIES,
  CATEGORY_GROUPS,
  getCategoryGroup,
  getGroupColor,
} from '@/lib/categories';
import { getCategoryColor } from '@/lib/colors';
import { getCategoryIcon } from '@/lib/categoryIcons';
import { TAXONOMY } from '@/lib/taxonomy';
import { get1Liner } from '@/lib/taxonomyDescriptions';
import { inferKind } from '@/lib/inferKind';
import type { Method } from '@/lib/content';
import { ConceptSheetModal, type ConceptSheetItem } from '@/components/ui/ConceptSheetModal';

const BOOKMARKS_KEY = 'ux_cheatsheet_bookmarks';

interface CategoryDashboardGridProps {
  allMethods: Method[];
}

const getGroupSlug = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export function CategoryDashboardGrid({ allMethods }: CategoryDashboardGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGroups, setActiveGroups] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<'default' | 'a-z' | 'z-a'>('default');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showBookmarked, setShowBookmarked] = useState(false);
  const [sortSectionOpen, setSortSectionOpen] = useState(true);
  const [categorySectionOpen, setCategorySectionOpen] = useState(true);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [selectedConcept, setSelectedConcept] = useState<ConceptSheetItem | null>(null);
  const [activeGroupTitle, setActiveGroupTitle] = useState<string>('');

  // Load bookmarks from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(BOOKMARKS_KEY);
      if (stored) {
        setBookmarkedIds(new Set(JSON.parse(stored)));
      }
    } catch (e) {
      // Ignore SSR/storage error
    }
  }, []);

  // Scrollspy logic to highlight active category group in left sidebar as user scrolls
  useEffect(() => {
    const handleScroll = () => {
      const groupElements = CATEGORY_GROUPS.map((g) =>
        document.getElementById(`group-${getGroupSlug(g.title)}`)
      ).filter(Boolean) as HTMLElement[];

      const scrollPos = window.scrollY + 160;

      for (let i = groupElements.length - 1; i >= 0; i--) {
        const el = groupElements[i];
        if (el && el.offsetTop <= scrollPos) {
          const matchedGroup = CATEGORY_GROUPS.find(
            (g) => `group-${getGroupSlug(g.title)}` === el.id
          );
          if (matchedGroup) {
            setActiveGroupTitle(matchedGroup.title);
            return;
          }
        }
      }
      setActiveGroupTitle('');
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleBookmark = (id: string) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      try {
        localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(Array.from(next)));
      } catch (e) {}
      return next;
    });
  };

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
    []
  );

  const categoryTitleById = useMemo(() => {
    const map = new Map<string, string>();
    CATEGORIES.forEach((c) => map.set(c.id, c.title));
    return map;
  }, []);

  const methodsById = useMemo(() => {
    const map = new Map<string, Method>();
    allMethods.forEach((m) => map.set(m.id, m));
    return map;
  }, [allMethods]);

  // Every topic across every category, used for bookmarks view
  const allTopicItems = useMemo<ConceptSheetItem[]>(() => {
    const list: ConceptSheetItem[] = [];
    const seenIds = new Set<string>();

    TAXONOMY.forEach((taxCategory) => {
      const categoryTitle = categoryTitleById.get(taxCategory.categoryId) ?? taxCategory.categoryId;
      taxCategory.groups.forEach((group) => {
        group.items.forEach((item) => {
          seenIds.add(item.id);
          const written = methodsById.get(item.id);
          const rawDesc = written?.sections['What is it'] ?? get1Liner(item.id, item.title);
          const cleanDesc = rawDesc.replace(/\n+/g, ' ').trim();

          list.push({
            id: item.id,
            title: item.title,
            topicTitle: categoryTitle,
            description: cleanDesc,
            isWritten: !!written,
            kind: written?.kind || inferKind(item.title, taxCategory.categoryId, item.id),
            method: written,
          });
        });
      });
    });

    // Add written methods that aren't listed in the taxonomy
    methodsById.forEach((written, id) => {
      if (!seenIds.has(id)) {
        const categoryTitle = categoryTitleById.get(written.category) ?? written.category;
        const rawDesc = written.sections['What is it'] ?? get1Liner(id, written.title);
        const cleanDesc = rawDesc.replace(/\n+/g, ' ').trim();

        list.push({
          id: written.id,
          title: written.title,
          topicTitle: categoryTitle,
          description: cleanDesc,
          isWritten: true,
          kind: written.kind || inferKind(written.title, written.category, written.id),
          method: written,
        });
      }
    });

    return list;
  }, [categoryTitleById, methodsById]);

  // Topic count per category ID
  const topicCountsByCategoryId = useMemo(() => {
    const map = new Map<string, number>();
    TAXONOMY.forEach((catTax) => {
      const count = catTax.groups.reduce((sum, g) => sum + g.items.length, 0);
      map.set(catTax.categoryId, count);
    });
    return map;
  }, []);

  const bookmarkedTopicItems = useMemo(
    () => allTopicItems.filter((item) => bookmarkedIds.has(item.id)),
    [allTopicItems, bookmarkedIds]
  );

  const filteredCards = useMemo(() => {
    let result = cards;

    // Filter by active category group checkboxes
    if (activeGroups.size > 0) {
      result = result.filter((c) => c.group && activeGroups.has(c.group.title));
    }

    // Filter by search query
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          (c.group && c.group.title.toLowerCase().includes(q))
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

  const scrollToGroup = (groupTitle: string) => {
    const slug = getGroupSlug(groupTitle);
    const el = document.getElementById(`group-${slug}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveGroupTitle(groupTitle);
    }
  };

  return (
    <>
      {/* 1. Top Full-Width Control Bar Row (Search Bar end-to-end with divider below) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-[#E5E2D9] w-full">
        {/* Search Input Filter */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories..."
            className="w-full rounded-full border border-[#E5E2D9] bg-white px-4 py-2.5 text-sm text-[#1A1A1A] placeholder-[#8C887E] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] shadow-2xs pr-9"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C887E] hover:text-[#1A1A1A]"
            >
              ✕
            </button>
          ) : (
            <svg
              className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C887E] pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          )}
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Bookmarked Topics Toggle */}
          <button
            onClick={() => setShowBookmarked((v) => !v)}
            className={`inline-flex items-center justify-center rounded-full border w-10 h-10 shrink-0 transition-colors ${
              showBookmarked
                ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                : 'bg-white text-[#1A1A1A] border-[#E5E2D9] hover:bg-[#F0EDE6]'
            }`}
            aria-label={showBookmarked ? 'Show all categories' : 'Show bookmarked topics'}
            aria-pressed={showBookmarked}
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 256 256"
              fill={showBookmarked ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth={showBookmarked ? 0 : 20}
            >
              <path d="M192,224a8,8,0,0,1-11.84,7.06L128,200.43,75.84,231.06A8,8,0,0,1,64,224V48A16,16,0,0,1,80,32H176a16,16,0,0,1,16,16Z" />
            </svg>
          </button>

          {!showBookmarked && (
            /* Filter & Sort Popover Trigger */
            <div className="relative">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`inline-flex items-center gap-2 rounded-full border border-[#E5E2D9] px-4 py-2.5 text-sm font-medium transition-colors ${
                  isFilterOpen || activeGroups.size > 0 || sortOrder !== 'default'
                    ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                    : 'bg-white text-[#1A1A1A] hover:bg-[#F0EDE6]'
                }`}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.707 7.293A1 1 0 013 6.586V4z"
                  />
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
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsFilterOpen(false)}
                  />

                  <div className="absolute right-0 sm:right-auto sm:left-0 mt-3 z-50 w-80 sm:w-96 rounded-2xl border border-[#E5E2D9] bg-[#FAF8F5] p-6 shadow-2xl space-y-5 text-[#1A1A1A]">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-[#1A1A1A] tracking-tight">
                        Filter and sort
                      </h3>
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

                    {/* Section 1: Sort by */}
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => setSortSectionOpen((v) => !v)}
                        className="w-full flex items-center justify-between"
                      >
                        <span className="text-base font-semibold text-[#3A3834]">Sort by</span>
                        <svg
                          className={`w-4 h-4 text-[#737067] transition-transform duration-200 ${
                            sortSectionOpen ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>

                      {sortSectionOpen && (
                        <div className="relative">
                          <select
                            value={sortOrder}
                            onChange={(e) =>
                              setSortOrder(e.target.value as 'default' | 'a-z' | 'z-a')
                            }
                            className="w-full appearance-none rounded-2xl border border-[#E6E3DA] bg-white px-5 py-3 text-base font-medium text-[#1A1A1A] pr-10 focus:outline-none focus:ring-1 focus:ring-black cursor-pointer shadow-xs"
                          >
                            <option value="default">Default Order</option>
                            <option value="a-z">Alphabetical (A – Z)</option>
                            <option value="z-a">Alphabetical (Z – A)</option>
                          </select>
                          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#1A1A1A]">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Section 2: Category Group Checkboxes */}
                    <div className="pb-1 space-y-4">
                      <button
                        type="button"
                        onClick={() => setCategorySectionOpen((v) => !v)}
                        className="w-full flex items-center justify-between"
                      >
                        <span className="text-base font-semibold text-[#3A3834]">
                          Category Group
                        </span>
                        <svg
                          className={`w-4 h-4 text-[#737067] transition-transform duration-200 ${
                            categorySectionOpen ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>

                      {categorySectionOpen && (
                        <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                          {CATEGORY_GROUPS.map((g) => {
                            const isChecked = activeGroups.has(g.title);
                            return (
                              <label
                                key={g.title}
                                className="flex items-center gap-3 cursor-pointer group text-sm font-medium text-[#1A1A1A] hover:text-black"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleGroup(g.title)}
                                  className="w-4 h-4 rounded-md border-[#D1CEC4] text-[#1A1A1A] focus:ring-0 cursor-pointer"
                                />
                                <span>{g.title}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. Main Content Container: Sidenav aligned with top of first category */}
      <div className="lg:flex lg:gap-10 items-start">
        {/* Left Freed-Up Space: Category Group Navigation Sidebar */}
        <aside className="hidden lg:block w-64 xl:w-72 shrink-0 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-3 space-y-1 text-[#1A1A1A]">
          <nav className="space-y-1">
            {CATEGORY_GROUPS.map((g) => {
              const isActive = activeGroupTitle === g.title;
              const groupColor = getGroupColor(g.title);

              return (
                <button
                  key={g.title}
                  type="button"
                  onClick={() => scrollToGroup(g.title)}
                  className={`w-full flex items-center justify-between px-2 py-2 rounded-xl text-sm transition-colors text-left group ${
                    isActive
                      ? 'font-extrabold text-[#1A1A1A]'
                      : 'font-medium text-[#737067] hover:text-[#1A1A1A]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-3 h-3 rounded-[3px] shrink-0"
                      style={{ backgroundColor: groupColor }}
                    />
                    <span className="truncate">{g.title}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Right Main Area */}
        <main className="flex-1 min-w-0">
          {/* Mobile Category Horizontal Pill Bar */}
          <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
            {CATEGORY_GROUPS.map((g) => (
              <button
                key={g.title}
                type="button"
                onClick={() => scrollToGroup(g.title)}
                className={`shrink-0 flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs transition-colors border ${
                  activeGroupTitle === g.title
                    ? 'font-extrabold text-[#1A1A1A] bg-[#F0EDE6] border-[#1A1A1A]'
                    : 'font-medium text-[#737067] bg-[#F0EDE6] border-[#E5E2D9] hover:text-[#1A1A1A]'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-[2px] shrink-0"
                  style={{ backgroundColor: getGroupColor(g.title) }}
                />
                <span>{g.title}</span>
              </button>
            ))}
          </div>

          {/* Bookmarked Topics View */}
          {showBookmarked ? (
            bookmarkedTopicItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#E5E2D9] bg-[#F0EDE6] p-12 text-center text-[#737067]">
                No bookmarked topics yet. Bookmark cards from inside a category to see them here.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {bookmarkedTopicItems.map((item) => {
                  const kindSquareBg =
                    (item.kind || 'concept').toLowerCase().trim() === 'method'
                      ? 'bg-blue-500'
                      : (item.kind || 'concept').toLowerCase().trim() === 'framework'
                      ? 'bg-emerald-500'
                      : 'bg-orange-500';

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedConcept(item)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedConcept(item);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      className="group block h-full text-left focus:outline-none cursor-pointer"
                    >
                      <div className="h-full min-h-[170px] sm:min-h-[190px] flex flex-col justify-between rounded-2xl border p-6 bg-[#F0EDE6] border-[#E5E2D9] transition-all duration-200 group-hover:border-[#1A1A1A]/40 group-hover:shadow-md relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBookmark(item.id);
                          }}
                          className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-black/5 transition-colors text-[#737067] hover:text-[#1A1A1A] focus:outline-none"
                          aria-label="Remove bookmark"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 256 256" fill="#1A1A1A">
                            <path d="M192,224a8,8,0,0,1-11.84,7.06L128,200.43,75.84,231.06A8,8,0,0,1,64,224V48A16,16,0,0,1,80,32H176a16,16,0,0,1,16,16Z" />
                          </svg>
                        </button>

                        <div>
                          <div className="flex items-start gap-2.5 pr-10">
                            <span
                              className={`w-3.5 h-3.5 mt-1 sm:w-4 sm:h-4 rounded-[4px] shrink-0 ${kindSquareBg}`}
                              aria-hidden="true"
                            />
                            <h3 className="text-lg font-bold text-[#1A1A1A] group-hover:text-black tracking-tight leading-snug">
                              {item.title}
                            </h3>
                          </div>
                          <p className="text-sm text-[#737067] line-clamp-3 leading-relaxed mt-2.5 pl-6">
                            {item.description}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-[#E5E2D9]/60 flex items-center justify-between text-xs font-semibold text-[#8C887E]">
                          <span className="capitalize">{item.topicTitle}</span>
                          <span className="text-[#1A1A1A] opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                            Read sheet →
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : filteredCards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E5E2D9] bg-[#F0EDE6] p-12 text-center text-[#737067]">
              No categories found matching your search.
            </div>
          ) : (
            /* Main Content: Category Group Sections (NO subheadings, NO category count, NO line dividers) */
            <div className="space-y-12">
              {CATEGORY_GROUPS.map((group) => {
                const groupCards = filteredCards.filter(
                  (c) => c.group?.title === group.title
                );
                if (groupCards.length === 0) return null;

                const groupSlug = getGroupSlug(group.title);
                const groupColor = getGroupColor(group.title);

                return (
                  <section
                    key={group.title}
                    id={`group-${groupSlug}`}
                    className="scroll-mt-32"
                    aria-label={group.title}
                  >
                    {/* Category Group Header Block: Clean Icon Badge + Title (NO subheadings, NO counts, NO line dividers) */}
                    <div className="flex items-center gap-4 mb-6">
                      {/* Group Color Badge Pill */}
                      <div
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs"
                        style={{ backgroundColor: groupColor }}
                      >
                        <span className="w-3 h-3 rounded-full bg-white" />
                      </div>

                      <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A1A] tracking-tight">
                        {group.title}
                      </h2>
                    </div>

                    {/* 3-Cards Column Layout of Category Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {groupCards.map((c) => {
                        const count = topicCountsByCategoryId.get(c.id) ?? 0;

                        return (
                          <Link
                            key={c.id}
                            href={`/c/${c.id}`}
                            className="group flex flex-col justify-between rounded-2xl overflow-hidden bg-[#F0EDE6] border border-[#E5E2D9] transition-all duration-200 hover:shadow-md min-h-[300px] sm:min-h-[330px] focus:outline-none"
                          >
                            {/* Top Vector Line Art Header Block */}
                            <div
                              className="h-52 sm:h-56 w-full rounded-t-2xl relative flex items-center justify-center p-6 overflow-hidden transition-opacity group-hover:opacity-95 shrink-0"
                              style={{ backgroundColor: c.colorHex }}
                            >
                              <div>{c.icon}</div>
                            </div>

                            {/* Bottom Card Content Body */}
                            <div className="p-6 sm:p-7 flex flex-col justify-between flex-1 bg-[#F0EDE6] rounded-b-2xl">
                              <h3 className="text-xl sm:text-2xl font-bold text-[#1A1A1A] leading-snug tracking-tight group-hover:text-black transition-colors">
                                {c.title}
                              </h3>
                              <span className="text-xs font-bold text-[#8C887E] mt-3 block group-hover:text-[#1A1A1A] transition-colors">
                                {count} topics inside →
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </main>
      </div>

      <ConceptSheetModal item={selectedConcept} onClose={() => setSelectedConcept(null)} />
    </>
  );
}
