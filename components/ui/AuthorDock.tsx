'use client';

import { useState } from 'react';
import { describeEdit } from '@/lib/authoring/pending';
import { IS_DEV, useAuthoring } from './AuthoringProvider';

const ICON = 'flex h-[25px] w-[25px] items-center justify-center rounded-[7px] border text-[12px] transition-colors';
const IDLE = 'border-[#E4DED2] bg-[#faf9f5] text-[#5C574A] hover:bg-[#EAE6DD]';
const ACTIVE = 'border-[#5A92C6] bg-[#5A92C6] text-white';

export function AuthorDock() {
  const {
    isEditing,
    toggleEditing,
    setAddOpen,
    authed,
    checkingSession,
    setNeedsLogin,
    pending,
    sync,
    syncing,
    justSynced,
    discardAll,
    logout,
    dockCollapsed,
    setDockCollapsed,
  } = useAuthoring();

  // Two-step, because discarding is the one irreversible thing in the dock:
  // a queued edit exists nowhere else, so a stray click would lose real work.
  // A native confirm() would do the job but reads as a browser error.
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  // Nothing at all until we know whether this browser is signed in: flashing a
  // "Sign in" button and then replacing it with the dock is worse than waiting
  // one request. In development there is no session to check, so this is false
  // from the first render and the dock behaves exactly as it always has.
  if (checkingSession) return null;

  if (!IS_DEV && !authed) {
    return (
      <button
        type="button"
        onClick={() => setNeedsLogin(true)}
        className="fixed bottom-[14px] left-[14px] z-50 rounded-[11px] border border-[#E4DED2] bg-white px-3 py-2 text-[13px] font-semibold text-[#5C574A] shadow-[0_6px_20px_rgba(35,33,29,0.11)]"
      >
        Sign in to edit
      </button>
    );
  }

  const openTerminal = () => {
    void fetch('/api/authoring/terminal', { method: 'POST' });
  };

  // Collapsed, the dock is a single dot. It is never removed outright: queued
  // edits live only in this browser, so a control that could hide them for
  // good would be a way to lose work silently. The dot stays amber while
  // anything is unsynced.
  if (dockCollapsed) {
    return (
      <button
        type="button"
        onClick={() => setDockCollapsed(false)}
        title={pending.length > 0 ? `${pending.length} unsynced — click to reopen` : 'Show authoring controls'}
        aria-label="Show authoring controls"
        className={`fixed bottom-[14px] left-[14px] z-50 h-[18px] w-[18px] rounded-full border border-[#E4DED2] shadow-[0_4px_14px_rgba(35,33,29,0.14)] ${
          pending.length > 0 ? 'bg-[#C98A28]' : 'bg-[#2E8A75]'
        }`}
      />
    );
  }

  return (
    <div
      className="fixed bottom-[14px] left-[14px] z-50 flex items-center gap-[7px] rounded-[11px] border border-[#E4DED2] bg-white px-[9px] py-[7px] shadow-[0_6px_20px_rgba(35,33,29,0.11)]"
      role="toolbar"
      aria-label="Authoring controls"
    >
      {/* Amber while work is queued, so unsynced edits are visible from any page. */}
      <span
        className={`h-[7px] w-[7px] rounded-full ${pending.length > 0 ? 'bg-[#C98A28]' : 'bg-[#2E8A75]'}`}
        aria-hidden
      />
      <span className="text-[11px] font-semibold tracking-[0.03em] text-[#23211D]">
        {IS_DEV ? 'DEV' : 'EDIT'}
      </span>
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
      {/* Development has no queue — a save is already on disk — so no Sync. */}
      {!IS_DEV && pending.length > 0 && (
        <button
          type="button"
          onClick={() => void sync()}
          disabled={syncing}
          title={pending.map(describeEdit).join('\n')}
          className="rounded-[8px] bg-[#5A92C6] px-2.5 py-1 text-[12px] font-semibold text-white disabled:opacity-60"
        >
          {syncing ? 'Syncing…' : `Sync ${pending.length}`}
        </button>
      )}
      {!IS_DEV && pending.length > 0 && !syncing && (
        <button
          type="button"
          onClick={() => {
            if (confirmingDiscard) {
              discardAll();
              setConfirmingDiscard(false);
            } else {
              setConfirmingDiscard(true);
              // Arm briefly, then disarm, so the dock never sits in a state
              // where the next click throws work away unexpectedly.
              setTimeout(() => setConfirmingDiscard(false), 4000);
            }
          }}
          title={
            confirmingDiscard
              ? 'Click again to discard'
              : `Discard without syncing:\n${pending.map(describeEdit).join('\n')}`
          }
          className={
            confirmingDiscard
              ? 'rounded-[8px] border border-[#A33] bg-[#FDF2F2] px-2.5 py-1 text-[12px] font-semibold text-[#A33]'
              : `${ICON} ${IDLE}`
          }
        >
          {confirmingDiscard ? `Discard ${pending.length}?` : '✕'}
        </button>
      )}
      {!IS_DEV && justSynced && pending.length === 0 && (
        <span className="text-[12px] text-[#2E8A75]">live in ~1 min</span>
      )}
      {!IS_DEV && (
        <button
          type="button"
          onClick={() => void logout()}
          title="Sign out of editing on this browser"
          className={`${ICON} ${IDLE}`}
        >
          ⏻
        </button>
      )}
      <button
        type="button"
        onClick={() => setDockCollapsed(true)}
        title="Collapse to a dot"
        aria-label="Collapse authoring controls"
        className={`${ICON} ${IDLE}`}
      >
        ‹
      </button>
      {/* There is no terminal to open on a serverless function. */}
      {IS_DEV && (
        <button type="button" onClick={openTerminal} title="Open terminal here" className={`${ICON} ${IDLE}`}>
          ▶_
        </button>
      )}
    </div>
  );
}
