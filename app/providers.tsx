'use client';

import Link from 'next/link';
import { MotionConfig } from 'motion/react';
import { Theme } from '@astryxdesign/core/theme';
import { LinkProvider } from '@astryxdesign/core/Link';
// Built (SSR-safe) theme — generated from lib/theme.ts by
// `bun run astryx theme build lib/theme.ts` (wired as predev/prebuild).
// __built: true tells <Theme> to skip client-only runtime style injection,
// since lib/cheatsheet.css (imported in app/globals.css) already carries
// the token CSS at server-render time.
import { cheatsheetTheme } from '@/lib/cheatsheet';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Theme theme={cheatsheetTheme}>
      <LinkProvider component={Link}>
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </LinkProvider>
    </Theme>
  );
}
