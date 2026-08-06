'use client';

import { useCallback, useEffect, useState } from 'react';

const KEY = 'ux-cheatsheet:recent';
const MAX = 8;

export function useRecent() {
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    // Deliberately reading localStorage in an effect rather than a useState
    // lazy initializer: this is a client component rendered during SSR,
    // where localStorage doesn't exist. Seeding state from it during the
    // initial render (server or first client pass) would either throw or
    // diverge between server and client output, producing a hydration
    // mismatch. Starting from `[]` and syncing after mount is the correct
    // pattern for browser-only storage, even though it's a one-shot
    // setState-in-effect that the lint rule below can't distinguish from a
    // genuine cascading-render smell.
    try {
      const raw = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setRecent(JSON.parse(raw));
    } catch {
      // Corrupt or unavailable storage is not worth failing over.
    }
  }, []);

  const push = useCallback((id: string) => {
    setRecent((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, MAX);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // Ignore quota or private-mode failures.
      }
      return next;
    });
  }, []);

  return { recent, push };
}
