'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  addEdit,
  loadPending,
  savePending,
  type PendingEdit,
} from '@/lib/authoring/pending';

interface Authoring {
  isEditing: boolean;
  toggleEditing: () => void;
  isAddOpen: boolean;
  setAddOpen: (v: boolean) => void;
  authed: boolean;
  checkingSession: boolean;
  /** True when a shortcut or the dock asked to edit while signed out. */
  needsLogin: boolean;
  setNeedsLogin: (v: boolean) => void;
  login: (password: string) => Promise<{ ok: boolean; error?: string }>;
  pending: PendingEdit[];
  saveEdit: (edit: PendingEdit) => Promise<{ ok: boolean; errors?: string[] }>;
  sync: () => Promise<{ ok: boolean; errors?: string[] }>;
  syncing: boolean;
  justSynced: boolean;
}

const AuthoringContext = createContext<Authoring | null>(null);

/**
 * Editing state, shared by the dock and every editable surface.
 *
 * `IS_DEV` is a compile-time constant. It no longer decides *whether* the
 * authoring layer exists — Plan B ships it to production behind a password —
 * only which of the two save paths runs: straight to the working tree in
 * development, or queue-then-Sync on the live site.
 *
 * Measured, not assumed: this does NOT get dead-code-eliminated. Because
 * `IS_DEV` is *exported*, the minifier cannot prove it constant across module
 * boundaries, so it survives as a runtime reference and these components ship
 * in a ~40K chunk. The boundary that actually protects anything is
 * `guardRequest`, which requires a signed session on every /api/authoring
 * route outside development.
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

  // Development is always "signed in" and never has a session to check, so the
  // dock is on screen from the first paint exactly as it was before.
  const [authed, setAuthed] = useState(IS_DEV);
  const [checkingSession, setChecking] = useState(!IS_DEV);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [pending, setPending] = useState<PendingEdit[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  // Asked on mount rather than read during render: a cookies() call in a layout
  // opts the whole route out of static rendering, and every visitor-facing page
  // here is prerendered.
  useEffect(() => {
    if (IS_DEV) return;
    let alive = true;
    fetch('/api/authoring/session')
      .then((r) => r.json() as Promise<{ authed: boolean }>)
      .then((d) => {
        if (alive) {
          setAuthed(d.authed);
          setChecking(false);
        }
      })
      .catch(() => {
        if (alive) setChecking(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // The pending queue exists only on the live site. In development a save is
  // already on disk by the time it returns, so there is nothing to queue.
  useEffect(() => {
    if (!IS_DEV) setPending(loadPending());
  }, []);
  useEffect(() => {
    if (!IS_DEV) savePending(pending);
  }, [pending]);

  // Unsynced work is only in this browser, so leaving silently loses it.
  useEffect(() => {
    if (IS_DEV || pending.length === 0) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [pending.length]);

  const login = useCallback(async (password: string) => {
    const res = await fetch('/api/authoring/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setAuthed(true);
      setNeedsLogin(false);
      return { ok: true };
    }
    return { ok: false, error: 'Wrong password' };
  }, []);

  /**
   * One save path for every editor.
   *
   * In development the edit is written to the working tree immediately, because
   * the files are right there. On the live site it is validated against the
   * current repository contents and then queued; Sync commits the queue.
   * Callers do not branch on environment — this is the only place that does.
   *
   * Images travel as base64 inside the JSON body in both environments, so there
   * is no multipart branch anywhere; `applyEdits` decodes and sniffs the bytes
   * before anything is written.
   */
  const saveEdit = useCallback(
    async (edit: PendingEdit): Promise<{ ok: boolean; errors?: string[] }> => {
      // Development commits a batch of one, straight through the same code the
      // live site uses: applyEdits -> DiskStore.commit, which is a plain file
      // write. Sharing the path is the point — dev exercises production's logic
      // every time you save, and there is no second implementation to keep
      // honest.
      if (IS_DEV) {
        const res = await fetch('/api/authoring/sync', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ edits: [edit] }),
        });
        if (res.ok) return { ok: true };
        const d = (await res.json()) as { errors?: string[] };
        return { ok: false, errors: d.errors ?? ['save failed'] };
      }

      const next = addEdit(pending, edit);
      const res = await fetch('/api/authoring/validate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ edits: next }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { errors?: string[] };
        return { ok: false, errors: d.errors ?? ['this edit is not valid'] };
      }
      setPending(next);
      return { ok: true };
    },
    [pending],
  );

  const sync = useCallback(async (): Promise<{ ok: boolean; errors?: string[] }> => {
    if (pending.length === 0) return { ok: true };
    setSyncing(true);
    const res = await fetch('/api/authoring/sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ edits: pending }),
    });
    setSyncing(false);
    if (!res.ok) {
      const d = (await res.json()) as { errors?: string[] };
      return { ok: false, errors: d.errors ?? ['sync failed'] };
    }
    setPending([]); // committed; the queue is now the repo's problem
    setJustSynced(true);
    setTimeout(() => setJustSynced(false), 90_000);
    return { ok: true };
  }, [pending]);

  useEffect(() => {
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
      if (!cmd || !e.shiftKey) return;

      // Signed out on the live site, the chords open the password prompt rather
      // than doing nothing — the affordance has to lead somewhere.
      const gate = () => {
        if (IS_DEV || authed) return false;
        setNeedsLogin(true);
        return true;
      };

      // ⌘⇧E, not ⌘E: plain ⌘E is a macOS system shortcut ("Use Selection for
      // Find"), so it is contested inside any text field.
      if (e.code === 'KeyE') {
        e.preventDefault();
        if (gate()) return;
        setEditing((v) => !v);
      }
      if (e.code === 'KeyK') {
        e.preventDefault();
        if (gate()) return;
        setAddOpen(true);
      }
      if (e.code === 'KeyS') {
        e.preventDefault();
        if (gate()) return;
        void sync();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [authed, sync]);

  return (
    <AuthoringContext
      value={{
        isEditing,
        toggleEditing: () => setEditing((v) => !v),
        isAddOpen,
        setAddOpen,
        authed,
        checkingSession,
        needsLogin,
        setNeedsLogin,
        login,
        pending,
        saveEdit,
        sync,
        syncing,
        justSynced,
      }}
    >
      {children}
    </AuthoringContext>
  );
}
