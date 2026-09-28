'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IS_DEV, useAuthoring } from './AuthoringProvider';

/**
 * Wraps one `## ` section. With editing off — or in production — it renders its
 * children and nothing else.
 *
 * The editor is a plain textarea holding the section's *source* markdown, not a
 * conversion of the rendered output. Card bodies are parsed by FormattedText,
 * which understands only bold, italic, ### and bullets; a rich-text editor
 * would have to serialize back into that four-primitive subset and would inject
 * markup that renders as literal text the moment anything was pasted in.
 */
export function EditableSection({
  methodId,
  heading,
  markdown,
  children,
}: {
  methodId: string;
  heading: string;
  markdown: string;
  children: React.ReactNode;
}) {
  const { isEditing } = useAuthoring();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(markdown);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  if (!IS_DEV || !isEditing) return <>{children}</>;

  const save = async () => {
    setSaving(true);
    setErrors([]);
    const res = await fetch('/api/authoring/section', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: methodId, heading, markdown: draft }),
    });
    setSaving(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      const body = (await res.json()) as { errors?: string[] };
      setErrors(body.errors ?? ['save failed']);
    }
  };

  if (!open) {
    return (
      <div className="relative">
        {children}
        <button
          type="button"
          onClick={() => {
            setDraft(markdown);
            setOpen(true);
          }}
          title={`Edit "${heading}"`}
          className="absolute -top-1 right-0 flex h-6 w-6 items-center justify-center rounded-[7px] border border-[#DCD7CC] bg-[#EAE6DD] text-[12px] text-[#6E6A5E] hover:bg-[#DCD7CC]"
        >
          ✎
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void save();
          }
          if (e.key === 'Escape') {
            e.stopPropagation();
            setOpen(false);
          }
        }}
        rows={Math.max(6, draft.split('\n').length + 2)}
        spellCheck
        autoFocus
        className="w-full rounded-[9px] border-[1.5px] border-[#5A92C6] bg-white p-3 font-mono text-[14px] leading-[1.7] text-[#3A3730] shadow-[0_0_0_3px_rgba(90,146,198,0.13)] outline-none"
      />
      {errors.length > 0 && (
        <ul className="rounded-[7px] bg-[#FDF2F2] p-3 text-[14px] text-[#A33]">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-[8px] bg-[#5A92C6] px-3.5 py-1.5 text-[14px] font-semibold text-white disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save section'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-[14px] text-[#5C574A]">
          Cancel
        </button>
        <span className="text-[14px] text-[#8C887E]">⌘S to save · Esc to cancel</span>
      </div>
    </div>
  );
}
