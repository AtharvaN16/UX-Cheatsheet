import Link from 'next/link';
import { getCategoryColor } from '@/lib/colors';

export function CategoryBanner({
  categoryId,
  title,
}: {
  categoryId: string;
  title: string;
}) {
  const color = getCategoryColor(categoryId);

  return (
    <div
      className="mb-10 relative flex min-h-[40vh] flex-col justify-between overflow-hidden rounded-3xl p-8 sm:p-12 shadow-2xl"
      style={{ backgroundColor: color.hex }}
    >
      {/* Top action bar */}
      <div className="relative z-10 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-[#101014]/80 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-transform hover:scale-105 hover:bg-[#101014]"
        >
          <span>←</span>
          <span>Back to All</span>
        </Link>
      </div>

      {/* Main banner title */}
      <div className="relative z-10 my-auto pt-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-7xl">
          {title}
        </h1>
      </div>
    </div>
  );
}
