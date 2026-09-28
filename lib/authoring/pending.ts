// lib/authoring/pending.ts

export type PendingEdit =
  | { kind: 'section'; id: string; heading: string; markdown: string }
  | { kind: 'frontmatter'; id: string; field: string; value: string }
  | { kind: 'image'; id: string; filename: string; base64: string }
  | { kind: 'card'; title: string; cardKind: string; domainId: string; groupTitle: string | null };

export const PENDING_KEY = 'ux-authoring-pending';

/**
 * Identity of an edit for replacement purposes.
 *
 * Two edits collide when they would write the same thing: the same section of
 * the same card, the same frontmatter field, that card's image. They do NOT
 * collide merely by touching the same file — editing Tips and Purpose on one
 * card must keep both, because sync applies them in order to one file write.
 * New cards never collide; each is its own entry.
 */
function slot(edit: PendingEdit): string {
  switch (edit.kind) {
    case 'section':
      return `section:${edit.id}:${edit.heading}`;
    case 'frontmatter':
      return `frontmatter:${edit.id}:${edit.field}`;
    case 'image':
      return `image:${edit.id}`;
    case 'card':
      return `card:${edit.title}:${edit.domainId}`;
  }
}

/** Append an edit, replacing any earlier edit to the same slot in place. */
export function addEdit(list: PendingEdit[], edit: PendingEdit): PendingEdit[] {
  const key = slot(edit);
  const at = list.findIndex((e) => slot(e) === key);
  if (at === -1) return [...list, edit];
  const next = [...list];
  next[at] = edit;
  return next;
}

/** One scannable line per pending change, for the dock. */
export function describeEdit(edit: PendingEdit): string {
  switch (edit.kind) {
    case 'section':
      return `${edit.id} — ${edit.heading}`;
    case 'frontmatter':
      return `${edit.id} — ${edit.field}: ${edit.value}`;
    case 'image':
      return `${edit.id} — image`;
    case 'card':
      return `new card — ${edit.title}`;
  }
}

/**
 * Pending edits live in the browser. There is no server-side draft store, and
 * adding a KV store for one is a far larger commitment than this feature
 * warrants. Consequences, stated rather than designed around: edits survive a
 * reload, and are per-browser.
 */
export function loadPending(): PendingEdit[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingEdit[]) : [];
  } catch {
    return [];
  }
}

export function savePending(list: PendingEdit[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(list));
  } catch {
    /* quota or private mode — the in-memory set still works this session */
  }
}
