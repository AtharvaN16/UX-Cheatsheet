'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import type { Method } from '@/lib/content';
import type { TaxonomyGroup } from '@/lib/taxonomy';
import { get1Liner } from '@/lib/taxonomyDescriptions';
import { ConceptSheetModal, type ConceptSheetItem, SHEET_TRANSITION } from '@/components/ui/ConceptSheetModal';
import { CategoryBanner } from '@/components/ui/CategoryBanner';

export interface CategoryItem extends ConceptSheetItem {
  href?: string;
}

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
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'default' | 'a-z' | 'z-a'>('default');
  const [selectedConcept, setSelectedConcept] = useState<CategoryItem | null>(null);

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

          list.push({
            id: item.id,
            title: item.title,
            topicTitle: groupTitle,
            description: cleanDesc,
            href: `/m/${item.id}`,
            isWritten: !!written,
            kind: written?.kind,
            method: written,
          });
        });
      });
    }

    // Include any written primary methods not explicitly listed in taxonomy
    methods.forEach((m) => {
      if (!seenIds.has(m.id)) {
        seenIds.add(m.id);
        const rawDesc = m.sections['What is it'] || get1Liner(m.id, m.title);
        list.push({
          id: m.id,
          title: m.title,
          topicTitle: 'Core Methods',
          description: rawDesc.replace(/\n+/g, ' ').trim(),
          href: `/m/${m.id}`,
          isWritten: true,
          kind: m.kind,
          method: m,
        });
      }
    });

    // Also include secondary methods if available
    secondaryMethods.forEach((m) => {
      if (!seenIds.has(m.id)) {
        seenIds.add(m.id);
        const rawDesc = m.sections['What is it'] || get1Liner(m.id, m.title);
        list.push({
          id: m.id,
          title: m.title,
          topicTitle: 'Also Relevant',
          description: rawDesc.replace(/\n+/g, ' ').trim(),
          href: `/m/${m.id}`,
          isWritten: true,
          kind: m.kind,
          method: m,
        });
      }
    });

    return list;
  }, [groups, methods, secondaryMethods, writtenMap, categoryTitle]);

  // Topic tabs extracted from groups
  const tabs = useMemo(() => {
    const topicSet = new Set<string>();
    allItems.forEach((item) => topicSet.add(item.topicTitle));
    const topicList = Array.from(topicSet);
    return ['all', ...topicList];
  }, [allItems]);

  // Filtered and sorted items
  const displayedItems = useMemo(() => {
    let result = allItems;

    // Filter by topic tab
    if (activeTab !== 'all') {
      result = result.filter((item) => item.topicTitle === activeTab);
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
  }, [allItems, activeTab, searchQuery, sortOrder]);

  const isModalOpen = selectedConcept !== null;

  return (
    <>
      {/* Background Page Content (Animates scale, fade, and blur on sheet open) */}
      <motion.div
        animate={{
          scale: isModalOpen ? 0.94 : 1,
          opacity: isModalOpen ? 0.45 : 1,
          filter: isModalOpen ? 'blur(6px)' : 'blur(0px)',
          borderRadius: isModalOpen ? '28px' : '0px',
        }}
        transition={SHEET_TRANSITION}
        className="w-full space-y-8 origin-top overflow-hidden"
      >
        {/* Category Banner */}
        <CategoryBanner categoryId={categoryId} title={categoryTitle} />

        {/* Inner Content Section padded with px-8 sm:px-12 to align with banner title */}
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

        {/* Control Bar: Search & Sort */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search box */}
            <div className="relative min-w-[240px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search in ${categoryTitle}...`}
                className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-primary placeholder:text-secondary/60 focus:border-primary focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-secondary hover:text-primary"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-2">
            <label htmlFor="sort-select" className="text-xs uppercase tracking-wider text-secondary">
              Sort:
            </label>
            <select
              id="sort-select"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'default' | 'a-z' | 'z-a')}
              className="rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-medium text-primary focus:border-primary focus:outline-none"
            >
              <option value="default">Default</option>
              <option value="a-z">A – Z</option>
              <option value="z-a">Z – A</option>
            </select>
          </div>
        </div>

        {/* Full-Width 4-Column Card Grid */}
        {displayedItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-secondary">
            No items found matching your filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-8">
            {displayedItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedConcept(item)}
                className="group block h-full text-left focus:outline-none"
              >
                <div
                  className={`h-full min-h-[160px] sm:min-h-[180px] flex flex-col justify-start rounded-2xl border p-6 sm:p-7 transition-all ${
                    item.isWritten
                      ? 'border-border bg-surface group-hover:bg-card group-hover:border-primary/50 shadow-sm group-hover:shadow-md'
                      : 'border-border/60 bg-surface/40 group-hover:bg-surface'
                  }`}
                >
                  {/* Top-aligned Card Title */}
                  <h3 className="text-lg sm:text-xl font-semibold text-primary tracking-tight leading-snug">
                    {item.title}
                  </h3>
                </div>
              </button>
            ))}
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

