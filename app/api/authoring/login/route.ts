import {
  checkPassword,
  signSession,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from '@/lib/authoring/auth';

/**
 * Exchange the password for a signed session cookie.
 *
 * This is the one route that deliberately does not call `guardRequest`: the
 * session half of that guard would reject every caller, and a login request is
 * unauthenticated by definition. The origin half still matters though, so it is
 * spelled out inline here rather than skipped — otherwise any other origin
 * could brute-force this endpoint from a visitor's browser. The route-walk test
 * in `lib/authoring/guard.test.ts` exempts this directory by name.
 */
export async function POST(request: Request): Promise<Response> {
  // Origin protection only; a login request is unauthenticated by definition.
  const site = request.headers.get('sec-fetch-site');
  if (site !== null && site !== 'same-origin' && site !== 'none') {
    return new Response(null, { status: 403 });
  }
  const origin = request.headers.get('origin');
  if (origin !== null) {
    try {
      if (new URL(origin).host !== request.headers.get('host')) {
        return new Response(null, { status: 403 });
      }
    } catch {
      return new Response(null, { status: 403 });
    }
  }

  const { password } = (await request.json()) as { password?: string };

  // A fixed delay on every attempt. Serverless instances share no memory, so a
  // real attempt counter is per-instance and close to useless; this plus a
  // high-entropy generated password is the honest mitigation. Documented in
  // the spec as a deliberate limit, not an oversight.
  await new Promise((r) => setTimeout(r, 500));

  if (!password || !checkPassword(password)) {
    return Response.json({ errors: ['wrong password'] }, { status: 401 });
  }

  const cookie = [
    `${SESSION_COOKIE}=${signSession(Date.now())}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Secure',
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  ].join('; ');

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'set-cookie': cookie },
  });
}
