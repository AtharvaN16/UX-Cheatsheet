import { expect, test, describe, afterEach, beforeEach } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { guardRequest, devOnlyRoute } from './guard';
import { signSession } from './auth';

// `process.env.NODE_ENV` is readonly in Next's ambient types, so reach the
// same object through a mutable view to set it for the duration of a test.
const env = process.env as Record<string, string | undefined>;
const original = env.NODE_ENV;
const originalSecret = env.AUTHORING_SECRET;
afterEach(() => {
  // Both are restored, not just NODE_ENV: the session describe below sets a
  // secret and a production environment, and the cross-origin describe expects
  // development. Without this, the pair would interfere by file order.
  env.NODE_ENV = original;
  env.AUTHORING_SECRET = originalSecret;
});

describe('guardRequest', () => {
  test('returns null in development', () => {
    env.NODE_ENV = 'development';
    expect(guardRequest()).toBeNull();
  });

  test('returns a 401 in production', () => {
    env.NODE_ENV = 'production';
    expect(guardRequest()?.status).toBe(401);
  });
});

describe('devOnlyRoute', () => {
  test('returns null in development', () => {
    env.NODE_ENV = 'development';
    expect(devOnlyRoute()).toBeNull();
  });

  test('returns a 404 in production', () => {
    env.NODE_ENV = 'production';
    expect(devOnlyRoute()?.status).toBe(404);
  });
});

describe('guardRequest cross-origin', () => {
  // These exercise the *who* half of the guard, so the *when* half must be
  // satisfied first — bun sets NODE_ENV to "test", which would 401 everything.
  beforeEach(() => {
    env.NODE_ENV = 'development';
  });

  // Without this, any site visited while `next dev` runs could write to the
  // repo: these routes are CORS simple requests, so no preflight protects them.
  const req = (headers: Record<string, string>) =>
    new Request('http://localhost:3000/api/authoring/section', { method: 'POST', headers });

  test('allows a same-origin request', () => {
    expect(guardRequest(req({ host: 'localhost:3000', origin: 'http://localhost:3000' }))).toBeNull();
  });

  test('allows a request with no origin header', () => {
    expect(guardRequest(req({ host: 'localhost:3000' }))).toBeNull();
  });

  test('rejects a cross-origin request with 403', () => {
    expect(
      guardRequest(req({ host: 'localhost:3000', origin: 'https://evil.example' }))?.status,
    ).toBe(403);
  });

  test('rejects a cross-site fetch even when Origin is absent', () => {
    expect(
      guardRequest(req({ host: 'localhost:3000', 'sec-fetch-site': 'cross-site' }))?.status,
    ).toBe(403);
  });

  test('rejects an unparseable origin', () => {
    expect(guardRequest(req({ host: 'localhost:3000', origin: 'not a url' }))?.status).toBe(403);
  });
});

describe('guardRequest session check', () => {
  const env2 = process.env as Record<string, string | undefined>;
  beforeEach(() => {
    env2.NODE_ENV = 'production';
    env2.AUTHORING_SECRET = 'test-secret-value';
  });

  const req = (headers: Record<string, string>) =>
    new Request('https://example.com/api/authoring/section', { method: 'POST', headers });

  test('allows a request carrying a valid session cookie', () => {
    const cookie = `ux_authoring=${signSession(Date.now())}`;
    expect(guardRequest(req({ host: 'example.com', cookie }))).toBeNull();
  });

  test('rejects a request with no cookie', () => {
    expect(guardRequest(req({ host: 'example.com' }))?.status).toBe(401);
  });

  test('rejects a forged cookie', () => {
    expect(
      guardRequest(req({ host: 'example.com', cookie: 'ux_authoring=1700000000.beef' }))?.status,
    ).toBe(401);
  });

  test('reads the session from a cookie header containing several cookies', () => {
    const cookie = `theme=light; ux_authoring=${signSession(Date.now())}; other=1`;
    expect(guardRequest(req({ host: 'example.com', cookie }))).toBeNull();
  });

  test('origin check still applies to an authenticated request', () => {
    const cookie = `ux_authoring=${signSession(Date.now())}`;
    expect(
      guardRequest(req({ host: 'example.com', cookie, origin: 'https://evil.example' }))?.status,
    ).toBe(403);
  });
});

describe('authoring routes', () => {
  test('every route file calls guardRequest', () => {
    const base = join(import.meta.dir, '../../app/api/authoring');
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((e) => {
        const full = join(dir, e);
        return statSync(full).isDirectory() ? walk(full) : e === 'route.ts' ? [full] : [];
      });

    // The two unauthenticated surfaces in the app, exempt for reasons the
    // guard cannot express: `login` is unauthenticated by definition — the
    // session check would reject the very request that creates a session — and
    // `session`'s entire job is answering "am I signed in?" for a caller who
    // may not be. Both still perform the same-origin half of the guard inline,
    // which is what the check below is really protecting.
    const EXEMPT = new Set(['login', 'session']);

    const routes = walk(base);
    expect(routes.length).toBeGreaterThan(0);
    for (const r of routes) {
      if (EXEMPT.has(basename(dirname(r)))) continue;
      // Not just `guardRequest(` — it must receive the request, or the
      // cross-origin half of the guard silently does nothing.
      expect(readFileSync(r, 'utf8')).toContain('guardRequest(request)');
    }
  });
});
