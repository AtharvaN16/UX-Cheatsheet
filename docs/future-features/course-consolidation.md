# Future feature — fold the course workspaces into this platform

**Logged:** 2026-08-06
**Status:** Idea, not scoped. Not part of any current phase (§10 of the design spec).

## The idea

Bring the sibling `Learning Lessons/*` course workspaces — `Product Thinking`, `Quantitative UX Research`, `Systems Thinking`, `Decision Making`, `Human Behaviour`, `Starting Project Right`, `Digital Product Craft`, `Conversational UX`, `Computer Science for Design Engineers`, `Job Search Strategy`, `Life Performance`, `Caste in India` — into this platform as a single personal site, rather than leaving them as separate repos each with their own `.claude/` setup, `MISSION.md`, `lessons/`, `reference/`, and `RESOURCES.md`.

Reference point named by the author: [builtformars.com](https://builtformars.com) — but adapted to personal needs rather than copied.

## Why it's deferred, not started

Raised while designing the cheatsheet entry-authoring skill. The cheatsheet's whole content model is built around one fixed, terse, comparable shape (§1, §3 of the design spec) — every entry answers the same questions in the same order so two entries can be scanned side by side. Course lessons are the opposite: sequential, expository, meant to teach rather than remind (§1's explicit non-goal: *"Not a course. It does not teach; it reminds."*).

Folding the two together isn't a content-authoring task, it's an information-architecture decision:

- What survives the move as-is vs. gets compressed into cheatsheet entries vs. stays a full lesson?
- Do courses get their own route/section and content model alongside `/m/[id]`, or does the platform grow a second, differently-shaped content type?
- Do the source `Learning Lessons/*` workspaces get retired once migrated, or stay as the authoring environment with this site as the read surface?
- Each workspace already has a `RESOURCES.md` (per the `/teach` skill's pattern, see §11.3 of the design spec) — how much of that sourcing work carries over vs. needs re-verification for a public-facing site.

None of this blocks Phase 2 (writing the research-spine cheatsheet entries) or the entry-authoring skill. When it's ready to scope, it wants its own spec pass — same rigor as the original design spec, not a bolt-on to the cheatsheet's content model.
