import { SESSION_COOKIE, verifySession } from '@/lib/authoring/auth';
import { readCookie } from '@/lib/authoring/guard';

/**
 * Whether this browser is signed in. Deliberately not gated by `guardRequest`
 * — its whole job is to answer "am I signed in?" for a caller who may not be,
 * and a 401 here would tell the UI nothing it could act on. The cross-site
 * check is kept inline so another origin cannot probe the cookie's state. The
 * route-walk test in `lib/authoring/guard.test.ts` exempts this directory by
 * name.
 *
 * The client asks this on mount rather than the server reading cookies during
 * render, because a `cookies()` call in a layout opts the whole route out of
 * static rendering and every visitor-facing page here is prerendered.
 */
export async function GET(request: Request): Promise<Response> {
  const site = request.headers.get('sec-fetch-site');
  if (site !== null && site !== 'same-origin' && site !== 'none') {
    return new Response(null, { status: 403 });
  }

  return Response.json({
    authed:
      process.env.NODE_ENV === 'development' ||
      verifySession(readCookie(request, SESSION_COOKIE)),
    dev: process.env.NODE_ENV === 'development',
  });
}
