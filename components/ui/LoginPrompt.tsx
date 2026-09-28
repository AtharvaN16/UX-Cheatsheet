'use client';

import { useState } from 'react';
import { useAuthoring } from './AuthoringProvider';

/**
 * The password gate. Styled as the command palette is — same cream surface,
 * 14px radius, beige header — so it reads as part of the product rather than
 * a browser dialog.
 *
 * `data-authoring` exempts it from the global 500px dialog rules in
 * globals.css, which exist to pin the search palette.
 */
export function LoginPrompt() {
  const { needsLogin, setNeedsLogin, login } = useAuthoring();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!needsLogin) return null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    const r = await login(password);
    setBusy(false);
    if (r.ok) setPassword('');
    else setError(r.error ?? 'Wrong password');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sign in to edit"
      data-authoring
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/40 pt-[18vh]"
      onClick={() => setNeedsLogin(false)}
    >
      <div
        className="w-full max-w-[420px] overflow-hidden rounded-[14px] border border-[#DCD7CC] bg-[#FAF8F5] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-[52px] items-center border-b border-[#DCD7CC] bg-[#EAE6DD] px-5 text-[15px] font-semibold text-[#2D2B28]">
          Sign in to edit
        </div>
        <div className="space-y-3 p-5">
          <input
            autoFocus
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submit();
              if (e.key === 'Escape') {
                e.stopPropagation();
                setNeedsLogin(false);
              }
            }}
            placeholder="Password"
            className="w-full rounded-[9px] border border-[#E4DED2] bg-white px-3 py-2 text-[15px] text-[#23211D] outline-none focus:border-[#5A92C6]"
          />
          {error && <p className="text-[14px] text-[#A33]">{error}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={busy || password === ''}
            className="w-full rounded-[8px] bg-[#5A92C6] py-2 text-[14px] font-semibold text-white disabled:opacity-60"
          >
            {busy ? 'Checking…' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
