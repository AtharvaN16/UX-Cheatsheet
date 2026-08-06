'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { CommandPalette } from '@astryxdesign/core/CommandPalette';
import { createMethodSource, type MethodItem } from '@/lib/search/source';
import type { ScorableMethod } from '@/lib/search/score';
import { useRecent } from '@/lib/useRecent';

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

  const source = useMemo(
    () => createMethodSource(items, scorables, recent),
    [items, scorables, recent],
  );

  return (
    <CommandPalette<MethodItem>
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      searchSource={source}
      label="Search methods"
      emptySearchText="No method matches. Try describing the situation instead."
      emptyBootstrapText="Search by name, or by what you are trying to learn."
      onValueChange={(id) => {
        push(id);
        onOpenChange(false);
        router.push(`/m/${id}`);
      }}
      renderItem={(item, isSelected) => (
        <div className="flex w-full items-center justify-between gap-4">
          <span className={isSelected ? 'text-primary' : 'text-secondary'}>{item.label}</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-secondary">
            {item.auxiliaryData.kind}
          </span>
        </div>
      )}
    />
  );
}
