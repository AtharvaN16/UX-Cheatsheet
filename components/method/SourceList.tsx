import type { Method } from '@/lib/content';
import { Eyebrow } from '@/components/ui/Eyebrow';

export function SourceList({ sources }: { sources: Method['sources'] }) {
  return (
    <section className="mt-10">
      <Eyebrow>Further reading</Eyebrow>
      <ul className="mt-4 space-y-3">
        {sources.map((s) => (
          <li key={s.url} className="text-sm">
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline underline-offset-4"
            >
              {s.title}
            </a>
            <span className="text-secondary">
              {' '}
              — {s.author}
              {s.year ? `, ${s.year}` : ''}
              {s.seminal ? ' · seminal' : ''}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
