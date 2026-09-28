# Authoring mode — design

Date: 2026-09-28
Status: approved design, not yet implemented

## Intent

Today, changing anything about a card means leaving the app: open an editor, find
`content/methods/<domain>/<id>.mdx` or a 27 KB TypeScript file, edit, come back.
For small changes — a clumsy sentence, a wrong effort rating, a diagram that needs
replacing — that round trip costs more than the edit itself.

**The goal is that the app becomes the authoring surface for small changes, and
Claude Code becomes the fallback rather than the default.** Not a CMS, not an AI
content pipeline. Three jobs:

1. **Edit a card** you are already reading, without leaving the page.
2. **Add a card** to the taxonomy in a few keystrokes, so capturing an idea is
   instant and the writing happens later.
3. **Reach Claude Code fast** when the change is bigger than an edit.

Editing works **on the live site as well as in development**, because the whole
point is not having to start a dev server to fix a sentence. That single
requirement drives most of this design.

### Explicitly out of scope

Considered and cut, with reasons, so they are not silently re-added:

- **In-app AI content generation.** The authoring brief's hardest rule is *"never
  write a URL you have not retrieved"*, and every card needs ≥ 2 verified sources.
  Generation meeting that bar needs retrieval, a review gate, and a regenerate
  loop — a larger project. Writing stays in Claude Code; that is what job 3 is for.
- **Card templates / new card kinds.** The three kinds (`concept`, `framework`,
  `method`) and their section sets stay as they are.
- **Adding or editing domains.** There are 20, and realistically two more will ever
  be added. Each needs a taxonomy block, an icon component, and a palette colour.
  A UI used twice is not worth building.
- **Editing `useCases`, `sources`, `useInstead`, or `related` in-app.** These carry
  cross-reference integrity rules checked across the whole content set. Editing
  them one field at a time invites breaking the build in ways a small panel cannot
  explain well.
- **Creating a card's first image.** Replacing an existing one is in scope; see
  "Images" for why creating one is not.

## Constraints discovered in the codebase

Facts the design has to accommodate, not preferences.

**C1 — Card bodies are not MDX at render time.** Despite the `.mdx` extension,
bodies are parsed by `FormattedText` in `components/ui/ConceptSheetModal.tsx`,
which supports exactly four things: `**bold**`, `*italic*`, `### `/`#### `
subheadings, and `- `/`* ` bullets. Everything else renders as literal text. This
rules out a WYSIWYG editor: round-tripping rendered HTML back to markdown needs a
serializer for a renderer with four primitives, and one paste from a rich-text
source injects markup that appears verbatim on the card.

**C2 — An empty `.mdx` breaks the build.** `bun run validate` runs as part of
`bun run build`, and `frontmatterSchema` requires `sources` ≥ 2, `useInstead` ≥ 1,
and the full required-section set for the kind. **Therefore add-card must not
create an `.mdx` file.**

**C3 — Unwritten cards are already a first-class concept.** 188 of the 336 taxonomy
entries have no `.mdx` and render as cards anyway, via `TAXONOMY` plus `get1Liner`
(which generates filler prose for unknown ids). Add-card plugs into this existing
seam rather than inventing a state — and needs to write no description, because
the fallback already supplies one.

**C4 — Taxonomy entries have no `kind`.** `TaxonomyItem` is `{ id, title }`. The
kind badge for unwritten cards comes from `lib/inferKind.ts`, a heuristic over
title keywords plus ~55 hardcoded id exceptions. A user-chosen kind has nowhere
to be stored.

**C5 — `app/globals.css` forces every dialog to 500 px.** Rules targeting
`dialog, dialog[open], div[role="dialog"], div[role="dialog"] > div, …` apply
`height: 500px !important` plus a fixed background and radius. They exist to pin
the command palette but are unscoped, so **any new dialog inherits them**.

**C6 — Content files are not in the module graph.** No module imports
`content/**/*.mdx`, so Turbopack does not watch them and editing one triggers no
HMR. `getAllMethods` clears its cache when `NODE_ENV === 'development'`, so a
re-render reads fresh from disk — but the re-render must be requested.

**C7 — Frontmatter YAML is hand-tuned and quoting-sensitive.** The authoring brief
documents YAML traps (an unquoted scalar containing `: ` parses as a mapping) that
have already broken a file once. Re-serializing through `matter.stringify` would
reformat quoting across the whole block, producing large diffs and risking meaning
changes in fields nobody edited.

**C8 — A command palette already exists.** `components/ui/Palette.tsx` wraps Astryx
`CommandPalette`, opens on `⌘K` or `/`, and is mounted site-wide by
`PaletteProvider`. Add-card extends this rather than adding a second overlay.

### The production constraints

**C9 — The live filesystem is read-only and ephemeral.** The site deploys to Vercel
(`.vercel/project.json`, Node 24). Vercel Functions cannot write outside `/tmp`,
and `/tmp` is per-instance and discarded. A file write on the live site either
throws `EROFS` or vanishes.

**C10 — Live pages are prerendered at build time.** `/c/[category]` uses
`generateStaticParams` with no `revalidate`, so the served HTML is baked from the
last build. Even a successful runtime write would not change what visitors see.

**C11 — `content/` is not readable at runtime in production.** `loadMethods` reads
`join(process.cwd(), 'content', 'methods')`, which is not statically analyzable,
so Next does not trace those files into the function bundle — the reason
documented in `lib/content/images.ts`. A production route handler therefore cannot
assume the content directory exists.

**C9 through C11 together mean: on the live site, saving must be a git commit, not
a file write.** GitHub holds the real files; Vercel already rebuilds on push.

**C12 — Reading cookies in a Server Component would de-optimise the whole site.**
Any `cookies()` call in a layout or page opts that route out of static rendering.
Authentication state must therefore be resolved **client-side**, so `/` and
`/c/[category]` stay static for visitors.

## Architecture

```
┌─ Client ───────────────────────────┐   ┌─ Server ─────────────────────────────┐
│                                    │   │                                      │
│  AuthorDock ─┬─ edit toggle        │   │  app/api/authoring/*/route.ts        │
│              ├─ add card ──────────┼──▶│    requireAuth()  ← every route      │
│              ├─ Sync (n)  ─────────┼──▶│    input: method id, never a path    │
│              └─ terminal (dev)     │   │           │                          │
│                     │              │   │           ▼                          │
│  ConceptSheetModal  │              │   │  lib/content/patch.ts      (pure)    │
│    ├─ EditableSection (per ##)     │   │           │                          │
│    └─ FrontmatterPanel             │   │           ▼                          │
│                     │              │   │  ContentStore  ── interface ──┐      │
│              PendingEdits          │   │    ├─ DiskStore    (dev)      │      │
│              (localStorage)        │   │    └─ GitHubStore  (live)     │      │
└────────────────────────────────────┘   └───────────────────────────────┴──────┘
```

Two seams carry this design:

**Seam 1 — pure text transformation.** All patching lives in `lib/content/patch.ts`
as `(fileText, edit) => fileText` with no I/O. The risky logic — where a section
starts and ends, whether a `##` is inside a code fence — is unit-testable without
touching disk or network, and is identical in dev and production.

**Seam 2 — `ContentStore`.** The only thing that differs between dev and live:

```ts
interface ContentStore {
  read(path: string): Promise<{ text: string; version: string }>;
  commit(files: FileWrite[], message: string): Promise<void>;
}

type FileWrite = { path: string; content: string | Uint8Array; version: string };
```

`DiskStore` reads and writes the working tree; `commit` writes each file and
`version` is ignored. `GitHubStore` reads and writes through the GitHub API, where
`version` is the blob SHA captured at read time. Selected once, by `NODE_ENV`, and
nothing above this line knows which is in play.

**How conflicts are actually caught** — worth being precise, because the mechanism
differs from the simpler contents API. `version` is not sent to GitHub as a
precondition. Instead, sync re-reads each affected file and compares its current
blob SHA with the `version` recorded when the edit was made; a mismatch means the
file changed underneath the edit, and the sync aborts. Separately, the ref is
updated **non-forced**, so if the branch moved between reading the tree and moving
the ref, GitHub rejects it rather than clobbering the newer commit. Two independent
checks, neither of which auto-merges.

`commit` takes **many files and produces one commit** — the shape the sync model
below requires. This is why `GitHubStore` uses the **Git Data API** rather than the
simpler contents API: the contents endpoint commits one file per call, so N edits
would mean N commits and N builds, which is exactly what sync exists to avoid. The
data-API sequence is: read the branch ref → read its commit's tree → create a blob
per file → create a tree with `base_tree` → create a commit → move the ref. Six
requests per sync regardless of file count, and it is **atomic**: either every
edit lands or none does.

`GitHubStore` **reads** from GitHub too, not just writes. Required by C11 (the
content directory may not exist at runtime), with the side benefit that the text
being patched is always the current committed text.

### Save semantics

The two environments differ, deliberately, because the underlying situation
differs.

**In development, save writes immediately** to the working tree. The files are
right there, git is right there, and batching would add a step that buys nothing.
There is no sync button in dev.

**On the live site, edits accumulate in a session and are committed together by an
explicit Sync.** Saving a section validates it server-side and records it as a
pending change; the dock shows the count. Pressing **Sync** sends the whole pending
set, which becomes **one commit and one build** no matter how many sections, cards,
or images it touches.

This means saving on the live site is cheap and reversible, and the moment of
consequence is a single deliberate action. It also means a card edited across four
sections produces one clean commit rather than four noisy ones.

**Where pending edits live.** In the browser, persisted to `localStorage` — there
is no server-side store to put them in, and adding a KV store for drafts would be a
much larger commitment than this feature warrants. The consequences are stated
plainly rather than designed around:

- Pending edits **survive a reload or an accidental tab close**.
- They are **per-browser**: edits started on a phone are not visible on a laptop.
- `beforeunload` warns when leaving with unsynced changes.
- The dock shows pending count and age, so stale unsynced work is visible rather
  than forgotten.

**Validation happens at save, and again at sync.** Each save POSTs to a
validate-only endpoint that reads the current file, applies every pending edit for
it, and returns errors or OK **without writing** — so errors surface while the
relevant text is still on screen, rather than minutes later in a batch. Sync then
re-validates the whole set before committing, because files may have changed in
between. The save-time pass is for fast feedback; the sync-time pass is the one
that guards the repo.

**After sync, the edit is not live for about a minute.** The client keeps showing
the edited text optimistically and displays "synced · live in ~1 min". Without
this the page would re-render from the still-stale build and look like the sync
failed.

### Commit target

Commits go to the **production branch** (`main`, configured via env var, not
hardcoded). This is forced: the point is to change the live site, and the live site
builds from that branch.

Known consequence, accepted deliberately: **content edits made on the live site
land on `main`, while feature work happens on `dev`.** The two will drift, and
`main` must be merged back into `dev` periodically or a later `dev` → `main` merge
will conflict with, or silently revert, live edits. This is a workflow cost of
editing production directly; it is not solvable in code.

## Authentication

Editing is public-facing now, so the endpoints are the security boundary — **not
the UI**. Hiding the dock protects nothing; `POST /api/authoring/sync` is what
reaches the repo, and every authoring endpoint is reachable by anyone who guesses
its URL.

- **A single shared password**, held in the `AUTHORING_PASSWORD` env var, never in
  the repo. Compared with `crypto.timingSafeEqual`.
- **On success, a signed session cookie**: HMAC-signed with `AUTHORING_SECRET`,
  `httpOnly`, `secure`, `sameSite=lax`, 30-day expiry.
- **`requireAuth()` runs first in every authoring route**, returning `401` before
  any other work. A test asserts every route file calls it.
- **No path ever crosses the wire.** Endpoints take a method `id` and resolve the
  path server-side; an unknown id is rejected. This removes path traversal as a
  category rather than sanitising against it.
- **Client-side session check.** Per C12 the dock asks `GET
  /api/authoring/session` on mount rather than reading cookies server-side, so
  visitor-facing pages stay static.

**On rate limiting, honestly:** serverless instances do not share memory, so an
in-process attempt counter is per-instance and near-useless. Rather than build
something that looks like protection and is not, the mitigation is **a
high-entropy generated password** (not a chosen one), which makes online brute
force infeasible without shared state. A fixed ~500 ms delay on failed attempts is
added as a cheap extra cost. If this ever needs to be real, it needs a KV store,
and that is a deliberate later decision rather than an oversight.

### Environment variables

| Name | Purpose |
|---|---|
| `AUTHORING_PASSWORD` | The login secret; high-entropy, generated |
| `AUTHORING_SECRET` | HMAC key for signing the session cookie |
| `GITHUB_TOKEN` | Fine-grained PAT, `contents: write`, **this repo only** |
| `GITHUB_REPO` | `AtharvaN16/UX-Cheatsheet` |
| `GITHUB_BRANCH` | Production branch (`main`) |

The GitHub REST API is free on all plans and this repo is public; the authenticated
limit is 5,000 requests/hour against roughly 6 per sync. GitHub **Actions** — the
metered product — is not used. The only metered resource is Vercel build minutes,
at **one build per sync** rather than per edit.

## Component 1 — AuthorDock

A small pill fixed bottom-left: a status dot, a label, and buttons for **edit
toggle** (`✎`), **add card** (`＋`), **Sync** (live site only), and — in
development only — **open terminal** (`▶_`). Styled in the existing language:
`#FFFFFF` on `#E4DED2` border, 11 px radius, soft shadow; active state uses the
method blue `#5A92C6`.

**Sync** is the panel's one consequential control, so it reads as one: hidden at
zero pending changes, and otherwise labelled with the count — `Sync 3 changes` —
in the method blue, with the oldest pending edit's age beneath it. During a sync it
shows progress; after one it shows "live in ~1 min" until the deploy lands. A
failed sync leaves every pending edit intact.

Rendered when `NODE_ENV === 'development'` **or** the session check returns
authenticated. Visitors never see it. It holds `isEditing` and the pending-edit set
in a context so `ConceptSheetModal` can read both without prop drilling. Keyboard
equivalents: `⌘E` toggle editing, `⌘⇧K` add card, `⌘⇧S` sync, `⌘⇧T` terminal (dev
only). Pressing a shortcut while unauthenticated opens the password prompt.

The dock is why these are one project rather than three: they share a session, an
on/off state, a pending-edit set, a provider, and a visual home.

## Component 2 — Edit mode

### Body text

With editing on, each `## ` section in the sheet gets a pencil. Clicking it
replaces that section's rendered body with a `<textarea>` containing **the exact
source markdown** for that section — not a conversion of the rendered output. `⌘S`
or a Save button submits. One section open at a time.

This follows directly from C1: a textarea stores bytes, so what is typed is what is
stored, and the four supported primitives are the only things reachable.

`patchSection(fileText, heading, markdown)` finds the `## <heading>` line, scans
forward to the next top-level heading **at fence depth zero**, and replaces the
span between. Fence-awareness is not optional — `sections.ts` already has
`scanLinesWithFenceState` for this reason, and it will be exported from a shared
module so parser and patcher use one implementation.

### Frontmatter

A right-hand panel, shown only while editing, exposing the safe scalar fields:
`kind`, `gives`, `effort`, `timeframe` as segmented controls, plus the image slot.
These are closed enums, so the panel cannot produce an invalid value.

`patchFrontmatterScalar` replaces a single `^<field>: .*$` line **inside** the
leading `---` block. Per C7 it does not re-serialize: changing `effort` produces a
one-line diff and touches no other field's quoting.

Changing `kind` is allowed but flagged, because `kind` selects the required section
set — switching a `method` to a `concept` fails validation until sections are
renamed. The save returns those errors and refuses.

### Images

The image slot accepts a dropped file. The server writes it to
`public/images/methods/<id>.<ext>` — named from the method id, **never** from the
uploaded filename — and patches `image.src`. Extension must be one of
`png|jpg|jpeg|svg|webp`, matching the schema's `LOCAL_IMAGE` pattern. On the live
site the binary is committed base64-encoded through the same contents API.

Creating a *first* image is out of scope: the schema requires `alt` of ≥ 20
characters, and a required prose field does not belong in a drop target.
**Replacing** an existing image is the common case and the one handled.

### Validate before write

Validation builds the proposed full file text — current file plus every pending
edit for it — and runs it through `matter` + `frontmatterSchema` +
`missingSections` + `duplicateSections`. In dev this gates the write; on the live
site it gates *accepting the pending edit*, and runs again at sync. On failure it
returns the same human-readable strings `loadMethods` produces, shown inline
against the section being edited.

A bad edit therefore never reaches disk, never reaches a commit, and never breaks a
deploy. Cross-reference checks are not re-run: no editable field can change a
cross-reference, since `useInstead` and `related` are out of scope.

### Refresh

In dev, a successful save calls `router.refresh()`; per C6 the server component
re-runs and `getAllMethods` re-reads from disk. On the live site the page is a
build artefact (C10), so the client renders from its pending-edit set on top of the
built content — which is also what makes a pending edit visible as you keep
browsing, rather than only inside the sheet where you made it.

## Component 3 — Add card

`⌘⇧K` opens the existing Astryx `CommandPalette` in a "new card" mode, marked by a
green `NEW` chip in the header.

**Flow: name → kind → location.**

1. **Type the title.** The derived kebab-case id is shown live and checked against
   all existing ids. A collision blocks submission and says so.
2. **Pick the kind** with `1`, `2`, `3`. Because the title is known first,
   `inferKind` runs and pre-selects its guess, so `↵` is usually enough and the
   number keys are the override.
3. **Pick the group.** Groups of the domain being viewed are listed first and
   pre-selected; other domains follow. This cannot be skipped — `TaxonomyDomain →
   groups[] → items[]` has no ungrouped slot.
4. **`↵` creates it.**

The result is **one insertion into `lib/taxonomy.json`** — written straight to disk
in dev, or added to the pending set and carried into the next sync on the live
site, exactly like a text edit. No `.mdx` is created (C2), so the build stays
green, and the card appears immediately as an unwritten card alongside the other
188 (C3). No description is written — `get1Liner` already supplies one (C3), so a
description step would be ceremony.

Because pending edits render on top of built content, a card added on the live site
is visible and browsable straight away, before it has been synced.

### The `kind` field

Per C4 the chosen kind has nowhere to live, so `TaxonomyItem` gains an **optional**
`kind?: 'concept' | 'framework' | 'method'`. Six resolution sites change from
`written?.kind || inferKind(…)` to `written?.kind ?? item.kind ?? inferKind(…)`:

- `components/ui/DomainTopicGrid.tsx` lines 712, 741
- `components/ui/DomainDashboardGrid.tsx` lines 218, 238
- `app/layout.tsx` lines 39, 58

Optional means all existing entries are untouched and behaviour is unchanged for
every one of them. The value is that `inferKind` stops being the only answer: new
entries carry an explicit kind, so its hardcoded exception list stops growing.

### Taxonomy as data, not source

Add-card must insert into `lib/taxonomy.ts` — a 27 KB TypeScript literal. String
surgery on it (find the domain, find the group, find its `items: [`, insert before
the matching `]`) is the highest-risk operation in this design and the one whose
failure is quietest. It is also impossible to do safely from the live site, where
the file arrives as text from an API rather than as a module.

So `TAXONOMY`'s data moves to **`lib/taxonomy.json`**, and `lib/taxonomy.ts`
becomes a thin typed re-export plus its existing helpers:

```ts
import data from './taxonomy.json';
export const TAXONOMY: readonly TaxonomyDomain[] = data;
```

Insertion becomes `JSON.parse` → push → `JSON.stringify(…, null, 2)`, which cannot
produce a syntactically invalid file, and works identically against a local file or
a string fetched from GitHub. It also puts the file in the module graph, so in dev
a new card appears via HMR with no refresh.

Mechanical migration with a verifiable invariant: **the migrated `TAXONOMY` must
deep-equal the pre-migration value**, captured as a test against a snapshot taken
before the change, so the migration cannot silently drop or reorder an entry.

## Component 4 — Terminal button

**Development only** — there is no terminal to open on a serverless function, and
the button is not rendered on the live site.

`POST /api/authoring/terminal` runs `open -a Terminal <repo root>` on macOS. The
path is `process.cwd()`, hardcoded: **no part of the command comes from the
request**, which is what keeps a shell-executing endpoint acceptable. Combined with
the dev guard and an empty body, its entire input space is "was it called". Other
platforms return `501` with an explanation rather than guessing at an emulator.

## Error handling

| Failure | Behaviour |
|---|---|
| Edit produces invalid content | Rejected at save; `loadMethods`-style errors inline on the section; not added to pending |
| `kind` change orphans sections | Same path — save refused, missing sections named |
| Duplicate id in add-card | Blocked at type time, before submission is possible |
| Image with bad extension | Rejected; allowed list named in the message |
| A pending edit no longer validates at sync | Sync aborts **before** committing anything, names the offending card, all pending edits retained |
| Branch moved since a pending edit was made | Sync's ref/tree read is taken fresh at sync time, so the commit is built on current `main`; a genuine conflicting change to the same file surfaces as a validation or ref-update failure and aborts the whole sync |
| GitHub API unreachable / token invalid | Sync fails loudly with the API's message; pending edits retained |
| Leaving the page with unsynced edits | `beforeunload` warning; edits persist in `localStorage` regardless |
| Unauthenticated request | `401` before any other work |
| Terminal on non-macOS or in production | `501` / not rendered |

Two consistent rules. **Fail before writing, and report in the language the
validator already uses**, so an error in the panel reads the same as one from
`bun run validate`. And **sync is all-or-nothing** — a partial sync would leave the
pending set in a state neither the user nor the code could reason about, so a
single bad edit aborts the batch and nothing is lost.

## Testing

Pure functions carry the weight, which is why the patch/store split exists.

- `patch.test.ts` — `patchSection` against: first section, last section, a section
  containing `## ` inside a fenced code block, a missing heading, a body containing
  `---`. `patchFrontmatterScalar` against: field present, field absent, and a
  matching pattern appearing later in the body.
- `write.test.ts` — validate-then-write against fixtures: a valid edit writes; an
  edit dropping a required section does not write and returns the error; the file
  is byte-identical after a rejected write.
- `store.test.ts` — `GitHubStore` against a stubbed fetch: the data-API sequence
  issued in order, **many files producing exactly one commit**, `base_tree` set so
  untouched files survive, base64 round-trip for binaries, and a failed ref update
  surfaced rather than retried.
- `pending.test.ts` — the pending-edit set: two edits to different sections of one
  card collapse into one file write; a re-edit of the same section replaces rather
  than stacks; `localStorage` round-trips; a sync that fails leaves the set intact.
- `taxonomy.test.ts` — the migration deep-equality invariant, insertion into an
  existing group, rejection of a duplicate id.
- `auth.test.ts` — every `route.ts` under `app/api/authoring/` calls
  `requireAuth()`; a bad password returns `401`; a tampered cookie signature is
  rejected.
- `inferKind` resolution order — explicit `item.kind` wins; absent `item.kind`
  preserves today's behaviour exactly.

Existing suites (`schema`, `sections`, `load`, `images`, `vocab`, `domains`,
`taxonomy`) stay green, and `bun run validate` must still report `✓ N methods
valid` after a round-trip edit that changes text and changes it back.

## Work not caused by this feature, but in its path

**Scoping the dialog CSS (C5).** The unscoped `height: 500px !important` rules in
`globals.css` will capture any dialog this feature adds. They will be narrowed to
the command palette specifically. A fix to existing code, done because it blocks
the work — not a general refactor of that stylesheet.

## Sequencing

Each step leaves the app working and useful on its own:

1. **Taxonomy → JSON**, with the deep-equality test. No behaviour change. Lands
   the risky migration alone, where failure is obvious and isolated.
2. **`patch.ts`**, with tests. Pure logic, no UI, nothing wired up.
3. **`ContentStore` + `DiskStore`**, then `GitHubStore` against a stubbed fetch.
4. **Auth** — password route, signed cookie, `requireAuth`, session check.
5. **AuthorDock + terminal button.** Smallest visible slice; proves the auth and
   environment layering end to end before anything can write content.
6. **Edit mode in dev only** — body sections, then the frontmatter panel, then
   image replace. Writes go straight to disk, so the whole editing experience can
   be built and felt before any of the pending/sync machinery exists.
7. **Pending edits + Sync**, turning on editing for the live site. This is the step
   that must be verified against a real deployment.
8. **Add card** — `kind` on `TaxonomyItem` first, then the palette mode, which
   inherits whichever save path step 6 or 7 provides.

Steps 1–3 are testable with no deployment at all. Step 4 is the first that needs a
real preview deployment, since cookie `secure` and `sameSite` behaviour cannot be
exercised on `localhost` alone.

The ordering choice worth noting: **dev-only editing lands complete at step 6**, so
the feature is genuinely useful before the riskiest part — committing to your live
repo from a browser — is built. If step 7 turns out to be more trouble than it is
worth, everything up to that point still stands on its own.
