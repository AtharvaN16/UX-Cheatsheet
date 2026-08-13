'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { CommandPalette, CommandPaletteInput } from '@astryxdesign/core/CommandPalette';
import { createMethodSource, type MethodItem } from '@/lib/search/source';
import type { ScorableMethod } from '@/lib/search/score';
import { useRecent } from '@/lib/useRecent';

function getTypeBadgeStyle(kind?: string) {
  const k = (kind || 'method').toLowerCase().trim();
  if (k === 'category') {
    return 'bg-[#D97757]/15 text-[#D97757] font-semibold rounded-md';
  }
  if (k === 'framework') {
    return 'bg-[#8C77B8]/15 text-[#8C77B8] font-semibold rounded-md';
  }
  if (k === 'concept') {
    return 'bg-[#f97316]/15 text-[#f97316] font-semibold rounded-md';
  }
  return 'bg-[#5A92C6]/15 text-[#5A92C6] font-semibold rounded-md';
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query || !query.trim()) return <>{text}</>;

  const q = query.trim();
  const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQ})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-[#FDE047]/85 text-[#1A1A1A] font-semibold rounded-[2px] inline"
            style={{ padding: 0, margin: 0 }}
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export function Palette({
  items,
  scorables,
  isOpen,
  onOpenChange,
}: {
  items: MethodItem[];
  scorables: ScorableMethod[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { recent, push } = useRecent();
  const [currentQuery, setCurrentQuery] = useState('');

  const source = useMemo(() => {
    const baseSource = createMethodSource(items, scorables, recent);
    return {
      search(q: string) {
        setCurrentQuery(q);
        return baseSource.search(q);
      },
      bootstrap() {
        setCurrentQuery('');
        return baseSource.bootstrap();
      },
    };
  }, [items, scorables, recent]);

  return (
    <CommandPalette<MethodItem>
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      searchSource={source}
      label="Search cheatsheets"
      emptySearchText="No matches found. Try searching by name, law, or concept."
      emptyBootstrapText="Search 330+ UX laws, methods, frameworks, and categories."
      input={
        <CommandPaletteInput
          placeholder="Search cheatsheets..."
        />
      }
      footer={
        <div className="flex items-center justify-center gap-6 text-xs text-[#8C887E] w-full h-full leading-none mt-3">
          <span className="inline-flex items-center gap-1.5 leading-none"><kbd className="inline-flex items-center justify-center px-1.5 py-0.5 bg-[#EAE6DD] text-[#2D2B28] rounded text-[11px] font-mono leading-none h-5 min-h-5">↑</kbd><kbd className="inline-flex items-center justify-center px-1.5 py-0.5 bg-[#EAE6DD] text-[#2D2B28] rounded text-[11px] font-mono leading-none h-5 min-h-5">↓</kbd> Navigate</span>
          <span className="inline-flex items-center gap-1.5 leading-none"><kbd className="inline-flex items-center justify-center px-1.5 py-0.5 bg-[#EAE6DD] text-[#2D2B28] rounded text-[11px] font-mono leading-none h-5 min-h-5">↵</kbd> Select</span>
          <span className="inline-flex items-center gap-1.5 leading-none"><kbd className="inline-flex items-center justify-center px-1.5 py-0.5 bg-[#EAE6DD] text-[#2D2B28] rounded text-[11px] font-mono leading-none h-5 min-h-5">Esc</kbd> Close</span>
        </div>
      }
      onValueChange={(id) => {
        const item = items.find((i) => i.id === id);
        push(id);
        onOpenChange(false);
        router.push(item?.auxiliaryData.href ?? `/m/${id}`);
      }}
      renderItem={(item, isSelected) => {
        const typeBadgeStyle = getTypeBadgeStyle(item.auxiliaryData.kind);
        const categoryName = item.auxiliaryData.category;
        const snippet = item.auxiliaryData.matchedSnippet;
        const isCategory = item.auxiliaryData.type === 'category';

        return (
          <div className="flex w-full flex-col gap-1.5 py-1.5 text-left">
            {/* Title & Accent Badge */}
            <div className="flex items-center justify-between gap-4">
              <span className={`text-[17px] sm:text-lg font-semibold leading-snug tracking-tight ${isSelected ? 'text-[#1A1A1A] font-bold' : 'text-[#2D2B28]'}`}>
                <HighlightText text={item.label} query={currentQuery} />
              </span>
              <span className={`px-2.5 py-0.5 text-xs capitalize shrink-0 ${typeBadgeStyle}`}>
                {item.auxiliaryData.kind || 'method'}
              </span>
            </div>

            {/* Category Subheading */}
            {!isCategory && categoryName && (
              <span className="text-sm font-medium text-[#737067] leading-snug">
                In <HighlightText text={categoryName} query={currentQuery} />
              </span>
            )}

            {/* Matched Snippet */}
            {snippet && (
              <span className="text-xs text-[#8C887E] leading-relaxed pt-1.5">
                "<HighlightText text={snippet} query={currentQuery} />"
              </span>
            )}
          </div>
        );
      }}
    />
  );
}
