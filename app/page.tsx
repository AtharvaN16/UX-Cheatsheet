import { DomainDashboardGrid } from '@/components/ui/DomainDashboardGrid';
import { getAllMethods } from '@/lib/content';

export default function IndexPage() {
  const allMethods = getAllMethods();

  return (
    <div className="w-full min-h-screen pb-16">
      <div className="w-full px-8 sm:px-12 lg:px-16 pt-6 sm:pt-8">
        {/* Cheatsheets Page Header Title */}
        <div className="mb-8 sm:mb-10 pt-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-[#1A1A1A] sm:text-5xl lg:text-6xl">
            Cheatsheets
          </h1>
        </div>

        <DomainDashboardGrid allMethods={allMethods} />
      </div>
    </div>
  );
}
