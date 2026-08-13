'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import type { Method } from '@/lib/content';
import type { TaxonomyGroup } from '@/lib/taxonomy';
import { get1Liner } from '@/lib/taxonomyDescriptions';
import { ConceptSheetModal, type ConceptSheetItem, SHEET_TRANSITION } from '@/components/ui/ConceptSheetModal';
import { CategoryBanner } from '@/components/ui/CategoryBanner';
import { inferKind } from '@/lib/inferKind';

export type CategoryItem = ConceptSheetItem;

interface CategoryTopicGridProps {
  categoryId: string;
  categoryTitle: string;
  groups: TaxonomyGroup[];
  methods: Method[];
  secondaryMethods?: Method[];
}

export function CategoryTopicGrid({
  categoryId,
  categoryTitle,
  groups,
  methods,
  secondaryMethods = [],
}: CategoryTopicGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [kindFilter, setKindFilter] = useState<'all' | 'method' | 'framework' | 'concept'>('all');
  const [effortFilter, setEffortFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [sortOrder, setSortOrder] = useState<'default' | 'a-z' | 'z-a'>('default');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<CategoryItem | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);
  const [sortSectionOpen, setSortSectionOpen] = useState(true);
  const [typeSectionOpen, setTypeSectionOpen] = useState(true);

  // Load bookmarks from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ux_cheatsheet_bookmarks');
      if (stored) {
        setBookmarkedIds(new Set(JSON.parse(stored)));
      }
    } catch (e) {
      // Ignore SSR/storage error
    }
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
        localStorage.setItem('ux_cheatsheet_bookmarks', JSON.stringify(Array.from(next)));
      } catch (e) {}
      return next;
    });
  };

  const writtenMap = useMemo(() => {
    const map = new Map<string, Method>();
    methods.forEach((m) => map.set(m.id, m));
    secondaryMethods.forEach((m) => map.set(m.id, m));
    return map;
  }, [methods, secondaryMethods]);

  // Consolidate all items under their respective topics
  const allItems = useMemo<CategoryItem[]>(() => {
    const list: CategoryItem[] = [];
    const seenIds = new Set<string>();

    if (groups && groups.length > 0) {
      groups.forEach((group) => {
        const groupTitle = group.title ?? categoryTitle;
        group.items.forEach((item) => {
          seenIds.add(item.id);
          const written = writtenMap.get(item.id);
          const rawDesc = written?.sections['What is it'] ?? get1Liner(item.id, item.title);
          const cleanDesc = rawDesc.replace(/\n+/g, ' ').trim();
          const itemKind = written?.kind || inferKind(item.title, categoryId, item.id);

          list.push({
            id: item.id,
            title: item.title,
            topicTitle: groupTitle,
            description: cleanDesc,
            isWritten: !!written,
            kind: itemKind,
            method: written,
          });
        });
      });
    }

    // Add un-grouped written methods
    writtenMap.forEach((written, id) => {
      if (!seenIds.has(id)) {
        const rawDesc = written.sections['What is it'] ?? get1Liner(id, written.title);
        const cleanDesc = rawDesc.replace(/\n+/g, ' ').trim();

        list.push({
          id: written.id,
          title: written.title,
          topicTitle: categoryTitle,
          description: cleanDesc,
          isWritten: true,
          kind: written.kind || inferKind(written.title, categoryId, written.id),
          method: written,
        });
      }
    });

    return list;
  }, [groups, categoryTitle, categoryId, writtenMap]);

  // Deep link from search (e.g. /c/ux-psychology?item=hicks-law): open that item's sheet on load
  useEffect(() => {
    const deepLinkId = searchParams.get('item');
    if (!deepLinkId) return;

    const match = allItems.find((i) => i.id === deepLinkId);
    if (match) setSelectedConcept(match);

    router.replace(`/c/${categoryId}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, allItems, categoryId]);

  // Compute unique topic tabs
  const tabs = useMemo(() => {
    const topicSet = new Set<string>();
    allItems.forEach((i) => {
      if (i.topicTitle && i.topicTitle !== categoryTitle) {
        topicSet.add(i.topicTitle);
      }
    });
    return ['all', ...Array.from(topicSet)];
  }, [allItems, categoryTitle]);

  // Filtered and sorted items
  const displayedItems = useMemo(() => {
    let result = allItems;

    // Filter by topic tab
    if (activeTab !== 'all') {
      result = result.filter((item) => item.topicTitle === activeTab);
    }

    // Filter by kind (method, framework, concept)
    if (kindFilter !== 'all') {
      result = result.filter((item) => {
        const k = (item.kind || item.method?.kind || 'method').toLowerCase().trim();
        return k === kindFilter;
      });
    }

    // Filter by effort (only meaningful when narrowed to Methods)
    if (kindFilter === 'method' && effortFilter !== 'all') {
      result = result.filter((item) => {
        const e = (item.method?.effort || 'low').toLowerCase().trim();
        return e === effortFilter;
      });
    }

    // Filter down to bookmarked items only
    if (showBookmarkedOnly) {
      result = result.filter((item) => bookmarkedIds.has(item.id));
    }

    // Filter by search query
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) => item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortOrder === 'a-z') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortOrder === 'z-a') {
      result = [...result].sort((a, b) => b.title.localeCompare(a.title));
    }

    return result;
  }, [allItems, activeTab, kindFilter, effortFilter, searchQuery, sortOrder, showBookmarkedOnly, bookmarkedIds]);

  const isModalOpen = selectedConcept !== null;

  // Escape on the topic page (sheet closed) navigates back to the main cheatsheet page.
  // When the sheet is open, ConceptSheetModal owns Escape and closes itself instead.
  useEffect(() => {
    if (isModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') router.push('/');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, router]);

  return (
    <>
      {/* Background Page Content (Animates scale, fade, and blur on sheet open) */}
      <motion.div
        animate={{
          scale: isModalOpen ? 0.94 : 1,
          opacity: isModalOpen ? 0.45 : 1,
          filter: isModalOpen ? 'blur(6px)' : 'blur(0px)',
          borderRadius: '0px',
        }}
        transition={SHEET_TRANSITION}
        className="w-full space-y-8 origin-top overflow-hidden"
      >
        {/* Category Banner */}
        <CategoryBanner categoryId={categoryId} title={categoryTitle} />

        {/* Inner Content Section padded with px-8 sm:px-12 to align with banner text */}
        <div className="w-full space-y-8 px-8 sm:px-12">
          {/* Top Tabs Bar: Topics within the category */}
          <div className="border-b border-border/40 pb-1">
            <nav className="flex flex-wrap gap-x-6 gap-y-2 overflow-x-auto text-sm font-medium">
              {tabs.map((tab) => {
                const isAll = tab === 'all';
                const label = isAll ? 'All' : tab;
                const isActive = activeTab === tab;
                const count = isAll
                  ? allItems.length
                  : allItems.filter((i) => i.topicTitle === tab).length;

                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`relative pb-3 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                      isActive
                        ? 'text-primary font-bold border-b-2 border-primary'
                        : 'text-secondary hover:text-primary'
                    }`}
                  >
                    <span>{label}</span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'bg-surface text-secondary/70'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Control Bar: Local Search on Left, Bookmark Toggle & Filter/Sort on Right */}
          <div className="flex items-center justify-between gap-3 py-1">
            {/* Local Search Input */}
            <div className="relative w-full max-w-xs">
              <svg
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C887E]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search this category..."
                className="w-full rounded-full border border-[#E5E2D9] bg-white pl-10 pr-4 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#8C887E] focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>

            <div className="flex items-center gap-3 shrink-0">
            {/* Bookmarked-Only Toggle */}
            <button
              onClick={() => setShowBookmarkedOnly((v) => !v)}
              className={`inline-flex items-center justify-center rounded-full border w-10 h-10 shrink-0 transition-colors ${
                showBookmarkedOnly
                  ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                  : 'bg-white text-[#1A1A1A] border-[#E5E2D9] hover:bg-[#F0EDE6]'
              }`}
              aria-label={showBookmarkedOnly ? 'Show all topics' : 'Show bookmarked topics only'}
              aria-pressed={showBookmarkedOnly}
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 256 256"
                fill={showBookmarkedOnly ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={showBookmarkedOnly ? 0 : 20}
              >
                <path d="M192,224a8,8,0,0,1-11.84,7.06L128,200.43,75.84,231.06A8,8,0,0,1,64,224V48A16,16,0,0,1,80,32H176a16,16,0,0,1,16,16Z" />
              </svg>
            </button>

            {/* Filter & Sort Popover Dropdown Trigger */}
            <div className="relative">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`inline-flex items-center gap-2 rounded-full border border-[#E5E2D9] px-4 py-2.5 text-sm font-medium transition-colors ${
                  isFilterOpen || kindFilter !== 'all' || sortOrder !== 'default' || effortFilter !== 'all'
                    ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                    : 'bg-white text-[#1A1A1A] hover:bg-[#F0EDE6]'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.707 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span>Filter and sort</span>
                {(kindFilter !== 'all' || sortOrder !== 'default' || effortFilter !== 'all') && (
                  <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
                    !
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

                  <div className="absolute right-0 mt-3 z-50 w-80 sm:w-96 rounded-2xl border border-[#E5E2D9] bg-[#FAF8F5] p-6 shadow-2xl space-y-5 text-[#1A1A1A]">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-[#1A1A1A] tracking-tight">Filter and sort</h3>
                      {(kindFilter !== 'all' || sortOrder !== 'default' || effortFilter !== 'all') && (
                        <button
                          onClick={() => {
                            setKindFilter('all');
                            setEffortFilter('all');
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
                          className={`w-4 h-4 text-[#737067] transition-transform duration-200 ${sortSectionOpen ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {sortSectionOpen && (
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
                      )}
                    </div>

                    {/* Section 2: Type Filter */}
                    <div className="pb-1 space-y-3">
                      <button
                        type="button"
                        onClick={() => setTypeSectionOpen((v) => !v)}
                        className="w-full flex items-center justify-between"
                      >
                        <span className="text-base font-semibold text-[#3A3834]">Type</span>
                        <svg
                          className={`w-4 h-4 text-[#737067] transition-transform duration-200 ${typeSectionOpen ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {typeSectionOpen && (
                        <div className="space-y-2.5">
                          {[
                            { id: 'all', label: 'All Types' },
                            { id: 'method', label: 'Methods' },
                            { id: 'framework', label: 'Frameworks' },
                            { id: 'concept', label: 'Concepts' },
                          ].map((t) => (
                            <div key={t.id}>
                              <label className="flex items-center gap-3 cursor-pointer group text-base font-medium text-[#1A1A1A] hover:text-black">
                                <input
                                  type="radio"
                                  name="kindFilter"
                                  checked={kindFilter === t.id}
                                  onChange={() => {
                                    setKindFilter(t.id as any);
                                    if (t.id !== 'method') setEffortFilter('all');
                                  }}
                                  className="w-5 h-5 border-[#D1CEC4] text-[#1A1A1A] focus:ring-0 cursor-pointer"
                                />
                                <span>{t.label}</span>
                              </label>

                              {/* Progressive disclosure: Effort options only when Methods is selected */}
                              <AnimatePresence initial={false}>
                                {t.id === 'method' && kindFilter === 'method' && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                                    className="overflow-hidden"
                                  >
                                    <div className="pl-8 pt-2.5 space-y-2.5">
                                      {[
                                        { id: 'all', label: 'All' },
                                        { id: 'low', label: 'Low' },
                                        { id: 'medium', label: 'Medium' },
                                        { id: 'high', label: 'High' },
                                      ].map((e) => (
                                        <label
                                          key={e.id}
                                          className="flex items-center gap-3 cursor-pointer group text-sm font-medium text-[#3A3834] hover:text-black"
                                        >
                                          <input
                                            type="radio"
                                            name="effortFilter"
                                            checked={effortFilter === e.id}
                                            onChange={() => setEffortFilter(e.id as any)}
                                            className="w-4 h-4 border-[#D1CEC4] text-[#1A1A1A] focus:ring-0 cursor-pointer"
                                          />
                                          <span>{e.label}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            </div>
          </div>

          {/* Full-Width 4-Column Card Grid */}
          {displayedItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center text-secondary">
              No items found matching your filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-8">
              {displayedItems.map((item) => {
                const isBookmarked = bookmarkedIds.has(item.id);
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
                    <div
                      className="h-full min-h-[160px] sm:min-h-[180px] flex flex-col justify-between rounded-2xl border p-6 sm:p-7 transition-all border-border/60 group-hover:border-primary/50 relative"
                      style={{ backgroundColor: '#f1eee6' }}
                    >
                      {/* Interactive Bookmark Button on Top Right (Show on Hover unless bookmarked) */}
                      <div className={`absolute top-3.5 right-3.5 z-10 transition-opacity duration-200 ${isBookmarked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBookmark(item.id);
                          }}
                          className="p-3 rounded-full hover:bg-black/5 transition-colors text-secondary hover:text-primary focus:outline-none"
                          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark topic'}
                        >
                          <svg
                            className="w-6 h-6 transition-transform group-hover:scale-110"
                            viewBox="0 0 256 256"
                            fill={isBookmarked ? '#1A1A1A' : 'none'}
                            stroke="#1A1A1A"
                            strokeWidth={isBookmarked ? '0' : '20'}
                          >
                            <path d="M192,224a8,8,0,0,1-11.84,7.06L128,200.43,75.84,231.06A8,8,0,0,1,64,224V48A16,16,0,0,1,80,32H176a16,16,0,0,1,16,16Z" />
                          </svg>
                        </button>
                      </div>

                      {/* Title with type indicator square */}
                      <div className="flex items-start gap-3 pr-12">
                        <span
                          className={`w-3.5 h-3.5 mt-1 sm:w-4 sm:h-4 rounded-[4px] shrink-0 ${kindSquareBg}`}
                          aria-hidden="true"
                        />
                        <h3 className="text-lg sm:text-xl font-semibold text-primary tracking-tight leading-snug">
                          {item.title}
                        </h3>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* Bottom Sheet Concept Modal */}
      <ConceptSheetModal
        item={selectedConcept}
        onClose={() => setSelectedConcept(null)}
      />
    </>
  );
}
