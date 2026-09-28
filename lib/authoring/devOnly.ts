/**
 * The gate on every authoring endpoint. Two independent checks: *when* the
 * route may run, and *who* may call it.
 *
 * Plan B replaces the NODE_ENV half with an auth check when editing goes to the
 * live site. The origin half stays either way.
 */
export function devOnlyGuard(request?: Request): Response | null {
  // WHEN — these routes mutate the working tree, so they must not exist outside
  // development. The client half of this is that the UI renders nothing in a
  // production build; that is cosmetic, and this is the actual boundary.
  if (process.env.NODE_ENV !== 'development') {
    return new Response(null, { status: 404 });
  }

  // WHO — reject cross-origin callers.
  //
  // Without this, any website you visit while `next dev` is running can write
  // to your repo. Next's `allowedDevOrigins` does not cover Route Handlers, and
  // these endpoints are CORS *simple requests* — the image route is
  // multipart/form-data and the terminal route needs no body or custom headers
  // — so no preflight is sent and a `no-cors` fetch() from any page lands the
  // side effect. Verified: `POST /api/authoring/section` with
  // `Origin: https://evil.example` wrote the file and returned 200.
  //
  // Same-origin browser requests either send no Origin at all (some navigations)
  // or send one matching Host, so requiring a match costs legitimate callers
  // nothing. `Sec-Fetch-Site` is checked first where present because it is set
  // by the browser and cannot be spoofed by page script.
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

  return null;
}
