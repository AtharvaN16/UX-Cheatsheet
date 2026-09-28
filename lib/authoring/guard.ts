import { SESSION_COOKIE, verifySession } from './auth';

/** Pull one cookie out of a request's Cookie header. */
export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

/**
 * The gate on every authoring endpoint: *who* may call it, and *from where*.
 *
 * In development everything is open, because the working tree is the thing
 * being edited and there is nobody else to keep out. In production a valid
 * signed session is required — the UI being hidden is not protection, this is.
 */
export function guardRequest(request?: Request): Response | null {
  // WHERE — reject cross-origin callers in every environment.
  //
  // These endpoints are CORS *simple requests* (the image route is
  // multipart/form-data, the terminal route needs no body), so no preflight
  // protects them. Verified during the dev phase: without this, a page on any
  // other origin could POST here and the write succeeded.
  if (request) {
    const site = request.headers.get('sec-fetch-site');
    if (site !== null && site !== 'same-origin' && site !== 'none') {
      return new Response(null, { status: 403 });
    }

    const origin = request.headers.get('origin');
    if (origin !== null) {
      const host = request.headers.get('host');
      let originHost: string | null = null;
      try {
        originHost = new URL(origin).host;
      } catch {
        return new Response(null, { status: 403 });
      }
      if (host === null || originHost !== host) {
        return new Response(null, { status: 403 });
      }
    }
  }

  // WHO — development is open; production needs a session.
  if (process.env.NODE_ENV === 'development') return null;

  if (!request || !verifySession(readCookie(request, SESSION_COOKIE))) {
    return Response.json({ errors: ['not signed in'] }, { status: 401 });
  }

  return null;
}

/**
 * For routes that cannot exist outside development regardless of who is asking.
 * There is no terminal to open on a serverless function.
 */
export function devOnlyRoute(): Response | null {
  return process.env.NODE_ENV === 'development' ? null : new Response(null, { status: 404 });
}
