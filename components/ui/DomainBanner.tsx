'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { getDomainColor } from '@/lib/colors';
import { shouldSkipEntrance } from '@/lib/entranceGuard';
import { ENTRANCE, EASE_ARRIVE } from '@/lib/entranceChoreography';

/**
 * Beats 1 and 2 of the domain entrance (see lib/entranceChoreography.ts): the
 * banner scales up as a surface, then the title lands on it. Splitting the two
 * is the whole point — the title arriving *onto* an already-present surface
 * reads as depth, where animating them together would just be one moving block.
 */
export function DomainBanner({
  domainId,
  title,
}: {
  domainId: string;
  title: string;
}) {
  const color = getDomainColor(domainId);
  // See lib/entranceGuard.ts — Next.js remounts this on client navigation twice
  // in quick succession; without this the entrance would visibly replay.
  const [skipEntrance] = useState(() => shouldSkipEntrance(`banner:${domainId}`));

  return (
    <motion.div
      className="mb-10 relative flex min-h-[40vh] flex-col justify-between overflow-hidden rounded-3xl p-8 sm:p-12 transition-colors"
      style={{ backgroundColor: color.hex }}
      initial={skipEntrance ? false : { opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: ENTRANCE.banner.duration,
        delay: ENTRANCE.banner.delay,
        ease: EASE_ARRIVE,
      }}
    >
      {/* Top action bar */}
      <div className="relative z-10 flex items-center justify-between">
        <Link
          href="/"
          scroll={false}
          onClick={() => {
            try {
              sessionStorage.setItem('home_last_domain', domainId);
            } catch (e) {}
          }}
          className="inline-flex items-center gap-2 rounded-full bg-black/20 backdrop-blur-md border border-white/20 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-transform hover:scale-105 hover:bg-black/35"
        >
          <span>←</span>
          <span>Back to All</span>
        </Link>
      </div>

      {/* Main banner title */}
      <div className="relative z-10 my-auto pt-6">
        <motion.h1
          className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-7xl"
          initial={skipEntrance ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: ENTRANCE.title.duration,
            delay: ENTRANCE.title.delay,
            ease: EASE_ARRIVE,
          }}
        >
          {title}
        </motion.h1>
      </div>
    </motion.div>
  );
}
