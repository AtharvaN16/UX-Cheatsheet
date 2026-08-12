import Link from 'next/link';

export function TaxonomyCard({ title, href }: { title: string; href?: string }) {
  if (!href) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 px-4 py-3.5 text-secondary/50">
        <span className="text-sm">{title}</span>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="block rounded-lg border border-border bg-surface px-4 py-3.5 text-primary transition-colors hover:bg-card"
    >
      <span className="text-sm">{title}</span>
    </Link>
  );
}
