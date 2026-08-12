import { notFound } from 'next/navigation';
import { getMethodsByCategory } from '@/lib/content';
import { CATEGORIES, getCategory } from '@/lib/categories';
import { getTaxonomyForCategory } from '@/lib/taxonomy';
import { CategoryBanner } from '@/components/ui/CategoryBanner';
import { CategoryTopicGrid } from '@/components/ui/CategoryTopicGrid';

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
  const groups = taxonomy?.groups ? [...taxonomy.groups] : [];

  return (
    <div className="w-full min-h-screen pb-16">
      <div className="w-full px-[32px] pt-6">
        <CategoryTopicGrid
          categoryId={category}
          categoryTitle={meta.title}
          groups={groups}
          methods={primary}
          secondaryMethods={secondary}
        />
      </div>
    </div>
  );
}

