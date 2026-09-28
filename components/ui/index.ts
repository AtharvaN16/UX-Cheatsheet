// Barrel export for this project's Astryx-wrapping UI components.
//
// `components/ui/` is the only directory (besides the specific files named in
// the Task 2 brief — `lib/theme.ts`, `app/providers.tsx`, `app/page.tsx`) that
// may import from `@astryxdesign/*`. Later tasks populate this barrel as they
// add wrapper components here.
export { MethodImage } from './MethodImage';

// Dev-only authoring layer (see docs/superpowers/specs/2026-09-28-authoring-mode-design.md).
export { AuthoringProvider, useAuthoring, IS_DEV } from './AuthoringProvider';
export { AuthorDock } from './AuthorDock';
export { AddCardPalette } from './AddCardPalette';
export { EditableSection } from './EditableSection';
export { FrontmatterPanel } from './FrontmatterPanel';
