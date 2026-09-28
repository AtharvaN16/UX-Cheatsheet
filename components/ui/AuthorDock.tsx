'use client';

import { IS_DEV, useAuthoring } from './AuthoringProvider';

const ICON = 'flex h-[25px] w-[25px] items-center justify-center rounded-[7px] border text-[12px] transition-colors';
const IDLE = 'border-[#E4DED2] bg-[#faf9f5] text-[#5C574A] hover:bg-[#EAE6DD]';
const ACTIVE = 'border-[#5A92C6] bg-[#5A92C6] text-white';

export function AuthorDock() {
  const { isEditing, toggleEditing, setAddOpen } = useAuthoring();

  if (!IS_DEV) return null;

  const openTerminal = () => {
    void fetch('/api/authoring/terminal', { method: 'POST' });
  };

  return (
    <div
      className="fixed bottom-[14px] left-[14px] z-50 flex items-center gap-[7px] rounded-[11px] border border-[#E4DED2] bg-white px-[9px] py-[7px] shadow-[0_6px_20px_rgba(35,33,29,0.11)]"
      role="toolbar"
      aria-label="Authoring controls"
    >
      <span className="h-[7px] w-[7px] rounded-full bg-[#2E8A75]" aria-hidden />
      <span className="text-[11px] font-semibold tracking-[0.03em] text-[#23211D]">DEV</span>
      <button
        type="button"
        onClick={toggleEditing}
        aria-pressed={isEditing}
        title="Toggle editing (⌘⇧E)"
        className={`${ICON} ${isEditing ? ACTIVE : IDLE}`}
      >
        ✎
      </button>
      <button
        type="button"
        onClick={() => setAddOpen(true)}
        title="Add card (⌘⇧K)"
        className={`${ICON} ${IDLE}`}
      >
        ＋
      </button>
      <button type="button" onClick={openTerminal} title="Open terminal here" className={`${ICON} ${IDLE}`}>
        ▶_
      </button>
    </div>
  );
}
