'use client';

import Link from 'next/link';
import { MotionConfig } from 'motion/react';
import { Theme } from '@astryxdesign/core/theme';
import { LinkProvider } from '@astryxdesign/core/Link';
// Built (SSR-safe) theme — generated from lib/theme.ts by
// `astryx theme build` (run automatically from next.config.ts on every
// `next dev`/`next build`, so it can't be skipped by how the build is
// invoked — see the comment there). __built: true tells <Theme> to skip
// client-only runtime style injection, since lib/cheatsheet.css (imported in
// app/globals.css) already carries the token CSS at server-render time.
import { cheatsheetTheme } from '@/lib/cheatsheet';
// Dev-only authoring layer. AuthoringProvider must wrap the tree because
// ConceptSheetModal's editable sections call useAuthoring() unconditionally.
// In a production build `IS_DEV` is false, so the dock and the palette render
// null and nothing authoring-related reaches the prerendered HTML. Verified:
// they are NOT dropped from the bundle (see AuthoringProvider), they are inert
// in it. The boundary that actually matters is `devOnlyGuard`, which 404s every
// /api/authoring route in production.
import { AuthoringProvider } from '@/components/ui/AuthoringProvider';
import { AuthorDock } from '@/components/ui/AuthorDock';
import { AddCardPalette } from '@/components/ui/AddCardPalette';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // mode="light" (not the "system" default) is required, not cosmetic: it's
    // what makes <Theme>'s client-side root-sync effect set the SAME
    // data-theme="light" value that app/layout.tsx already set for SSR. If
    // this were "system", the effect would instead *remove* data-theme right
    // after hydration, flipping color-scheme back to "light dark" and
    // re-exposing every un-overridden light-dark() token (e.g.
    // --color-accent, inherited from stoneTheme) to the OS/browser
    // preference — see app/globals.css's `:root { color-scheme: light; }`
    // comment for the other half of this fix.
    <Theme theme={cheatsheetTheme} mode="light">
      <LinkProvider component={Link}>
        <MotionConfig reducedMotion="user">
          <AuthoringProvider>
            {children}
            <AuthorDock />
            <AddCardPalette />
          </AuthoringProvider>
        </MotionConfig>
      </LinkProvider>
    </Theme>
  );
}
