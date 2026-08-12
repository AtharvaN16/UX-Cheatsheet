import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Providers } from './providers';
// Not an @astryxdesign/* import — cheatsheetTheme.name is our own generated
// object (see app/providers.tsx). Used below only to avoid hardcoding the
// theme name twice.
import { cheatsheetTheme } from '@/lib/cheatsheet';
import { getAllMethods, toScorable } from '@/lib/content';
import { PaletteProvider } from '@/components/ui/PaletteProvider';
import type { MethodItem } from '@/lib/search/source';
import { AppShellFrame } from '@/components/ui/AppShellFrame';
import { AppSidebar } from '@/components/ui/AppSidebar';
import { CATEGORIES } from '@/lib/categories';

export const metadata: Metadata = {
  title: 'UX Methods',
  description: 'A working reference for UX methods, frameworks, and models.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const methods = getAllMethods();
  const methodItems: MethodItem[] = methods.map((m) => ({
    id: m.id,
    label: m.title,
    auxiliaryData: { category: m.category, kind: m.kind, group: '' },
  }));
  const categoryItems: MethodItem[] = CATEGORIES.map((c) => ({
    id: c.id,
    label: c.title,
    auxiliaryData: {
      category: c.id,
      kind: 'category',
      group: '',
      href: `/c/${c.id}`,
      type: 'category',
    },
  }));
  const idCollision = methodItems.find((m) =>
    categoryItems.some((c) => c.id === m.id),
  );
  if (idCollision) {
    throw new Error(
      `Search index id collision: "${idCollision.id}" is used by both a method and a category. ` +
        'Method and category ids must be disjoint — rename one of them.',
    );
  }
  const items: MethodItem[] = [...methodItems, ...categoryItems];

  const categoryScorables = CATEGORIES.map((c) => ({
    id: c.id,
    title: c.title,
    aka: [],
    whenToUse: '',
    rest: '',
  }));
  const scorables = [...methods.map(toScorable), ...categoryScorables];

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
    // default first. Values must match the mode="light" prop on <Theme> in
    // app/providers.tsx exactly, or hydration would flip them back.
    <html
      lang="en"
      data-astryx-theme={cheatsheetTheme.name}
      data-theme="light"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body>
        <Providers>
          <PaletteProvider items={items} scorables={scorables}>
            <AppShellFrame sideNav={<AppSidebar />} mobileNav={{ breakpoint: 'md' }}>
              {children}
            </AppShellFrame>
          </PaletteProvider>
        </Providers>
      </body>
    </html>
  );
}
