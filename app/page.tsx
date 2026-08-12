import { Eyebrow } from '@/components/ui/Eyebrow';
import { Kbd } from '@astryxdesign/core/Kbd';
import { CategoryDashboardGrid } from '@/components/ui/CategoryDashboardGrid';

export default function IndexPage() {
  return (
    <div className="mx-auto w-full max-w-7xl p-6">
      <Eyebrow>UX Methods</Eyebrow>
      <h1 className="mt-3 text-4xl tracking-[-0.025em] text-primary">
        A Cheatsheet
      </h1>
      <p className="mt-3 inline-flex flex-wrap items-center gap-1.5 text-secondary">
        Press <Kbd keys="mod+k" /> to search by name, or by
        what you are trying to learn.
      </p>

      <CategoryDashboardGrid />
    </div>
  );
}
