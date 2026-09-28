import type { DomainCoverage } from '@/lib/coverage';

/**
 * Authoring progress, shown in development only.
 *
 * `process.env.NODE_ENV` is inlined by the bundler, so in a production build
 * this component's body is dead code behind a `false` branch and the badge
 * never reaches the deployed bundle. The production signal for an unwritten
 * entry is the faded card in the grid instead — a reader does not need a
 * ratio, only to see which cards have nothing behind them yet.
 */
export function CoverageBadge({
  coverage,
  label = 'written',
}: {
  coverage: Pick<DomainCoverage, 'written' | 'planned'>;
  label?: string;
}) {
  if (process.env.NODE_ENV !== 'development') return null;

  const { written, planned } = coverage;
  if (planned === 0) return null;

  const pct = Math.round((written / planned) * 100);
  const complete = written === planned;

  return (
    <div
      className="inline-flex items-center gap-2.5 rounded-full border border-dashed border-[#B8B3A6] bg-[#F0EDE6] px-3 py-1 text-xs text-[#5A5A5A]"
      title="Authoring progress — development only, not shown in production"
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${complete ? 'bg-emerald-600' : 'bg-orange-500'}`}
      />
      <span className="font-medium text-[#1A1A1A]">
        {written}/{planned}
      </span>
      <span>
        {label} · {pct}%
      </span>
      <span
        aria-hidden
        className="relative h-1 w-16 overflow-hidden rounded-full bg-[#DDD8CB]"
      >
        <span
          className={`absolute inset-y-0 left-0 rounded-full ${complete ? 'bg-emerald-600' : 'bg-orange-500'}`}
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  );
}
