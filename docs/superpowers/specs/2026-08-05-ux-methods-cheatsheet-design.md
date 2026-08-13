# UX Methods Cheatsheet — Design

**Date:** 2026-08-05
**Status:** Approved, ready for implementation planning

---

## 1. What this is

A personal reference site covering ~315 UX methods, frameworks, and mental models across 21 categories. Every entry answers the same twelve questions in the same order, so the reader can compare two methods by scanning the same position on two pages.

The site's job is to answer **"which method, right now?"** in under ten seconds. It is a decision aid first and a library second.

### Success criteria

- Typing a half-remembered name or a *situation* into `⌘K` surfaces the right method in one or two keystrokes.
- Every "when not to use" statement links to a concrete alternative — never a dead end.
- Adding one more entry requires touching exactly one file.
- An incomplete or inconsistent entry cannot reach the deployed site.

### Non-goals

- Not a course. It does not teach; it reminds. The sibling `Learning Lessons/*` workspaces teach.
- Not SEO-optimised. Public URL, but no ranking work, OG image pipeline, or content marketing.
- Not a CMS. Content is files in git, edited in an editor.
- No accounts, no persistence beyond `localStorage`, no backend.

---

## 2. Audience and voice

Written for the author — an experienced product designer moving toward design engineering. This licenses a specific voice:

- **Terse and opinionated.** "Don't run a focus group to evaluate a design" beats "focus groups may be less suitable for evaluative purposes."
- **Judgment stated plainly.** Where practitioners disagree, say who disagrees and pick a side.
- **No hedging, no throat-clearing.** Assume the reader knows what a user interview is; tell them the thing they'd get wrong.
- **Numbers where numbers exist.** "5 participants finds ~85% of usability problems (Nielsen/Landauer)" not "a small number of participants."

Every non-obvious claim carries a citation. This is the single guard against the content becoming plausible-sounding invention.

---

## 3. Content model

### 3.1 Canonical entries, multi-category membership

The original outline listed Card Sorting three times, Service Blueprint three times, and JTBD / HEART / AARRR / A-B Testing / Opportunity Solution Tree twice each. Duplicating prose across categories guarantees drift.

**One MDX file per method.** A method declares one `category` (which owns its URL) and any number in `alsoIn`. Category listing pages render both, marking secondary entries with a "primary home" link.

~310 canonical entries produce ~345 listing appearances.

**Count derivation.** The original outline listed 242 entries, ~215 unique after removing repeats. Additions in §4 total ~98. Net ~315, then -5 from the 2026-08-06 taxonomy restructure (§4 — six Research Ops & Ethics entries consolidated into one Ethical Design entry). Net ~310. This is materially larger than the ~260 estimated during brainstorming — the additions were counted low at that point. It does not change the architecture, only the content-writing runway, which is why the work is phased (§10).

### 3.2 Frontmatter schema

```yaml
id: tree-testing                    # kebab-case, unique, matches filename
title: Tree Testing
aka: [reverse card sorting]         # searchable aliases
category: ia-structure              # primary; owns the URL
alsoIn: [evaluation]

kind: method                        # concept | framework | method
gives: quantitative                 # quantitative | qualitative | mixed | conceptual
effort: low                         # low | medium | high
timeframe: days                     # hours | days | weeks | months | ongoing
needs:                              # prerequisites — free text, short
  - An existing or proposed IA
  - 30+ participants for stable numbers

useInstead:                         # drives "When not to use"; every method: id must resolve
  - when: You don't have a structure yet — you're building one
    method: card-sorting
  - when: You need to know why people chose wrong, not just that they did
    method: usability-testing

related:
  before:    [card-sorting]
  after:     [first-click-testing]
  alongside: [top-task-analysis]

sources:                            # min 2
  - title: Tree Testing
    author: Dave O'Brien
    url: https://…
    type: article                   # book | article | paper | video | standard | tool
    year: 2026
    seminal: false                  # true = timeless bucket, see §11.1
```

### 3.3 Knowledge Object Types & Modular Semantic Blocks

The cheatsheet content architecture models entry topics as three distinct knowledge objects, each tailored to answer a specific primary reader intent:

| Type | Reader Intent | Primary Focus Section | Key Value |
|---|---|---|---|
| **Method** | *"How do I do this?"* | `## How to do it` / Process | Actionable, step-by-step execution & real-world trade-offs |
| **Framework** | *"How is this structured?"* | `## Structure` | Scaffolding, matrices, stages, or dimensional breakdown |
| **Concept** | *"What does this mean?"* | `## How it works` / Key Ideas | Mental representation, mechanisms, & principles |

#### Canonical Section Orderings

- **Method**: Definition → Purpose → When to use → How to do it → Common mistakes → Using AI → Limitations → Alternatives → Tips → Notes
- **Framework**: Definition → Overview & Purpose → When to use → Structure → How to use → Example → Common mistakes → Limitations → Variations → Using AI → Tips → Notes
- **Concept**: Definition → Overview & Why it matters → Key ideas → How it works → Example → Application → Limitations → Common misconceptions → Using AI → Tips → Notes

#### Modular Block System

Rather than forcing every entry into a rigid mandatory set of headings, the CMS supports composable semantic blocks. Minimum required headings are enforced per `kind` (e.g., an intro/definition section and primary focus section), while optional blocks (e.g., `Structure`, `Example`, `Limitations`, `Variations`, `Misconceptions`, `Using AI`) are rendered when present.

### 3.4 The `## Using AI` section

The `## Using AI` section is an **optional block across all 3 content types** (Methods, Frameworks, and Concepts). Authors make a genuine effort to identify practical AI use-cases (where it helps / where it fails), but if a topic has no genuine need or application for AI, the section is omitted rather than forced.

When written, `## Using AI` carries a two-part shape:

```markdown
## Using AI

**Where it helps**
- Draft the discussion guide, then attack it for leading questions…
- Transcribe and timestamp, so you can search by phrase later…

**Where it fails**
- Synthetic participants. A model predicting what a user "would say" returns
  the median of its training data — the opposite of why you interview…
```


### 3.5 Build-time validation

`bun run validate` (and the Next build) enforces:

1. Frontmatter parses against the Zod schema.
2. `id` matches the filename and is globally unique.
3. Every id referenced in `useInstead[].method`, `related.*`, and `alsoIn` resolves to an existing entry.
4. All required body sections present, in order.
5. `sources` has ≥ 2 entries; every `url` is well-formed.
6. `useInstead` has ≥ 1 entry.

Failures print `content/methods/<cat>/<file>.mdx: <field> — <what's wrong>` and exit non-zero. **This constraint is the highest-value engineering in the project** — it is what stops 300+ entries from rotting into inconsistency.

---

## 4. Taxonomy — 20 parts, ~310 entries

Additions to the original outline are marked **[+]**. Restructured 2026-08-06 from the original 21-part outline: Foundations split in two (psychology pulled out on its own), Starting a Project and Research Ops & Ethics folded into a merged research part, and a new Ethical Design entry consolidates what had been six separate ethics/legal entries. Net: 21 → 20 parts, ~315 → ~310 entries. Rationale is in the design conversation, not repeated here — this section states the result.

**01 · UX Psychology** *(the former "Human Behavior" and "Motivation Models" groups from Foundations, split out as their own part — this is laws, biases, and effects, not something anyone "runs")*
- *Human Behavior* — Mental Models, Cognitive Load, Hick's Law, Fitts's Law, Miller's Law, Peak-End Rule, Goal Gradient Effect, Habit Loop, Dual Process Theory, Loss Aversion, Anchoring, Availability Bias, Confirmation Bias, Social Proof, Reciprocity, Scarcity, Progress Principle, Behavioral Economics Basics, **[+]** Jakob's Law, **[+]** Tesler's Law, **[+]** Postel's Law, **[+]** Doherty Threshold, **[+]** Von Restorff Effect, **[+]** Serial Position Effect, **[+]** Zeigarnik Effect, **[+]** Aesthetic-Usability Effect, **[+]** Choice Overload, **[+]** Default Effect, **[+]** Framing Effect, **[+]** Sunk Cost Fallacy, **[+]** Survivorship Bias, **[+]** Endowment Effect, **[+]** IKEA Effect, **[+]** Weber–Fechner Law
- *Motivation Models* — **[+]** Fogg Behavior Model, **[+]** COM-B, **[+]** Self-Determination Theory, **[+]** Hook Model, **[+]** Flow

**02 · Strategic Thinking** *(the former Foundations remainder — Product Thinking, Systems Thinking, Decision Making, Process Frameworks. Not psychology; kept separate from Part 01 for that reason)*
- *Product Thinking* — Product-Market Fit, Jobs To Be Done, North Star Metric, Pirate Metrics (AARRR), HEART, OKRs, Opportunity Solution Tree, Kano Model, RICE, ICE, MoSCoW, Cost vs Value, Product Strategy, Value Proposition Canvas, Business Model Canvas, **[+]** WSJF, **[+]** Cost of Delay, **[+]** Buy-a-Feature, **[+]** Impact/Effort Matrix
- *Systems Thinking* — Feedback Loops, Stocks & Flows, Leverage Points, Second Order Effects, Emergent Behavior, Causal Loop Diagrams, System Mapping, Actor Network, Cynefin Framework *(Ecosystem Mapping lives in Part 14 and appears here via `alsoIn`)*
- *Decision Making* — First Principles, Inversion, OODA Loop, RAPID, DACI, Eisenhower Matrix, Pareto Principle, Expected Value, Opportunity Cost, Assumption Mapping, Risk Matrix, Decision Trees, **[+]** Pre-mortem, **[+]** Red Teaming, **[+]** Six Thinking Hats
- *Process frameworks* **[+]** — Double Diamond, Design Thinking, Lean UX, Google Design Sprint, Continuous Discovery, Story Mapping, Working Backwards / PR-FAQ

**03 · Research & Synthesis** *(merged from the former Starting a Project, the non-ethics half of Research Ops & Ethics, and Synthesis — everything about framing, running, and making sense of research lives in one part now)*
- *Framing & Planning* — Problem Framing, Stakeholder Interviews, Kickoff Workshop, Project Brief, Goal Setting, Research Plan, Success Metrics, Constraints Mapping, Scope Definition, Competitive Analysis, Literature Review, Heuristic Review, Risk Assessment *(Assumption Mapping and Journey Mapping appear here via `alsoIn`)*
- *Research Operations* — Screener Design, Participant Recruitment, Incentives, Research Repository, Atomic Research, Sample Size & Saturation, Session Logistics & Note-taking
- *Synthesis* — Affinity Mapping, Thematic Analysis, Qualitative Coding *(renamed from "Coding")*, Journey Mapping, Experience Mapping, Personas, Proto Personas, Empathy Maps, Insight Statements, Opportunity Areas, JTBD Statements, POV Statements, HMW Questions

**04 · Qualitative Research** — User Interviews, Contextual Inquiry, Ethnography, Diary Studies, Think Aloud, Retrospective Think Aloud, Focus Groups, Participatory Design, Co-design Workshops, Cultural Probes, Observation, Shadowing, Fly-on-the-wall Observation, Expert Interviews, **[+]** Grounded Theory, **[+]** Triangulation, **[+]** Mixed-Methods Design, **[+]** Inter-rater Reliability

**05 · Quantitative Research** — Surveys, Analytics, Funnel Analysis, Heatmaps, Session Recordings, Click Tracking, Eye Tracking, Multivariate Testing, Benchmark Studies, SUS, UMUX, NPS, CES, Time on Task, Task Success Rate, Error Rate, Retention Analysis, Cohort Analysis, **[+]** SEQ (Single Ease Question), **[+]** UMUX-Lite, **[+]** SUPR-Q, **[+]** NASA-TLX, **[+]** MaxDiff, **[+]** Conjoint Analysis, **[+]** Kano Survey, **[+]** Van Westendorp, **[+]** TURF Analysis, **[+]** Top Task Analysis, **[+]** First-Click Testing, **[+]** 5-Second Test, **[+]** Preference Testing, **[+]** Desirability Testing (Reaction Cards), **[+]** Tracking Plan & Instrumentation

**06 · Ideation** — Brainstorming, Brainwriting, Crazy 8s, SCAMPER, Design Studio, Reverse Brainstorming, Morphological Matrix, Lotus Blossom, Bodystorming, Analogous Inspiration, Dot Voting

**07 · IA & Structure** — Site Maps, User Flows, Task Flows, Information Architecture, Content Inventory, Card Sorting, Tree Testing, Navigation Design, Taxonomy, Labeling

**08 · Interaction Design** — Wireframes, State Diagrams, Interaction Patterns, Microinteractions, Feedback, Progressive Disclosure, Empty States, Error Handling, Onboarding, Motion Principles

**09 · Content Design** **[+ NEW PART]** — UX Writing, Microcopy, Error Message Writing, Voice & Tone, Plain Language & Readability, Content Strategy, Content Modelling, Localization & i18n

**10 · Visual Design** — Visual Hierarchy, Typography, Color Theory, Contrast, Spacing, Gestalt Principles, Layout, Grid Systems, Iconography, Design Tokens

**11 · Prototyping** — Paper Prototypes, Low Fidelity, Mid Fidelity, High Fidelity, Interactive Prototypes, Wizard of Oz, Concierge MVP, Clickable Prototype, **[+]** Fake Door Test, **[+]** Painted Door, **[+]** Smoke Test

**12 · Evaluation** — Usability Testing, Heuristic Evaluation, Cognitive Walkthrough, Accessibility Audit, Expert Review, A/B Testing, Benchmark Testing, Comparative Testing, Longitudinal Testing, Pilot Testing, **[+]** Pluralistic Walkthrough, **[+]** GOMS / KLM

**13 · Accessibility** — WCAG, Screen Readers, Keyboard Navigation, Focus States, Color Blindness, Accessible Forms, Accessible Tables, ARIA, Inclusive Design, Universal Design, **[+]** Cognitive Accessibility, **[+]** Legal Landscape (ADA / EN 301 549 / European Accessibility Act)

**14 · Service Design** — Service Blueprint, Stakeholder Maps, Ecosystem Maps, Touchpoint Analysis, Service Safari, Experience Prototyping, Backstage Mapping, **[+]** Ethical Design *(consolidates what had been six separate Research Ops & Ethics entries — Informed Consent, Research Ethics, Privacy & GDPR in Research, Consequence Scanning, Privacy by Design, and Deceptive Patterns — into one entry rather than six thin ones)*

**15 · AI Design** — Prompt Design, AI Interaction Patterns, AI Transparency, Human-in-the-loop, AI Error Recovery, Trust Calibration, AI Mental Models, Explainability, Confidence Indicators, **[+]** AI Ethics & Harm Review

**16 · Metrics & Experimentation** — KPI Trees, Experiment Design, Statistical Significance, Confidence Intervals, Power Analysis, Leading vs Lagging Metrics, Goal-Signal-Metric, **[+]** Guardrail & Counter Metrics, **[+]** Sample Ratio Mismatch, **[+]** Novelty Effect, **[+]** The Peeking Problem, **[+]** Quasi-experiments & Diff-in-Diff, **[+]** Holdout Groups, **[+]** Switchback Tests

**17 · Design Systems** **[+ NEW PART — promoted from a single line in Career]** — Design System Strategy, Component API Design, Token Architecture, Governance Models, Contribution Model, Component Documentation, Versioning & Deprecation, Adoption Measurement

**18 · Facilitation** — Workshop Design, Sprint Planning, Design Critiques, Retrospectives, Brainstorm Facilitation, Silent Voting, Timeboxing

**19 · Communication** — UX Reports, Executive Summaries, Research Readouts, Storytelling, Design Reviews, Presentations, Design Rationale, Project Documentation

**20 · Career & Practice** — Portfolio Storytelling, Case Studies, Working with PMs, Working with Engineers, Design QA, Prioritization, Time Management

---

## 5. Visual design

Two inputs, cleanly separated:

- **Structure and pacing** from [interfacecraft.dev](https://www.interfacecraft.dev) — single centered column, whitespace as the divider, uppercase mono eyebrows, tight display tracking, generous vertical rhythm.
- **Palette** is the author's own call: **warm gray background, cream-white text**. This is a deliberate departure from Interface Craft's white-on-light. The structural qualities carry over; the colour scheme does not.

The result is a single committed dark, warm reading surface — not a light/dark pair. A reference used daily in long sittings benefits more from one well-tuned surface than from two adequate ones.

**Type**
- Geist Sans (variable) — body and UI
- Geist Mono — metadata, eyebrows, IDs, counts
- Display headings: `letter-spacing: -0.025em`
- Uppercase mono eyebrows: `letter-spacing: 0.05–0.1em`

**Color** — warm gray, no blue in the neutrals. Applied as CSS custom property overrides on Astryx's `stone` theme (see §7).

| Role | Token | Value |
|---|---|---|
| Page | `--color-background-body` | `#24231F` |
| Surface (cards, palette) | `--color-background-surface` | `#2C2B26` |
| Raised | `--color-background-card` | `#333230` |
| Primary text (cream) | `--color-text-primary` | `#F2EBDE` |
| Secondary text | `--color-text-secondary` | `#B8B2A6` |
| Border | `--color-border` | `#3D3B35` |

Contrast computed, not estimated: cream on page = **13.3:1**, secondary on page = **7.5:1**. Both clear AAA for body text.

Accent used **only** for the `kind` taxonomy (concept / framework / method) — three of Astryx's ten hues, using the `-vivid` variants so they hold up against the gray. Consistent site-wide, so the badge colour becomes a learnable signal rather than decoration. Each verified ≥ 4.5:1 on both page and surface.

**Layout** — single centered column, `max-width` ~68ch for prose. Hairline borders only where structure genuinely needs them.

**Radii** — Astryx's `--radius-inner` / `element` / `container`, bridged to Tailwind's `rounded-sm` / `md` / `lg`.

---

## 6. Interaction

### 6.1 Command palette — the primary interface

`⌘K` / `/` from anywhere. Built on Astryx's `CommandPalette`, with the entire search supplied by our own scorer through its `searchSource` prop (§7.0).

Search runs over three weighted fields:

| Field | Weight | Why |
|---|---|---|
| `title` + `aka` | 1.0 | Half-remembered names |
| `## When to use` body text | 0.6 | **Situational search** |
| Remaining body | 0.25 | Last resort |

Results group under `METHODS` and `MATCHED ON WHEN TO USE`, so a query like *"users keep getting lost"* surfaces Tree Testing and Top Task Analysis even though neither phrase appears in their titles. This behaviour is the reason the palette is worth building — plain title search would not justify it.

Each row shows title, category, and `kind` badge. Recently-viewed methods appear on empty input, backed by `localStorage`.

### 6.2 Pages

- **`/`** — the 21 parts as a dense index with entry counts and a `kind` distribution bar per part. Recently viewed above the fold.
- **`/c/[category]`** — listing with filter chips on `kind`, `gives`, `effort`, `timeframe`. Secondary (`alsoIn`) entries shown with a link to their primary home.
- **`/m/[id]`** — the method. Header carries title, category, and a metadata strip (`kind · gives · effort · timeframe`). Body sections in fixed order. `When not to use` renders as a distinct block where each row is *condition → linked alternative*.

All method pages statically prerendered.

### 6.3 Motion

Framer Motion (`motion/react`). Restrained, matching the reference — nothing moves that isn't communicating.

- **Palette** — spring in, no overshoot; results stagger 12ms. On mobile: bottom sheet with drag-to-dismiss.
- **Index → method** — `layoutId` on the method title so it travels from card to page header.
- **Method page** — sections reveal on scroll, `once: true`, 8px y-offset.
- **Filter chips** — `layoutId` sliding indicator.
- `<MotionConfig reducedMotion="user">` at the root. Non-negotiable on a site about UX.

### 6.4 Responsive

Mobile-first. Single column throughout; the desktop layout is the same column with more margin, not a different layout. Palette becomes a bottom sheet under 640px. Metadata strip wraps to two rows. Touch targets ≥ 44px.

---

## 7. Architecture

```
app/
  layout.tsx                  fonts, theme, MotionConfig, palette provider
  page.tsx                    index
  c/[category]/page.tsx       category listing
  m/[id]/page.tsx             method detail
lib/
  content/schema.ts           Zod schema — single source of truth
  content/load.ts             read → validate → typed index
  content/index.ts            cached accessor (getMethod, getCategory, allMethods)
  search/score.ts             pure scorer — unit tested
  search/build.ts             generates the search doc at build time
components/
  palette/                    Palette, PaletteResults, PaletteRow
  method/                     MetaStrip, UseInsteadBlock, MistakeList, SourceList, RelatedRail
  ui/                         Badge, Chip, Eyebrow, Prose
content/methods/<category>/<id>.mdx
scripts/validate-content.ts
```

**Module boundaries.** `lib/content` is the only code that touches the filesystem; everything else consumes its typed output. `lib/search/score.ts` is pure — string in, ranked ids out — so it is unit-testable without fixtures. Components never read frontmatter directly; they receive typed props.

**Stack** — Bun (package manager, test runner, scripts) · Next.js 16 App Router · React 19 · TypeScript · **[Astryx](https://github.com/facebook/astryx)** (`@astryxdesign/core` + `theme-stone` + `cli`) · Tailwind v4 · `motion` v12 · `geist` · `next-mdx-remote/rsc` · `gray-matter` · `zod`.

### 7.0 Astryx

Meta's design system — 150+ React components, MIT, 8 years internal (13,000+ apps), public since Jan 2026.

**It does not force a styling rewrite.** Astryx authors its styles with StyleX but ships pre-built CSS: *"no build plugin, no PostCSS or Babel config."* `@astryxdesign/core/tailwind-theme.css` bridges its tokens to Tailwind utilities via `@theme inline`, so `bg-surface text-primary rounded-lg` resolves to Astryx tokens. Tailwind v4 stays.

Setup is a CSS layer order plus a `<Theme>` provider:

```css
@layer reset, theme, base, astryx-base, astryx-theme, components, utilities;
@import 'tailwindcss/theme.css' layer(theme);
@import 'tailwindcss/preflight.css' layer(base);
@import '@astryxdesign/core/reset.css';
@import '@astryxdesign/core/astryx.css';
@import '@astryxdesign/theme-stone/theme.css';
@import '@astryxdesign/core/tailwind-theme.css';
@import 'tailwindcss/utilities.css' layer(utilities);
```

The §5 palette is applied as CSS custom property overrides after the theme import — Astryx's documented customization path, no forking or wrapping.

**What it replaces:** `cmdk` (Astryx ships a Command Palette), plus Dialog, Popover, Toast, Badge, Tooltip, Skeleton, and the layout primitives. Its CLI (`astryx component --list`, docs, codemods) is explicitly built for agent use, which suits how this repo is worked on.

**Risk, stated plainly.** Astryx is v0.2.0, Beta, 674 npm versions since June 2026. Breaking changes between minors are likely. Mitigations: exact-pin every `@astryxdesign/*` version in `package.json` (no `^`), keep `bun.lock` committed, and confine Astryx imports to `components/ui/` so a breaking change has one blast radius. `swizzle` (ejects a component's source into the repo) is the escape hatch if a component becomes a blocker.

**Phase 0 spike — resolved during planning, 2026-08-05.** `CommandPalette` takes a `searchSource: SearchSource<T>` prop, where `SearchSource` is just `{ search(query): T[] | Promise<T[]>; bootstrap(): T[] | Promise<T[]>; cancel?(): void }`. The entire search implementation is ours — this is better than a custom filter hook. It also auto-groups results by `auxiliaryData.group` and takes a `renderItem(item, isSelected)`, which covers §6.1's grouped results and custom rows without any workaround. **`cmdk` is not needed and is not a dependency.**

Content pipeline is hand-rolled rather than Velite/Contentlayer: fewer dependencies, no version-coupling risk, and the whole thing is readable in one sitting.

**Deploy** — Vercel project `ux-cheatsheet` (`anayak-2220s-projects`), connected to `github.com/AtharvaN16/UX-Cheatsheet`. Public URL. No backend, no environment variables, no database.

### 7.1 Branch and deploy flow

| Branch | Purpose | Vercel |
|---|---|---|
| `dev` | All work happens here | Preview deployment per push |
| `main` | Release only | **Production** |

`main` is the GitHub default branch and Vercel's pinned production branch. Work lands on `dev`, gets reviewed on its preview URL, then merges to `main` to ship.

### 7.2 Agent skills installed

Vendored into `.claude/skills/` and committed, so they travel with the repo:

- **18 engineering skills** from [mattpocock/skills](https://github.com/mattpocock/skills) — `tdd`, `implement`, `to-spec`, `code-review`, `codebase-design`, `diagnosing-bugs`, `research`, `prototype`, `wayfinder`, and others. Run `/setup-matt-pocock-skills` once to configure issue tracking and doc locations.
- **[Impeccable](https://github.com/pbakaus/impeccable)** — design-quality skill. Installs `PostToolUse` and `Stop` hooks that check UI changes as they are written. Run `/impeccable init` to generate `PRODUCT.md` and `DESIGN.md` from §5 of this spec.

`.claude/settings.local.json` holds the Impeccable hook wiring but is **not** committed (it also carries machine-local permissions). Re-run `bunx impeccable install --providers=claude --scope=project` on a fresh clone.

---

## 8. Error handling

The only meaningful failure mode is bad content, and it is caught before deploy.

- **Schema violation** → build fails with file, field, and reason.
- **Unresolved cross-reference** → build fails naming both the source file and the missing id.
- **Missing body section** → build fails listing which sections are missing.
- **Runtime** — `/m/[id]` for an unknown id renders `not-found.tsx`. Since all pages are prerendered from a validated index, this is unreachable in practice; it exists as a safety net.
- **Palette with zero results** → suggests the nearest category rather than showing an empty state.

---

## 9. Testing

- **Unit (`bun test`)** — `lib/search/score.ts` ranking behaviour, including the situational-search cases that justify the field weighting; `lib/content/load.ts` against fixture MDX (valid, missing section, broken reference, duplicate id).
- **Build-time** — the validator is the integration test. It runs on every build and in CI.
- **Manual** — a `kind`/contrast check in both themes, and a reduced-motion pass.

No E2E in v1. The site has no state to break beyond `localStorage`.

---

## 10. Delivery plan

**Phase 0 — Astryx Command Palette spike.** ✅ Resolved 2026-08-05 (§7.0). `searchSource` hosts the custom scorer directly.

**Phase 1 — Platform.** Next.js scaffold on Bun, Astryx + Tailwind layer setup, §5 theme overrides, Geist, content pipeline, Zod schema, validator, palette, all three page types, motion. Seeded with ~6 hand-written entries spanning several categories to exercise every schema field — including `## Using AI`.

**Phase 2 — Vertical slice: the research spine.** Parts 04 Qualitative (18), 05 Quantitative (33), 12 Evaluation (12) — 63 entries written to full depth.

Chosen because "use instead" carries the most weight here (research method selection is exactly the decision this site should win), these three exercise every schema field, and Part 05 is backed by the existing `Quantitative UX Research` workspace.

**Phase 3+ — Remaining parts,** in priority order: 03 Research & Synthesis (the `Starting Project Right` workspace already has nine reference documents to mine, and the *Framing & Planning* group draws on it directly), 01 UX Psychology, 02 Strategic Thinking, then the rest.

Each phase ends with a passing `bun run validate` and a deploy.

---

## 11. Sourcing

Content is grounded in, in order of preference:

1. **Sibling workspaces** — `Product Thinking`, `Quantitative UX Research`, `Systems Thinking`, `Decision Making`, `Human Behaviour`, `Starting Project Right`, `Digital Product Craft`. Each has a curated `RESOURCES.md` (21–97 lines) plus glossary and reference documents. This is vetted material and the first place to look.
2. **Primary sources** — the originating book or paper, cited directly.
3. **Established practitioner sources** — NN/g, MeasuringU, Baymard, IDEO, GV, WCAG.

**Where each sibling workspace lands after the 2026-08-06 taxonomy restructure (§4)** — kept explicit because prose mentions scattered through the doc are easy to lose track of:

| Sibling workspace | Grounds |
|---|---|
| `Human Behaviour` | 01 UX Psychology |
| `Product Thinking` | 02 Strategic Thinking — *Product Thinking* subgroup |
| `Systems Thinking` | 02 Strategic Thinking — *Systems Thinking* subgroup |
| `Decision Making` | 02 Strategic Thinking — *Decision Making* subgroup |
| `Starting Project Right` | 03 Research & Synthesis — *Framing & Planning* subgroup |
| `Quantitative UX Research` | 05 Quantitative Research |
| `Digital Product Craft` | Not pinned to one part — spans craft-level parts (Interaction Design, Visual Design, Prototyping, Content Design). Flagging this as unresolved rather than guessing a single home. |

Parametric recall is not a source. Any claim that cannot be attributed gets cut or marked as the author's own judgment.

### 11.1 Recency policy

Split every claim into one of two buckets, and source it accordingly:

| Bucket | Sourcing rule |
|---|---|
| **Timeless** — Fitts's Law, Gestalt, the maths of significance, Miller's 7±2, the mechanics of card sorting | Cite the seminal source. Age is a virtue. Do **not** substitute a 2026 blog post for the original paper. |
| **Time-sensitive** — tooling, benchmarks, platform behaviour, legal thresholds, sample-size norms, anything about AI | Prefer 2026. A 2019 source is a red flag unless nothing has changed. |

Time-sensitive areas where the 2026 answer differs materially from the older one, and which therefore need current sourcing rather than recall:

- **Accessibility law** — the European Accessibility Act, WCAG 2.2 as the operative version, WCAG 3.0's status
- **Experimentation** — sequential testing and always-valid inference have moved mainstream; fixed-horizon advice is dated
- **Analytics & privacy** — post-cookie measurement, consent-mode effects on funnel data
- **Research tooling** — the repository/ReOps landscape changes yearly
- **Anything AI** — including the §3.4 sections, which are the most perishable content on the site

`sources[].seminal: true` marks the timeless bucket. The build reports any entry whose sources are *all* non-seminal and older than three years — a nudge to re-check, not a hard failure.

### 11.2 AI's role in producing this content

AI is used to draft, cross-check, and find sources — never as the source itself. Every citation is resolved to a real, reachable URL before it ships; a plausible-looking reference to a paper that does not exist is worse than no reference. This is the same discipline §3.4 asks of the reader.

### 11.3 Resource-first triage for parts with no sibling workspace

§11's ordering assumes a curated `RESOURCES.md` exists to check first. It does for the parts a sibling workspace covers — `Foundations`, `Starting a Project`, `Quantitative Research`, and pieces of a few others. It does not for roughly half the taxonomy: `Research Ops & Ethics`, `Synthesis`, `Ideation`, `Content Design`, `Prototyping`, `Service Design`, `Design Systems`, `Facilitation`, `Communication`, and parts of `Interaction Design` / `Visual Design` / `AI Design`.

Adopted from the `/teach` skill's own resourcing discipline ([mattpocock/skills](https://github.com/mattpocock/skills), `productivity/teach`): *"Before `RESOURCES.md` is well-populated, your focus should be to find high-quality resources... Never trust your parametric knowledge."* Applied here — before drafting any entry in an uncovered part:

1. Spend a research pass finding 3–6 high-quality sources for that *part* (not just the one entry), same bar as §11's tier 2/3 — primary sources first, established practitioner sources second.
2. Note them inline in that part's authoring notes (no need for a formal `RESOURCES.md` file per part — the sibling-workspace format is overkill for a part that will only ever produce a handful of MDX files here).
3. Only then draft entries, citing from that set rather than recall.

This turns "no sibling workspace" into a research step instead of a licence to draft from memory — the same failure mode §3.4 warns the reader about, applied to the act of writing the cheatsheet itself.

---

## 12. Open questions

None blocking. Deferred to post-v1:

- A method-relationship graph view (the `related` data supports it; unclear it earns its complexity).
- Print stylesheet.
- Per-method personal notes.
