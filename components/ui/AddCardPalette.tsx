'use client';

import { useMemo, useState } from 'react';
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

/**
 * Adds a taxonomy stub, never an .mdx file: an .mdx without two sources and a
 * useInstead rule fails `bun run validate` and breaks the build. The stub
 * renders immediately as an unwritten card, exactly like the 188 that already
 * exist, and Claude Code writes the real content later.
 *
 * Flow is name -> kind -> group, so the title is known before the kind step and
 * `inferKind` can pre-select its guess.
 */
export function AddCardPalette() {
  const { isAddOpen, setAddOpen } = useAuthoring();
  const router = useRouter();
  const params = useParams<{ category?: string }>();

  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const existing = useMemo(
    () => new Set(TAXONOMY.flatMap((d) => d.groups.flatMap((g) => g.items.map((i) => i.id)))),
    [],
  );

  if (!IS_DEV || !isAddOpen) return null;

  const id = toId(title);
  const collision = id !== '' && existing.has(id);
  const currentDomain = params?.category ?? DOMAINS[0].id;
  const guess = title ? inferKind(title, currentDomain, id) : 'method';

  const close = () => {
    setAddOpen(false);
    setTitle('');
    setKind(null);
    setErrors([]);
  };

  const create = async (domainId: string, groupTitle: string | null) => {
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
    }
  };

  const groupsFor = (domainId: string) =>
    TAXONOMY.find((d) => d.domainId === domainId)?.groups ?? [];

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
      >
        <div className="flex h-[52px] items-center gap-3 border-b border-[#DCD7CC] bg-[#EAE6DD] px-5">
          <span className="rounded-[6px] bg-[#2E8A75]/15 px-2 py-0.5 text-[14px] font-bold uppercase tracking-[0.07em] text-[#2E8A75]">
            New
          </span>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') close();
              if (kind === null && ['1', '2', '3'].includes(e.key)) {
                e.preventDefault();
                setKind(KINDS[Number(e.key) - 1].key);
              }
            }}
            placeholder="Name the card…"
            className="flex-1 bg-transparent text-[17px] text-[#1A1A1A] outline-none"
          />
        </div>

        <div className="max-h-[360px] overflow-y-auto py-3">
          {title && (
            <p className="px-5 pb-2 font-mono text-[14px] text-[#737067]">
              id: <b className={collision ? 'text-[#A33]' : 'text-[#2D2B28]'}>{id || '—'}</b>
              {collision && ' · already exists'}
            </p>
          )}

          {kind === null ? (
            <>
              <p className="px-5 py-2 text-[14px] font-medium uppercase tracking-[0.08em] text-[#8C887E]">
                Pick a kind
              </p>
              {KINDS.map((k, i) => (
                <button
                  key={k.key}
                  type="button"
                  disabled={!title || collision}
                  onClick={() => setKind(k.key)}
                  className={`flex w-full items-center gap-3 px-5 py-2 text-left disabled:opacity-40 ${
                    k.key === guess ? 'bg-[#F0EDE4]' : ''
                  }`}
                >
                  <span className="flex h-[21px] w-[21px] items-center justify-center rounded-[5px] bg-[#EAE6DD] font-mono text-[14px]">
                    {i + 1}
                  </span>
                  <span className="text-[15px] font-semibold text-[#2D2B28]">{k.label}</span>
                  <span className="text-[14px] text-[#737067]">{k.hint}</span>
                  {k.key === guess && <span className="ml-auto text-[14px] italic text-[#8C887E]">suggested</span>}
                </button>
              ))}
            </>
          ) : (
            DOMAINS.filter((d) => groupsFor(d.id).length > 0).map((d) => (
              <div key={d.id}>
                <p className="px-5 py-2 text-[14px] font-medium uppercase tracking-[0.08em] text-[#8C887E]">
                  {d.title}
                  {d.id === currentDomain && ' · current page'}
                </p>
                {groupsFor(d.id).map((g) => (
                  <button
                    key={`${d.id}-${g.title}`}
                    type="button"
                    onClick={() => create(d.id, g.title)}
                    className="flex w-full items-center justify-between px-5 py-2 text-left hover:bg-[#F0EDE4]"
                  >
                    <span className="text-[15px] font-semibold text-[#2D2B28]">{g.title ?? d.title}</span>
                    <span className="text-[14px] text-[#737067]">{g.items.length} cards</span>
                  </button>
                ))}
              </div>
            ))
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
          <span>1 2 3 — kind</span>
          <span>↵ — create</span>
          <span>Esc — cancel</span>
        </div>
      </div>
    </div>
  );
}
