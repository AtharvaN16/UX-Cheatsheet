'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TopNav, TopNavItem, TopNavHeading } from '@astryxdesign/core/TopNav';

const OTHER_ITEMS = ['Books', 'Courses', 'Checklists', 'Quotes'] as const;

export function AppNavbar() {
  const pathname = usePathname();
  const cheatsheetActive = pathname === '/' || pathname.startsWith('/m/');

  return (
    <div className="w-full px-8 sm:px-12 lg:px-16">
      <TopNav heading={<TopNavHeading heading="UX Cheatsheet" />} label="Main navigation">
        <TopNavItem as={Link} href="/" label="Cheatsheet" isSelected={cheatsheetActive} />
        {OTHER_ITEMS.map((label) => (
          <TopNavItem key={label} label={label} as="span" className="cursor-default" />
        ))}
      </TopNav>
    </div>
  );
}
