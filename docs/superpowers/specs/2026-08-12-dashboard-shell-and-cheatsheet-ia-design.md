# Dashboard Shell & Cheatsheet IA — Design

**Date:** 2026-08-12
**Status:** Approved, ready for implementation planning
**Supersedes (in part):** [2026-08-05-ux-methods-cheatsheet-design.md](2026-08-05-ux-methods-cheatsheet-design.md) §5 (color), §6.2 (home page)

---

## 1. What this is

The site is growing from a single-purpose Cheatsheet into a personal dashboard with multiple features: Cheatsheet (live), Books, Courses, Checklists, Quotes (all planned). This spec covers the first slice of that: the **app-level navigation shell** and a **redesigned Cheatsheet dashboard** (the `/` page). It does not design Books, Courses, Checklists, or Quotes themselves — those are stubs for now and each gets its own spec when built.

This spec also resolves an IA drift: the approved 2026-08-05 spec called for the home page to be a flat index of 20 categories; what shipped instead nested them under 6 unspec'd super-groups, and two of those categories (UX Psychology, Strategic Thinking — 89 planned entries combined) have zero written content, which reads as broken rather than "not started yet."

### Explicit non-goal override

The 2026-08-05 spec states: *"Not a course. It does not teach; it reminds. The sibling `Learning Lessons/*` workspaces teach."* Adding a Courses nav entry is a conscious first step away from that boundary. The Courses feature itself — what content model it uses, whether the sibling workspaces retire or stay as authoring environments — is explicitly out of scope here and remains an open question logged in `docs/future-features/course-consolidation.md`.

### In scope

- A persistent app-nav sidebar, present on every page.
- The Cheatsheet dashboard (`/`): a flat, color-coded grid of all 20 categories, plus a search + filter panel.
- A site-wide switch from the current single dark warm-gray surface to a light/cream palette.

### Explicitly not touched

- Topic pages (`/c/[category]`) — `CategoryTopicGrid` (tabs, inline search/sort, card grid) stays exactly as built. Only its color tokens change as a side effect of the site-wide palette switch (see §5).
- Method pages (`/m/[id]`) — layout unchanged, same palette-switch side effect.
- The taxonomy data (`lib/taxonomy.ts`, `lib/categories.ts`'s `CATEGORIES` list) — still 20 categories, same entries. This is a presentation-layer change, not a content restructure.
- Content authoring (writing the remaining ~300 unwritten entries) — separate, ongoing work.

---

## 2. App shell — persistent sidebar

A slim left sidebar, rendered in the root layout (`app/layout.tsx`) so it wraps every route.

**Desktop (≥640px):** fixed rail, ~240px wide, full viewport height. Top-to-bottom: site mark/eyebrow, then 5 nav entries:

| Entry | State | Destination |
|---|---|---|
| Cheatsheet | active, enabled | `/` |
| Books | visible, disabled | none — "soon" badge, no click |
| Courses | visible, disabled | none — "soon" badge, no click |
| Checklists | visible, disabled | none — "soon" badge, no click |
| Quotes | visible, disabled | none — "soon" badge, no click |

Disabled entries are visually muted (lower opacity, no hover state) with a small "soon" tag — present so the roadmap is visible, not clickable since there's nothing behind them yet.

**Mobile (<640px):** the persistent rail doesn't fit single-column mobile (spec §6.4's mobile-first constraint still holds). Collapses to a hamburger-triggered slide-out drawer, same 5 entries, dismissible by tapping outside or selecting an entry — mirroring the existing pattern where the command palette becomes a bottom sheet under 640px.

This is new — there is no existing sidebar component in the codebase to extend, so this is a new component built on Astryx's primitives, following the existing dark→light token migration in §5.

---

## 3. Cheatsheet dashboard (`/`)

Replaces `CategoryGroupList` (the current 6-group nested list) entirely.

### 3.1 Category grid

- **Flat grid of all 20 category cards** — no section headers, no collapsing. This restores the spec's original "dense index" intent while keeping a color signal.
- **Color:** each card is filled with its existing super-group color — reusing `CATEGORY_GROUPS[].fillClass` from `lib/categories.ts` unchanged (e.g. the 3 Research-family categories — Research & Synthesis, Qualitative Research, Quantitative Research — all render in the same red already assigned to that group today). The 6 groups stop being a *navigation* layer but continue as a *color* system.
- **Card content:** category number (existing `01`–`20`), title, and total planned entry count (e.g. "39 entries") — the count of taxonomy items in `getTaxonomyForCategory(categoryId)`, not the count of written `.mdx` files. Deliberately **not** showing written-vs-total ("0/39") — that's an authoring-progress detail, not something a reader needs, and would make just-started categories look broken rather than early.
- **Click target:** entire card links to `/c/[category]` (unchanged route/page).

### 3.2 Filter panel

Sits alongside the grid (not the same panel as the app-nav sidebar — see §2, these are two distinct panels).

- **Search field:** a visible, always-present entry point into the *existing* global search — clicking or typing into it opens the same `⌘K` command palette already wired up via `PaletteProvider` (`app/layout.tsx`). No new search implementation; this is a discoverability affordance for search that already exists but was keyboard-shortcut-only. Selecting a result (category, or a specific written entry) navigates straight to that page.
- **Group filter:** chips/checkboxes for the 6 color groups. Selecting one or more narrows the 20-card grid to categories in those groups. No `kind` filter (kind is a per-entry property, not a per-category one, and doesn't map cleanly onto a category-card grid). No completion-status filter (reader-facing page, not an authoring dashboard).

---

## 4. Visual language — site-wide light/cream palette

Reverses the 2026-08-05 spec §5 decision ("single committed dark warm reading surface — not a light/dark pair"). New direction, modeled on claude.com's blog: light, cream, high-clarity, generous whitespace, color reserved for accents (the category system) and interactive elements.

Applied via the same mechanism as today — CSS custom property overrides on Astryx's `stone` theme, defined in `lib/theme.ts` and compiled by the Astryx build step into `lib/cheatsheet.css`. Same ascending-lightness tiering as the current dark tokens (page → surface → card, each a step toward the most "raised" element), just inverted:

| Role | Token | Value | Contrast |
|---|---|---|---|
| Page | `--color-background-body` | `#FAF6EF` (cream) | — |
| Surface (side panels, filter panel) | `--color-background-surface` | `#FDFBF6` | — |
| Card (category cards, raised elements) | `--color-background-card` | `#FFFFFF` | — |
| Primary text | `--color-text-primary` | `#23211D` | 14.9:1 on page |
| Secondary text | `--color-text-secondary` | `#5C574A` | 6.7:1 on page |
| Border | `--color-border` | `#E4DED2` | — |

Both text tokens computed against `#FAF6EF` using the same relative-luminance method the original spec used; primary clears AAA (7:1), secondary clears AA (4.5:1) and sits close to AAA.

**Category accent colors are unchanged** — the existing `CATEGORY_GROUPS[].fillClass` hex values (coral, teal, ochre, slate blue, plum, terracotta) and their `text-white` pairing carry over as-is. They're used as solid card fills, so page-background contrast doesn't apply to them; text-on-fill contrast was already a requirement when they were introduced and needs no rework.

This palette switch cascades to every page (dashboard, topic pages, method pages) as a token change — no per-page palette logic. Component-level classes that hardcode the old dark tokens (if any exist outside the token system) need auditing during implementation.

---

## 5. What's next

- Write the implementation plan for this spec (sidebar component, dashboard rewrite, `lib/theme.ts` token changes, an audit of any hardcoded dark-mode classes).
- Books, Courses, Checklists, Quotes each get their own brainstorm + spec when picked up. Courses in particular should revisit `docs/future-features/course-consolidation.md`'s open questions before scoping.
