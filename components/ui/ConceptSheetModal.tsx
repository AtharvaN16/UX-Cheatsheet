'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import type { Method } from '@/lib/content';

export interface ConceptSheetItem {
  id: string;
  title: string;
  topicTitle: string;
  description: string;
  isWritten: boolean;
  kind?: string;
  method?: Method;
}

interface ConceptSheetModalProps {
  item: ConceptSheetItem | null;
  onClose: () => void;
}

/** Shared transition curve so background scale down & sheet slide up stop in 100% synchrony */
export const SHEET_TRANSITION = {
  duration: 0.38,
  ease: [0.32, 0.72, 0, 1],
} as const;

export function ConceptSheetModal({ item, onClose }: ConceptSheetModalProps) {
  // Lock body scroll and listen for Escape key
  useEffect(() => {
    if (!item) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [item, onClose]);

  return (
    <AnimatePresence>
      {item && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            key="sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={SHEET_TRANSITION}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 cursor-pointer"
          />

          {/* Bottom Sheet Container */}
          <motion.div
            key="sheet-modal"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={SHEET_TRANSITION}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex h-[94vh] max-w-6xl flex-col rounded-t-[32px] border-t border-border bg-surface shadow-2xl overflow-hidden"
          >
            {/* Sheet Handle */}
            <div className="flex justify-center pt-3.5 pb-1 bg-surface">
              <div className="h-1.5 w-14 rounded-full bg-border" />
            </div>

            {/* Header: Clean Title & Close (No eyebrows or labels) */}
            <div className="flex items-center justify-between px-8 sm:px-14 py-8 border-b border-border/40 bg-surface">
              <h1 className="text-4xl sm:text-6xl font-extrabold text-primary tracking-tight">
                {item.title}
              </h1>

              <button
                onClick={onClose}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-card border border-border text-secondary hover:text-primary hover:bg-border/40 transition-transform active:scale-95 text-2xl font-bold"
                aria-label="Close sheet"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content Body (Flat Laws of UX Layout: Big text, big overview, no boxes within boxes) */}
            <div className="flex-1 overflow-y-auto px-8 sm:px-14 py-10 space-y-10 bg-surface">
              {/* Big Overview Paragraph */}
              <p className="text-2xl sm:text-3xl text-primary font-medium leading-relaxed tracking-tight pb-8 border-b border-border/40">
                {item.description}
              </p>

              {/* If written method details exist, render flat editorial sections */}
              {item.method ? (
                <div className="space-y-10">
                  {/* Inline Metadata Row (No cards or border boxes) */}
                  <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-lg font-semibold text-secondary pb-6 border-b border-border/40">
                    <div>
                      <span className="text-secondary/70 font-normal">Kind: </span>
                      <span className="text-primary capitalize">{item.method.kind}</span>
                    </div>
                    <div>
                      <span className="text-secondary/70 font-normal">Gives: </span>
                      <span className="text-primary capitalize">{item.method.gives}</span>
                    </div>
                    <div>
                      <span className="text-secondary/70 font-normal">Effort: </span>
                      <span className="text-primary capitalize">{item.method.effort}</span>
                    </div>
                    <div>
                      <span className="text-secondary/70 font-normal">Timeframe: </span>
                      <span className="text-primary capitalize">{item.method.timeframe}</span>
                    </div>
                  </div>

                  {/* Editorial Sections (No card boxes around sections) */}
                  {Object.entries(item.method.sections).map(([sectionTitle, sectionContent]) => (
                    <div key={sectionTitle} className="space-y-4 pt-2">
                      <h2 className="text-2xl sm:text-4xl font-bold text-primary tracking-tight">
                        {sectionTitle}
                      </h2>
                      <div className="text-lg sm:text-2xl leading-relaxed text-secondary whitespace-pre-line">
                        {sectionContent}
                      </div>
                    </div>
                  ))}

                  {/* Bottom Action Link */}
                  <div className="pt-8 flex justify-start border-t border-border/40">
                    <Link
                      href={`/m/${item.id}`}
                      className="inline-flex items-center gap-3 text-lg font-bold text-primary hover:underline"
                    >
                      <span>View Full Standalone Method Page</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              ) : (
                /* Unwritten item preview block */
                <div className="space-y-8 pt-4">
                  <div className="space-y-4">
                    <h2 className="text-2xl sm:text-4xl font-bold text-primary tracking-tight">
                      Key Method Principles
                    </h2>
                    <ul className="list-disc list-inside space-y-3 text-lg sm:text-2xl leading-relaxed text-secondary">
                      <li>Core principle in {item.topicTitle.toLowerCase()} workflows.</li>
                      <li>Streamlines user experience evaluation and decision making.</li>
                      <li>Widely applied during UX research, design reviews, and optimization.</li>
                    </ul>
                  </div>

                  <div className="pt-8 border-t border-border/40 text-lg sm:text-xl text-secondary">
                    Full detailed cheatsheet entry for <span className="font-semibold text-primary">{item.title}</span> is queued for the next content release batch.
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
