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
      // Protect an open draft, but only a draft.
      //
      // The thing worth guarding is the section editor: toggling edit mode
      // while it is open unmounts it and the typed text is gone with no undo.
      // That editor is a <textarea>. Guarding every <input> as well was too
      // broad and broke the feature outright — the category search box on
      // /c/[category] takes focus on page load, so ⌘⇧K did nothing at all
      // until you clicked elsewhere first. Verified in the browser.
      const target = e.target as HTMLElement | null;
      const inDraft = target?.tagName === 'TEXTAREA' || target?.isContentEditable === true;
      if (inDraft) return;

      // Physical-key matching, for the same reason as PaletteProvider: `e.key`
      // varies with Shift, Caps Lock and keyboard layout, so two handlers
      // comparing characters disagreed about who owned ⌘⇧K.
      const cmd = e.metaKey || e.ctrlKey;

      // ⌘⇧E, not ⌘E: plain ⌘E is a macOS system shortcut ("Use Selection for
      // Find"), so it is contested inside any text field.
      if (e.code === 'KeyE' && cmd && e.shiftKey) {
        e.preventDefault();
        setEditing((v) => !v);
      }
      if (e.code === 'KeyK' && cmd && e.shiftKey) {
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
