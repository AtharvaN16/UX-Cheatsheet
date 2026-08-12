'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SideNav, SideNavItem, SideNavHeading } from '@astryxdesign/core/SideNav';
import { Badge } from '@astryxdesign/core/Badge';

const DISABLED_ITEMS = ['Books', 'Courses', 'Checklists', 'Quotes'] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const cheatsheetActive =
    pathname === '/' || pathname.startsWith('/c/') || pathname.startsWith('/m/');

  return (
    <SideNav header={<SideNavHeading heading="UX Cheatsheet" />}>
      <SideNavItem as={Link} href="/" label="Cheatsheet" isSelected={cheatsheetActive} />
      {DISABLED_ITEMS.map((label) => (
        <SideNavItem
          key={label}
          label={label}
          isDisabled
          endContent={<Badge label="Soon" variant="neutral" />}
        />
      ))}
    </SideNav>
  );
}
