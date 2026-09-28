'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface Authoring {
  isEditing: boolean;
  toggleEditing: () => void;
  isAddOpen: boolean;
  setAddOpen: (v: boolean) => void;
}

const AuthoringContext = createContext<Authoring | null>(null);

/**
 * Editing state, shared by the dock and every editable surface.
 *
 * `IS_DEV` is a compile-time constant, so in a production build this whole
 * module's interactive branches are gated off at runtime.
 *
 * Measured, not assumed: this does NOT get dead-code-eliminated. Because
 * `IS_DEV` is *exported*, the minifier cannot prove it constant across module
 * boundaries, so it survives as a runtime reference and these components ship
 * in a ~40K chunk. They are inert there — every one returns null before
 * rendering, nothing appears in the prerendered HTML, and every
 * /api/authoring route answers 404 in production. Plan B ships this UI to
 * production deliberately behind auth, so eliminating it now would be undone
 * immediately.
 */
export const IS_DEV = process.env.NODE_ENV === 'development';

export function useAuthoring(): Authoring {
  const ctx = useContext(AuthoringContext);
  if (!ctx) throw new Error('useAuthoring must be used within an AuthoringProvider');
  return ctx;
}

export function AuthoringProvider({ children }: { children: React.ReactNode }) {
  const [isEditing, setEditing] = useState(false);
  const [isAddOpen, setAddOpen] = useState(false);

  useEffect(() => {
    if (!IS_DEV) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'e' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setEditing((v) => !v);
      }
      if (e.key === 'K' && e.shiftKey && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setAddOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <AuthoringContext
      value={{ isEditing, toggleEditing: () => setEditing((v) => !v), isAddOpen, setAddOpen }}
    >
      {children}
    </AuthoringContext>
  );
}
