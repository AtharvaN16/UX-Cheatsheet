import { SESSION_COOKIE } from '@/lib/authoring/auth';
import { guardRequest } from '@/lib/authoring/guard';

/**
 * End the session by expiring the cookie.
 *
 * Guarded like every other authoring route: signing out is only meaningful for
 * someone who is signed in, and leaving it open would let any page on any
 * origin log you out for sport.
 *
 * Note this expires THIS browser's cookie only. It does not invalidate the
 * signature, so a copy of the cookie taken elsewhere stays valid until it
 * ages out. Killing every session everywhere means rotating AUTHORING_SECRET —
 * see docs/authoring-setup.md.
 */
export async function POST(request: Request): Promise<Response> {
  const blocked = guardRequest(request);
  if (blocked) return blocked;

  const cookie = [
    `${SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Secure',
    'Max-Age=0',
  ].join('; ');

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'set-cookie': cookie },
  });
}
