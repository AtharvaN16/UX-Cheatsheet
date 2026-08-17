'use client';

import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { AppShellFrame } from '@/components/ui/AppShellFrame';
import { AppNavbar } from '@/components/ui/AppNavbar';

const PAGE_FADE_SECONDS = 1;

/**
 * Whole-page entrance fade on route change: the outgoing page is removed
 * immediately and the incoming one fades up from fully transparent, so the
 * only thing the eye ever tracks is blank -> page.
 *
 * Deliberately NOT an AnimatePresence exit/enter pair. An exit animation makes
 * the *outgoing* page dissolve on screen first, which reads as "page, fade,
 * page again" — the viewer watches the page they're leaving melt away, sits
 * through a blank gap, then watches a page arrive. Dropping the exit means the
 * old page is simply gone on the same frame the new one mounts.
 *
 * `key={pathname}` is what forces that swap: navigating between two domains
 * reuses the same [category] route template, so without it React would reuse
 * the instance and the incoming page would never replay its entrance at all.
 */
export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNavbar = !pathname.startsWith('/c/');

  return (
    <AppShellFrame topNav={showNavbar ? <AppNavbar /> : undefined} mobileNav={{ breakpoint: 'md' }}>
      <motion.div
        key={pathname}
        data-page-fade={pathname}
        className="w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: PAGE_FADE_SECONDS, ease: [0.4, 0, 0.2, 1] }}
      >
        {children}
      </motion.div>
    </AppShellFrame>
  );
}
