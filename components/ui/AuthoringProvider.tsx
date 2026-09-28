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
  /**
   * The queued value for a section body, or undefined if nothing is queued.
   *
   * On the live site a save does not change the page — the page is a build
   * artefact, and the edit only joins `pending` until Sync commits it. Without
   * these two lookups every editor appeared to silently discard the change, so
   * every render site of an editable value reads through them.
   */
  pendingSection: (id: string, heading: string) => string | undefined;
  /** The queued value for a frontmatter field, or undefined. */
  pendingField: (id: string, field: string) => string | undefined;
  /** How many queued edits touch one card. Drives the per-card undo button. */
  pendingCountFor: (id: string) => number;
  /** Drop every queued edit for one card, without touching the rest. */
  discardEdits: (id: string) => void;
  /** Drop the entire queue, including new-card entries. */
  discardAll: () => void;
  /** End the session in this browser. */
  logout: () => Promise<void>;
  /** Whether the dock is collapsed to a dot. */
  dockCollapsed: boolean;
  setDockCollapsed: (v: boolean) => void;
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

/**
 * The quiet "this is queued, not saved" cue.
 *
 * Amber rather than the blue used for active editing or the green used for a
 * landed sync: queued work is neither. A 2px rule down the left edge of the
 * affected body is enough to notice on a second look and easy to ignore on the
 * first — it must not compete with the content it marks.
 */
/**
 * How an unsynced change looks. Deliberately louder than a hairline: the whole
 * point is that a queued edit is visible at a glance, because the previous
 * version showed nothing at all and the app read as broken.
 *
 * Amber is a third state, distinct from the blue of "editing right now" and the
 * green of "synced". Same hue as the search highlight already in use.
 */
export const PENDING_CUE_CLASS =
  'border-l-[3px] border-[#E8B307] bg-[#FDE047]/15 pl-4 py-2 -my-2 rounded-r-[6px]';

/** The same amber, for a control (a segmented button) rather than a block. */
export const PENDING_CONTROL_CLASS = 'ring-2 ring-[#E8B307] ring-offset-1';

/** The same signal where a left rule would not fit — beside a field label. */
export function PendingDot() {
  const label = 'Queued — not synced yet';
  return (
    <span
      title={label}
      aria-label={label}
      role="img"
      className="ml-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#FDE047] align-middle"
    />
  );
}

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
  const [dockCollapsed, setDockCollapsed] = useState(false);

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

  // `addEdit` keeps one entry per slot, so the first match is the only match.
  // In development `pending` is always empty and both of these return undefined,
  // which is exactly right: there the file on disk already holds the new text.
  const pendingSection = useCallback(
    (id: string, heading: string) =>
      pending.find(
        (e): e is Extract<PendingEdit, { kind: 'section' }> =>
          e.kind === 'section' && e.id === id && e.heading === heading,
      )?.markdown,
    [pending],
  );

  const pendingCountFor = useCallback(
    (id: string) => pending.filter((e) => e.kind !== 'card' && e.id === id).length,
    [pending],
  );

  /**
   * Undo, scoped to one card. Nothing is sent anywhere — a queued edit has not
   * reached the repository yet, so discarding it is purely local and instant.
   * New-card entries are keyed differently and are never dropped by this.
   */
  const discardEdits = useCallback((id: string) => {
    setPending((list) => list.filter((e) => e.kind === 'card' || e.id !== id));
  }, []);

  /**
   * Clear everything. The per-card undo only reaches the card whose sheet is
   * open, so without this a queue spread across several cards — or one whose
   * card you can no longer find — had no way out but clearing site data.
   */
  const discardAll = useCallback(() => setPending([]), []);

  /**
   * Sign out of this browser. Editing is switched off first so the page does
   * not sit in edit mode with no session behind it — every save would 401.
   * Queued edits are deliberately NOT discarded: they are unsynced work, and
   * signing out is not a request to destroy it.
   */
  const logout = useCallback(async () => {
    await fetch('/api/authoring/logout', { method: 'POST' });
    setEditing(false);
    setAuthed(false);
  }, []);

  const pendingField = useCallback(
    (id: string, field: string) =>
      pending.find(
        (e): e is Extract<PendingEdit, { kind: 'frontmatter' }> =>
          e.kind === 'frontmatter' && e.id === id && e.field === field,
      )?.value,
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
        pendingSection,
        pendingField,
        pendingCountFor,
        discardEdits,
        discardAll,
        logout,
        dockCollapsed,
        setDockCollapsed,
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
