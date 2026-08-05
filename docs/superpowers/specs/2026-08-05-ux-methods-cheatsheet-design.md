# UX Methods Cheatsheet — Design

**Date:** 2026-08-05
**Status:** Approved, ready for implementation planning

---

## 1. What this is

A personal reference site covering ~315 UX methods, frameworks, and mental models across 21 categories. Every entry answers the same eleven questions in the same order, so the reader can compare two methods by scanning the same position on two pages.

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

~315 canonical entries produce ~350 listing appearances.

**Count derivation.** The original outline listed 242 entries, ~215 unique after removing repeats. Additions in §4 total ~98. Net ~315. This is materially larger than the ~260 estimated during brainstorming — the additions were counted low at that point. It does not change the architecture, only the content-writing runway, which is why the work is phased (§10).

### 3.2 Frontmatter schema

```yaml
id: tree-testing                    # kebab-case, unique, matches filename
title: Tree Testing
aka: [reverse card sorting]         # searchable aliases
category: ia-structure              # primary; owns the URL
alsoIn: [evaluation]

kind: evaluative                    # generative | descriptive | evaluative | causal | framework
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
    seminal: false
```

### 3.3 Body sections

Fixed `##` headings, validated by the loader. Order is fixed; a missing required section fails the build.

| Heading | Required | Notes |
|---|---|---|
| `## What is it` | yes | 2–4 sentences, no jargon, no method name in the first sentence |
| `## Purpose` | yes | The problem it solves. One paragraph. |
| `## When to use` | yes | Bullets. Situational, not abstract. |
| `## How to do it` | yes | Numbered steps someone could follow |
| `## Common mistakes` | yes | Bullets, each `**Mistake** — the fix` |
| `## Tips` | yes | Practitioner advice, not restated steps |
| `## Notes` | no | Anything that doesn't fit above |

`When not to use`, `Use instead`, `Prerequisites`, `Related methods`, and `Further reading` are **rendered from frontmatter**, not written as prose. This is deliberate: it makes them queryable, guarantees they exist, and lets the site build a method-relationship graph for free.

### 3.4 Build-time validation

`bun run validate` (and the Next build) enforces:

1. Frontmatter parses against the Zod schema.
2. `id` matches the filename and is globally unique.
3. Every id referenced in `useInstead[].method`, `related.*`, and `alsoIn` resolves to an existing entry.
4. All required body sections present, in order.
5. `sources` has ≥ 2 entries; every `url` is well-formed.
6. `useInstead` has ≥ 1 entry.

Failures print `content/methods/<cat>/<file>.mdx: <field> — <what's wrong>` and exit non-zero. **This constraint is the highest-value engineering in the project** — it is what stops 300+ entries from rotting into inconsistency.

---

## 4. Taxonomy — 21 parts, ~315 entries

Additions to the original outline are marked **[+]**.

**01 · Foundations** *(four groups; largest part)*
- *Human Behavior* — Mental Models, Cognitive Load, Hick's Law, Fitts's Law, Miller's Law, Peak-End Rule, Goal Gradient Effect, Habit Loop, Dual Process Theory, Loss Aversion, Anchoring, Availability Bias, Confirmation Bias, Social Proof, Reciprocity, Scarcity, Progress Principle, Behavioral Economics Basics, **[+]** Jakob's Law, **[+]** Tesler's Law, **[+]** Postel's Law, **[+]** Doherty Threshold, **[+]** Von Restorff Effect, **[+]** Serial Position Effect, **[+]** Zeigarnik Effect, **[+]** Aesthetic-Usability Effect, **[+]** Choice Overload, **[+]** Default Effect, **[+]** Framing Effect, **[+]** Sunk Cost Fallacy, **[+]** Survivorship Bias, **[+]** Endowment Effect, **[+]** IKEA Effect, **[+]** Weber–Fechner Law
- *Motivation Models* (replaces the "Motivation Models" stub) — **[+]** Fogg Behavior Model, **[+]** COM-B, **[+]** Self-Determination Theory, **[+]** Hook Model, **[+]** Flow
- *Product Thinking* — Product-Market Fit, Jobs To Be Done, North Star Metric, Pirate Metrics (AARRR), HEART, OKRs, Opportunity Solution Tree, Kano Model, RICE, ICE, MoSCoW, Cost vs Value, Product Strategy, Value Proposition Canvas, Business Model Canvas, **[+]** WSJF, **[+]** Cost of Delay, **[+]** Buy-a-Feature, **[+]** Impact/Effort Matrix
- *Systems Thinking* — Feedback Loops, Stocks & Flows, Leverage Points, Second Order Effects, Emergent Behavior, Causal Loop Diagrams, System Mapping, Actor Network, Cynefin Framework *(Ecosystem Mapping lives in Part 15 and appears here via `alsoIn`)*
- *Decision Making* — First Principles, Inversion, OODA Loop, RAPID, DACI, Eisenhower Matrix, Pareto Principle, Expected Value, Opportunity Cost, Assumption Mapping, Risk Matrix, Decision Trees, **[+]** Pre-mortem, **[+]** Red Teaming, **[+]** Six Thinking Hats
- *Process frameworks* **[+]** — Double Diamond, Design Thinking, Lean UX, Google Design Sprint, Continuous Discovery, Story Mapping, Working Backwards / PR-FAQ

**02 · Starting a Project** — Problem Framing, Stakeholder Interviews, Kickoff Workshop, Project Brief, Goal Setting, Research Plan, Success Metrics, Constraints Mapping, Scope Definition, Competitive Analysis, Literature Review, Heuristic Review, Risk Assessment *(Assumption Mapping and Journey Mapping appear here via `alsoIn`)*

**03 · Research Ops & Ethics** **[+ NEW PART]** — Screener Design, Participant Recruitment, Incentives, Informed Consent, Research Ethics, Privacy & GDPR in Research, Research Repository, Atomic Research, Sample Size & Saturation, Session Logistics & Note-taking, Consequence Scanning, Privacy by Design, Deceptive Patterns (what to avoid)

**04 · Qualitative Research** — User Interviews, Contextual Inquiry, Ethnography, Diary Studies, Think Aloud, Retrospective Think Aloud, Focus Groups, Participatory Design, Co-design Workshops, Cultural Probes, Observation, Shadowing, Fly-on-the-wall Observation, Expert Interviews, **[+]** Grounded Theory, **[+]** Triangulation, **[+]** Mixed-Methods Design, **[+]** Inter-rater Reliability

**05 · Quantitative Research** — Surveys, Analytics, Funnel Analysis, Heatmaps, Session Recordings, Click Tracking, Eye Tracking, Multivariate Testing, Benchmark Studies, SUS, UMUX, NPS, CES, Time on Task, Task Success Rate, Error Rate, Retention Analysis, Cohort Analysis, **[+]** SEQ (Single Ease Question), **[+]** UMUX-Lite, **[+]** SUPR-Q, **[+]** NASA-TLX, **[+]** MaxDiff, **[+]** Conjoint Analysis, **[+]** Kano Survey, **[+]** Van Westendorp, **[+]** TURF Analysis, **[+]** Top Task Analysis, **[+]** First-Click Testing, **[+]** 5-Second Test, **[+]** Preference Testing, **[+]** Desirability Testing (Reaction Cards), **[+]** Tracking Plan & Instrumentation

**06 · Synthesis** — Affinity Mapping, Thematic Analysis, Qualitative Coding *(renamed from "Coding")*, Journey Mapping, Experience Mapping, Personas, Proto Personas, Empathy Maps, Insight Statements, Opportunity Areas, JTBD Statements, POV Statements, HMW Questions

**07 · Ideation** — Brainstorming, Brainwriting, Crazy 8s, SCAMPER, Design Studio, Reverse Brainstorming, Morphological Matrix, Lotus Blossom, Bodystorming, Analogous Inspiration, Dot Voting

**08 · IA & Structure** — Site Maps, User Flows, Task Flows, Information Architecture, Content Inventory, Card Sorting, Tree Testing, Navigation Design, Taxonomy, Labeling

**09 · Interaction Design** — Wireframes, State Diagrams, Interaction Patterns, Microinteractions, Feedback, Progressive Disclosure, Empty States, Error Handling, Onboarding, Motion Principles

**10 · Content Design** **[+ NEW PART]** — UX Writing, Microcopy, Error Message Writing, Voice & Tone, Plain Language & Readability, Content Strategy, Content Modelling, Localization & i18n

**11 · Visual Design** — Visual Hierarchy, Typography, Color Theory, Contrast, Spacing, Gestalt Principles, Layout, Grid Systems, Iconography, Design Tokens

**12 · Prototyping** — Paper Prototypes, Low Fidelity, Mid Fidelity, High Fidelity, Interactive Prototypes, Wizard of Oz, Concierge MVP, Clickable Prototype, **[+]** Fake Door Test, **[+]** Painted Door, **[+]** Smoke Test

**13 · Evaluation** — Usability Testing, Heuristic Evaluation, Cognitive Walkthrough, Accessibility Audit, Expert Review, A/B Testing, Benchmark Testing, Comparative Testing, Longitudinal Testing, Pilot Testing, **[+]** Pluralistic Walkthrough, **[+]** GOMS / KLM

**14 · Accessibility** — WCAG, Screen Readers, Keyboard Navigation, Focus States, Color Blindness, Accessible Forms, Accessible Tables, ARIA, Inclusive Design, Universal Design, **[+]** Cognitive Accessibility, **[+]** Legal Landscape (ADA / EN 301 549 / European Accessibility Act)

**15 · Service Design** — Service Blueprint, Stakeholder Maps, Ecosystem Maps, Touchpoint Analysis, Service Safari, Experience Prototyping, Backstage Mapping

**16 · AI Design** — Prompt Design, AI Interaction Patterns, AI Transparency, Human-in-the-loop, AI Error Recovery, Trust Calibration, AI Mental Models, Explainability, Confidence Indicators, **[+]** AI Ethics & Harm Review

**17 · Metrics & Experimentation** — KPI Trees, Experiment Design, Statistical Significance, Confidence Intervals, Power Analysis, Leading vs Lagging Metrics, Goal-Signal-Metric, **[+]** Guardrail & Counter Metrics, **[+]** Sample Ratio Mismatch, **[+]** Novelty Effect, **[+]** The Peeking Problem, **[+]** Quasi-experiments & Diff-in-Diff, **[+]** Holdout Groups, **[+]** Switchback Tests

**18 · Design Systems** **[+ NEW PART — promoted from a single line in Career]** — Design System Strategy, Component API Design, Token Architecture, Governance Models, Contribution Model, Component Documentation, Versioning & Deprecation, Adoption Measurement

**19 · Facilitation** — Workshop Design, Sprint Planning, Design Critiques, Retrospectives, Brainstorm Facilitation, Silent Voting, Timeboxing

**20 · Communication** — UX Reports, Executive Summaries, Research Readouts, Storytelling, Design Reviews, Presentations, Design Rationale, Project Documentation

**21 · Career & Practice** — Portfolio Storytelling, Case Studies, Working with PMs, Working with Engineers, Design QA, Prioritization, Time Management

---

## 5. Visual design

Modelled on [interfacecraft.dev](https://www.interfacecraft.dev) — editorial restraint executed in a modern app typeface.

**Type**
- Geist Sans (variable) — body and UI
- Geist Mono — metadata, eyebrows, IDs, counts
- Display headings: `letter-spacing: -0.025em`
- Uppercase mono eyebrows: `letter-spacing: 0.05–0.1em`

**Color** — warm neutrals, not blue-gray. Light default, dark supported via `prefers-color-scheme` + a manual toggle.

| Token | Light | Dark |
|---|---|---|
| `--background` | `#ffffff` | `#0c0a09` |
| `--foreground` | `#171717` | `#e7e5e4` |
| `--muted` | stone-500 | stone-400 |
| `--border` | stone-200 | stone-800 |

Accent used **only** for the `kind` taxonomy (generative / descriptive / evaluative / causal / framework) — five hues, consistent site-wide, so the badge colour becomes a learnable signal rather than decoration. Contrast verified at 4.5:1 minimum in both themes.

**Layout** — single centered column, `max-width` ~68ch for prose. Whitespace as the divider; hairline borders only where structure genuinely needs them. Generous vertical rhythm.

**Radii** — `0.25rem` → `1.5rem`, matching the reference's scale.

---

## 6. Interaction

### 6.1 Command palette — the primary interface

`⌘K` / `/` from anywhere. Built on `cmdk` with a custom scorer.

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

**Stack** — Bun (package manager, test runner, scripts) · Next.js 16 App Router · TypeScript · Tailwind v4 (`@theme`) · `motion` v12 · `geist` · `cmdk` · `next-mdx-remote/rsc` · `gray-matter` · `zod`.

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

- **Unit (Vitest)** — `lib/search/score.ts` ranking behaviour, including the situational-search cases that justify the field weighting; `lib/content/load.ts` against fixture MDX (valid, missing section, broken reference, duplicate id).
- **Build-time** — the validator is the integration test. It runs on every build and in CI.
- **Manual** — a `kind`/contrast check in both themes, and a reduced-motion pass.

No E2E in v1. The site has no state to break beyond `localStorage`.

---

## 10. Delivery plan

**Phase 1 — Platform.** Next.js scaffold, design tokens, Geist, content pipeline, Zod schema, validator, palette, all three page types, motion. Seeded with ~6 hand-written entries spanning several categories to exercise every schema field.

**Phase 2 — Vertical slice: the research spine.** Parts 04 Qualitative (18), 05 Quantitative (33), 13 Evaluation (12) — 63 entries written to full depth.

Chosen because "use instead" carries the most weight here (research method selection is exactly the decision this site should win), these three exercise every schema field, and Part 05 is backed by the existing `Quantitative UX Research` workspace.

**Phase 3+ — Remaining parts,** in priority order: 02 Starting a Project (the `Starting Project Right` workspace already has nine reference documents to mine), 03 Research Ops & Ethics, 01 Foundations, then the rest.

Each phase ends with a passing `bun run validate` and a deploy.

---

## 11. Sourcing

Content is grounded in, in order of preference:

1. **Sibling workspaces** — `Product Thinking`, `Quantitative UX Research`, `Systems Thinking`, `Decision Making`, `Human Behaviour`, `Starting Project Right`, `Digital Product Craft`. Each has a curated `RESOURCES.md` (21–97 lines) plus glossary and reference documents. This is vetted material and the first place to look.
2. **Primary sources** — the originating book or paper, cited directly.
3. **Established practitioner sources** — NN/g, MeasuringU, Baymard, IDEO, GV, WCAG.

Parametric recall is not a source. Any claim that cannot be attributed gets cut or marked as the author's own judgment.

---

## 12. Open questions

None blocking. Deferred to post-v1:

- A method-relationship graph view (the `related` data supports it; unclear it earns its complexity).
- Print stylesheet.
- Per-method personal notes.
