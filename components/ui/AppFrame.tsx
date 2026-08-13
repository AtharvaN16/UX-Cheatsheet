'use client';

import { usePathname } from 'next/navigation';
import { AppShellFrame } from '@/components/ui/AppShellFrame';
import { AppNavbar } from '@/components/ui/AppNavbar';

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNavbar = !pathname.startsWith('/c/');

  return (
    <AppShellFrame topNav={showNavbar ? <AppNavbar /> : undefined} mobileNav={{ breakpoint: 'md' }}>
      {children}
    </AppShellFrame>
  );
}
