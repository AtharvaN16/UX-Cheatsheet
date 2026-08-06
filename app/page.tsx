import Link from 'next/link';
import { getAllMethods } from '@/lib/content';
import { CATEGORIES } from '@/lib/categories';
import { Eyebrow } from '@/components/ui/Eyebrow';

export default function IndexPage() {
  const methods = getAllMethods();
  const countFor = (id: string) =>
    methods.filter((m) => m.category === id || m.alsoIn.includes(id)).length;

  return (
    <main className="mx-auto max-w-[68ch] px-6 py-16">
      <Eyebrow>UX Methods</Eyebrow>
      <h1 className="mt-3 text-4xl tracking-[-0.025em] text-primary">
        A working reference
      </h1>
      <p className="mt-3 text-secondary">
        Press <kbd className="font-mono text-sm text-primary">⌘K</kbd> to search by name, or by
        what you are trying to learn.
      </p>

      <ul className="mt-12 divide-y divide-border border-y border-border">
        {CATEGORIES.map((c) => (
          <li key={c.id}>
            <Link
              href={`/c/${c.id}`}
              className="flex items-baseline justify-between gap-4 py-4 transition-colors hover:text-primary"
            >
              <span className="font-mono text-xs text-secondary">{c.number}</span>
              <span className="flex-1 text-primary">{c.title}</span>
              <span className="font-mono text-xs text-secondary">{countFor(c.id)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
