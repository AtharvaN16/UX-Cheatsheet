'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import type { Method } from '@/lib/content';
import { useMethodLookup, type MethodLookupEntry } from '@/components/ui/PaletteProvider';

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

/** Kind theme colors for chip pills & sheet top accent bar */
const KIND_THEME: Record<string, { bg: string; text: string; border: string; barHex: string }> = {
  method: {
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    barHex: '#3b82f6', // Blue for methods
  },
  framework: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    barHex: '#10b981', // Green for frameworks
  },
  concept: {
    bg: 'bg-orange-500/15',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
    barHex: '#f97316', // Orange for concepts
  },
};

function getKindTheme(kind?: string) {
  const normalized = (kind || 'concept').toLowerCase().trim();
  return KIND_THEME[normalized] || KIND_THEME.concept;
}

function getEffortColorClass(effort?: string) {
  const normalized = (effort || 'low').toLowerCase().trim();
  if (normalized === 'high') return 'text-red-500';
  if (normalized === 'medium') return 'text-orange-500';
  return 'text-green-500';
}

/** Parse inline markdown bold **text** and italic *text* */
function parseInlineMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIndex = 0;

  while (remaining.length > 0) {
    // Bold: **text** or __text__
    const boldMatch = remaining.match(/^(\*\*|__)(.*?)\1/);
    if (boldMatch) {
      parts.push(
        <strong key={keyIndex++} className="font-bold text-primary">
          {boldMatch[2]}
        </strong>
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic: *text* or _text_
    const italicMatch = remaining.match(/^(\*|_)(.*?)\1/);
    if (italicMatch) {
      parts.push(
        <em key={keyIndex++} className="italic text-primary font-medium">
          {italicMatch[2]}
        </em>
      );
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    const nextSpecial = remaining.search(/[\*_]/);
    if (nextSpecial === -1) {
      parts.push(remaining);
      break;
    } else if (nextSpecial > 0) {
      parts.push(remaining.slice(0, nextSpecial));
      remaining = remaining.slice(nextSpecial);
    } else {
      parts.push(remaining[0]);
      remaining = remaining.slice(1);
    }
  }

  return parts;
}

/** Render content cleanly converting markdown bullet points, subheadings, and inline bold/italic tags into formatted React elements */
export function FormattedText({
  content,
  className = '',
  style,
}: {
  content: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (!content) return null;

  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];
  let keyCounter = 0;

  const flushList = () => {
    if (currentList.length > 0) {
      blocks.push(
        <ul
          key={`list-${keyCounter++}`}
          style={style}
          className="list-disc list-outside space-y-3.5 my-4 ml-6 text-secondary"
        >
          {currentList}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    const h3Match = trimmed.match(/^(###|####)\s*(.*)/);
    const isSubLabel =
      trimmed === 'Where it helps' ||
      trimmed === 'Where it fails' ||
      trimmed === '**Where it helps**' ||
      trimmed === '**Where it fails**' ||
      trimmed === 'Where it helps:' ||
      trimmed === 'Where it fails:';

    if (h3Match || isSubLabel) {
      flushList();
      const textVal = h3Match
        ? h3Match[2]
        : trimmed.replace(/\*\*/g, '').replace(/:$/, '');

      blocks.push(
        <h3
          key={`h3-${keyCounter++}`}
          className="text-xl sm:text-2xl font-semibold text-primary mt-8 mb-4 tracking-tight"
        >
          {parseInlineMarkdown(textVal)}
        </h3>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const listContent = trimmed.slice(2);
      currentList.push(
        <li key={`item-${keyCounter++}`} style={style} className="leading-relaxed pl-1">
          {parseInlineMarkdown(listContent)}
        </li>
      );
    } else {
      flushList();
      if (trimmed.length > 0) {
        blocks.push(
          <p key={`p-${keyCounter++}`} style={style} className="my-3 leading-relaxed">
            {parseInlineMarkdown(trimmed)}
          </p>
        );
      }
    }
  });

  flushList();

  return (
    <div className={className} style={style}>
      {blocks}
    </div>
  );
}

function TipsContent({ content }: { content: string }) {
  if (!content) return null;

  return (
    <div className="mt-8 pt-6 border-t border-border/40">
      <div className="flex items-center gap-2 mb-2 text-amber-600 dark:text-amber-400 font-semibold text-base">
        {/* Phosphor Lightbulb Stroke Icon */}
        <svg
          className="w-5 h-5 shrink-0"
          viewBox="0 0 256 256"
          fill="currentColor"
        >
          <path d="M128,24A80.09,80.09,0,0,0,48,104a79.6,79.6,0,0,0,24.64,57.77,7.86,7.86,0,0,1,2.36,5.65V184a16,16,0,0,0,16,16h76a16,16,0,0,0,16-16V167.42a7.86,7.86,0,0,1,2.36-5.65A79.6,79.6,0,0,0,208,104,80.09,80.09,0,0,0,128,24Zm32,160H96V168h64Zm8,32H88a8,8,0,0,1,0-16h80a8,8,0,0,1,0,16ZM128,40a64.07,64.07,0,0,1,64,64,63.66,63.66,0,0,1-19.72,46.22,23.83,23.83,0,0,0-7.14,17.15V176H90.86v-8.63a23.83,23.83,0,0,0-7.14-17.15A63.66,63.66,0,0,1,64,104,64.07,64.07,0,0,1,128,40Z" />
        </svg>
        <span className="tracking-wide">Pro Tip</span>
      </div>
      <FormattedText
        content={content}
        style={{ fontSize: '16px', fontWeight: 400, lineHeight: '1.6' }}
        className="text-secondary"
      />
    </div>
  );
}

/** Collapsible dropdown component for section content like "How to do it" */
function CollapsibleSection({
  title,
  content,
  tipsContent,
}: {
  title: string;
  content: string;
  tipsContent?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 sm:p-7 text-left focus:outline-none hover:bg-surface/50 transition-colors"
      >
        <h2
          style={{ fontSize: '28px', fontWeight: 600, lineHeight: '1.3' }}
          className="text-primary tracking-tight"
        >
          {title}
        </h2>
        <span
          className={`transform transition-transform duration-250 text-secondary p-2 rounded-full border border-border/40 bg-surface ${
            isOpen ? 'rotate-180' : ''
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden border-t border-border/40"
          >
            <div className="p-6 sm:p-7 pt-4 space-y-4">
              <FormattedText
                content={content}
                style={{ fontSize: '20px', fontWeight: 400, lineHeight: '1.6' }}
                className="text-secondary"
              />
              {tipsContent && <TipsContent content={tipsContent} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const SECTION_HEADING_STYLE: React.CSSProperties = { fontSize: '28px', fontWeight: 600, lineHeight: '1.3' };
const SECTION_BODY_STYLE: React.CSSProperties = { fontSize: '20px', fontWeight: 400, lineHeight: '1.6' };
const FURTHER_READING_STYLE: React.CSSProperties = { fontSize: '16px', fontWeight: 400, lineHeight: '1.6' };
const SECTION_EMPTY_STYLE: React.CSSProperties = { fontSize: '18px' };

/** Gray, rectangular-rounded (not pill-rounded) tag used for related/alternative method links */
const TAG_LINK_CLASS =
  'inline-flex items-center rounded-lg bg-border/40 px-3 py-1.5 font-semibold text-primary hover:bg-border/60 transition-colors';
const TAG_STATIC_CLASS =
  'inline-flex items-center rounded-lg bg-border/40 px-3 py-1.5 font-semibold text-secondary';

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={SECTION_HEADING_STYLE} className="text-primary tracking-tight">
      {children}
    </h2>
  );
}

function SectionEmptyState() {
  return (
    <p style={SECTION_EMPTY_STYLE} className="text-secondary">
      Content queued for the next release.
    </p>
  );
}

function WhenNotToUseSection({
  entries,
  lookup,
}: {
  entries?: Method['useInstead'];
  lookup: Map<string, MethodLookupEntry>;
}) {
  return (
    <div className="space-y-4">
      <SectionHeading>When Not to Use</SectionHeading>
      {entries && entries.length > 0 ? (
        <ul className="space-y-4">
          {entries.map((e) => {
            const target = lookup.get(e.method);
            return (
              <li key={`${e.when}-${e.method}`} className="space-y-2">
                <p style={SECTION_BODY_STYLE} className="text-secondary">
                  {e.when}
                </p>
                {target?.href ? (
                  <Link href={target.href} style={SECTION_BODY_STYLE} className={TAG_LINK_CLASS}>
                    {target.title}
                  </Link>
                ) : (
                  <span style={SECTION_BODY_STYLE} className={TAG_STATIC_CLASS}>
                    {target?.title ?? e.method}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <SectionEmptyState />
      )}
    </div>
  );
}

function RelatedTopicsSection({
  related,
  lookup,
}: {
  related?: Method['related'];
  lookup: Map<string, MethodLookupEntry>;
}) {
  const ids = related ? [...related.before, ...related.after, ...related.alongside] : [];

  return (
    <div className="space-y-4">
      <SectionHeading>Related Topics</SectionHeading>
      {ids.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          {ids.map((id) => {
            const target = lookup.get(id);
            return target?.href ? (
              <Link key={id} href={target.href} style={SECTION_BODY_STYLE} className={TAG_LINK_CLASS}>
                {target.title}
              </Link>
            ) : (
              <span key={id} style={SECTION_BODY_STYLE} className={TAG_STATIC_CLASS}>
                {target?.title ?? id}
              </span>
            );
          })}
        </div>
      ) : (
        <SectionEmptyState />
      )}
    </div>
  );
}

function FurtherReadingSection({ sources }: { sources?: Method['sources'] }) {
  return (
    <div className="space-y-4">
      <SectionHeading>Further Reading</SectionHeading>
      {sources && sources.length > 0 ? (
        <ul className="space-y-4">
          {sources.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                style={FURTHER_READING_STYLE}
                className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
              >
                {s.title}
              </a>
              <span style={FURTHER_READING_STYLE} className="text-secondary">
                {' '}
                — {s.author}
                {s.year ? `, ${s.year}` : ''}
                {s.seminal ? ' · seminal' : ''}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <SectionEmptyState />
      )}
    </div>
  );
}

export function ConceptSheetModal({ item, onClose }: ConceptSheetModalProps) {
  const lookup = useMethodLookup();

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

  const kindVal = item?.kind || item?.method?.kind;
  const effortVal = item?.method?.effort || 'low';
  const isMethod = (kindVal || '').toLowerCase().trim() === 'method';
  const kindTheme = getKindTheme(kindVal);
  const effortColorClass = getEffortColorClass(effortVal);

  const tipsSection = item?.method
    ? Object.entries(item.method.sections).find(([t]) => t.toLowerCase().trim() === 'tips')
    : undefined;
  const tipsContent = tipsSection ? tipsSection[1] : undefined;

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

          {/* Bottom Sheet Container (Strictly 0px rounded corners) */}
          <motion.div
            key="sheet-modal"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={SHEET_TRANSITION}
            style={{ borderRadius: 0 }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex h-[94vh] max-w-6xl flex-col bg-surface overflow-hidden"
          >
            {/* Kind Color Top Bar (100% flush at top, 10px thick) */}
            <div className="w-full h-2.5 shrink-0" style={{ backgroundColor: kindTheme.barHex }} />

            {/* Header: Top Row (Effort Pill + ESC Button), Main Title below */}
            <div className="flex flex-col gap-4 px-8 sm:px-14 pt-8 pb-4 bg-surface">
              {/* Top Row: Effort Pill on left (only for methods), ESC button on right */}
              <div className="flex items-center justify-between gap-4">
                {isMethod ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-base text-primary">
                    <span className="text-secondary font-normal">Effort:</span>
                    <span className="font-semibold capitalize text-primary">{effortVal}</span>
                    <svg
                      className={`w-5 h-5 shrink-0 ${effortColorClass}`}
                      viewBox="0 0 256 256"
                      fill="currentColor"
                    >
                      <path d="M224,200h-8V40a8,8,0,0,0-8-8H152a8,8,0,0,0-8,8V80H96a8,8,0,0,0-8,8v40H48a8,8,0,0,0-8,8v64H32a8,8,0,0,0,0,16H224a8,8,0,0,0,0-16ZM160,48h40V200H160ZM104,96h40V200H104ZM56,144H88v56H56Z" />
                    </svg>
                  </div>
                ) : (
                  <div />
                )}

                {/* ESC Close Button (No Drop Shadow) */}
                <button
                  onClick={onClose}
                  className="inline-flex items-center justify-center rounded-full bg-card border border-border px-4 py-2 text-sm font-bold text-secondary hover:text-primary hover:bg-border/40 transition-transform active:scale-95"
                  aria-label="Close sheet (Press Esc)"
                >
                  <span>ESC</span>
                </button>
              </div>

              {/* Title Row */}
              <h1 className="text-4xl sm:text-6xl font-extrabold text-primary tracking-tight">
                {item.title}
              </h1>
            </div>

            {/* Scrollable Content Body (Flat Laws of UX Layout) */}
            <div className="flex-1 overflow-y-auto px-8 sm:px-14 pt-2 pb-10 space-y-16 bg-surface">
              {/* Overview Paragraph: Strictly 28-30px Semibold Lead */}
              <div className="pb-8 border-b border-border/40">
                <FormattedText
                  content={item.description}
                  style={{ fontSize: '30px', fontWeight: 600, lineHeight: '1.4' }}
                  className="text-primary tracking-tight"
                />
              </div>



              {/* If written method details exist, render flat editorial sections */}
              {item.method ? (
                <div className="space-y-10">
                  {/* Editorial Sections: Filter out redundant "What is it" and "Tips", make "How to do it" (methods) / "How to use" (frameworks) a collapsible dropdown */}
                  {Object.entries(item.method.sections)
                    .filter(
                      ([title]) =>
                        title.toLowerCase().trim() !== 'what is it' &&
                        title.toLowerCase().trim() !== 'tips'
                    )
                    .map(([sectionTitle, sectionContent]) => {
                      const normalizedTitle = sectionTitle.toLowerCase().trim();
                      const isCollapsible = normalizedTitle === 'how to do it' || normalizedTitle === 'how to use';

                      if (isCollapsible) {
                        return (
                          <CollapsibleSection
                            key={sectionTitle}
                            title={sectionTitle}
                            content={sectionContent}
                            tipsContent={tipsContent}
                          />
                        );
                      }

                      return (
                        <div key={sectionTitle} className="space-y-4 pt-2">
                          <h2
                            style={{ fontSize: '28px', fontWeight: 600, lineHeight: '1.3' }}
                            className="text-primary tracking-tight"
                          >
                            {sectionTitle}
                          </h2>
                          <FormattedText
                            content={sectionContent}
                            style={{ fontSize: '20px', fontWeight: 400, lineHeight: '1.6' }}
                            className="text-secondary"
                          />
                        </div>
                      );
                    })}
                </div>
              ) : (
                /* Unwritten item preview block */
                <div className="space-y-8 pt-4">
                  <div className="space-y-4">
                    <h2
                      style={{ fontSize: '28px', fontWeight: 600, lineHeight: '1.3' }}
                      className="text-primary tracking-tight"
                    >
                      Key Method Principles
                    </h2>
                    <ul
                      style={{ fontSize: '20px', fontWeight: 400, lineHeight: '1.6' }}
                      className="list-disc list-inside space-y-3 text-secondary"
                    >
                      <li>Core principle in {item.topicTitle.toLowerCase()} workflows.</li>
                      <li>Streamlines user experience evaluation and decision making.</li>
                      <li>Widely applied during UX research, design reviews, and optimization.</li>
                    </ul>
                  </div>

                  <div
                    style={{ fontSize: '20px' }}
                    className="pt-8 border-t border-border/40 text-secondary"
                  >
                    Full detailed cheatsheet entry for <span className="font-semibold text-primary">{item.title}</span> is queued for the next content release batch.
                  </div>
                </div>
              )}

              {/* When Not to Use / Related Topics / Further Reading — real data for written methods, queued placeholder otherwise */}
              <WhenNotToUseSection entries={item.method?.useInstead} lookup={lookup} />
              <RelatedTopicsSection related={item.method?.related} lookup={lookup} />
              <FurtherReadingSection sources={item.method?.sources} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
