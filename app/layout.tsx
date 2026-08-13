import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Providers } from './providers';
import { cheatsheetTheme } from '@/lib/cheatsheet';
import { getAllMethods, toScorable } from '@/lib/content';
import { PaletteProvider } from '@/components/ui/PaletteProvider';
import type { MethodItem } from '@/lib/search/source';
import type { ScorableMethod } from '@/lib/search/score';
import { AppFrame } from '@/components/ui/AppFrame';
import { CATEGORIES, getCategory } from '@/lib/categories';
import { TAXONOMY } from '@/lib/taxonomy';
import { get1Liner } from '@/lib/taxonomyDescriptions';
import { inferKind } from '@/lib/inferKind';

export const metadata: Metadata = {
  title: 'UX Cheatsheets',
  description: 'A working reference for UX methods, frameworks, models, and psychology.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const methods = getAllMethods();
  const writtenIds = new Set(methods.map((m) => m.id));

  // 1. Written method search items — one entry per category a method actually
  // renders under (its primary `category` plus every `alsoIn`), so a search
  // result's label/href always matches the page the user found it on instead
  // of silently pointing back to the primary category only.
  const writtenMethodItems: MethodItem[] = methods.flatMap((m) => {
    const categoriesForSearch = [m.category, ...m.alsoIn];
    return categoriesForSearch.map((catId, i) => {
      const categoryMeta = getCategory(catId);
      return {
        id: i === 0 ? m.id : `${m.id}::${catId}`,
        label: m.title,
        auxiliaryData: {
          category: categoryMeta?.title || catId,
          kind: m.kind || inferKind(m.title, catId, m.id),
          group: '',
          href: `/c/${catId}?item=${m.id}`,
        },
      };
    });
  });

  // 2. Index all ~310 taxonomy entries (Hick's Law, Fitts's Law, RICE, Kano, etc.)
  const taxonomyItems: MethodItem[] = [];
  const taxonomyScorables: ScorableMethod[] = [];

  TAXONOMY.forEach((catTax) => {
    const categoryMeta = getCategory(catTax.categoryId);
    const categoryName = categoryMeta?.title || catTax.categoryId;

    catTax.groups.forEach((group) => {
      group.items.forEach((item) => {
        if (!writtenIds.has(item.id)) {
          const kind = inferKind(item.title, catTax.categoryId, item.id);
          const desc = get1Liner(item.id, item.title);

          taxonomyItems.push({
            id: item.id,
            label: item.title,
            auxiliaryData: {
              category: categoryName,
              kind,
              group: '',
              href: `/c/${catTax.categoryId}?item=${item.id}`,
            },
          });

          taxonomyScorables.push({
            id: item.id,
            title: item.title,
            aka: [],
            whenToUse: desc,
            rest: `${item.title} ${categoryName} ${group.title || ''}`,
          });
        }
      });
    });
  });

  // 3. Category Items & Scorables
  const categoryItems: MethodItem[] = CATEGORIES.map((c) => ({
    id: c.id,
    label: c.title,
    auxiliaryData: {
      category: c.title,
      kind: 'category',
      group: '',
      href: `/c/${c.id}`,
      type: 'category',
    },
  }));

  const categoryScorables: ScorableMethod[] = CATEGORIES.map((c) => ({
    id: c.id,
    title: c.title,
    aka: [],
    whenToUse: `Category cheatsheet with topics & frameworks for ${c.title}`,
    rest: c.title,
  }));

  // Mirrors writtenMethodItems: one scorable per category a method renders under,
  // keyed with the same ids, so createMethodSource's byId lookup resolves each row.
  const writtenScorables: ScorableMethod[] = methods.flatMap((m) => {
    const base = toScorable(m);
    return [m.category, ...m.alsoIn].map((catId, i) => ({
      ...base,
      id: i === 0 ? m.id : `${m.id}::${catId}`,
    }));
  });

  const items: MethodItem[] = [...writtenMethodItems, ...taxonomyItems, ...categoryItems];
  const scorables: ScorableMethod[] = [
    ...writtenScorables,
    ...taxonomyScorables,
    ...categoryScorables,
  ];

  return (
    <html
      lang="en"
      data-astryx-theme={cheatsheetTheme.name}
      data-theme="light"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body>
        <Providers>
          <PaletteProvider items={items} scorables={scorables}>
            <AppFrame>{children}</AppFrame>
          </PaletteProvider>
        </Providers>
      </body>
    </html>
  );
}
