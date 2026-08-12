import { getAllMethods } from '@/lib/content';
import { CATEGORIES } from '@/lib/categories';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Kbd } from '@astryxdesign/core/Kbd';
import { CategoryGroupList } from '@/components/ui/CategoryGroupList';

export default function IndexPage() {
  const methods = getAllMethods();
  const counts: Record<string, number> = {};
  for (const c of CATEGORIES) {
    counts[c.id] = methods.filter((m) => m.category === c.id || m.alsoIn.includes(c.id)).length;
  }

  return (
    <main className="mx-auto w-full max-w-[68ch] p-6">
      <Eyebrow>UX Methods</Eyebrow>
      <h1 className="mt-3 text-4xl tracking-[-0.025em] text-primary">
        A Cheatsheet
      </h1>
      <p className="mt-3 inline-flex flex-wrap items-center gap-1.5 text-secondary">
        Press <Kbd keys="mod+k" /> to search by name, or by
        what you are trying to learn.
      </p>

      <CategoryGroupList counts={counts} />
    </main>
  );
}
