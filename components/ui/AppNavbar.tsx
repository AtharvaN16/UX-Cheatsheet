'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePaletteControls } from '@/components/ui/PaletteProvider';

const OTHER_ITEMS = ['Books', 'Courses', 'Checklists', 'Quotes'] as const;

export function AppNavbar() {
  const pathname = usePathname();
  const cheatsheetActive = pathname === '/' || pathname.startsWith('/m/');
  const { open } = usePaletteControls();

  return (
    <header className="w-full px-8 sm:px-12 lg:px-16 py-3.5 border-b border-[#E5E2D9] bg-[#FAF8F5]">
      <div className="w-full flex items-center justify-between gap-4">
        {/* Left: Brand Logo & Title */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="font-extrabold text-xl tracking-tight text-[#1A1A1A]">
            UX Cheatsheet
          </span>
        </Link>

        {/* Center: Mobbin-Style Rounded Pill Search Input Trigger */}
        <div className="flex-1 max-w-md mx-auto hidden md:block">
          <button
            type="button"
            onClick={open}
            className="w-full flex items-center justify-between rounded-full border border-[#E5E2D9] bg-[#F0EDE6] hover:bg-[#EAE6DD] px-4 py-2.5 text-sm text-[#737067] transition-colors shadow-2xs group focus:outline-none"
          >
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 text-[#8C887E] group-hover:text-[#1A1A1A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Search methods, categories...</span>
            </div>
            <kbd className="hidden sm:inline-block rounded-full bg-white border border-[#E5E2D9] px-2.5 py-0.5 text-xs font-semibold text-[#737067] shadow-2xs">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Repositioned Nav Items */}
        <nav className="flex items-center gap-5 shrink-0 text-sm font-medium">
          <Link
            href="/"
            className={`transition-colors ${
              cheatsheetActive
                ? 'font-bold text-[#1A1A1A]'
                : 'text-[#737067] hover:text-[#1A1A1A]'
            }`}
          >
            Cheatsheet
          </Link>
          {OTHER_ITEMS.map((label) => (
            <span key={label} className="text-[#737067]/70 cursor-default hidden lg:inline-block">
              {label}
            </span>
          ))}
          <button
            type="button"
            onClick={open}
            className="md:hidden p-2 text-[#1A1A1A]"
            aria-label="Open search"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </nav>
      </div>
    </header>
  );
}
