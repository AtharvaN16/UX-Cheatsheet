'use client';

import { useState, useMemo, useEffect, useRef, useLayoutEffect, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import type { Method } from '@/lib/content';
import type { TaxonomyGroup } from '@/lib/taxonomy';
import { get1Liner } from '@/lib/taxonomyDescriptions';
import { getStubUseCases } from '@/lib/taxonomyUseCases';
import { USE_CASES } from '@/lib/useCases';
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

/**
 * Renders a popover through a portal straight into `document.body`, positioned from the
 * trigger's actual screen coordinates via `position: fixed`. Every dropdown on this page
 * sits inside the sheet-modal background wrapper, which has `overflow-hidden` (needed for
 * its scale/blur-on-open animation) — an ordinary `absolute`-positioned popover gets
 * silently clipped by that ancestor regardless of z-index, since overflow-hidden clips
 * based on the ancestor's own box, not the popover's stacking order. Escaping via a portal
 * sidesteps that entirely instead of touching the animation wrapper.
 */
function DropdownPortal({
  open,
  triggerRef,
  align = 'left',
  width,
  onClose,
  children,
}: {
  open: boolean;
  triggerRef: RefObject<HTMLElement | null>;
  align?: 'left' | 'right';
  width?: number;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [coords, setCoords] = useState<{ top: number; left?: number; right?: number; maxHeight: number } | null>(
    null
  );

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    const update = () => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const top = rect.bottom + 12;
      // Clamp to whatever room is actually available below the trigger — for a trigger
      // near the top of a tall page (the common case) that's plenty, so the list just
      // renders in full with no visible scrollbar. Only a trigger with genuinely little
      // room below it (near the bottom of a short viewport) ever needs to scroll — and
      // it can, internally, self-contained within the popover.
      const maxHeight = Math.max(160, window.innerHeight - top - 16);
      setCoords(
        align === 'right'
          ? { top, right: window.innerWidth - rect.right, maxHeight }
          : { top, left: rect.left, maxHeight }
      );
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, triggerRef, align]);

  if (!open || !coords || typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        style={{
          position: 'fixed',
          top: coords.top,
          left: coords.left,
          right: coords.right,
          width,
          maxHeight: coords.maxHeight,
        }}
        className="z-50 overflow-y-auto rounded-2xl border border-[#E5E2D9] bg-[#FAF8F5] shadow-2xl"
      >
        {children}
      </div>
    </>,
    document.body
  );
}

/**
 * Shared pill trigger for Category/UseCase — a container `<div>` (the ref target for
 * DropdownPortal) holding two buttons: label+chevron toggles the dropdown, and — only
 * once there's an active selection — a small X that clears it directly. Split into two
 * real `<button>`s rather than one, since nesting a clickable X inside a single button
 * is invalid HTML and makes stopping the open/close toggle from also firing unreliable.
 */
function PillTrigger({
  label,
  open,
  hasSelection,
  onToggle,
  onClear,
  triggerRef,
}: {
  label: string;
  open: boolean;
  hasSelection: boolean;
  onToggle: () => void;
  onClear: () => void;
  triggerRef: RefObject<HTMLDivElement | null>;
}) {
  const isDark = open || hasSelection;

  return (
    <div
      ref={triggerRef}
      className={`inline-flex items-center overflow-hidden rounded-full border transition-colors ${
        isDark
          ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
          : 'bg-white text-[#1A1A1A] border-[#E5E2D9] hover:bg-[#F0EDE6]'
      }`}
    >
      <button type="button" onClick={onToggle} className="flex items-center py-2.5 pl-4 pr-1.5 text-sm font-medium">
        <span>{label}</span>
      </button>
      {hasSelection && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear selection"
          className="flex items-center justify-center w-6 h-6 rounded-full hover:bg-white/20 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}
      <button
        type="button"
        onClick={onToggle}
        aria-label="Toggle dropdown"
        className={`flex items-center py-2.5 pl-2.5 pr-4 transition-colors ${
          isDark ? 'bg-white/10 hover:bg-white/15' : 'hover:bg-black/5'
        }`}
      >
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
}

/**
 * Single-select "what is it" facet — replaces the tab row for categories with use-case
 * data. Built as a custom button+popover (not a native `<select>`) so it renders pixel-
 * identical to `UseCaseFilter` — a native select's padding/font metrics are browser-
 * controlled and never quite match hand-styled buttons.
 */
function CategoryDropdown({
  tabs,
  value,
  onChange,
  allItems,
}: {
  tabs: string[];
  value: string;
  onChange: (tab: string) => void;
  allItems: CategoryItem[];
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const currentLabel = value === 'all' ? 'Category: All' : value;

  const select = (tab: string) => {
    onChange(tab);
    setOpen(false);
  };

  return (
    <div className="relative">
      <PillTrigger
        triggerRef={triggerRef}
        label={currentLabel}
        open={open}
        hasSelection={value !== 'all'}
        onToggle={() => setOpen((v) => !v)}
        onClear={() => select('all')}
      />

      <DropdownPortal open={open} triggerRef={triggerRef} onClose={() => setOpen(false)} width={256}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-[#1A1A1A]">Category</span>
            {value !== 'all' && (
              <button
                onClick={() => select('all')}
                className="text-xs font-semibold text-[#737067] hover:text-[#1A1A1A] underline"
              >
                Clear
              </button>
            )}
          </div>
          <div className="space-y-2">
            {tabs.map((tab) => {
              const isAll = tab === 'all';
              const count = isAll ? allItems.length : allItems.filter((i) => i.topicTitle === tab).length;
              return (
                <label
                  key={tab}
                  className="flex items-center justify-between gap-3 cursor-pointer text-sm font-medium text-[#1A1A1A] hover:text-black py-0.5"
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="category-dropdown"
                      checked={value === tab}
                      onChange={() => select(tab)}
                      className="w-4 h-4 border-[#D1CEC4] text-[#1A1A1A] focus:ring-0 cursor-pointer"
                    />
                    <span>{isAll ? 'All' : tab}</span>
                  </span>
                  <span className="text-xs text-[#8C887E]">{count}</span>
                </label>
              );
            })}
          </div>
        </div>
      </DropdownPortal>
    </div>
  );
}

/**
 * Multi-select "why would I use this" facet. Renders nothing if the category has no
 * use-case tags at all — this is what keeps the whole feature opt-in per category.
 */
function UseCaseFilter({
  options,
  selected,
  onChange,
}: {
  options: { id: string; label: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  if (options.length === 0) return null;

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const label = selected.length === 0 ? 'Use case: All' : `Use case: ${selected.length} selected`;

  return (
    <div className="relative">
      <PillTrigger
        triggerRef={triggerRef}
        label={label}
        open={open}
        hasSelection={selected.length > 0}
        onToggle={() => setOpen((v) => !v)}
        onClear={() => onChange([])}
      />

      <DropdownPortal open={open} triggerRef={triggerRef} onClose={() => setOpen(false)} width={256}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-[#1A1A1A]">Use case</span>
            {selected.length > 0 && (
              <button
                onClick={() => onChange([])}
                className="text-xs font-semibold text-[#737067] hover:text-[#1A1A1A] underline"
              >
                Clear
              </button>
            )}
          </div>
          <div className="space-y-2">
            {options.map((opt) => (
              <label
                key={opt.id}
                className="flex items-center gap-3 cursor-pointer text-sm font-medium text-[#1A1A1A] hover:text-black py-0.5"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt.id)}
                  onChange={() => toggle(opt.id)}
                  className="w-4 h-4 rounded border-[#D1CEC4] text-[#1A1A1A] focus:ring-0 cursor-pointer"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      </DropdownPortal>
    </div>
  );
}

/** Bookmark toggle + the "Filter and sort" popover — identical in both layouts, so it's shared rather than duplicated. */
function FilterSortControls({
  showBookmarkedOnly,
  onToggleBookmarkedOnly,
  isFilterOpen,
  onToggleFilterOpen,
  onCloseFilter,
  kindFilter,
  onKindFilterChange,
  effortFilter,
  onEffortFilterChange,
  sortOrder,
  onSortOrderChange,
  sortSectionOpen,
  onToggleSortSection,
  typeSectionOpen,
  onToggleTypeSection,
  kindCounts,
  effortCounts,
  selectableKindCount,
}: {
  showBookmarkedOnly: boolean;
  onToggleBookmarkedOnly: () => void;
  isFilterOpen: boolean;
  onToggleFilterOpen: () => void;
  onCloseFilter: () => void;
  kindFilter: 'all' | 'method' | 'framework' | 'concept';
  onKindFilterChange: (v: 'all' | 'method' | 'framework' | 'concept') => void;
  effortFilter: 'all' | 'low' | 'medium' | 'high';
  onEffortFilterChange: (v: 'all' | 'low' | 'medium' | 'high') => void;
  sortOrder: 'default' | 'a-z' | 'z-a';
  onSortOrderChange: (v: 'default' | 'a-z' | 'z-a') => void;
  sortSectionOpen: boolean;
  onToggleSortSection: () => void;
  typeSectionOpen: boolean;
  onToggleTypeSection: () => void;
  /** How many items would remain for each option — an option other than "all" with a
      zero count gets disabled instead of letting the user pick their way into an empty grid. */
  kindCounts: Record<string, number>;
  effortCounts: Record<string, number>;
  /** Whether the Type section has at least 2 real choices — otherwise it's hidden entirely. */
  selectableKindCount: number;
}) {
  const hasActiveFilters = kindFilter !== 'all' || sortOrder !== 'default' || effortFilter !== 'all';
  const filterTriggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="flex items-center gap-3 shrink-0">
      {/* Bookmarked-Only Toggle */}
      <button
        onClick={onToggleBookmarkedOnly}
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
          ref={filterTriggerRef}
          onClick={onToggleFilterOpen}
          className={`inline-flex items-center gap-2 rounded-full border border-[#E5E2D9] px-4 py-2.5 text-sm font-medium transition-colors ${
            isFilterOpen || hasActiveFilters
              ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
              : 'bg-white text-[#1A1A1A] hover:bg-[#F0EDE6]'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.707 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span>Filter and sort</span>
          {hasActiveFilters && (
            <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">!</span>
          )}
        </button>

        {/* Floating Popover Dropdown Overlay */}
        <DropdownPortal open={isFilterOpen} triggerRef={filterTriggerRef} onClose={onCloseFilter} align="right">
            <div className="w-80 sm:w-96 p-6 space-y-5 text-[#1A1A1A]">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-[#1A1A1A] tracking-tight">Filter and sort</h3>
                {hasActiveFilters && (
                  <button
                    onClick={() => {
                      onKindFilterChange('all');
                      onEffortFilterChange('all');
                      onSortOrderChange('default');
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
                  onClick={onToggleSortSection}
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
                      onChange={(e) => onSortOrderChange(e.target.value as 'default' | 'a-z' | 'z-a')}
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

              {/* Section 2: Type Filter — hidden entirely when the category has fewer
                  than 2 kinds present, since it could never narrow anything anyway. */}
              {selectableKindCount >= 2 && (
              <div className="pb-1 space-y-3">
                <button
                  type="button"
                  onClick={onToggleTypeSection}
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
                    ].map((t) => {
                      const count = kindCounts[t.id] ?? 0;
                      const isDisabled = t.id !== 'all' && count === 0;

                      return (
                        <div key={t.id}>
                          <label
                            className={`flex items-center justify-between gap-3 text-base font-medium ${
                              isDisabled
                                ? 'text-[#B8B2A6] cursor-not-allowed'
                                : 'cursor-pointer group text-[#1A1A1A] hover:text-black'
                            }`}
                          >
                            <span className="flex items-center gap-3">
                              <input
                                type="radio"
                                name="kindFilter"
                                checked={kindFilter === t.id}
                                disabled={isDisabled}
                                onChange={() => {
                                  onKindFilterChange(t.id as 'all' | 'method' | 'framework' | 'concept');
                                  if (t.id !== 'method') onEffortFilterChange('all');
                                }}
                                className={`w-5 h-5 border-[#D1CEC4] focus:ring-0 ${
                                  isDisabled ? 'cursor-not-allowed' : 'text-[#1A1A1A] cursor-pointer'
                                }`}
                              />
                              <span>{t.label}</span>
                            </span>
                            {t.id !== 'all' && <span className="text-xs text-[#B8B2A6]">{count}</span>}
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
                                  ].map((e) => {
                                    const eCount = effortCounts[e.id] ?? 0;
                                    const eDisabled = e.id !== 'all' && eCount === 0;

                                    return (
                                      <label
                                        key={e.id}
                                        className={`flex items-center justify-between gap-3 text-sm font-medium ${
                                          eDisabled
                                            ? 'text-[#B8B2A6] cursor-not-allowed'
                                            : 'cursor-pointer group text-[#3A3834] hover:text-black'
                                        }`}
                                      >
                                        <span className="flex items-center gap-3">
                                          <input
                                            type="radio"
                                            name="effortFilter"
                                            checked={effortFilter === e.id}
                                            disabled={eDisabled}
                                            onChange={() => onEffortFilterChange(e.id as 'all' | 'low' | 'medium' | 'high')}
                                            className={`w-4 h-4 border-[#D1CEC4] focus:ring-0 ${
                                              eDisabled ? 'cursor-not-allowed' : 'text-[#1A1A1A] cursor-pointer'
                                            }`}
                                          />
                                          <span>{e.label}</span>
                                        </span>
                                        {e.id !== 'all' && <span className="text-xs text-[#B8B2A6]">{eCount}</span>}
                                      </label>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              )}
            </div>
        </DropdownPortal>
      </div>
    </div>
  );
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
  const [activeUseCases, setActiveUseCases] = useState<string[]>([]);
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
          const itemUseCases = written?.useCases?.length ? written.useCases : getStubUseCases(item.id);

          list.push({
            id: item.id,
            title: item.title,
            topicTitle: groupTitle,
            description: cleanDesc,
            isWritten: !!written,
            kind: itemKind,
            method: written,
            useCases: itemUseCases,
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
          useCases: written.useCases,
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

  // Use-case dropdown only ever offers tags a category actually has (UseCaseFilter
  // itself renders nothing when this is empty) — everything else in the row (Category,
  // Bookmark, Filter and sort) is universal across every category page.
  const availableUseCases = useMemo(
    () => USE_CASES.filter((uc) => allItems.some((i) => i.useCases?.includes(uc.id))),
    [allItems]
  );

  // Everything displayedItems applies EXCEPT kind/effort/sort — this is the pool the
  // Type/Effort radios in "Filter and sort" get their counts from, so an option that
  // would produce zero results (e.g. "Frameworks" on a category that's 100% concepts)
  // can be disabled instead of silently leading to an empty grid.
  const itemsBeforeKindFilter = useMemo(() => {
    let result = allItems;

    if (activeTab !== 'all') {
      result = result.filter((item) => item.topicTitle === activeTab);
    }

    if (activeUseCases.length > 0) {
      result = result.filter((item) => item.useCases?.some((uc) => activeUseCases.includes(uc)));
    }

    if (showBookmarkedOnly) {
      result = result.filter((item) => bookmarkedIds.has(item.id));
    }

    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) => item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
      );
    }

    return result;
  }, [allItems, activeTab, activeUseCases, showBookmarkedOnly, bookmarkedIds, searchQuery]);

  const kindCounts = useMemo(() => {
    const counts: Record<string, number> = { all: itemsBeforeKindFilter.length, method: 0, framework: 0, concept: 0 };
    itemsBeforeKindFilter.forEach((item) => {
      const k = (item.kind || item.method?.kind || 'method').toLowerCase().trim();
      if (k in counts) counts[k] += 1;
    });
    return counts;
  }, [itemsBeforeKindFilter]);

  const effortCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0, low: 0, medium: 0, high: 0 };
    itemsBeforeKindFilter
      .filter((item) => (item.kind || item.method?.kind || 'method').toLowerCase().trim() === 'method')
      .forEach((item) => {
        const e = (item.method?.effort || 'low').toLowerCase().trim();
        counts.all += 1;
        if (e in counts) counts[e] += 1;
      });
    return counts;
  }, [itemsBeforeKindFilter]);

  // Once a category has only one kind present (e.g. UX Psychology is 100% concepts),
  // the Type section can never actually narrow anything — every option either matches
  // everything or matches nothing — so it's hidden entirely rather than shown with two
  // permanently-disabled options and one redundant "same as All Types" option.
  const selectableKindCount = ['method', 'framework', 'concept'].filter((k) => (kindCounts[k] ?? 0) > 0).length;

  // Safety net alongside disabling zero-count options in the popover: if a filter that
  // was valid becomes stale because some other filter changed underneath it (e.g. Kind
  // was "Method" and the Category dropdown just switched to a group with no methods),
  // fall back to "all" instead of leaving the grid stuck on "No items found". Derived
  // during render rather than via an effect + setState, which would cause an extra
  // render pass for no benefit — this way there's nothing to "catch up" on.
  const effectiveKindFilter = kindFilter !== 'all' && (kindCounts[kindFilter] ?? 0) === 0 ? 'all' : kindFilter;
  const effectiveEffortFilter =
    effortFilter !== 'all' && (effortCounts[effortFilter] ?? 0) === 0 ? 'all' : effortFilter;

  // Filtered and sorted items
  const displayedItems = useMemo(() => {
    let result = allItems;

    // Filter by topic tab
    if (activeTab !== 'all') {
      result = result.filter((item) => item.topicTitle === activeTab);
    }

    // Filter by use case (multi-select — OR across selected tags; items with no
    // use-case tags at all simply never match a specific selection, but still show
    // under "All")
    if (activeUseCases.length > 0) {
      result = result.filter((item) => item.useCases?.some((uc) => activeUseCases.includes(uc)));
    }

    // Filter by kind (method, framework, concept)
    if (effectiveKindFilter !== 'all') {
      result = result.filter((item) => {
        const k = (item.kind || item.method?.kind || 'method').toLowerCase().trim();
        return k === effectiveKindFilter;
      });
    }

    // Filter by effort (only meaningful when narrowed to Methods)
    if (effectiveKindFilter === 'method' && effectiveEffortFilter !== 'all') {
      result = result.filter((item) => {
        const e = (item.method?.effort || 'low').toLowerCase().trim();
        return e === effectiveEffortFilter;
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
  }, [allItems, activeTab, activeUseCases, effectiveKindFilter, effectiveEffortFilter, searchQuery, sortOrder, showBookmarkedOnly, bookmarkedIds]);

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
          {/* Search — its own row above the category/use-case row. Recessed rectangle
              (not a pill) so it reads as an input field, distinct from the filter chips
              below it. This is now the universal layout for every category page — the
              old tab row is gone; CategoryDropdown replaces it everywhere. */}
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
              className="w-full rounded-xl border border-transparent bg-[#F0EDE6] pl-10 pr-4 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#8C887E] focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          {/* Topics within the category — Category dropdown (replaces the old tab row for
              every category) + Use case dropdown (only renders once a category has
              use-case tags — see UseCaseFilter's own empty-options guard), sharing the row
              with Bookmark/Filter-sort. */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
            <div className="flex items-center gap-3">
              <CategoryDropdown tabs={tabs} value={activeTab} onChange={setActiveTab} allItems={allItems} />
              <UseCaseFilter
                options={availableUseCases}
                selected={activeUseCases}
                onChange={setActiveUseCases}
              />
            </div>
            <FilterSortControls
              showBookmarkedOnly={showBookmarkedOnly}
              onToggleBookmarkedOnly={() => setShowBookmarkedOnly((v) => !v)}
              isFilterOpen={isFilterOpen}
              onToggleFilterOpen={() => setIsFilterOpen((v) => !v)}
              onCloseFilter={() => setIsFilterOpen(false)}
              kindFilter={effectiveKindFilter}
              onKindFilterChange={setKindFilter}
              effortFilter={effectiveEffortFilter}
              onEffortFilterChange={setEffortFilter}
              sortOrder={sortOrder}
              onSortOrderChange={setSortOrder}
              sortSectionOpen={sortSectionOpen}
              onToggleSortSection={() => setSortSectionOpen((v) => !v)}
              typeSectionOpen={typeSectionOpen}
              onToggleTypeSection={() => setTypeSectionOpen((v) => !v)}
              kindCounts={kindCounts}
              effortCounts={effortCounts}
              selectableKindCount={selectableKindCount}
            />
          </div>

          {/* Full-Width 4-Column Card Grid — min-height keeps the page from visually
              shrinking to a tiny sliver when filters narrow the results down to a
              handful of cards or none at all. */}
          {displayedItems.length === 0 ? (
            <div className="min-h-[50vh] flex items-center justify-center rounded-2xl border border-dashed border-border p-12 text-center text-secondary">
              No items found matching your filters.
            </div>
          ) : (
            <div className="min-h-[50vh] grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-8 items-start">
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
