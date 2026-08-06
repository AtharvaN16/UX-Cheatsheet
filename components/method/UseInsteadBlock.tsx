import Link from 'next/link';
import type { Method } from '@/lib/content';
import { Eyebrow } from '@/components/ui/Eyebrow';

export function UseInsteadBlock({
  entries,
  titleOf,
}: {
  entries: Method['useInstead'];
  titleOf: (id: string) => string;
}) {
  return (
    <section className="mt-10 rounded-lg bg-surface p-6">
      <Eyebrow>When not to use</Eyebrow>
      <ul className="mt-4 space-y-4">
        {entries.map((e) => (
          <li key={`${e.when}-${e.method}`}>
            <p className="text-primary">{e.when}</p>
            <Link
              href={`/m/${e.method}`}
              className="mt-1 inline-block font-mono text-sm text-secondary underline underline-offset-4 hover:text-primary"
            >
              → {titleOf(e.method)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
