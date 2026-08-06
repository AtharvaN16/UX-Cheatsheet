import { notFound } from 'next/navigation';
import { getMethodsByCategory } from '@/lib/content';
import { CATEGORIES, getCategory } from '@/lib/categories';
import { MethodCard } from '@/components/ui/MethodCard';
import { Eyebrow } from '@/components/ui/Eyebrow';

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

  return (
    <main className="mx-auto max-w-[68ch] px-6 py-16">
      <Eyebrow>{meta.number}</Eyebrow>
      <h1 className="mt-3 text-4xl tracking-[-0.025em] text-primary">{meta.title}</h1>
      <p className="mt-2 text-sm text-secondary">
        {primary.length} method{primary.length === 1 ? '' : 's'}
      </p>

      <div className="mt-10 space-y-3">
        {primary.map((m) => (
          <MethodCard key={m.id} method={m} />
        ))}
        {secondary.map((m) => (
          <MethodCard key={m.id} method={m} isSecondary />
        ))}
      </div>
    </main>
  );
}
