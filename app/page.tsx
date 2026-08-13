import { CategoryDashboardGrid } from '@/components/ui/CategoryDashboardGrid';

export default function IndexPage() {
  return (
    <div className="w-full min-h-screen pb-16">
      <div className="w-full px-8 sm:px-12 lg:px-16 pt-6 sm:pt-8">
        {/* Cheatsheets Page Header Title */}
        <div className="mb-8 sm:mb-10 pt-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-[#1A1A1A] sm:text-5xl lg:text-6xl">
            Cheatsheets
          </h1>
        </div>

        <CategoryDashboardGrid />
      </div>
    </div>
  );
}
