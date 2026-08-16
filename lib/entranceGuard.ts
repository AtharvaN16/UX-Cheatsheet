/**
 * Next.js's App Router client-side navigation genuinely remounts the destination
 * page's client component tree twice in quick succession (confirmed via direct
 * instrumentation: two separate CategoryBanner mounts ~230-250ms apart, with only
 * one real pathname change logged in between) — this isn't something a page/
 * component can prevent from the outside, only work around.
 *
 * Left unguarded, every mount replays its `initial` -> `animate` entrance, which
 * looks exactly like "visible, fade to invisible, fade back to visible" — a
 * duplicate animation, not a real intentional exit+enter.
 *
 * This tracks the last mount time per key (module-scope, so it survives the
 * remount itself but resets on a real hard reload) and reports whether a mount
 * should skip its entrance because a mount with the same key just happened. A
 * genuinely new visit later (past `windowMs`) still animates normally.
 */
const lastMount = new Map<string, number>();

export function shouldSkipEntrance(key: string, windowMs = 800): boolean {
  const now = Date.now();
  const prev = lastMount.get(key);
  lastMount.set(key, now);
  return prev !== undefined && now - prev < windowMs;
}
