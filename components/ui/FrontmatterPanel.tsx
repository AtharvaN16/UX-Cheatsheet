'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Method } from '@/lib/content';
import { IS_DEV, useAuthoring } from './AuthoringProvider';

const FIELDS = [
  { field: 'kind', label: 'Kind', options: ['concept', 'framework', 'method'] },
  { field: 'gives', label: 'Gives', options: ['quantitative', 'qualitative', 'mixed', 'conceptual'] },
  { field: 'effort', label: 'Effort', options: ['low', 'medium', 'high'] },
  { field: 'timeframe', label: 'Timeframe', options: ['hours', 'days', 'weeks', 'months', 'ongoing'] },
] as const;

/**
 * The closed-enum frontmatter fields, as segmented controls.
 *
 * Only enums are here on purpose. Free-text and array fields (`sources`,
 * `useInstead`, `related`, `useCases`) carry cross-reference and minimum-count
 * rules checked across the whole content set, and editing them a field at a
 * time invites build breaks a small panel cannot explain. A segmented control
 * over a closed list cannot produce an invalid value at all.
 */
export function FrontmatterPanel({ method }: { method: Method }) {
  const { isEditing } = useAuthoring();
  const router = useRouter();
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  if (!IS_DEV || !isEditing) return null;

  const set = async (field: string, value: string) => {
    setBusy(field);
    setErrors([]);
    const res = await fetch('/api/authoring/frontmatter', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: method.id, field, value }),
    });
    setBusy(null);
    if (res.ok) router.refresh();
    else setErrors(((await res.json()) as { errors?: string[] }).errors ?? ['save failed']);
  };

  const upload = async (file: File) => {
    setBusy('image');
    setErrors([]);
    const body = new FormData();
    body.set('id', method.id);
    body.set('file', file);
    const res = await fetch('/api/authoring/image', { method: 'POST', body });
    setBusy(null);
    if (res.ok) router.refresh();
    else setErrors(((await res.json()) as { errors?: string[] }).errors ?? ['upload failed']);
  };

  return (
    <aside className="rounded-[10px] border border-[#E4DED2] bg-[#faf9f5] p-4">
      <p className="mb-3 text-[14px] font-medium uppercase tracking-[0.08em] text-[#8C887E]">
        Frontmatter
      </p>

      {FIELDS.map(({ field, label, options }) => {
        const current = method[field as 'kind' | 'gives' | 'effort' | 'timeframe'];
        return (
          <div key={field} className="mb-3">
            <label className="mb-1.5 block text-[14px] font-medium uppercase tracking-[0.06em] text-[#8C887E]">
              {label}
            </label>
            <div className="flex gap-1">
              {options.map((o) => (
                <button
                  key={o}
                  type="button"
                  disabled={busy === field}
                  onClick={() => set(field, o)}
                  className={`flex-1 rounded-[7px] border px-2 py-1.5 text-[14px] ${
                    current === o
                      ? 'border-[#5A92C6] bg-[#5A92C6] font-semibold text-white'
                      : 'border-[#E4DED2] bg-white text-[#6E6A5E] hover:bg-[#EAE6DD]'
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {method.image && (
        <div className="mb-3">
          <label className="mb-1.5 block text-[14px] font-medium uppercase tracking-[0.06em] text-[#8C887E]">
            Image
          </label>
          <label
            className="block cursor-pointer rounded-[9px] border-[1.5px] border-dashed border-[#CFC8B8] bg-white p-4 text-center text-[14px] text-[#8C887E] hover:border-[#5A92C6]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) void upload(f);
            }}
          >
            ⇪ Drop or choose a replacement
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.svg,.webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
              }}
            />
          </label>
        </div>
      )}

      {errors.length > 0 && (
        <ul className="rounded-[7px] bg-[#FDF2F2] p-3 text-[14px] text-[#A33]">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </aside>
  );
}
