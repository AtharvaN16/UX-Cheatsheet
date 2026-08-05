import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Providers } from './providers';
// Not an @astryxdesign/* import — cheatsheetTheme.name is our own generated
// object (see app/providers.tsx). Used below only to avoid hardcoding the
// theme name twice.
import { cheatsheetTheme } from '@/lib/cheatsheet';

export const metadata: Metadata = {
  title: 'UX Methods',
  description: 'A working reference for UX methods, frameworks, and models.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // <Theme>'s root-sync effect (useIsomorphicLayoutEffect in
    // @astryxdesign/core's Theme.js) sets these same two attributes on
    // document.documentElement, but only client-side after hydration. Setting
    // them here too — in this server component, so they're in the initial
    // SSR markup — is required per Theme.js's own doc comment ("For RSC/SSR,
    // set data-theme on <html> in your root server layout to avoid a flash
    // of wrong theme before hydration"). Without this, `[data-astryx-theme=
    // "cheatsheet"]`-scoped tokens (lib/cheatsheet.css) don't match <html> or
    // <body> until JS runs, and the page paints Astryx's neutral-light
    // default first. Values must match the mode="dark" prop on <Theme> in
    // app/providers.tsx exactly, or hydration would flip them back.
    <html
      lang="en"
      data-astryx-theme={cheatsheetTheme.name}
      data-theme="dark"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
