import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getAllMethods, getMethod } from '@/lib/content';
import { MetaStrip } from '@/components/method/MetaStrip';
import { UseInsteadBlock } from '@/components/method/UseInsteadBlock';
import { SourceList } from '@/components/method/SourceList';
import { RelatedRail } from '@/components/method/RelatedRail';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Reveal } from '@/components/ui/Reveal';
import { BackButton } from '@/components/ui/BackButton';

export function generateStaticParams() {
  return getAllMethods().map((m) => ({ id: m.id }));
}

export default async function MethodPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const method = getMethod(id);
  if (!method) notFound();

  const titleOf = (mid: string) => getMethod(mid)?.title ?? mid;

  return (
    <div className="mx-auto w-full max-w-[68ch] p-6">
      <BackButton href="/" label="Back to Cheatsheet" />
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

      <Reveal><UseInsteadBlock entries={method.useInstead} titleOf={titleOf} /></Reveal>
      <Reveal><RelatedRail related={method.related} titleOf={titleOf} /></Reveal>
      <Reveal><SourceList sources={method.sources} /></Reveal>
    </div>
  );
}
