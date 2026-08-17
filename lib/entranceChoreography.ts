/**
 * The domain page's one authored moment: a three-beat entrance that builds the
 * page in the order the eye reads it — the coloured banner arrives as a surface,
 * its title lands on that surface, then the grid fills in beneath.
 *
 * Timings live here rather than in the components because the sequence spans two
 * files (DomainBanner owns beats 1-2, DomainTopicGrid owns beat 3) and a
 * choreography you can only read by cross-referencing two components is one that
 * silently drifts out of step the first time someone tunes half of it.
 *
 * t=0 is the moment the domain page mounts, which is also when AppFrame's page
 * fade starts. The two are meant to overlap: the fade is the wash, this is the
 * structure underneath it, and together they read as a single arrival.
 *
 *   0.00s  ├─ banner scales up ─────────┤
 *   0.42s            ├─ title rises ────────┤
 *   0.78s                     ├─ cards stagger in ─────── ...
 *
 * Each beat starts while the previous is ~75% settled. Strict "wait until fully
 * stopped" gaps read as stutter and would push a routine navigation past two
 * seconds; an overlap this size still reads as three distinct beats.
 */

/** Exponential ease-out — a confident arrival that decelerates hard into place. */
export const EASE_ARRIVE = [0.16, 1, 0.3, 1] as const;

export const ENTRANCE = {
  banner: { delay: 0, duration: 0.6 },
  title: { delay: 0.42, duration: 0.45 },
  cards: { delay: 0.78, duration: 0.45, stagger: 0.035, maxStagger: 0.35 },
} as const;

/**
 * Delay for the card at `index`.
 *
 * `staged` is true only for the page's one-time entrance. Cards also mount when the
 * user changes a filter, and those must not sit out the banner/title beats again —
 * three quarters of a second of nothing after clicking a filter reads as the filter
 * being broken, not as choreography. Those keep the stagger and drop the lead-in.
 */
export function cardDelay(index: number, staged: boolean): number {
  const stagger = Math.min(index * ENTRANCE.cards.stagger, ENTRANCE.cards.maxStagger);
  return staged ? ENTRANCE.cards.delay + stagger : stagger;
}

/** Milliseconds from mount until the last staggered card has settled. */
export const ENTRANCE_SETTLED_MS =
  (ENTRANCE.cards.delay + ENTRANCE.cards.maxStagger + ENTRANCE.cards.duration) * 1000;
