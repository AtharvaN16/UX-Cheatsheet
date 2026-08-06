import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getAllMethods, getMethod } from '@/lib/content';
import { MetaStrip } from '@/components/method/MetaStrip';
import { UseInsteadBlock } from '@/components/method/UseInsteadBlock';
import { SourceList } from '@/components/method/SourceList';
import { RelatedRail } from '@/components/method/RelatedRail';
import { Eyebrow } from '@/components/ui/Eyebrow';

export function generateStaticParams() {
  return getAllMethods().map((m) => ({ id: m.id }));
}

export default async function MethodPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const method = getMethod(id);
  if (!method) notFound();

  const titleOf = (mid: string) => getMethod(mid)?.title ?? mid;

  return (
    <main className="mx-auto max-w-[68ch] px-6 py-16">
      <Eyebrow>{method.category.replace(/-/g, ' ')}</Eyebrow>
      <h1 className="mt-3 text-4xl tracking-[-0.025em] text-primary">{method.title}</h1>
      {method.aka.length > 0 && (
        <p className="mt-2 text-sm text-secondary">also: {method.aka.join(', ')}</p>
      )}

      <div className="mt-8">
        <MetaStrip method={method} />
      </div>

      <article className="prose-cheatsheet mt-10">
        <MDXRemote source={method.body} />
      </article>

      <UseInsteadBlock entries={method.useInstead} titleOf={titleOf} />
      <RelatedRail related={method.related} titleOf={titleOf} />
      <SourceList sources={method.sources} />
    </main>
  );
}
