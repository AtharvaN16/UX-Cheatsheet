import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getMethodsByDomain } from '@/lib/content';
import { DOMAINS, getDomain } from '@/lib/domains';
import { getTaxonomyForDomain } from '@/lib/taxonomy';
import { DomainTopicGrid } from '@/components/ui/DomainTopicGrid';

export function generateStaticParams() {
  return DOMAINS.map((d) => ({ category: d.id }));
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const meta = getDomain(category);
  if (!meta) notFound();

  const { primary, secondary } = getMethodsByDomain(category);
  const taxonomy = getTaxonomyForDomain(category);
  const groups = taxonomy?.groups ? [...taxonomy.groups] : [];

  return (
    <div className="w-full min-h-screen pb-16">
      <div className="w-full px-[32px] pt-6">
        <Suspense fallback={null}>
          <DomainTopicGrid
            domainId={category}
            domainTitle={meta.title}
            groups={groups}
            methods={primary}
            secondaryMethods={secondary}
          />
        </Suspense>
      </div>
    </div>
  );
}
