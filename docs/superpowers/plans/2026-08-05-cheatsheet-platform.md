# UX Methods Cheatsheet — Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the site platform — content pipeline, build-time validation, command palette, three page types, motion — seeded with 6 method entries and deployed to production.

**Architecture:** MDX files with Zod-validated frontmatter are read at build time into a typed index. A pure scoring function ranks methods across three weighted fields and is fed to Astryx's `CommandPalette` via its `searchSource` interface. All pages are statically prerendered. `lib/content` is the only code touching the filesystem; everything downstream consumes its typed output.

**Tech Stack:** Bun · Next.js 16.3 (App Router) · React 19.2 · TypeScript · Astryx 0.2.0 (`@astryxdesign/core`, `theme-stone`, `cli`) · Tailwind v4.3 · motion 13 · next-mdx-remote 6 · gray-matter 4 · zod 4.4 · geist 1.7

**Spec:** [`docs/superpowers/specs/2026-08-05-ux-methods-cheatsheet-design.md`](../specs/2026-08-05-ux-methods-cheatsheet-design.md)

**Scope:** This plan covers spec Phase 0 + Phase 1 only. Phase 2 (authoring 63 research-spine entries) is content work, not engineering, and gets its own plan once this platform proves the format.

## Global Constraints

- **Package manager and test runner: Bun.** Never `npm`/`pnpm`/`yarn`. Tests use `bun test`, not Vitest.
- **Pin every `@astryxdesign/*` dependency exactly** — `"0.2.0"`, never `"^0.2.0"`. Astryx is v0.2.0 Beta with 674 npm versions since June 2026; a floating range will break the build. Commit `bun.lock`.
- **Confine Astryx imports to `components/ui/`.** No other directory imports from `@astryxdesign/*`. One blast radius for a breaking change.
- **Single theme.** Warm gray surface, cream text. No light mode, no `prefers-color-scheme` pair, no theme toggle.
- Palette values, verbatim: page `#24231F`, surface `#2C2B26`, raised `#333230`, text primary `#F2EBDE`, text secondary `#B8B2A6`, border `#3D3B35`.
- **Required body sections, exact strings, this order:** `What is it`, `Purpose`, `When to use`, `How to do it`, `Common mistakes`, `Tips`, `Using AI`. Optional: `Notes`.
- **Search field weights:** title + aka `1.0`, `When to use` body `0.6`, remaining body `0.25`.
- **Every method needs ≥1 `useInstead` entry and ≥2 `sources`.** Build fails otherwise.
- `<MotionConfig reducedMotion="user">` wraps the app. Non-negotiable.
- Work on `dev`. Never commit directly to `main`.
- Node/Next runtime is Node 24.x on Vercel; React 19 is a hard floor for Astryx.

---

### Task 1: Scaffold Next.js on Bun

The working directory already contains `.claude/`, `docs/`, `.gitignore`, and `.vercel/`. `create-next-app` refuses to scaffold into a directory with conflicting files, so scaffold into a temp subdirectory and lift the files up.

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `postcss.config.mjs`, `bun.lock`

**Interfaces:**
- Consumes: nothing
- Produces: a running Next.js 16 app; `bun run dev`, `bun run build`, `bun test` all functional

- [ ] **Step 1: Scaffold into a temp subdirectory**

```bash
cd "/Users/atharvanayak/Desktop/Learning Lessons/UX Cheatsheet"
bun create next-app@latest _scaffold \
  --ts --tailwind --app --no-src-dir --turbopack \
  --eslint --import-alias "@/*" --use-bun --yes
```

- [ ] **Step 2: Lift scaffold files up and remove the temp directory**

```bash
cd "/Users/atharvanayak/Desktop/Learning Lessons/UX Cheatsheet"
# Move everything including dotfiles, but never clobber our .gitignore
shopt -s dotglob
for f in _scaffold/*; do
  base=$(basename "$f")
  [ "$base" = ".gitignore" ] && continue
  [ "$base" = ".git" ] && continue
  mv "$f" .
done
shopt -u dotglob
rm -rf _scaffold
```

- [ ] **Step 3: Append Next.js entries to the existing .gitignore**

```bash
cat >> .gitignore <<'EOF'
/.next/
/out/
next-env.d.ts
*.tsbuildinfo
EOF
sort -u .gitignore -o .gitignore
```

- [ ] **Step 4: Verify the build passes**

Run: `bun run build`
Expected: build completes, no type errors. If `next-env.d.ts` is missing, run `bun run dev` once to generate it, then re-run.

- [ ] **Step 5: Verify the test runner works**

Create `lib/smoke.test.ts`:

```ts
import { expect, test } from 'bun:test';

test('bun test runs', () => {
  expect(1 + 1).toBe(2);
});
```

Run: `bun test`
Expected: 1 pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 16 app on Bun"
```

---

### Task 2: Astryx, Tailwind layers, and the gray/cream theme

**Files:**
- Create: `lib/theme.ts`, `app/providers.tsx`, `components/ui/index.ts`
- Modify: `app/globals.css`, `app/layout.tsx`, `package.json`

**Interfaces:**
- Consumes: Task 1's app shell
- Produces: `cheatsheetTheme: DefinedTheme` from `lib/theme.ts`; `<Providers>` from `app/providers.tsx`; every page renders on the gray surface with cream text

- [ ] **Step 1: Install Astryx and runtime deps with exact pins**

```bash
bun add @astryxdesign/core@0.2.0 @astryxdesign/theme-stone@0.2.0 @stylexjs/stylex@^0.19.0
bun add motion@^13.0.0 geist@^1.7.2 gray-matter@^4.0.3 zod@^4.4.3 next-mdx-remote@^6.0.0
bun add -d @astryxdesign/cli@0.2.0
```

Then confirm `package.json` shows `"@astryxdesign/core": "0.2.0"` with **no** caret. If Bun added one, edit it out and re-run `bun install`.

- [ ] **Step 2: Add the Astryx CLI script to package.json**

Add to the `scripts` block:

```json
"astryx": "node node_modules/@astryxdesign/cli/clients/cli/bin/astryx.mjs"
```

- [ ] **Step 3: Write `app/globals.css` with the exact layer order**

Layer order is load-bearing — Astryx's CSS must sit between Tailwind's base and utilities or the theme will not win.

```css
@layer reset, theme, base, astryx-base, astryx-theme, components, utilities;

@import 'tailwindcss/theme.css' layer(theme);
@import 'tailwindcss/preflight.css' layer(base);
@import '@astryxdesign/core/reset.css';
@import '@astryxdesign/core/astryx.css';
@import '@astryxdesign/theme-stone/theme.css';
@import '@astryxdesign/core/tailwind-theme.css';
@import 'tailwindcss/utilities.css' layer(utilities);

html,
body {
  background: var(--color-background-body);
  color: var(--color-text-primary);
}
```

- [ ] **Step 4: Write `lib/theme.ts` with the spec palette**

```ts
import { defineTheme } from '@astryxdesign/core/theme';
import { stoneTheme } from '@astryxdesign/theme-stone/built';

/**
 * Single committed surface: warm gray page, cream text.
 * Contrast verified — cream on page 13.3:1, secondary on page 7.5:1.
 */
export const cheatsheetTheme = defineTheme({
  name: 'cheatsheet',
  extends: stoneTheme,
  tokens: {
    '--color-background-body': '#24231F',
    '--color-background-surface': '#2C2B26',
    '--color-background-card': '#333230',
    '--color-text-primary': '#F2EBDE',
    '--color-text-secondary': '#B8B2A6',
    '--color-border': '#3D3B35',
  },
});
```

- [ ] **Step 5: Write `app/providers.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { MotionConfig } from 'motion/react';
import { Theme } from '@astryxdesign/core/theme';
import { LinkProvider } from '@astryxdesign/core/Link';
import { cheatsheetTheme } from '@/lib/theme';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Theme theme={cheatsheetTheme}>
      <LinkProvider component={Link}>
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </LinkProvider>
    </Theme>
  );
}
```

- [ ] **Step 6: Wire `app/layout.tsx` to Geist and Providers**

```tsx
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'UX Methods',
  description: 'A working reference for UX methods, frameworks, and models.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Replace `app/page.tsx` with a theme smoke test**

```tsx
import { Button } from '@astryxdesign/core/Button';

export default function Page() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <p className="font-mono text-xs uppercase tracking-[0.1em] text-secondary">
        Theme check
      </p>
      <h1 className="mt-2 text-4xl tracking-[-0.025em] text-primary">
        Cream on warm gray
      </h1>
      <div className="mt-6">
        <Button label="Astryx button" variant="primary" />
      </div>
    </main>
  );
}
```

- [ ] **Step 8: Verify visually**

Run: `bun run dev`, open `http://localhost:3000`
Expected: warm gray `#24231F` page background, cream `#F2EBDE` heading, a rendered Astryx button. If the background is white, the layer order in Step 3 is wrong — Astryx CSS must come after Tailwind preflight.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add Astryx with gray/cream theme and Geist fonts"
```

---

### Task 3: Content schema

**Files:**
- Create: `lib/content/schema.ts`, `lib/content/schema.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `frontmatterSchema: z.ZodType` — parses raw frontmatter
  - `type Frontmatter = z.infer<typeof frontmatterSchema>`
  - `REQUIRED_SECTIONS: readonly string[]` — the 7 required `##` headings in order
  - `OPTIONAL_SECTIONS: readonly string[]`
  - `KIND`, `GIVES`, `EFFORT`, `TIMEFRAME`, `SOURCE_TYPE` const arrays

- [ ] **Step 1: Write the failing tests**

`lib/content/schema.test.ts`:

```ts
import { expect, test, describe } from 'bun:test';
import { frontmatterSchema, REQUIRED_SECTIONS } from './schema';

const valid = {
  id: 'tree-testing',
  title: 'Tree Testing',
  category: 'ia-structure',
  kind: 'evaluative',
  gives: 'quantitative',
  effort: 'low',
  timeframe: 'days',
  useInstead: [{ when: 'No structure yet', method: 'card-sorting' }],
  sources: [
    { title: 'A', author: 'B', url: 'https://a.test', type: 'article' },
    { title: 'C', author: 'D', url: 'https://c.test', type: 'book' },
  ],
};

describe('frontmatterSchema', () => {
  test('accepts a valid entry and defaults optional arrays', () => {
    const r = frontmatterSchema.parse(valid);
    expect(r.id).toBe('tree-testing');
    expect(r.aka).toEqual([]);
    expect(r.alsoIn).toEqual([]);
    expect(r.related.before).toEqual([]);
    expect(r.sources[0].seminal).toBe(false);
  });

  test('rejects a non-kebab-case id', () => {
    expect(() => frontmatterSchema.parse({ ...valid, id: 'Tree_Testing' })).toThrow();
  });

  test('rejects fewer than two sources', () => {
    expect(() =>
      frontmatterSchema.parse({ ...valid, sources: [valid.sources[0]] }),
    ).toThrow();
  });

  test('rejects an empty useInstead', () => {
    expect(() => frontmatterSchema.parse({ ...valid, useInstead: [] })).toThrow();
  });

  test('rejects an unknown kind', () => {
    expect(() => frontmatterSchema.parse({ ...valid, kind: 'vibes' })).toThrow();
  });

  test('rejects a malformed source url', () => {
    const bad = { ...valid, sources: [{ ...valid.sources[0], url: 'not-a-url' }, valid.sources[1]] };
    expect(() => frontmatterSchema.parse(bad)).toThrow();
  });
});

describe('REQUIRED_SECTIONS', () => {
  test('is the seven spec sections in order', () => {
    expect([...REQUIRED_SECTIONS]).toEqual([
      'What is it',
      'Purpose',
      'When to use',
      'How to do it',
      'Common mistakes',
      'Tips',
      'Using AI',
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test lib/content/schema.test.ts`
Expected: FAIL — cannot resolve `./schema`.

- [ ] **Step 3: Write the schema**

`lib/content/schema.ts`:

```ts
import { z } from 'zod';

export const KIND = ['generative', 'descriptive', 'evaluative', 'causal', 'framework'] as const;
export const GIVES = ['quantitative', 'qualitative', 'mixed', 'conceptual'] as const;
export const EFFORT = ['low', 'medium', 'high'] as const;
export const TIMEFRAME = ['hours', 'days', 'weeks', 'months', 'ongoing'] as const;
export const SOURCE_TYPE = ['book', 'article', 'paper', 'video', 'standard', 'tool'] as const;

export const REQUIRED_SECTIONS = [
  'What is it',
  'Purpose',
  'When to use',
  'How to do it',
  'Common mistakes',
  'Tips',
  'Using AI',
] as const;

export const OPTIONAL_SECTIONS = ['Notes'] as const;

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const sourceSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  url: z.url(),
  type: z.enum(SOURCE_TYPE),
  year: z.number().int().min(1900).max(2100).optional(),
  seminal: z.boolean().default(false),
});

export const useInsteadSchema = z.object({
  when: z.string().min(1),
  method: z.string().regex(KEBAB),
});

export const relatedSchema = z.object({
  before: z.array(z.string().regex(KEBAB)).default([]),
  after: z.array(z.string().regex(KEBAB)).default([]),
  alongside: z.array(z.string().regex(KEBAB)).default([]),
});

export const frontmatterSchema = z.object({
  id: z.string().regex(KEBAB),
  title: z.string().min(1),
  aka: z.array(z.string()).default([]),
  category: z.string().regex(KEBAB),
  alsoIn: z.array(z.string().regex(KEBAB)).default([]),
  kind: z.enum(KIND),
  gives: z.enum(GIVES),
  effort: z.enum(EFFORT),
  timeframe: z.enum(TIMEFRAME),
  needs: z.array(z.string()).default([]),
  useInstead: z.array(useInsteadSchema).min(1),
  related: relatedSchema.default({ before: [], after: [], alongside: [] }),
  sources: z.array(sourceSchema).min(2),
});

export type Frontmatter = z.infer<typeof frontmatterSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type UseInstead = z.infer<typeof useInsteadSchema>;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test lib/content/schema.test.ts`
Expected: 7 pass.

- [ ] **Step 5: Commit**

```bash
git add lib/content/schema.ts lib/content/schema.test.ts
git commit -m "feat: add Zod schema for method frontmatter"
```

---

### Task 4: Section parser

Splits an MDX body into named sections and reports which required ones are missing. Kept separate from file I/O so it is testable on plain strings.

**Files:**
- Create: `lib/content/sections.ts`, `lib/content/sections.test.ts`

**Interfaces:**
- Consumes: `REQUIRED_SECTIONS` from `lib/content/schema.ts`
- Produces:
  - `parseSections(body: string): Record<string, string>`
  - `missingSections(parsed: Record<string, string>): string[]`

- [ ] **Step 1: Write the failing tests**

`lib/content/sections.test.ts`:

```ts
import { expect, test, describe } from 'bun:test';
import { parseSections, missingSections } from './sections';

const body = `
## What is it
A guided conversation.

## Purpose
To learn why.

## When to use
- You need depth

## How to do it
1. Write a guide

## Common mistakes
- **Leading questions** — ask about the past

## Tips
Record everything.

## Using AI
**Where it helps**
- Transcription

**Where it fails**
- Synthetic participants
`;

describe('parseSections', () => {
  test('extracts every section keyed by heading', () => {
    const s = parseSections(body);
    expect(Object.keys(s)).toContain('What is it');
    expect(Object.keys(s)).toContain('Using AI');
    expect(s['Purpose'].trim()).toBe('To learn why.');
  });

  test('keeps multi-line section content intact', () => {
    const s = parseSections(body);
    expect(s['Using AI']).toContain('Where it helps');
    expect(s['Using AI']).toContain('confident garbage');
  });

  test('ignores h3 and deeper headings', () => {
    const s = parseSections('## Tips\ntext\n### Subhead\nmore\n');
    expect(Object.keys(s)).toEqual(['Tips']);
    expect(s['Tips']).toContain('Subhead');
  });
});

describe('missingSections', () => {
  test('returns empty for a complete body', () => {
    expect(missingSections(parseSections(body))).toEqual([]);
  });

  test('names each missing required section', () => {
    const s = parseSections('## What is it\nx\n');
    const missing = missingSections(s);
    expect(missing).toContain('Purpose');
    expect(missing).toContain('Using AI');
    expect(missing).not.toContain('What is it');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test lib/content/sections.test.ts`
Expected: FAIL — cannot resolve `./sections`.

- [ ] **Step 3: Write the parser**

`lib/content/sections.ts`:

```ts
import { REQUIRED_SECTIONS } from './schema';

/** Split an MDX body into sections keyed by their `## ` heading text. */
export function parseSections(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  const lines = body.split('\n');
  let current: string | null = null;
  let buf: string[] = [];

  const flush = () => {
    if (current !== null) out[current] = buf.join('\n').trim();
    buf = [];
  };

  for (const line of lines) {
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (m) {
      flush();
      current = m[1];
    } else if (current !== null) {
      buf.push(line);
    }
  }
  flush();

  return out;
}

/** Required section names absent from a parsed body, in spec order. */
export function missingSections(parsed: Record<string, string>): string[] {
  return REQUIRED_SECTIONS.filter((s) => !(s in parsed));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test lib/content/sections.test.ts`
Expected: 5 pass.

- [ ] **Step 5: Commit**

```bash
git add lib/content/sections.ts lib/content/sections.test.ts
git commit -m "feat: add MDX section parser"
```

---

### Task 5: Content loader and cross-reference validation

**Files:**
- Create: `lib/content/load.ts`, `lib/content/load.test.ts`, `lib/content/fixtures/valid/ia-structure/tree-testing.mdx`, `lib/content/fixtures/valid/ia-structure/card-sorting.mdx`, `lib/content/fixtures/broken-ref/ia-structure/tree-testing.mdx`
- Modify: `package.json` (add `validate` script)
- Create: `scripts/validate-content.ts`

**Interfaces:**
- Consumes: `frontmatterSchema`, `parseSections`, `missingSections`
- Produces:
  - `type Method = Frontmatter & { body: string; sections: Record<string, string> }`
  - `loadMethods(dir: string): { methods: Method[]; errors: string[] }`
  - Error strings formatted `<relative/path>.mdx: <field> — <reason>`

- [ ] **Step 1: Write the fixtures**

`lib/content/fixtures/valid/ia-structure/tree-testing.mdx`:

```mdx
---
id: tree-testing
title: Tree Testing
aka: [reverse card sorting]
category: ia-structure
kind: evaluative
gives: quantitative
effort: low
timeframe: days
useInstead:
  - when: You do not have a structure yet
    method: card-sorting
related:
  before: [card-sorting]
sources:
  - title: Tree Testing
    author: Dave OBrien
    url: https://example.test/tree-testing
    type: article
    year: 2026
  - title: Information Architecture
    author: Rosenfeld and Morville
    url: https://example.test/ia
    type: book
    seminal: true
---

## What is it
People find things in a text-only version of your navigation.

## Purpose
Tells you whether your structure works before visual design hides the problem.

## When to use
- You want to know whether people find things in an existing navigation

## How to do it
1. Write the tree as plain nested text

## Common mistakes
- **Testing with your own labels** — use the words users use

## Tips
Run it before wireframes.

## Using AI
**Where it helps**
- Draft candidate label variants to test

**Where it fails**
- Predicting which label users prefer without testing
```

`lib/content/fixtures/valid/ia-structure/card-sorting.mdx` — identical shape, with `id: card-sorting`, `title: Card Sorting`, `kind: generative`, `aka: []`, `useInstead: [{ when: You already have a structure to test, method: tree-testing }]`, `related: { after: [tree-testing] }`, and its own two sources. Its `## When to use` section reads:

```
- You are building a structure and need to know how people group things
```

`lib/content/fixtures/broken-ref/ia-structure/tree-testing.mdx` — copy of the valid tree-testing file with `method: card-sorting` changed to `method: does-not-exist`.

- [ ] **Step 2: Write the failing tests**

`lib/content/load.test.ts`:

```ts
import { expect, test, describe } from 'bun:test';
import { join } from 'node:path';
import { loadMethods } from './load';

const FIX = join(import.meta.dir, 'fixtures');

describe('loadMethods', () => {
  test('loads valid methods with no errors', () => {
    const { methods, errors } = loadMethods(join(FIX, 'valid'));
    expect(errors).toEqual([]);
    expect(methods.map((m) => m.id).sort()).toEqual(['card-sorting', 'tree-testing']);
  });

  test('exposes parsed sections on each method', () => {
    const { methods } = loadMethods(join(FIX, 'valid'));
    const tree = methods.find((m) => m.id === 'tree-testing')!;
    expect(tree.sections['When to use']).toContain('existing navigation');
    expect(tree.sections['Using AI']).toContain('confident garbage');
  });

  test('reports an unresolved useInstead reference', () => {
    const { errors } = loadMethods(join(FIX, 'broken-ref'));
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('tree-testing.mdx');
    expect(errors[0]).toContain('does-not-exist');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `bun test lib/content/load.test.ts`
Expected: FAIL — cannot resolve `./load`.

- [ ] **Step 4: Write the loader**

`lib/content/load.ts`:

```ts
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, basename } from 'node:path';
import matter from 'gray-matter';
import { frontmatterSchema, type Frontmatter } from './schema';
import { parseSections, missingSections } from './sections';

export type Method = Frontmatter & {
  body: string;
  sections: Record<string, string>;
};

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('.mdx')) out.push(full);
  }
  return out;
}

/**
 * Read every .mdx under `dir`, validate it, and resolve cross-references.
 * Returns both the parsed methods and a list of human-readable errors.
 * The caller decides whether errors are fatal.
 */
export function loadMethods(dir: string): { methods: Method[]; errors: string[] } {
  const errors: string[] = [];
  const methods: Method[] = [];
  const seen = new Map<string, string>();

  for (const file of walk(dir).sort()) {
    const rel = relative(dir, file);
    const raw = readFileSync(file, 'utf8');
    const { data, content } = matter(raw);

    const parsed = frontmatterSchema.safeParse(data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push(`${rel}: ${issue.path.join('.') || '(root)'} — ${issue.message}`);
      }
      continue;
    }

    const fm = parsed.data;
    const expectedFile = `${fm.id}.mdx`;
    if (basename(file) !== expectedFile) {
      errors.push(`${rel}: id — must match filename (expected ${expectedFile})`);
    }
    if (seen.has(fm.id)) {
      errors.push(`${rel}: id — duplicate of ${seen.get(fm.id)}`);
    }
    seen.set(fm.id, rel);

    const sections = parseSections(content);
    const missing = missingSections(sections);
    if (missing.length > 0) {
      errors.push(`${rel}: sections — missing ${missing.join(', ')}`);
    }

    methods.push({ ...fm, body: content, sections });
  }

  // Cross-references resolve only once every id is known.
  const ids = new Set(methods.map((m) => m.id));
  for (const m of methods) {
    const rel = seen.get(m.id)!;
    const check = (id: string, field: string) => {
      if (!ids.has(id)) errors.push(`${rel}: ${field} — unresolved reference "${id}"`);
    };
    m.useInstead.forEach((u, i) => check(u.method, `useInstead[${i}].method`));
    m.related.before.forEach((id) => check(id, 'related.before'));
    m.related.after.forEach((id) => check(id, 'related.after'));
    m.related.alongside.forEach((id) => check(id, 'related.alongside'));
  }

  return { methods, errors };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun test lib/content/load.test.ts`
Expected: 3 pass.

- [ ] **Step 6: Write the validate script**

`scripts/validate-content.ts`:

```ts
import { join } from 'node:path';
import { loadMethods } from '../lib/content/load';

const dir = join(import.meta.dir, '..', 'content', 'methods');
const { methods, errors } = loadMethods(dir);

if (errors.length > 0) {
  console.error(`\n${errors.length} content error(s):\n`);
  for (const e of errors) console.error(`  ${e}`);
  console.error('');
  process.exit(1);
}

console.log(`✓ ${methods.length} methods valid`);
```

Add to `package.json` scripts:

```json
"validate": "bun run scripts/validate-content.ts"
```

- [ ] **Step 7: Verify the script runs against an empty content dir**

```bash
mkdir -p content/methods
bun run validate
```

Expected: `✓ 0 methods valid`

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add content loader with cross-reference validation"
```

---

### Task 6: Search scorer

A pure function — string in, ranked ids out. No React, no filesystem. This is the behaviour that justifies building a palette instead of a search box.

**Files:**
- Create: `lib/search/score.ts`, `lib/search/score.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type ScorableMethod = { id: string; title: string; aka: string[]; whenToUse: string; rest: string }`
  - `type ScoredMethod = { id: string; score: number; matchedOn: 'title' | 'whenToUse' | 'body' }`
  - `scoreMethods(query: string, methods: ScorableMethod[]): ScoredMethod[]` — sorted descending, zero-score entries omitted

- [ ] **Step 1: Write the failing tests**

`lib/search/score.test.ts`:

```ts
import { expect, test, describe } from 'bun:test';
import { scoreMethods, type ScorableMethod } from './score';

const methods: ScorableMethod[] = [
  {
    id: 'tree-testing',
    title: 'Tree Testing',
    aka: ['reverse card sorting'],
    whenToUse: 'You want to know whether people find things in an existing navigation',
    rest: 'Participants click through a text-only tree.',
  },
  {
    id: 'card-sorting',
    title: 'Card Sorting',
    aka: [],
    whenToUse: 'You are building a structure and need to know how people group things',
    rest: 'Participants group content into piles.',
  },
  {
    id: 'usability-testing',
    title: 'Usability Testing',
    aka: [],
    whenToUse: 'You need to know why people fail a task',
    rest: 'Watch someone attempt a task and narrate.',
  },
];

describe('scoreMethods', () => {
  test('ranks an exact title match first', () => {
    const r = scoreMethods('tree testing', methods);
    expect(r[0].id).toBe('tree-testing');
    expect(r[0].matchedOn).toBe('title');
  });

  test('matches on an alias', () => {
    const r = scoreMethods('reverse card sorting', methods);
    expect(r[0].id).toBe('tree-testing');
  });

  test('matches situationally on "when to use" text', () => {
    const r = scoreMethods('people find things', methods);
    expect(r[0].id).toBe('tree-testing');
    expect(r[0].matchedOn).toBe('whenToUse');
  });

  test('title match outranks a whenToUse match for the same query', () => {
    // Isolated fixture: the shared `methods` array can't test this cleanly,
    // since tree-testing's aka ('reverse card sorting') fully contains the
    // query "card sorting" and aka shares title's weight — a legitimate tie,
    // not the property under test here.
    const scoped: ScorableMethod[] = [
      { id: 'a', title: 'Some Method With Widgets', aka: [], whenToUse: 'irrelevant', rest: '' },
      { id: 'b', title: 'Other Method', aka: [], whenToUse: 'You need widgets to succeed', rest: '' },
    ];
    const r = scoreMethods('widgets', scoped);
    expect(r[0].id).toBe('a');
    expect(r[0].matchedOn).toBe('title');
    expect(r.find((x) => x.id === 'b')!.score).toBeLessThan(r[0].score);
  });

  test('falls back to body text with the lowest weight', () => {
    const r = scoreMethods('piles', methods);
    expect(r[0].id).toBe('card-sorting');
    expect(r[0].matchedOn).toBe('body');
  });

  test('returns empty for a query that matches nothing', () => {
    expect(scoreMethods('quantum tunnelling', methods)).toEqual([]);
  });

  test('returns empty for a blank query', () => {
    expect(scoreMethods('   ', methods)).toEqual([]);
  });

  test('is case and punctuation insensitive', () => {
    const r = scoreMethods('TREE-TESTING!', methods);
    expect(r[0].id).toBe('tree-testing');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test lib/search/score.test.ts`
Expected: FAIL — cannot resolve `./score`.

- [ ] **Step 3: Write the scorer**

`lib/search/score.ts`:

```ts
export type MatchField = 'title' | 'whenToUse' | 'body';

export interface ScorableMethod {
  id: string;
  title: string;
  aka: string[];
  whenToUse: string;
  rest: string;
}

export interface ScoredMethod {
  id: string;
  score: number;
  matchedOn: MatchField;
}

/** Spec §6.1 field weights. */
const WEIGHTS: Record<MatchField, number> = {
  title: 1.0,
  whenToUse: 0.6,
  body: 0.25,
};

const normalize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim();

const terms = (s: string) => normalize(s).split(' ').filter(Boolean);

/** Fraction of query terms present anywhere in `text`. */
function coverage(queryTerms: string[], text: string): number {
  if (queryTerms.length === 0) return 0;
  const hay = normalize(text);
  const hit = queryTerms.filter((t) => hay.includes(t)).length;
  return hit / queryTerms.length;
}

/**
 * Rank methods against a query across three weighted fields.
 * A method scores on its best field; `matchedOn` reports which one,
 * so the palette can group results by why they matched.
 */
export function scoreMethods(query: string, methods: ScorableMethod[]): ScoredMethod[] {
  const qt = terms(query);
  if (qt.length === 0) return [];

  const scored: ScoredMethod[] = [];

  for (const m of methods) {
    const fields: Array<[MatchField, string]> = [
      ['title', [m.title, ...m.aka].join(' ')],
      ['whenToUse', m.whenToUse],
      ['body', m.rest],
    ];

    let best: ScoredMethod | null = null;
    for (const [field, text] of fields) {
      const score = coverage(qt, text) * WEIGHTS[field];
      if (score > 0 && (best === null || score > best.score)) {
        best = { id: m.id, score, matchedOn: field };
      }
    }
    if (best) scored.push(best);
  }

  return scored.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test lib/search/score.test.ts`
Expected: 8 pass.

- [ ] **Step 5: Commit**

```bash
git add lib/search/score.ts lib/search/score.test.ts
git commit -m "feat: add weighted three-field search scorer"
```

---

### Task 7: Content index and search source adapter

**Files:**
- Create: `lib/content/index.ts`, `lib/search/source.ts`, `lib/search/source.test.ts`

**Interfaces:**
- Consumes: `loadMethods`, `Method`, `scoreMethods`, `ScorableMethod`
- Produces:
  - `getAllMethods(): Method[]` — cached, reads `content/methods`
  - `getMethod(id: string): Method | undefined`
  - `getMethodsByCategory(category: string): { primary: Method[]; secondary: Method[] }`
  - `toScorable(m: Method): ScorableMethod`
  - `type MethodItem = { id: string; label: string; auxiliaryData: { category: string; kind: string; group: string } }`
  - `createMethodSource(items: MethodItem[], scorables: ScorableMethod[]): SearchSource<MethodItem>`

- [ ] **Step 1: Write the failing test for the search source**

`lib/search/source.test.ts`:

```ts
import { expect, test, describe } from 'bun:test';
import { createMethodSource, type MethodItem } from './source';
import type { ScorableMethod } from './score';

const items: MethodItem[] = [
  { id: 'tree-testing', label: 'Tree Testing', auxiliaryData: { category: 'ia-structure', kind: 'evaluative', group: '' } },
  { id: 'card-sorting', label: 'Card Sorting', auxiliaryData: { category: 'ia-structure', kind: 'generative', group: '' } },
];

const scorables: ScorableMethod[] = [
  { id: 'tree-testing', title: 'Tree Testing', aka: [], whenToUse: 'people find things in navigation', rest: '' },
  { id: 'card-sorting', title: 'Card Sorting', aka: [], whenToUse: 'building a structure', rest: '' },
];

describe('createMethodSource', () => {
  test('search returns items ranked by the scorer', async () => {
    const src = createMethodSource(items, scorables);
    const r = await src.search('tree testing');
    expect(r[0].id).toBe('tree-testing');
  });

  test('tags title matches with the METHODS group', async () => {
    const src = createMethodSource(items, scorables);
    const r = await src.search('tree testing');
    expect(r[0].auxiliaryData.group).toBe('METHODS');
  });

  test('tags situational matches with the WHEN TO USE group', async () => {
    const src = createMethodSource(items, scorables);
    const r = await src.search('people find things');
    expect(r[0].id).toBe('tree-testing');
    expect(r[0].auxiliaryData.group).toBe('MATCHED ON WHEN TO USE');
  });

  test('bootstrap returns an empty list when there is no history', async () => {
    const src = createMethodSource(items, scorables);
    expect(await src.bootstrap()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test lib/search/source.test.ts`
Expected: FAIL — cannot resolve `./source`.

- [ ] **Step 3: Write the content index**

`lib/content/index.ts`:

```ts
import { join } from 'node:path';
import { loadMethods, type Method } from './load';
import type { ScorableMethod } from '../search/score';

const CONTENT_DIR = join(process.cwd(), 'content', 'methods');

let cache: Method[] | null = null;

/** All valid methods. Throws at build time if any entry is invalid. */
export function getAllMethods(): Method[] {
  if (cache) return cache;
  const { methods, errors } = loadMethods(CONTENT_DIR);
  if (errors.length > 0) {
    throw new Error(`Invalid content:\n${errors.map((e) => `  ${e}`).join('\n')}`);
  }
  cache = methods;
  return cache;
}

export function getMethod(id: string): Method | undefined {
  return getAllMethods().find((m) => m.id === id);
}

/** Methods whose primary home is `category`, plus those listing it in alsoIn. */
export function getMethodsByCategory(category: string): {
  primary: Method[];
  secondary: Method[];
} {
  const all = getAllMethods();
  return {
    primary: all.filter((m) => m.category === category),
    secondary: all.filter((m) => m.alsoIn.includes(category)),
  };
}

export function toScorable(m: Method): ScorableMethod {
  const { 'When to use': whenToUse = '', ...others } = m.sections;
  return {
    id: m.id,
    title: m.title,
    aka: m.aka,
    whenToUse,
    rest: Object.values(others).join('\n'),
  };
}

export type { Method };
```

- [ ] **Step 4: Write the search source adapter**

`lib/search/source.ts`:

```ts
import type { SearchSource, SearchableItem } from '@astryxdesign/core/Typeahead';
import { scoreMethods, type ScorableMethod, type MatchField } from './score';

export interface MethodAux {
  category: string;
  kind: string;
  /** CommandPalette auto-groups on this. */
  group: string;
}

export interface MethodItem extends SearchableItem<MethodAux> {
  id: string;
  label: string;
  auxiliaryData: MethodAux;
}

const GROUP_LABEL: Record<MatchField, string> = {
  title: 'METHODS',
  whenToUse: 'MATCHED ON WHEN TO USE',
  body: 'ALSO MENTIONS',
};

/**
 * Adapts the pure scorer to Astryx's SearchSource interface.
 * `recent` ids are returned by bootstrap() when the query is empty.
 */
export function createMethodSource(
  items: MethodItem[],
  scorables: ScorableMethod[],
  recent: string[] = [],
): SearchSource<MethodItem> {
  const byId = new Map(items.map((i) => [i.id, i]));

  return {
    search(query: string): MethodItem[] {
      return scoreMethods(query, scorables).flatMap((s) => {
        const item = byId.get(s.id);
        if (!item) return [];
        return [{ ...item, auxiliaryData: { ...item.auxiliaryData, group: GROUP_LABEL[s.matchedOn] } }];
      });
    },
    bootstrap(): MethodItem[] {
      return recent.flatMap((id) => {
        const item = byId.get(id);
        if (!item) return [];
        return [{ ...item, auxiliaryData: { ...item.auxiliaryData, group: 'RECENT' } }];
      });
    },
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun test lib/search/source.test.ts`
Expected: 4 pass.

- [ ] **Step 6: Commit**

```bash
git add lib/content/index.ts lib/search/source.ts lib/search/source.test.ts
git commit -m "feat: add content index and Astryx search source adapter"
```

---

### Task 8: Command palette

**Files:**
- Create: `components/ui/Palette.tsx`, `components/ui/PaletteProvider.tsx`, `lib/useRecent.ts`
- Modify: `app/providers.tsx`, `app/layout.tsx`

**Interfaces:**
- Consumes: `createMethodSource`, `MethodItem`, `ScorableMethod`
- Produces:
  - `<PaletteProvider items scorables>` — renders the palette, owns open state, binds ⌘K and `/`
  - `useRecent(): { recent: string[]; push: (id: string) => void }`

- [ ] **Step 1: Write the recent-items hook**

`lib/useRecent.ts`:

```ts
'use client';

import { useCallback, useEffect, useState } from 'react';

const KEY = 'ux-cheatsheet:recent';
const MAX = 8;

export function useRecent() {
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
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
```

- [ ] **Step 2: Write the palette**

`components/ui/Palette.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { CommandPalette } from '@astryxdesign/core/CommandPalette';
import { createMethodSource, type MethodItem } from '@/lib/search/source';
import type { ScorableMethod } from '@/lib/search/score';
import { useRecent } from '@/lib/useRecent';

export function Palette({
  items,
  scorables,
  isOpen,
  onOpenChange,
}: {
  items: MethodItem[];
  scorables: ScorableMethod[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { recent, push } = useRecent();

  const source = useMemo(
    () => createMethodSource(items, scorables, recent),
    [items, scorables, recent],
  );

  return (
    <CommandPalette<MethodItem>
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      searchSource={source}
      label="Search methods"
      emptySearchText="No method matches. Try describing the situation instead."
      emptyBootstrapText="Search by name, or by what you are trying to learn."
      onValueChange={(id) => {
        push(id);
        onOpenChange(false);
        router.push(`/m/${id}`);
      }}
      renderItem={(item, isSelected) => (
        <div className="flex w-full items-center justify-between gap-4">
          <span className={isSelected ? 'text-primary' : 'text-secondary'}>{item.label}</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-secondary">
            {item.auxiliaryData.kind}
          </span>
        </div>
      )}
    />
  );
}
```

- [ ] **Step 3: Write the provider with keybindings**

`components/ui/PaletteProvider.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Palette } from './Palette';
import type { MethodItem } from '@/lib/search/source';
import type { ScorableMethod } from '@/lib/search/score';

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
    <>
      {children}
      <Palette items={items} scorables={scorables} isOpen={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
```

- [ ] **Step 4: Feed the palette from the root layout**

In `app/layout.tsx`, build the item list on the server and pass it down:

```tsx
import { getAllMethods, toScorable } from '@/lib/content';
import { PaletteProvider } from '@/components/ui/PaletteProvider';
import type { MethodItem } from '@/lib/search/source';
```

Inside `RootLayout`, before the return:

```tsx
const methods = getAllMethods();
const items: MethodItem[] = methods.map((m) => ({
  id: m.id,
  label: m.title,
  auxiliaryData: { category: m.category, kind: m.kind, group: '' },
}));
const scorables = methods.map(toScorable);
```

Then wrap children: `<Providers><PaletteProvider items={items} scorables={scorables}>{children}</PaletteProvider></Providers>`

- [ ] **Step 5: Give the palette real data to search**

Tasks 9 and 10 also need content to render. Copy the two valid fixtures into the real content directory — Task 12 supersedes them with full entries.

```bash
mkdir -p content/methods/ia-structure
cp lib/content/fixtures/valid/ia-structure/*.mdx content/methods/ia-structure/
bun run validate
```

Expected: `✓ 2 methods valid`

- [ ] **Step 6: Verify manually**

Run: `bun run dev`. Press ⌘K.
Expected: palette opens on the gray surface; typing "tree" filters to Tree Testing; Enter navigates to `/m/tree-testing` (a 404 until Task 9 — confirm the URL changes); Escape closes.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add command palette with cmd-K binding"
```

---

### Task 9: Method detail page

**Files:**
- Create: `app/m/[id]/page.tsx`, `app/m/[id]/not-found.tsx`, `components/method/MetaStrip.tsx`, `components/method/UseInsteadBlock.tsx`, `components/method/SourceList.tsx`, `components/method/RelatedRail.tsx`, `components/ui/Eyebrow.tsx`

**Interfaces:**
- Consumes: `getAllMethods`, `getMethod`, `Method`
- Produces: statically prerendered `/m/<id>` for every method

- [ ] **Step 1: Write the shared eyebrow**

`components/ui/Eyebrow.tsx`:

```tsx
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-xs uppercase tracking-[0.1em] text-secondary">{children}</p>
  );
}
```

- [ ] **Step 2: Write the metadata strip**

`components/method/MetaStrip.tsx`:

```tsx
import type { Method } from '@/lib/content';

export function MetaStrip({ method }: { method: Method }) {
  const cells = [
    ['kind', method.kind],
    ['gives', method.gives],
    ['effort', method.effort],
    ['timeframe', method.timeframe],
  ] as const;

  return (
    <dl className="flex flex-wrap gap-x-8 gap-y-3 border-y border-border py-4">
      {cells.map(([label, value]) => (
        <div key={label}>
          <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-secondary">
            {label}
          </dt>
          <dd className="mt-1 text-sm text-primary">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
```

- [ ] **Step 3: Write the use-instead block**

`components/method/UseInsteadBlock.tsx`:

```tsx
import Link from 'next/link';
import type { Method } from '@/lib/content';
import { Eyebrow } from '@/components/ui/Eyebrow';

export function UseInsteadBlock({
  entries,
  titleOf,
}: {
  entries: Method['useInstead'];
  titleOf: (id: string) => string;
}) {
  return (
    <section className="mt-10 rounded-lg bg-surface p-6">
      <Eyebrow>When not to use</Eyebrow>
      <ul className="mt-4 space-y-4">
        {entries.map((e) => (
          <li key={`${e.when}-${e.method}`}>
            <p className="text-primary">{e.when}</p>
            <Link
              href={`/m/${e.method}`}
              className="mt-1 inline-block font-mono text-sm text-secondary underline underline-offset-4 hover:text-primary"
            >
              → {titleOf(e.method)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 4: Write the source list**

`components/method/SourceList.tsx`:

```tsx
import type { Method } from '@/lib/content';
import { Eyebrow } from '@/components/ui/Eyebrow';

export function SourceList({ sources }: { sources: Method['sources'] }) {
  return (
    <section className="mt-10">
      <Eyebrow>Further reading</Eyebrow>
      <ul className="mt-4 space-y-3">
        {sources.map((s) => (
          <li key={s.url} className="text-sm">
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline underline-offset-4"
            >
              {s.title}
            </a>
            <span className="text-secondary">
              {' '}
              — {s.author}
              {s.year ? `, ${s.year}` : ''}
              {s.seminal ? ' · seminal' : ''}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 5: Write the related rail**

`components/method/RelatedRail.tsx`:

```tsx
import Link from 'next/link';
import type { Method } from '@/lib/content';
import { Eyebrow } from '@/components/ui/Eyebrow';

export function RelatedRail({
  related,
  titleOf,
}: {
  related: Method['related'];
  titleOf: (id: string) => string;
}) {
  const groups: Array<[string, string[]]> = [
    ['Before', related.before],
    ['After', related.after],
    ['Alongside', related.alongside],
  ];
  const populated = groups.filter(([, ids]) => ids.length > 0);
  if (populated.length === 0) return null;

  return (
    <section className="mt-10">
      <Eyebrow>Related methods</Eyebrow>
      <div className="mt-4 space-y-3">
        {populated.map(([label, ids]) => (
          <div key={label} className="flex flex-wrap items-baseline gap-x-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-secondary">
              {label}
            </span>
            {ids.map((id) => (
              <Link key={id} href={`/m/${id}`} className="text-sm text-primary underline underline-offset-4">
                {titleOf(id)}
              </Link>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Write the page**

`app/m/[id]/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getAllMethods, getMethod } from '@/lib/content';
import { MetaStrip } from '@/components/method/MetaStrip';
import { UseInsteadBlock } from '@/components/method/UseInsteadBlock';
import { SourceList } from '@/components/method/SourceList';
import { RelatedRail } from '@/components/method/RelatedRail';
import { Eyebrow } from '@/components/ui/Eyebrow';

export function generateStaticParams() {
  return getAllMethods().map((m) => ({ id: m.id }));
}

export default async function MethodPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const method = getMethod(id);
  if (!method) notFound();

  const titleOf = (mid: string) => getMethod(mid)?.title ?? mid;

  return (
    <main className="mx-auto max-w-[68ch] px-6 py-16">
      <Eyebrow>{method.category.replace(/-/g, ' ')}</Eyebrow>
      <h1 className="mt-3 text-4xl tracking-[-0.025em] text-primary">{method.title}</h1>
      {method.aka.length > 0 && (
        <p className="mt-2 text-sm text-secondary">also: {method.aka.join(', ')}</p>
      )}

      <div className="mt-8">
        <MetaStrip method={method} />
      </div>

      <article className="prose-cheatsheet mt-10">
        <MDXRemote source={method.body} />
      </article>

      <UseInsteadBlock entries={method.useInstead} titleOf={titleOf} />
      <RelatedRail related={method.related} titleOf={titleOf} />
      <SourceList sources={method.sources} />
    </main>
  );
}
```

- [ ] **Step 7: Write the not-found page**

`app/m/[id]/not-found.tsx`:

```tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-[68ch] px-6 py-16">
      <h1 className="text-2xl text-primary">No such method</h1>
      <Link href="/" className="mt-4 inline-block text-secondary underline underline-offset-4">
        Back to the index
      </Link>
    </main>
  );
}
```

- [ ] **Step 8: Add prose styles**

Append to `app/globals.css`:

```css
@layer components {
  .prose-cheatsheet h2 {
    font-family: var(--font-geist-mono), ui-monospace, monospace;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-text-secondary);
    margin-top: 2.5rem;
    margin-bottom: 0.75rem;
  }
  .prose-cheatsheet p { margin-bottom: 1rem; line-height: 1.7; }
  .prose-cheatsheet ul { list-style: disc; padding-left: 1.25rem; margin-bottom: 1rem; }
  .prose-cheatsheet ol { list-style: decimal; padding-left: 1.25rem; margin-bottom: 1rem; }
  .prose-cheatsheet li { margin-bottom: 0.5rem; line-height: 1.6; }
  .prose-cheatsheet strong { color: var(--color-text-primary); font-weight: 600; }
}
```

- [ ] **Step 9: Verify**

Run: `bun run build`
Expected: build succeeds and logs two static routes under `/m/` (the fixtures seeded in Task 8). Visit `/m/tree-testing` — all seven sections render, the use-instead block links to `/m/card-sorting`, both sources listed.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add method detail page"
```

---

### Task 10: Category and index pages

**Files:**
- Create: `lib/categories.ts`, `app/c/[category]/page.tsx`, `components/ui/MethodCard.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `getAllMethods`, `getMethodsByCategory`
- Produces:
  - `CATEGORIES: readonly { id: string; number: string; title: string }[]`
  - `getCategory(id: string)` — lookup helper

- [ ] **Step 1: Write the category registry**

`lib/categories.ts` — seed with the categories the platform needs now; the full 21 land with Phase 2 content.

```ts
export interface Category {
  id: string;
  number: string;
  title: string;
}

export const CATEGORIES: readonly Category[] = [
  { id: 'foundations', number: '01', title: 'Foundations' },
  { id: 'starting-a-project', number: '02', title: 'Starting a Project' },
  { id: 'research-ops-ethics', number: '03', title: 'Research Ops & Ethics' },
  { id: 'qualitative-research', number: '04', title: 'Qualitative Research' },
  { id: 'quantitative-research', number: '05', title: 'Quantitative Research' },
  { id: 'synthesis', number: '06', title: 'Synthesis' },
  { id: 'ideation', number: '07', title: 'Ideation' },
  { id: 'ia-structure', number: '08', title: 'IA & Structure' },
  { id: 'interaction-design', number: '09', title: 'Interaction Design' },
  { id: 'content-design', number: '10', title: 'Content Design' },
  { id: 'visual-design', number: '11', title: 'Visual Design' },
  { id: 'prototyping', number: '12', title: 'Prototyping' },
  { id: 'evaluation', number: '13', title: 'Evaluation' },
  { id: 'accessibility', number: '14', title: 'Accessibility' },
  { id: 'service-design', number: '15', title: 'Service Design' },
  { id: 'ai-design', number: '16', title: 'AI Design' },
  { id: 'metrics-experimentation', number: '17', title: 'Metrics & Experimentation' },
  { id: 'design-systems', number: '18', title: 'Design Systems' },
  { id: 'facilitation', number: '19', title: 'Facilitation' },
  { id: 'communication', number: '20', title: 'Communication' },
  { id: 'career-practice', number: '21', title: 'Career & Practice' },
] as const;

export function getCategory(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
```

- [ ] **Step 2: Write the method card**

`components/ui/MethodCard.tsx`:

```tsx
import Link from 'next/link';
import type { Method } from '@/lib/content';

export function MethodCard({ method, isSecondary }: { method: Method; isSecondary?: boolean }) {
  return (
    <Link
      href={`/m/${method.id}`}
      className="block rounded-lg border border-border bg-surface p-5 transition-colors hover:bg-card"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-lg tracking-[-0.015em] text-primary">{method.title}</h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-secondary">
          {method.kind}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-secondary">{method.sections['What is it']}</p>
      {isSecondary && (
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-secondary">
          primary home: {method.category.replace(/-/g, ' ')}
        </p>
      )}
    </Link>
  );
}
```

- [ ] **Step 3: Write the category page**

`app/c/[category]/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { getMethodsByCategory } from '@/lib/content';
import { CATEGORIES, getCategory } from '@/lib/categories';
import { MethodCard } from '@/components/ui/MethodCard';
import { Eyebrow } from '@/components/ui/Eyebrow';

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.id }));
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const meta = getCategory(category);
  if (!meta) notFound();

  const { primary, secondary } = getMethodsByCategory(category);

  return (
    <main className="mx-auto max-w-[68ch] px-6 py-16">
      <Eyebrow>{meta.number}</Eyebrow>
      <h1 className="mt-3 text-4xl tracking-[-0.025em] text-primary">{meta.title}</h1>
      <p className="mt-2 text-sm text-secondary">
        {primary.length} method{primary.length === 1 ? '' : 's'}
      </p>

      <div className="mt-10 space-y-3">
        {primary.map((m) => (
          <MethodCard key={m.id} method={m} />
        ))}
        {secondary.map((m) => (
          <MethodCard key={m.id} method={m} isSecondary />
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Write the index page**

Replace `app/page.tsx`:

```tsx
import Link from 'next/link';
import { getAllMethods } from '@/lib/content';
import { CATEGORIES } from '@/lib/categories';
import { Eyebrow } from '@/components/ui/Eyebrow';

export default function IndexPage() {
  const methods = getAllMethods();
  const countFor = (id: string) =>
    methods.filter((m) => m.category === id || m.alsoIn.includes(id)).length;

  return (
    <main className="mx-auto max-w-[68ch] px-6 py-16">
      <Eyebrow>UX Methods</Eyebrow>
      <h1 className="mt-3 text-4xl tracking-[-0.025em] text-primary">
        A working reference
      </h1>
      <p className="mt-3 text-secondary">
        Press <kbd className="font-mono text-sm text-primary">⌘K</kbd> to search by name, or by
        what you are trying to learn.
      </p>

      <ul className="mt-12 divide-y divide-border border-y border-border">
        {CATEGORIES.map((c) => (
          <li key={c.id}>
            <Link
              href={`/c/${c.id}`}
              className="flex items-baseline justify-between gap-4 py-4 transition-colors hover:text-primary"
            >
              <span className="font-mono text-xs text-secondary">{c.number}</span>
              <span className="flex-1 text-primary">{c.title}</span>
              <span className="font-mono text-xs text-secondary">{countFor(c.id)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 5: Verify**

Run: `bun run build`
Expected: 21 static `/c/` routes plus 2 `/m/` routes. `/` lists all 21 categories, with `08 IA & Structure` showing a count of 2 and the rest 0. `/c/ia-structure` shows both method cards.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add category and index pages"
```

---

### Task 11: Motion

**Files:**
- Create: `components/ui/Reveal.tsx`
- Modify: `components/ui/MethodCard.tsx`, `app/m/[id]/page.tsx`

**Interfaces:**
- Consumes: `motion/react`
- Produces: `<Reveal>` — scroll-triggered section reveal, fires once

- [ ] **Step 1: Write the reveal component**

`components/ui/Reveal.tsx`:

```tsx
'use client';

import * as motion from 'motion/react-client';

export function Reveal({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: Wrap the method page's trailing sections**

In `app/m/[id]/page.tsx`, import `Reveal` and wrap each of the three trailing blocks:

```tsx
<Reveal><UseInsteadBlock entries={method.useInstead} titleOf={titleOf} /></Reveal>
<Reveal><RelatedRail related={method.related} titleOf={titleOf} /></Reveal>
<Reveal><SourceList sources={method.sources} /></Reveal>
```

- [ ] **Step 3: Verify reduced motion is respected**

Run: `bun run dev`. In macOS System Settings → Accessibility → Display, enable "Reduce motion", then reload a method page.
Expected: sections appear with no translate or fade. `MotionConfig reducedMotion="user"` from Task 2 handles this — if animation still runs, confirm `MotionConfig` wraps the tree in `app/providers.tsx`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add scroll reveal motion"
```

---

### Task 12: Seed six method entries

Six real entries spanning several categories, exercising every schema field including `alsoIn`, `aka`, `needs`, all three `related` groups, and a `seminal: true` source.

**Files:**
- Replace (Task 8 copied thin fixtures here — overwrite with full entries): `content/methods/ia-structure/card-sorting.mdx`, `content/methods/ia-structure/tree-testing.mdx`
- Create: `content/methods/qualitative-research/user-interviews.mdx`, `content/methods/qualitative-research/contextual-inquiry.mdx`, `content/methods/evaluation/usability-testing.mdx`, `content/methods/quantitative-research/seq.mdx`
- Delete: `lib/smoke.test.ts`

Leave `lib/content/fixtures/` untouched — the loader tests depend on those files.

**Interfaces:**
- Consumes: the schema and section contract
- Produces: a populated `content/methods/` that makes every page type render real data

- [ ] **Step 1: Write the six entries**

Each follows the fixture shape from Task 5 with real content. Cross-reference graph, which must resolve:

| id | category | alsoIn | useInstead → | related |
|---|---|---|---|---|
| `card-sorting` | `ia-structure` | `qualitative-research` | `tree-testing` | after: `tree-testing` |
| `tree-testing` | `ia-structure` | `evaluation` | `card-sorting`, `usability-testing` | before: `card-sorting` |
| `user-interviews` | `qualitative-research` | — | `contextual-inquiry` | alongside: `usability-testing` |
| `contextual-inquiry` | `qualitative-research` | — | `user-interviews` | before: `user-interviews` |
| `usability-testing` | `evaluation` | — | `tree-testing`, `contextual-inquiry` | alongside: `seq` |
| `seq` | `quantitative-research` | `evaluation` | `usability-testing` | alongside: `usability-testing` |

Write real prose for all seven sections in each. `## Using AI` must have both bolded halves — `**Where it helps**` and `**Where it fails**`. Every `sources[].url` must be a real, reachable page; verify each with `curl -s -o /dev/null -w "%{http_code}" <url>` before committing.

- [ ] **Step 2: Remove the scaffold smoke test**

```bash
rm lib/smoke.test.ts
```

- [ ] **Step 3: Validate the content**

Run: `bun run validate`
Expected: `✓ 6 methods valid`. Any unresolved reference or missing section fails here with the file and field named — fix and re-run until clean.

- [ ] **Step 4: Run the full test suite**

Run: `bun test`
Expected: all pass (schema 7, sections 5, load 3, score 8, source 4).

- [ ] **Step 5: Verify every page type renders**

Run: `bun run dev` and check:
- `/` lists 21 categories with non-zero counts on the four seeded ones
- `/c/ia-structure` shows card-sorting and tree-testing, plus `seq` is absent
- `/c/evaluation` shows usability-testing as primary and tree-testing + seq as secondary with "primary home" labels
- `/m/tree-testing` renders all seven sections, the use-instead block with two working links, and both sources
- ⌘K → type "people find things" → tree-testing appears under MATCHED ON WHEN TO USE

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: seed six method entries"
```

---

### Task 13: Wire validation into the build and deploy

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: everything prior
- Produces: production deployment at the Vercel project `ux-cheatsheet`

- [ ] **Step 1: Make the build run validation first**

In `package.json`, change the build script:

```json
"build": "bun run validate && next build"
```

- [ ] **Step 2: Verify a broken entry fails the build**

Temporarily change a `useInstead[].method` in `content/methods/ia-structure/tree-testing.mdx` to `does-not-exist`, then:

Run: `bun run build`
Expected: FAIL, printing `ia-structure/tree-testing.mdx: useInstead[0].method — unresolved reference "does-not-exist"` and exiting before `next build` runs.

Revert the change and re-run — expected: build succeeds.

- [ ] **Step 3: Commit and push dev**

```bash
git add -A
git commit -m "feat: gate build on content validation"
git push origin dev
```

- [ ] **Step 4: Verify the preview deployment**

Vercel builds `dev` as a preview. Check the deployment succeeds and the preview URL renders the gray/cream index page.

Run: `vercel ls ux-cheatsheet --token "$VERCEL_TOKEN"`

If the build fails on Vercel but passes locally, the most likely cause is a case-sensitivity mismatch in an import path — macOS is case-insensitive, Vercel's Linux builders are not.

- [ ] **Step 5: Merge to main and ship**

```bash
git checkout main
git merge --no-ff dev -m "Release: cheatsheet platform"
git push origin main
git checkout dev
```

- [ ] **Step 6: Verify production**

Confirm the production deployment succeeds and the site loads. Check on a phone: palette opens as a bottom sheet, the index is readable at 375px, no horizontal scroll.

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| §3.2 Frontmatter schema | 3 |
| §3.3 Body sections | 4 |
| §3.4 `## Using AI` | 4 (contract), 12 (content) |
| §3.5 Build-time validation | 5, 13 |
| §4 Taxonomy | 10 (21 categories registered; entries land in Phase 2) |
| §5 Visual design | 2, 9, 10 |
| §6.1 Command palette | 6, 7, 8 |
| §6.2 Pages | 9, 10 |
| §6.3 Motion | 2 (MotionConfig), 11 |
| §6.4 Responsive | 13 (verification) |
| §7 Architecture | 1, 2 |
| §7.0 Astryx + Phase 0 spike | **Resolved during planning** — `searchSource` accepts any `search()`/`bootstrap()` implementation, so the custom scorer plugs in directly. `cmdk` is not needed and is not a dependency. |
| §8 Error handling | 5 (loader errors), 9 (not-found), 13 (build gate) |
| §9 Testing | 3, 4, 5, 6, 7 |
| §10 Phase 1 | all |
| §11 Sourcing | 12 (URL verification) |

**Known gaps, deliberate:** Phase 2's 63 entries are out of scope per the header. §5's five `kind` accent hues are not implemented — with six seed methods the badge colour has nothing to teach yet; it lands with Phase 2 when categories are populated. The §11.1 staleness report (flagging entries with all-non-seminal sources older than three years) is deferred for the same reason: it needs a corpus to be useful.

**Type consistency:** `Method`, `ScorableMethod`, `ScoredMethod`, `MethodItem`, `MethodAux`, `Category` are each defined once and imported thereafter. `toScorable` produces exactly the `ScorableMethod` shape Task 6 defines. `createMethodSource` returns Astryx's `SearchSource<MethodItem>`, matching `CommandPalette`'s `searchSource` prop. `getMethodsByCategory` returns `{primary, secondary}` and is destructured as such in Task 10.
