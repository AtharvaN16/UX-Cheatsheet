import { notFound } from 'next/navigation';
import { getMethodsByCategory } from '@/lib/content';
import { CATEGORIES, getCategory } from '@/lib/categories';
import { getTaxonomyForCategory } from '@/lib/taxonomy';
import { MethodCard } from '@/components/ui/MethodCard';
import { TaxonomyCard } from '@/components/ui/TaxonomyCard';
import { CategoryBanner } from '@/components/ui/CategoryBanner';

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.id }));
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const meta = getCategory(category);
  if (!meta) notFound();

  const { primary, secondary } = getMethodsByCategory(category);
  const taxonomy = getTaxonomyForCategory(category);
  const writtenIds = new Set(primary.map((m) => m.id));

  return (
    <main className="w-full p-6">
      <CategoryBanner categoryId={category} title={meta.title} />

      {taxonomy ? (
        <div className="mt-10 space-y-10">
          {taxonomy.groups.map((group) => (
            <section key={group.title ?? category}>
              {group.title && (
                <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.08em] text-secondary">
                  {group.title}
                </h2>
              )}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {group.items.map((item) => (
                  <TaxonomyCard
                    key={item.id}
                    title={item.title}
                    href={writtenIds.has(item.id) ? `/m/${item.id}` : undefined}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="mt-10 space-y-3">
          {primary.map((m) => (
            <MethodCard key={m.id} method={m} />
          ))}
        </div>
      )}

      {secondary.length > 0 && (
        <div className="mt-10 space-y-3">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.08em] text-secondary">
            Also relevant here
          </h2>
          {secondary.map((m) => (
            <MethodCard key={m.id} method={m} isSecondary />
          ))}
        </div>
      )}
    </main>
  );
}
