import { createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'ux_authoring';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** Constant-time compare that tolerates different lengths without throwing. */
function equals(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    // Still burn a comparison so the failure path costs the same either way.
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

/**
 * Compare a supplied password against AUTHORING_PASSWORD.
 *
 * If the variable is unset, everything is rejected. That matters more than it
 * looks: a preview deployment without the secret configured must be closed,
 * not open to anyone who sends an empty string.
 */
export function checkPassword(supplied: string): boolean {
  const expected = process.env.AUTHORING_PASSWORD;
  if (!expected) return false;
  return equals(supplied, expected);
}

function secret(): string {
  const value = process.env.AUTHORING_SECRET;
  if (!value) throw new Error('AUTHORING_SECRET is not set');
  return value;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('hex');
}

/** `<issuedAtMs>.<hmac>` — no session store, the cookie carries its own proof. */
export function signSession(issuedAt: number): string {
  const payload = String(issuedAt);
  return `${payload}.${sign(payload)}`;
}

export function verifySession(value: string | null, now: number = Date.now()): boolean {
  if (!value) return false;

  const parts = value.split('.');
  if (parts.length !== 2) return false;

  const [issued, signature] = parts;
  const issuedAt = Number(issued);
  if (!Number.isFinite(issuedAt)) return false;

  if (now - issuedAt > SESSION_MAX_AGE_SECONDS * 1000) return false;
  if (now - issuedAt < -60_000) return false; // clock-skew tolerance, not a time machine

  let expected: string;
  try {
    expected = sign(issued);
  } catch {
    return false; // no secret configured — closed, not open
  }
  return equals(signature, expected);
}
