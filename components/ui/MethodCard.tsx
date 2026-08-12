import Link from 'next/link';
import type { Method } from '@/lib/content';

export function MethodCard({ method, isSecondary }: { method: Method; isSecondary?: boolean }) {
  return (
    <Link
      href={`/m/${method.id}`}
      className="block rounded-lg border border-border bg-surface p-5 transition-colors hover:bg-card"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-lg tracking-[-0.015em] text-primary">{method.title}</h3>
        <span className="text-sm font-medium uppercase tracking-[0.08em] text-secondary">
          {method.kind}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-secondary">{method.sections['What is it']}</p>
      {isSecondary && (
        <p className="mt-3 text-sm font-medium uppercase tracking-[0.08em] text-secondary">
          primary home: {method.category.replace(/-/g, ' ')}
        </p>
      )}
    </Link>
  );
}
