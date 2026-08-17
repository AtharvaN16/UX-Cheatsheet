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
import { DOMAINS, getDomain } from '@/lib/domains';
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

  // 1. Written method search items — one entry per domain a method actually
  // renders under (its primary `domain` plus every `alsoIn`), so a search
  // result's label/href always matches the page the user found it on instead
  // of silently pointing back to the primary domain only.
  const writtenMethodItems: MethodItem[] = methods.flatMap((m) => {
    const domainsForSearch = [m.domain, ...m.alsoIn];
    return domainsForSearch.map((domainId, i) => {
      const domainMeta = getDomain(domainId);
      return {
        id: i === 0 ? m.id : `${m.id}::${domainId}`,
        label: m.title,
        auxiliaryData: {
          domain: domainMeta?.title || domainId,
          kind: m.kind || inferKind(m.title, domainId, m.id),
          group: '',
          href: `/c/${domainId}?item=${m.id}`,
        },
      };
    });
  });

  // 2. Index all ~310 taxonomy entries (Hick's Law, Fitts's Law, RICE, Kano, etc.)
  const taxonomyItems: MethodItem[] = [];
  const taxonomyScorables: ScorableMethod[] = [];

  TAXONOMY.forEach((domainTax) => {
    const domainMeta = getDomain(domainTax.domainId);
    const domainName = domainMeta?.title || domainTax.domainId;

    domainTax.groups.forEach((group) => {
      group.items.forEach((item) => {
        if (!writtenIds.has(item.id)) {
          const kind = inferKind(item.title, domainTax.domainId, item.id);
          const desc = get1Liner(item.id, item.title);

          taxonomyItems.push({
            id: item.id,
            label: item.title,
            auxiliaryData: {
              domain: domainName,
              kind,
              group: '',
              href: `/c/${domainTax.domainId}?item=${item.id}`,
            },
          });

          taxonomyScorables.push({
            id: item.id,
            title: item.title,
            aka: [],
            whenToUse: desc,
            rest: `${item.title} ${domainName} ${group.title || ''}`,
          });
        }
      });
    });
  });

  // 3. Domain Items & Scorables
  const domainItems: MethodItem[] = DOMAINS.map((d) => ({
    id: d.id,
    label: d.title,
    auxiliaryData: {
      domain: d.title,
      kind: 'category',
      group: '',
      href: `/c/${d.id}`,
      type: 'category',
    },
  }));

  const domainScorables: ScorableMethod[] = DOMAINS.map((d) => ({
    id: d.id,
    title: d.title,
    aka: [],
    whenToUse: `Category cheatsheet with topics & frameworks for ${d.title}`,
    rest: d.title,
  }));

  // Mirrors writtenMethodItems: one scorable per domain a method renders under,
  // keyed with the same ids, so createMethodSource's byId lookup resolves each row.
  const writtenScorables: ScorableMethod[] = methods.flatMap((m) => {
    const base = toScorable(m);
    return [m.domain, ...m.alsoIn].map((domainId, i) => ({
      ...base,
      id: i === 0 ? m.id : `${m.id}::${domainId}`,
    }));
  });

  const items: MethodItem[] = [...writtenMethodItems, ...taxonomyItems, ...domainItems];
  const scorables: ScorableMethod[] = [
    ...writtenScorables,
    ...taxonomyScorables,
    ...domainScorables,
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
