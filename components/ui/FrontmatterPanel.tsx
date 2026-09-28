'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Method } from '@/lib/content';
import { IS_DEV, PENDING_CONTROL_CLASS, PendingDot, UndoEdit, useAuthoring } from './AuthoringProvider';

// `gives` is deliberately not offered here. It stays in the schema and in all
// 161 content files, but nothing renders it and nothing filters on it, so a
// control for it only invites edits that can never show up anywhere.
const FIELDS = [
  { field: 'kind', label: 'Kind', options: ['concept', 'framework', 'method'] },
  { field: 'effort', label: 'Effort', options: ['low', 'medium', 'high'] },
  { field: 'timeframe', label: 'Timeframe', options: ['hours', 'days', 'weeks', 'months', 'ongoing'] },
] as const;

/**
 * Read a picked file as raw base64.
 *
 * Images travel as base64 inside the JSON save body in both environments —
 * there is no multipart path anymore, because the live site's save is a queued
 * JSON edit and dev must exercise the same one. `readAsDataURL` is the only
 * FileReader mode that base64-encodes, so the `data:<mime>;base64,` prefix it
 * prepends is stripped here: the server sniffs raw bytes, not a data URL.
 */
function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('could not read file'));
    reader.onload = () => {
      const result = String(reader.result);
      const comma = result.indexOf(',');
      resolve(comma === -1 ? result : result.slice(comma + 1));
    };
    reader.readAsDataURL(file);
  });
}

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
  const { isEditing, authed, saveEdit, pendingField, pendingCountFor, discardEdits, discardField } =
    useAuthoring();
  const cardPendingCount = pendingCountFor(method.id);
  const router = useRouter();
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  if ((!IS_DEV && !authed) || !isEditing) return null;

  const set = async (field: string, value: string) => {
    setBusy(field);
    setErrors([]);
    const r = await saveEdit({ kind: 'frontmatter', id: method.id, field, value });
    setBusy(null);
    // Only development has anything to refresh; on the live site the page is a
    // build artefact until Sync lands a commit.
    if (r.ok) {
      if (IS_DEV) router.refresh();
    } else {
      setErrors(r.errors ?? ['save failed']);
    }
  };

  const upload = async (file: File) => {
    setBusy('image');
    setErrors([]);

    let base64: string;
    try {
      base64 = await readAsBase64(file);
    } catch {
      setBusy(null);
      setErrors(['could not read that file']);
      return;
    }

    const r = await saveEdit({ kind: 'image', id: method.id, filename: file.name, base64 });
    setBusy(null);
    if (r.ok) {
      if (IS_DEV) router.refresh();
    } else {
      setErrors(r.errors ?? ['upload failed']);
    }
  };

  return (
    <aside className="rounded-[10px] border border-[#E4DED2] bg-[#faf9f5] p-4">
      <p className="mb-3 text-[14px] font-medium uppercase tracking-[0.08em] text-[#8C887E]">
        Frontmatter
      </p>

      {!IS_DEV && cardPendingCount > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-[8px] border border-[#E8B307]/40 bg-[#FDE047]/15 px-3 py-2">
          <span className="text-[14px] text-[#5C574A]">
            {cardPendingCount} unsynced change{cardPendingCount === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            onClick={() => discardEdits(method.id)}
            className="text-[14px] font-semibold text-[#A33] underline underline-offset-2 hover:text-[#8a2a2a]"
          >
            Undo all
          </button>
        </div>
      )}

      {FIELDS.map(({ field, label, options }) => {
        // The queued value wins over the built page's value. Without this, on
        // the live site pressing "high" saved correctly and then re-rendered
        // with "low" still selected, which reads as a failed save.
        const queued = pendingField(method.id, field);
        const current = queued ?? method[field as 'kind' | 'effort' | 'timeframe'];
        return (
          <div key={field} className="mb-3">
            <label className="mb-1.5 block text-[14px] font-medium uppercase tracking-[0.06em] text-[#8C887E]">
              {label}
              {queued !== undefined && (
                <>
                  <PendingDot />
                  <UndoEdit onUndo={() => discardField(method.id, field)} label={label} />
                </>
              )}
            </label>
            <div className="flex gap-1">
              {options.map((o) => (
                <button
                  key={o}
                  type="button"
                  disabled={busy === field}
                  onClick={() => set(field, o)}
                  className={`flex-1 rounded-[7px] border px-2 py-1.5 text-[14px] ${
                    current === o && queued !== undefined
                      ? `border-[#E8B307] bg-[#E8B307] font-semibold text-white ${PENDING_CONTROL_CLASS}`
                      : current === o
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

      {/* Shown on every card, not only the 14 that already have an image.
          applyEdits creates the frontmatter `image:` block when one is absent,
          so a first diagram can be dropped in like any replacement. */}
      <div className="mb-3">
        <div className="mb-3">
          <label className="mb-1.5 block text-[14px] font-medium uppercase tracking-[0.06em] text-[#8C887E]">
            {method.image ? 'Image' : 'Image — none yet'}
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
      </div>

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
