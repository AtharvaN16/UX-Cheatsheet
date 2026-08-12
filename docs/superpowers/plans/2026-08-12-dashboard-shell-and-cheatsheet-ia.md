# Dashboard Shell & Cheatsheet IA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent app-nav sidebar (Cheatsheet/Books/Courses/Checklists/Quotes) and replace the Cheatsheet home page's 6-group nested list with a flat, color-coded, filterable grid of all 20 categories — on a new site-wide light/cream palette.

**Architecture:** Two new client components (`AppSidebar`, `CategoryDashboardGrid`) built on existing Astryx primitives (`AppShell`, `SideNav`, `Badge`), wired into the existing root layout and home page. The dashboard's search field reuses the existing `⌘K` command palette (extended to also index the 20 categories) rather than a new search implementation. The palette switch is a token-only change in `lib/theme.ts` plus three small pieces of state that must move in lockstep (`app/globals.css`'s forced `color-scheme`, `app/providers.tsx`'s `<Theme mode>`, `app/layout.tsx`'s SSR `data-theme` attribute) — all three exist today specifically to keep dark mode consistent between SSR and hydration, and must flip together or the site renders inconsistently.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Astryx (`@astryxdesign/core`), Tailwind v4, Bun (test runner).

## Global Constraints

- Astryx imports stay confined to `components/ui/` (per the original spec §7.0 — one blast radius if a breaking Astryx change lands).
- No new dependencies. Everything needed (`AppShell`, `SideNav`, `SideNavItem`, `Badge`) already ships in the pinned `@astryxdesign/core`.
- `bun run validate` and `bun test` must stay green after every task.
- Category accent colors (`CATEGORY_GROUPS[].fillClass` hex values) do not change — only the page/surface/card/text/border tokens do.
- No component-level test infra exists in this repo (no jsdom/testing-library) and this plan does not add any — per the original spec §9, components are verified manually (`bun run dev` + browser/curl check), unit tests are for `lib/` pure functions only.
- Topic pages (`/c/[category]`, `CategoryTopicGrid`) and method pages (`/m/[id]`) keep their existing content/layout — only their color tokens and the new sidebar frame around them change.

---

### Task 1: `getCategoryGroup` helper

**Files:**
- Modify: `lib/categories.ts`
- Test: `lib/categories.test.ts` (new)

**Interfaces:**
- Produces: `getCategoryGroup(categoryId: string): CategoryGroup | undefined` — reverse lookup from a category id to the `CategoryGroup` it belongs to (for card coloring in Task 8).

- [ ] **Step 1: Write the failing test**

Create `lib/categories.test.ts`:

```ts
import { expect, test, describe } from 'bun:test';
import { getCategoryGroup, CATEGORY_GROUPS } from './categories';

describe('getCategoryGroup', () => {
  test('finds the group containing a given category id', () => {
    const group = getCategoryGroup('quantitative-research');
    expect(group?.title).toBe('Research');
  });

  test('returns undefined for an unknown category id', () => {
    expect(getCategoryGroup('not-a-real-category')).toBeUndefined();
  });

  test('every category in CATEGORY_GROUPS resolves back to its own group', () => {
    for (const group of CATEGORY_GROUPS) {
      for (const id of group.categoryIds) {
        expect(getCategoryGroup(id)?.title).toBe(group.title);
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/categories.test.ts`
Expected: FAIL — `getCategoryGroup is not a function` (or similar import error).

- [ ] **Step 3: Add the implementation**

In `lib/categories.ts`, after the existing `getCategory` function:

```ts
export function getCategoryGroup(categoryId: string): CategoryGroup | undefined {
  return CATEGORY_GROUPS.find((g) => g.categoryIds.includes(categoryId));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test lib/categories.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/categories.ts lib/categories.test.ts
git commit -m "feat: add getCategoryGroup reverse lookup"
```

---

### Task 2: `getTaxonomyEntryCount` helper

**Files:**
- Modify: `lib/taxonomy.ts`
- Test: `lib/taxonomy.test.ts` (new)

**Interfaces:**
- Produces: `getTaxonomyEntryCount(categoryId: string): number` — total planned entries (written or not) for a category, for the dashboard card count in Task 8. Deliberately counts *taxonomy* items, not written `.mdx` files — see spec §3.1.

- [ ] **Step 1: Write the failing test**

Create `lib/taxonomy.test.ts`:

```ts
import { expect, test, describe } from 'bun:test';
import { getTaxonomyEntryCount, getTaxonomyForCategory } from './taxonomy';

describe('getTaxonomyEntryCount', () => {
  test('sums items across every group in a multi-group category', () => {
    const tax = getTaxonomyForCategory('evaluation');
    const expected = tax!.groups.reduce((sum, g) => sum + g.items.length, 0);
    expect(getTaxonomyEntryCount('evaluation')).toBe(expected);
    expect(getTaxonomyEntryCount('evaluation')).toBe(11);
  });

  test('sums items across a category with multiple named subgroups', () => {
    // ux-psychology has two groups: Human Behavior (34) + Motivation Models (5)
    expect(getTaxonomyEntryCount('ux-psychology')).toBe(39);
  });

  test('returns 0 for an unknown category id', () => {
    expect(getTaxonomyEntryCount('not-a-real-category')).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/taxonomy.test.ts`
Expected: FAIL — `getTaxonomyEntryCount is not a function`.

- [ ] **Step 3: Add the implementation**

In `lib/taxonomy.ts`, after the existing `getTaxonomyForCategory` function:

```ts
export function getTaxonomyEntryCount(categoryId: string): number {
  const tax = getTaxonomyForCategory(categoryId);
  if (!tax) return 0;
  return tax.groups.reduce((sum, g) => sum + g.items.length, 0);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test lib/taxonomy.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/taxonomy.ts lib/taxonomy.test.ts
git commit -m "feat: add getTaxonomyEntryCount helper"
```

---

### Task 3: Site-wide light/cream palette

**Files:**
- Modify: `lib/theme.ts`
- Modify: `app/globals.css`
- Modify: `app/providers.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: the six `--color-*` tokens re-exported from `lib/cheatsheet.css` (generated) that every existing component already consumes via Tailwind utility classes (`bg-body`, `text-primary`, `border-border`, etc.) — no component code changes needed, this task only changes token *values* plus the three theme-mode signals that must move with them.

This task has no automated test (CSS token values, no pure-function surface) — verify with `bun run dev` and a visual check, per the Global Constraints note on manual verification.

- [ ] **Step 1: Flip the six theme tokens**

In `lib/theme.ts`, replace the token block:

```ts
import { defineTheme } from '@astryxdesign/core/theme';
import { stoneTheme } from '@astryxdesign/theme-stone/built';

/**
 * Single committed surface: light cream page, warm charcoal text.
 * Contrast verified — primary on page 14.9:1, secondary on page 6.7:1.
 */
export const cheatsheetTheme = defineTheme({
  name: 'cheatsheet',
  extends: stoneTheme,
  tokens: {
    '--color-background-body': '#FAF6EF',
    '--color-background-surface': '#FDFBF6',
    '--color-background-card': '#FFFFFF',
    '--color-text-primary': '#23211D',
    '--color-text-secondary': '#5C574A',
    '--color-border': '#E4DED2',
  },
});
```

- [ ] **Step 2: Flip the forced color-scheme in globals.css**

In `app/globals.css`, find:

```css
:root {
  color-scheme: dark;
}
```

Replace with:

```css
:root {
  color-scheme: light;
}
```

Update the comment immediately above it (currently explaining why dark is forced) to say `light` instead of `dark` throughout — the mechanism and reasoning are unchanged, only which mode is being forced.

- [ ] **Step 3: Flip the Theme mode in providers.tsx**

In `app/providers.tsx`:

```tsx
<Theme theme={cheatsheetTheme} mode="light">
```

Update the comment above it (currently explaining why `mode="dark"` matters for SSR/hydration consistency) to reference `light`/`"light"` instead of `dark`/`"dark"` — same mechanism, flipped value.

- [ ] **Step 4: Flip the SSR data-theme attribute in layout.tsx**

In `app/layout.tsx`:

```tsx
<html
  lang="en"
  data-astryx-theme={cheatsheetTheme.name}
  data-theme="light"
  className={`${GeistSans.variable} ${GeistMono.variable}`}
>
```

- [ ] **Step 5: Verify visually**

Run: `bun run dev`
Then fetch or open `http://localhost:3001/`, `/c/evaluation`, `/m/usability-testing` and confirm: cream/white background, dark warm-gray text, no leftover dark surfaces. On `/c/evaluation`, check the existing `CategoryTopicGrid` search `<input>` — its text cursor and selection highlight should render as light-mode chrome, not dark, confirming `color-scheme: light` took effect.

- [ ] **Step 6: Commit**

```bash
git add lib/theme.ts app/globals.css app/providers.tsx app/layout.tsx
git commit -m "feat: switch site-wide palette to light/cream"
```

---

### Task 4: Category-aware search source

**Files:**
- Modify: `lib/search/source.ts`
- Modify: `lib/search/source.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `MethodAux` gains two optional fields, `href?: string` and `type?: 'method' | 'category'`. `createMethodSource` is otherwise unchanged — it already works generically over `MethodItem`/`ScorableMethod`, so feeding it category-shaped entries (a `ScorableMethod` with only `title` set, empty `whenToUse`/`rest`) needs no change to the scorer itself. Task 5 and Task 7 consume `auxiliaryData.href` and `auxiliaryData.type`.

- [ ] **Step 1: Write the failing tests**

Add to `lib/search/source.test.ts` (append inside the existing `describe('createMethodSource', ...)` block, after the last test):

```ts
  test('tags a category-type item with the CATEGORIES group regardless of matched field', async () => {
    const catItems: MethodItem[] = [
      {
        id: 'evaluation',
        label: 'Evaluation',
        auxiliaryData: { category: 'evaluation', kind: 'category', group: '', href: '/c/evaluation', type: 'category' },
      },
    ];
    const catScorables: ScorableMethod[] = [
      { id: 'evaluation', title: 'Evaluation', aka: [], whenToUse: '', rest: '' },
    ];
    const src = createMethodSource(catItems, catScorables);
    const r = await src.search('evaluation');
    expect(r[0].auxiliaryData.group).toBe('CATEGORIES');
  });

  test('a mixed items list ranks methods and categories together by score', async () => {
    const mixedItems: MethodItem[] = [
      ...items,
      {
        id: 'ia-structure',
        label: 'IA & Structure',
        auxiliaryData: { category: 'ia-structure', kind: 'category', group: '', href: '/c/ia-structure', type: 'category' },
      },
    ];
    const mixedScorables: ScorableMethod[] = [
      ...scorables,
      { id: 'ia-structure', title: 'IA & Structure', aka: [], whenToUse: '', rest: '' },
    ];
    const src = createMethodSource(mixedItems, mixedScorables);
    const r = await src.search('tree testing');
    expect(r[0].id).toBe('tree-testing');
  });

  test('items without href/type still work (existing method items are unaffected)', async () => {
    const src = createMethodSource(items, scorables);
    const r = await src.search('tree testing');
    expect(r[0].auxiliaryData.href).toBeUndefined();
    expect(r[0].auxiliaryData.type).toBeUndefined();
  });
```

Also add the needed import at the top of the file if not already present — `MethodItem` and `ScorableMethod` are already imported; no new imports needed.

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test lib/search/source.test.ts`
Expected: FAIL — TypeScript error on `href`/`type` not existing on the `MethodAux` type used in the item literals (or the CATEGORIES-group assertion failing since nothing sets it yet).

- [ ] **Step 3: Implement**

In `lib/search/source.ts`, update `MethodAux` and the `search()` method:

```ts
export interface MethodAux {
  category: string;
  kind: string;
  /** CommandPalette auto-groups on this. */
  group: string;
  /** Route to navigate to on selection. Falls back to `/m/${id}` in Palette.tsx when absent. */
  href?: string;
  /** Distinguishes a category entry from a method entry. Defaults to 'method' behavior when absent. */
  type?: 'method' | 'category';
}
```

Update the `search` function inside `createMethodSource` to override the group label for category entries:

```ts
    search(query: string): MethodItem[] {
      return scoreMethods(query, scorables).flatMap((s) => {
        const item = byId.get(s.id);
        if (!item) return [];
        const group =
          item.auxiliaryData.type === 'category' ? 'CATEGORIES' : GROUP_LABEL[s.matchedOn];
        return [{ ...item, auxiliaryData: { ...item.auxiliaryData, group } }];
      });
    },
```

(`bootstrap()` is unchanged — it doesn't compute a `matchedOn`-based group.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test lib/search/source.test.ts`
Expected: PASS, all tests (existing 9 + 3 new = 12).

- [ ] **Step 5: Commit**

```bash
git add lib/search/source.ts lib/search/source.test.ts
git commit -m "feat: let search source carry category entries alongside methods"
```

---

### Task 5: Palette navigation by href + palette-open context

**Files:**
- Modify: `components/ui/Palette.tsx`
- Modify: `components/ui/PaletteProvider.tsx`

**Interfaces:**
- Consumes: `MethodAux.href` / `MethodAux.type` from Task 4.
- Produces: `usePaletteControls(): { open: () => void }` — a hook any descendant of `PaletteProvider` can call to open the command palette programmatically. Task 8's dashboard search button consumes this.

- [ ] **Step 1: Generalize Palette's navigation**

In `components/ui/Palette.tsx`, `onValueChange` receives only the selected item's `id`, but the destination now lives on the item's `auxiliaryData.href` (Task 4), not the id — so look the item up from `items` before navigating. Replace:

```tsx
      onValueChange={(id) => {
        push(id);
        onOpenChange(false);
        router.push(`/m/${id}`);
      }}
```

with:

```tsx
      onValueChange={(id) => {
        const item = items.find((i) => i.id === id);
        push(id);
        onOpenChange(false);
        router.push(item?.auxiliaryData.href ?? `/m/${id}`);
      }}
```

The fallback to `/m/${id}` preserves existing behavior for every method item, which has no `href` set.

- [ ] **Step 2: Add the palette-open context**

Rewrite `components/ui/PaletteProvider.tsx` in full:

```tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Palette } from './Palette';
import type { MethodItem } from '@/lib/search/source';
import type { ScorableMethod } from '@/lib/search/score';

interface PaletteControls {
  open: () => void;
}

const PaletteContext = createContext<PaletteControls | null>(null);

/** Lets any descendant of PaletteProvider open the command palette programmatically. */
export function usePaletteControls(): PaletteControls {
  const ctx = useContext(PaletteContext);
  if (!ctx) {
    throw new Error('usePaletteControls must be used within a PaletteProvider');
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;

      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        setIsOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <PaletteContext value={{ open: () => setIsOpen(true) }}>
      {children}
      <Palette items={items} scorables={scorables} isOpen={isOpen} onOpenChange={setIsOpen} />
    </PaletteContext>
  );
}
```

- [ ] **Step 3: Verify manually**

Run: `bun run dev`, open `http://localhost:3001/`, press `⌘K`, select a method — confirm it still navigates to `/m/<id>` exactly as before (no regression, since existing method items have no `href` and fall back correctly).

Run: `bunx tsc --noEmit` — confirm no type errors (the `items.find` lookup and context typing must compile clean).

- [ ] **Step 4: Commit**

```bash
git add components/ui/Palette.tsx components/ui/PaletteProvider.tsx
git commit -m "feat: route palette selections by href; expose usePaletteControls"
```

---

### Task 6: `AppSidebar` component

**Files:**
- Create: `components/ui/AppSidebar.tsx`

**Interfaces:**
- Consumes: nothing new (uses `usePathname` from `next/navigation`, and Astryx's `SideNav`/`SideNavItem`/`SideNavHeading`/`Badge`).
- Produces: `<AppSidebar />` — a client component rendering the 5-entry nav list, for Task 7 to pass as `AppShell`'s `sideNav` prop.

- [ ] **Step 1: Write the component**

Create `components/ui/AppSidebar.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SideNav, SideNavItem, SideNavHeading } from '@astryxdesign/core/SideNav';
import { Badge } from '@astryxdesign/core/Badge';

const DISABLED_ITEMS = ['Books', 'Courses', 'Checklists', 'Quotes'] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const cheatsheetActive =
    pathname === '/' || pathname.startsWith('/c/') || pathname.startsWith('/m/');

  return (
    <SideNav header={<SideNavHeading heading="UX Cheatsheet" />}>
      <SideNavItem as={Link} href="/" label="Cheatsheet" isSelected={cheatsheetActive} />
      {DISABLED_ITEMS.map((label) => (
        <SideNavItem
          key={label}
          label={label}
          isDisabled
          endContent={<Badge label="Soon" variant="neutral" />}
        />
      ))}
    </SideNav>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `bunx tsc --noEmit`
Expected: no errors. (This component isn't rendered anywhere yet — Task 7 wires it in — so there's nothing to visually check until then.)

- [ ] **Step 3: Commit**

```bash
git add components/ui/AppSidebar.tsx
git commit -m "feat: add AppSidebar nav component"
```

---

### Task 7: Wire AppShell into the root layout; fix duplicate `<main>` landmarks

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx` (tag change only, not layout)
- Modify: `app/c/[category]/page.tsx` (tag change only)
- Modify: `app/m/[id]/page.tsx` (tag change only)
- Modify: `app/m/[id]/not-found.tsx` (tag change only)

**Interfaces:**
- Consumes: `AppSidebar` from Task 6; `MethodAux.href`/`type` from Task 4.
- Produces: every route now renders inside `AppShell`'s content area, which already carries `role="main"` — so the four page files must stop rendering their own `<main>` (a second `role="main"` landmark is invalid and confuses assistive tech). Swap each to `<div>` with the same className, no other change.

- [ ] **Step 1: Fix the duplicate `<main>` landmarks**

In each of the four files, change the root element from `<main className="...">...</main>` to `<div className="...">...</div>`, keeping the className identical. For example, in `app/page.tsx`:

```tsx
    <div className="mx-auto w-full max-w-[68ch] p-6">
      <Eyebrow>UX Methods</Eyebrow>
      ...
    </div>
```

Do the same in `app/c/[category]/page.tsx`, `app/m/[id]/page.tsx`, and `app/m/[id]/not-found.tsx` — only the tag name changes (`main` → `div`), nothing else.

- [ ] **Step 2: Wire AppShell + AppSidebar into the root layout**

In `app/layout.tsx`, add the imports and build a combined search index that includes categories (from Task 4's `href`/`type` fields) alongside methods:

```tsx
import { AppShell } from '@astryxdesign/core/AppShell';
import { AppSidebar } from '@/components/ui/AppSidebar';
import { CATEGORIES } from '@/lib/categories';
```

Replace the `items`/`scorables` construction:

```tsx
  const methods = getAllMethods();
  const methodItems: MethodItem[] = methods.map((m) => ({
    id: m.id,
    label: m.title,
    auxiliaryData: { category: m.category, kind: m.kind, group: '' },
  }));
  const categoryItems: MethodItem[] = CATEGORIES.map((c) => ({
    id: c.id,
    label: c.title,
    auxiliaryData: {
      category: c.id,
      kind: 'category',
      group: '',
      href: `/c/${c.id}`,
      type: 'category',
    },
  }));
  const items: MethodItem[] = [...methodItems, ...categoryItems];

  const categoryScorables = CATEGORIES.map((c) => ({
    id: c.id,
    title: c.title,
    aka: [],
    whenToUse: '',
    rest: '',
  }));
  const scorables = [...methods.map(toScorable), ...categoryScorables];
```

Wrap `{children}` in `AppShell`:

```tsx
      <body>
        <Providers>
          <PaletteProvider items={items} scorables={scorables}>
            <AppShell sideNav={<AppSidebar />} mobileNav={{ breakpoint: 'md' }}>
              {children}
            </AppShell>
          </PaletteProvider>
        </Providers>
      </body>
```

(`PaletteProvider` stays outside `AppShell` so `usePaletteControls`, used by both `AppSidebar` — not yet, but future nav — and Task 8's dashboard, is available throughout the shell including inside it.)

- [ ] **Step 3: Verify manually**

Run: `bun run dev`. Check:
- `http://localhost:3001/` — sidebar visible on the left, "Cheatsheet" highlighted, other four items muted with "Soon" badges and not clickable.
- `http://localhost:3001/c/evaluation` and `/m/usability-testing` — sidebar still present, "Cheatsheet" still highlighted (via the `startsWith` checks), page content unchanged otherwise.
- Resize below 768px (or use browser device toolbar) — sidebar collapses to a hamburger-triggered drawer.
- View source / inspect DOM — confirm exactly one element with `role="main"` per page.

Run: `bunx tsc --noEmit` and `bun run validate` — both clean.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx app/page.tsx "app/c/[category]/page.tsx" "app/m/[id]/page.tsx" "app/m/[id]/not-found.tsx"
git commit -m "feat: wire AppShell sidebar into root layout; fix duplicate main landmarks"
```

---

### Task 8: `CategoryDashboardGrid` component

**Files:**
- Create: `components/ui/CategoryDashboardGrid.tsx`

**Interfaces:**
- Consumes: `getCategoryGroup` (Task 1), `getTaxonomyEntryCount` (Task 2), `usePaletteControls` (Task 5).
- Produces: `<CategoryDashboardGrid />` — for Task 9 to render on the home page.

- [ ] **Step 1: Write the component**

Create `components/ui/CategoryDashboardGrid.tsx`:

```tsx
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Kbd } from '@astryxdesign/core/Kbd';
import { CATEGORIES, CATEGORY_GROUPS, getCategoryGroup } from '@/lib/categories';
import { getTaxonomyEntryCount } from '@/lib/taxonomy';
import { usePaletteControls } from '@/components/ui/PaletteProvider';

export function CategoryDashboardGrid() {
  const { open } = usePaletteControls();
  const [activeGroups, setActiveGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (title: string) => {
    setActiveGroups((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const cards = useMemo(
    () =>
      CATEGORIES.map((c) => ({
        ...c,
        count: getTaxonomyEntryCount(c.id),
        group: getCategoryGroup(c.id),
      })),
    [],
  );

  const visibleCards =
    activeGroups.size === 0
      ? cards
      : cards.filter((c) => c.group && activeGroups.has(c.group.title));

  return (
    <div className="mt-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={open}
          className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm text-secondary transition-colors hover:border-primary/40 hover:text-primary sm:max-w-xs"
        >
          <span>Search categories, methods…</span>
          <Kbd keys="mod+k" />
        </button>

        <div className="flex flex-wrap gap-2">
          {CATEGORY_GROUPS.map((g) => {
            const isActive = activeGroups.has(g.title);
            const dimmed = activeGroups.size > 0 && !isActive;
            return (
              <button
                key={g.title}
                type="button"
                onClick={() => toggleGroup(g.title)}
                aria-pressed={isActive}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-opacity ${g.fillClass} ${dimmed ? 'opacity-40' : 'opacity-100'}`}
              >
                {g.title}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {visibleCards.map((c) => (
          <Link
            key={c.id}
            href={`/c/${c.id}`}
            className={`flex flex-col justify-between rounded-xl p-5 shadow-sm transition-transform hover:scale-[1.02] ${c.group?.fillClass ?? 'bg-card text-primary'}`}
          >
            <span className="font-mono text-xs opacity-70">{c.number}</span>
            <div className="mt-6">
              <h2 className="text-lg font-semibold tracking-tight">{c.title}</h2>
              <p className="mt-1 text-xs opacity-80">{c.count} entries</p>
            </div>
          </Link>
        ))}
      </div>

      {visibleCards.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-secondary">
          No categories in the selected groups.
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `bunx tsc --noEmit`
Expected: no errors. (Not rendered anywhere yet — Task 9 wires it in.)

- [ ] **Step 3: Commit**

```bash
git add components/ui/CategoryDashboardGrid.tsx
git commit -m "feat: add CategoryDashboardGrid component"
```

---

### Task 9: Wire the dashboard grid into the home page; retire `CategoryGroupList`

**Files:**
- Modify: `app/page.tsx`
- Delete: `components/ui/CategoryGroupList.tsx`

**Interfaces:**
- Consumes: `CategoryDashboardGrid` from Task 8.
- Produces: the live home page.

- [ ] **Step 1: Confirm `CategoryGroupList` has no other consumers**

Run: `grep -rn "CategoryGroupList" app components lib`
Expected: only `app/page.tsx` (the import and usage being replaced in this task). If anything else references it, stop and re-scope this step — do not delete it out from under another consumer.

- [ ] **Step 2: Rewrite app/page.tsx**

```tsx
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Kbd } from '@astryxdesign/core/Kbd';
import { CategoryDashboardGrid } from '@/components/ui/CategoryDashboardGrid';

export default function IndexPage() {
  return (
    <div className="mx-auto w-full max-w-7xl p-6">
      <Eyebrow>UX Methods</Eyebrow>
      <h1 className="mt-3 text-4xl tracking-[-0.025em] text-primary">
        A Cheatsheet
      </h1>
      <p className="mt-3 inline-flex flex-wrap items-center gap-1.5 text-secondary">
        Press <Kbd keys="mod+k" /> to search by name, or by
        what you are trying to learn.
      </p>

      <CategoryDashboardGrid />
    </div>
  );
}
```

Note this drops `getAllMethods()` and the per-category written-count loop entirely — the dashboard no longer needs a written-count (Task 8 uses `getTaxonomyEntryCount`, a static/pure lookup), and no other part of this page needs the methods list.

Note this also widens the container from the `max-w-[68ch]` reading-width column (a prior, now-superseded change) to `max-w-7xl`, matching the width already used on the topic page (`CategoryTopicGrid`'s wrapper in `app/c/[category]/page.tsx`) — a card grid needs more than a 68-character reading column.

- [ ] **Step 3: Delete the superseded component**

```bash
git rm components/ui/CategoryGroupList.tsx
```

- [ ] **Step 4: Verify manually**

Run: `bun run dev`, open `http://localhost:3001/`. Confirm:
- Flat grid of 20 color-coded cards, no group section headers.
- Cards in the same family (e.g. the 3 Research categories) share the same color.
- Clicking a card navigates to its `/c/[category]` page.
- Clicking a group filter chip narrows the grid to that family; clicking it again (or another chip) toggles correctly; with nothing selected, all 20 show.
- Clicking the search button opens the `⌘K` palette; selecting a category navigates to `/c/[category]`; selecting a method still navigates to `/m/[id]`.

Run: `bunx tsc --noEmit`, `bun run validate`, `bun test` — all clean.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "feat: replace grouped category list with flat dashboard grid"
```

---

### Task 10: Full verification pass

**Files:** none (verification only).

- [ ] **Step 1: Run the full automated suite**

```bash
bun run validate
bun test
bunx tsc --noEmit
```

Expected: all clean — 17 methods valid, all unit tests pass (existing + the ones added in Tasks 1/2/4), no type errors.

- [ ] **Step 2: Manual pass through every route**

With `bun run dev` running, check each of:
- `/` — dashboard grid, filter chips, search button, sidebar with 4 disabled + 1 active item.
- `/c/evaluation` (a category with full taxonomy groups) and `/c/ux-psychology` (a category with zero written entries) — `CategoryTopicGrid` renders correctly on both, including the zero-written case (no broken cards, unwritten items show as non-clickable).
- `/m/usability-testing` — method page renders correctly, sidebar present, "Cheatsheet" highlighted.
- A nonexistent method id (e.g. `/m/does-not-exist`) — `not-found.tsx` renders inside the shell, not as a bare page.

- [ ] **Step 3: Mobile and accessibility spot-checks**

- Narrow the viewport below 768px (or use device toolbar): sidebar collapses to a drawer; dashboard grid drops to 2 columns; filter chips wrap.
- `<MotionConfig reducedMotion="user">` still wraps everything (unchanged from before this plan) — no new motion was added that ignores it.
- Inspect any page's DOM: exactly one `role="main"` element.
- Tab through the sidebar with the keyboard: disabled items are skipped or clearly announced as disabled, not focusable as if clickable.

- [ ] **Step 4: Final commit if any fixes were needed**

If Steps 1–3 turned up nothing, there's nothing to commit — the plan is complete as of Task 9's commit. If a fix was needed, commit it with a message describing what verification caught.
