# Content authoring brief — method cards

Every `content/methods/<domain>/<id>.mdx` file must satisfy this brief. `bun run validate` enforces the mechanical parts; the rest is the quality bar that makes these cards worth looking up.

Read existing files before writing anything. **Match the altitude and voice of the cards already in the domain you are writing for** — not the longest card in the repo. `content/methods/ia-structure/card-sorting.mdx` (575 words) and `tree-testing.mdx` (516 words) show how tight a card can be; 850 is the ceiling, not the target.

## Audience and altitude

An experienced product designer moving into design engineering, mid-task, in a hurry. They are not a beginner. Do not define common terms, do not pad, do not motivate at length. Assume they know what a usability test is and want to know *which* method fits *this* decision and what will go wrong.

**Target 600–700 words of body. Aim for 650.**

This is a target, not a ceiling. Do not write to the number. Earlier batches were given 850 as a ceiling and every single card landed within ten words of 850 — which is how you can tell the number was driving the writing rather than the content. If a card says what it needs in 520, ship 520; `tree-testing` does exactly that.

The compressible parts, in order: `Example` (make the situation specific in two sentences, not five), then any bullet that restates a neighbouring bullet, then adjectives. The parts that must survive a trim: the honest `useInstead` rules, the real costs in `Limitations`, and the specific failure modes in `Common mistakes`. Cut words, never arguments.

## YAML traps that break the build

- **An unquoted scalar containing `: ` parses as a mapping.** This has already broken one file. Quote any `needs`/`when`/`caption` string containing a colon-space:
  `- "An agreed scope boundary (which surfaces the map covers: site, app, help centre)"`
- Quote strings containing `#`, leading `*`, leading `-`, or `[`/`{`.
- `aka` and other inline arrays need quoted members if they contain punctuation.

## Frontmatter

```yaml
id: kebab-case              # MUST equal the filename without .mdx
title: Human Title
aka: ["Alternative Name"]   # optional, [] if none
domain: kebab-case          # the domain directory this file lives in
alsoIn: []                  # other domain ids where this legitimately belongs
kind: concept | framework | method
gives: quantitative | qualitative | mixed | conceptual
effort: low | medium | high
timeframe: hours | days | weeks | months | ongoing
needs:                      # concrete preconditions, not vague advice
  - A recruited sample of at least 15 target users
useCases: [understand-behavior]   # ids from lib/useCases.ts ONLY
useInstead:                 # AT LEAST ONE. The honest "don't use me" rule.
  - when: You need X rather than Y
    method: some-other-id   # MUST be an id that exists
related:
  before: []
  after: []
  alongside: []
sources:                    # AT LEAST TWO
  - title: Exact Title
    author: Real Author
    url: https://real.url/that/resolves
    type: book | article | paper | standard | tool | video
    year: 1984
    seminal: true
image:                      # OPTIONAL — see "Images" below
  src: /images/methods/<id>.svg
  alt: At least 20 characters describing what the diagram shows
  caption: Optional one-line caption
```

**`kind` decides everything downstream.** Method = an activity you perform. Framework = a structure you fill in. Concept = an idea/law/mechanism you understand.

## Sections — use exactly the set for your `kind`

Headings are `## ` at the top level. No duplicate headings. No other top-level headings.

**concept:**
`What is it` · `Why it matters` · `Key ideas` · `Example` · `Application` · `Limitations` · `Common misconceptions` · `Tips` · `Using AI`

**method:**
`What is it` · `Purpose` · `When to use` · `How to do it` · `Example` · `Common mistakes` · `Limitations` · `Tips` · `Using AI`

**framework:**
`What is it` · `Purpose` · `When to use` · `Structure` · `How to use` · `Example` · `Common mistakes` · `Limitations` · `Using AI`

`Using AI` must contain exactly these two bolded labels with bullets under each:

```markdown
**Where it helps**
- Specific, verifiable assistance

**Where it fails**
- A specific way AI produces output that *looks* like the method's result without the evidence the method depends on
```

## The renderer only supports four things

Method bodies do **not** go through MDX. They are parsed by `FormattedText` in `components/ui/ConceptSheetModal.tsx`, which handles:

- `**bold**` and `*italic*`
- `### ` / `#### ` subheadings
- `- ` and `* ` bullet lists
- paragraphs

Anything else renders as **literal text**. Do not use tables, markdown links, images, blockquotes, numbered lists (`1.` renders as a plain paragraph), footnotes, or HTML. Links belong in `sources`; diagrams belong in `image`.

## Sources are the hard part

This is where quality is won or lost.

- **Never write a URL you have not retrieved.** Search for each source and confirm it resolves. A plausible-looking invented URL is the single worst defect a card can have.
- Prefer the **primary** source: the original paper, the author's own book or site, the standards document. Mark it `seminal: true`.
- **Prefer a publisher, author, library or archive record over a retail listing.** If the publisher page returns 403 to fetchers (O'Reilly and ACM both do), use Google Books, archive.org or the author's own site — not an Amazon product page.
- One secondary source explaining current practice is fine. Generic listicles and SEO content farms are not acceptable.
- The bar: *would a practitioner in this field recognise this as the real canon?*
- If you cannot find two genuine sources, say so in your report rather than inventing one.

## Content rules

- **`useInstead` must be honest.** Name a real situation where a different method beats this one, and point at that method's id. This field is the spine of the whole cheatsheet — a card that oversells itself is worse than no card.
- **`Limitations` must cost something.** Name what the method genuinely cannot do. "Requires time" is not a limitation; "classification shifts with question wording, so category boundaries are fuzzier than the diagram suggests" is.
- **`Example` must be concrete.** A specific product situation with specific detail, not "imagine an e-commerce site".
- **Do not let a hypothetical read as a research finding.** Illustrative numbers are fine as inputs to a worked example ("assume a 50% chance"). But figures that look like measured results — "the task failed at 78%, and renaming moved it to 84%" — must be framed as hypothetical, because a reader will otherwise cite them. Real measured figures must come from a cited source.
- **`Common mistakes` are failure modes you'd actually see on a real team**, each with the reason it goes wrong.
- Ground modern claims in current practice; keep timeless principles attributed to their originators.

## Cross-references

`useInstead[].method` and every id in `related` must resolve to a file that exists, and cannot be this file's own id. When writing a batch, you may reference:

1. any id already present in `content/methods/`, and
2. any id being written in the same batch.

Nothing else. An unresolved reference fails the build.

## Images

Optional, and genuinely optional — most cards do not need one. Add one only when the method has a **canonical visual form** that prose cannot replace: a 2×2 matrix, a curve, a canvas layout, a loop, a funnel, a hierarchy.

Do not add one for a card whose value is a procedure or a list. A decorative diagram is worse than no diagram.

When adding one: author a hand-written SVG to `public/images/methods/<id>.svg`, dark background (`#141414`), muted grid strokes (`#3a3a3a`), labels in a serif face, accent colours drawn from the domain palette. Alt text describes what the diagram *shows*, not that it is a diagram. See `public/images/methods/kano-model.svg`.

## Before you report done

Run `bun run validate` from the repo root. It must print `✓ N methods valid`. Fix every error it reports; do not report success while it fails.
