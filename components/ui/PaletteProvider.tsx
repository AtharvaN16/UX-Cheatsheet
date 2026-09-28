'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Palette } from './Palette';
import type { MethodItem } from '@/lib/search/source';
import type { ScorableMethod } from '@/lib/search/score';

interface PaletteControls {
  open: () => void;
}

export interface MethodLookupEntry {
  title: string;
  href?: string;
}

const PaletteContext = createContext<PaletteControls | null>(null);
const MethodLookupContext = createContext<Map<string, MethodLookupEntry> | null>(null);

/** Lets any descendant of PaletteProvider open the command palette programmatically. */
export function usePaletteControls(): PaletteControls {
  const ctx = useContext(PaletteContext);
  if (!ctx) {
    throw new Error('usePaletteControls must be used within a PaletteProvider');
  }
  return ctx;
}

/** Site-wide id -> {title, href} lookup, e.g. for resolving related-method links. */
export function useMethodLookup(): Map<string, MethodLookupEntry> {
  const ctx = useContext(MethodLookupContext);
  if (!ctx) {
    throw new Error('useMethodLookup must be used within a PaletteProvider');
  }
  return ctx;
}

export function PaletteProvider({
  items,
  scorables,
  children,
}: {
  items: MethodItem[];
  scorables: ScorableMethod[];
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const lookup = useMemo(() => {
    const map = new Map<string, MethodLookupEntry>();
    items.forEach((item) => {
      map.set(item.id, { title: item.label, href: item.auxiliaryData.href });
    });
    return map;
  }, [items]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;

      // Match the *physical* key, not the character it produced. `e.key` for
      // this chord is "k" or "K" depending on Shift, Caps Lock and layout, and
      // the authoring shortcuts sit on the same physical key — so matching on
      // the character made which handler won a matter of luck. Verified in the
      // browser: ⌘⇧K was opening this search palette instead of add-card.
      //
      // `!e.shiftKey` is the other half: ⌘⇧K belongs to authoring, not search.
      const isSearchChord =
        e.code === 'KeyK' && (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey;

      if (isSearchChord || (e.key === '/' && !typing)) {
        e.preventDefault();
        setIsOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <PaletteContext value={{ open: () => setIsOpen(true) }}>
      <MethodLookupContext value={lookup}>
        {children}
        <Palette items={items} scorables={scorables} isOpen={isOpen} onOpenChange={setIsOpen} />
      </MethodLookupContext>
    </PaletteContext>
  );
}
