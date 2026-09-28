'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TAXONOMY } from '@/lib/taxonomy';
import { DOMAINS } from '@/lib/domains';
import { inferKind } from '@/lib/inferKind';
import { toId } from '@/lib/authoring/taxonomyEdit';
import { IS_DEV, useAuthoring } from './AuthoringProvider';

const KINDS = [
  { key: 'concept', label: 'Concept', hint: 'an idea you understand' },
  { key: 'framework', label: 'Framework', hint: 'a structure you fill in' },
  { key: 'method', label: 'Method', hint: 'an activity you perform' },
] as const;

type Step = 'title' | 'kind' | 'group';

interface GroupRow {
  domainId: string;
  domainTitle: string;
  groupTitle: string | null;
  count: number;
  /** First row of its domain, so the render knows where to draw the heading. */
  startsDomain: boolean;
}

/**
 * Adds a taxonomy stub, never an .mdx file: an .mdx without two sources and a
 * useInstead rule fails `bun run validate` and breaks the build. The stub
 * renders immediately as an unwritten card, exactly like the 188 that already
 * exist, and Claude Code writes the real content later.
 *
 * Flow is name -> kind -> group, so the title is known before the kind step and
 * `inferKind` can pre-select its guess.
 *
 * The step is explicit state rather than inferred from `kind === null`, because
 * the kind shortcuts are digits and real titles contain digits ("2x2
 * Prioritization Matrix", "Legal Landscape (ADA / EN 301 549)"). Only the
 * 'kind' step may claim 1/2/3; on the 'title' step they are just characters.
 */
export function AddCardPalette() {
  const { isAddOpen, setAddOpen } = useAuthoring();
  const router = useRouter();
  const params = useParams<{ category?: string }>();

  const [step, setStep] = useState<Step>('title');
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<string | null>(null);
  const [cursor, setCursor] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const existing = useMemo(
    () => new Set(TAXONOMY.flatMap((d) => d.groups.flatMap((g) => g.items.map((i) => i.id)))),
    [],
  );

  const currentDomain = params?.category ?? DOMAINS[0].id;

  /**
   * The domain being viewed comes first and its first group is where the cursor
   * starts: on domain 18 of 20 the relevant groups are otherwise buried under a
   * screenful of unrelated ones.
   */
  const groupRows = useMemo(() => {
    const ordered = [
      ...DOMAINS.filter((d) => d.id === currentDomain),
      ...DOMAINS.filter((d) => d.id !== currentDomain),
    ];
    const rows: GroupRow[] = [];
    for (const d of ordered) {
      const groups = TAXONOMY.find((t) => t.domainId === d.id)?.groups ?? [];
      groups.forEach((g, i) =>
        rows.push({
          domainId: d.id,
          domainTitle: d.title,
          groupTitle: g.title,
          count: g.items.length,
          startsDomain: i === 0,
        }),
      );
    }
    return rows;
  }, [currentDomain]);

  // Keep the highlighted row inside the 360px scroll window as the cursor moves.
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [step, cursor]);

  if (!IS_DEV || !isAddOpen) return null;

  const id = toId(title);
  const collision = id !== '' && existing.has(id);
  const usable = id !== '' && !collision;
  const guess = title ? inferKind(title, currentDomain, id) : 'method';
  const guessIndex = Math.max(
    0,
    KINDS.findIndex((k) => k.key === guess),
  );

  const close = () => {
    setAddOpen(false);
    setStep('title');
    setTitle('');
    setKind(null);
    setCursor(0);
    setErrors([]);
    setBusy(false);
  };

  const create = async (domainId: string, groupTitle: string | null) => {
    if (busy) return;
    setBusy(true);
    const res = await fetch('/api/authoring/card', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title, kind: kind ?? guess, domainId, groupTitle }),
    });
    if (res.ok) {
      close();
      router.refresh();
    } else {
      setErrors(((await res.json()) as { errors?: string[] }).errors ?? ['could not create card']);
      setBusy(false);
    }
  };

  const toKindStep = () => {
    if (!usable) return;
    setErrors([]);
    setStep('kind');
    setCursor(guessIndex);
  };

  const pickKind = (key: string) => {
    if (!usable) return;
    setErrors([]);
    setKind(key);
    setStep('group');
    setCursor(0);
  };

  const move = (delta: number, length: number) =>
    setCursor((c) => Math.min(length - 1, Math.max(0, c + delta)));

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Both ConceptSheetModal and DomainTopicGrid listen for Escape on window;
      // without this the palette closes, the sheet under it closes, and
      // DomainTopicGrid calls router.back(), losing the typed title too.
      e.preventDefault();
      e.stopPropagation();
      close();
      return;
    }

    if (step === 'title') {
      if (e.key === 'Enter') {
        e.preventDefault();
        toKindStep();
      }
      return;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      setErrors([]);
      if (step === 'kind') {
        setStep('title');
      } else {
        setKind(null);
        setStep('kind');
        setCursor(guessIndex);
      }
      return;
    }

    const length = step === 'kind' ? KINDS.length : groupRows.length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      move(1, length);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      move(-1, length);
      return;
    }

    if (step === 'kind') {
      if (['1', '2', '3'].includes(e.key)) {
        e.preventDefault();
        pickKind(KINDS[Number(e.key) - 1].key);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        pickKind(KINDS[cursor].key);
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const row = groupRows[cursor];
      if (row) void create(row.domainId, row.groupTitle);
    }
  };

  const hints =
    step === 'title'
      ? ['↵ — pick kind', 'Esc — cancel']
      : step === 'kind'
        ? ['1 2 3 / ↑↓ — kind', '↵ — pick group', '⌫ — rename', 'Esc — cancel']
        : ['↑↓ — group', '↵ — create', '⌫ — back', 'Esc — cancel'];

  const highlight = (active: boolean) =>
    active ? 'bg-[#F0EDE4] shadow-[inset_2px_0_0_#2E8A75]' : '';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add a card"
      data-authoring
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 pt-[12vh]"
      onClick={close}
    >
      <div
        className="w-full max-w-[560px] overflow-hidden rounded-[14px] border border-[#DCD7CC] bg-[#FAF8F5] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex h-[52px] items-center gap-3 border-b border-[#DCD7CC] bg-[#EAE6DD] px-5">
          <span className="rounded-[6px] bg-[#2E8A75]/15 px-2 py-0.5 text-[14px] font-bold uppercase tracking-[0.07em] text-[#2E8A75]">
            New
          </span>
          <input
            autoFocus
            value={title}
            // Past the title step the field is a label, not a control: letters
            // must not rewrite the title while 1/2/3 pick a kind. ⌫ steps back.
            readOnly={step !== 'title'}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Name the card…"
            className="flex-1 bg-transparent text-[17px] text-[#1A1A1A] outline-none"
          />
        </div>

        <div ref={listRef} className="max-h-[360px] overflow-y-auto py-3">
          {title && (
            <p className="px-5 pb-2 font-mono text-[14px] text-[#737067]">
              id: <b className={usable ? 'text-[#2D2B28]' : 'text-[#A33]'}>{id || '—'}</b>
              {collision && ' · already exists'}
              {id === '' && ' · needs a letter or number'}
            </p>
          )}

          {step === 'group' ? (
            groupRows.map((row, i) => (
              <div key={`${row.domainId}-${row.groupTitle}`}>
                {row.startsDomain && (
                  <p className="px-5 py-2 text-[14px] font-medium uppercase tracking-[0.08em] text-[#8C887E]">
                    {row.domainTitle}
                    {row.domainId === currentDomain && ' · current page'}
                  </p>
                )}
                <button
                  type="button"
                  data-active={i === cursor}
                  disabled={busy}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => void create(row.domainId, row.groupTitle)}
                  className={`flex w-full items-center justify-between px-5 py-2 text-left hover:bg-[#F0EDE4] ${highlight(
                    i === cursor,
                  )}`}
                >
                  <span className="text-[15px] font-semibold text-[#2D2B28]">
                    {row.groupTitle ?? row.domainTitle}
                  </span>
                  <span className="text-[14px] text-[#737067]">{row.count} cards</span>
                </button>
              </div>
            ))
          ) : (
            <>
              <p className="px-5 py-2 text-[14px] font-medium uppercase tracking-[0.08em] text-[#8C887E]">
                Pick a kind
              </p>
              {KINDS.map((k, i) => (
                <button
                  key={k.key}
                  type="button"
                  data-active={step === 'kind' && i === cursor}
                  // The derived id, not the raw title: "???" is a title but not
                  // an id, and the server rejects it. Block the step here too.
                  disabled={!usable}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => step === 'kind' && setCursor(i)}
                  onClick={() => pickKind(k.key)}
                  className={`flex w-full items-center gap-3 px-5 py-2 text-left disabled:opacity-40 ${
                    step === 'kind' && i === cursor ? highlight(true) : k.key === guess ? 'bg-[#F0EDE4]' : ''
                  }`}
                >
                  <span className="flex h-[21px] w-[21px] items-center justify-center rounded-[5px] bg-[#EAE6DD] font-mono text-[14px]">
                    {i + 1}
                  </span>
                  <span className="text-[15px] font-semibold text-[#2D2B28]">{k.label}</span>
                  <span className="text-[14px] text-[#737067]">{k.hint}</span>
                  {k.key === guess && (
                    <span className="ml-auto text-[14px] italic text-[#8C887E]">suggested</span>
                  )}
                </button>
              ))}
            </>
          )}

          {errors.length > 0 && (
            <ul className="mx-5 mt-2 rounded-[7px] bg-[#FDF2F2] p-3 text-[14px] text-[#A33]">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex h-[42px] items-center justify-center gap-6 border-t border-[#E5E2D9] text-[14px] text-[#8C887E]">
          {hints.map((h) => (
            <span key={h}>{h}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
