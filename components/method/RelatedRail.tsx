import Link from 'next/link';
import type { Method } from '@/lib/content';
import { Eyebrow } from '@/components/ui/Eyebrow';

export function RelatedRail({
  related,
  titleOf,
}: {
  related: Method['related'];
  titleOf: (id: string) => string;
}) {
  const groups: Array<[string, string[]]> = [
    ['Before', related.before],
    ['After', related.after],
    ['Alongside', related.alongside],
  ];
  const populated = groups.filter(([, ids]) => ids.length > 0);
  if (populated.length === 0) return null;

  return (
    <section className="mt-10">
      <Eyebrow>Related methods</Eyebrow>
      <div className="mt-4 space-y-3">
        {populated.map(([label, ids]) => (
          <div key={label} className="flex flex-wrap items-baseline gap-x-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-secondary">
              {label}
            </span>
            {ids.map((id) => (
              <Link key={id} href={`/m/${id}`} className="text-sm text-primary underline underline-offset-4">
                {titleOf(id)}
              </Link>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
