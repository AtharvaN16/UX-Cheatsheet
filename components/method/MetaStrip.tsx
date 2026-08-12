import type { Method } from '@/lib/content';

export function MetaStrip({ method }: { method: Method }) {
  const cells = [
    ['kind', method.kind],
    ['gives', method.gives],
    ['effort', method.effort],
    ['timeframe', method.timeframe],
  ] as const;

  return (
    <dl className="flex flex-wrap gap-x-8 gap-y-3 border-y border-border py-4">
      {cells.map(([label, value]) => (
        <div key={label}>
          <dt className="text-sm font-medium uppercase tracking-[0.08em] text-secondary">
            {label}
          </dt>
          <dd className="mt-1 text-sm text-primary">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
