import { expect, test, describe, afterEach, beforeEach } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { devOnlyGuard } from './devOnly';

// `process.env.NODE_ENV` is readonly in Next's ambient types, so reach the
// same object through a mutable view to set it for the duration of a test.
const env = process.env as Record<string, string | undefined>;
const original = env.NODE_ENV;
afterEach(() => {
  env.NODE_ENV = original;
});

describe('devOnlyGuard', () => {
  test('returns null in development', () => {
    env.NODE_ENV = 'development';
    expect(devOnlyGuard()).toBeNull();
  });

  test('returns a 404 in production', () => {
    env.NODE_ENV = 'production';
    expect(devOnlyGuard()?.status).toBe(404);
  });
});

describe('devOnlyGuard cross-origin', () => {
  // These exercise the *who* half of the guard, so the *when* half must be
  // satisfied first — bun sets NODE_ENV to "test", which would 404 everything.
  beforeEach(() => {
    env.NODE_ENV = 'development';
  });

  // Without this, any site visited while `next dev` runs could write to the
  // repo: these routes are CORS simple requests, so no preflight protects them.
  const req = (headers: Record<string, string>) =>
    new Request('http://localhost:3000/api/authoring/section', { method: 'POST', headers });

  test('allows a same-origin request', () => {
    expect(devOnlyGuard(req({ host: 'localhost:3000', origin: 'http://localhost:3000' }))).toBeNull();
  });

  test('allows a request with no origin header', () => {
    expect(devOnlyGuard(req({ host: 'localhost:3000' }))).toBeNull();
  });

  test('rejects a cross-origin request with 403', () => {
    expect(
      devOnlyGuard(req({ host: 'localhost:3000', origin: 'https://evil.example' }))?.status,
    ).toBe(403);
  });

  test('rejects a cross-site fetch even when Origin is absent', () => {
    expect(
      devOnlyGuard(req({ host: 'localhost:3000', 'sec-fetch-site': 'cross-site' }))?.status,
    ).toBe(403);
  });

  test('rejects an unparseable origin', () => {
    expect(devOnlyGuard(req({ host: 'localhost:3000', origin: 'not a url' }))?.status).toBe(403);
  });
});

describe('authoring routes', () => {
  test('every route file calls devOnlyGuard', () => {
    const base = join(import.meta.dir, '../../app/api/authoring');
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((e) => {
        const full = join(dir, e);
        return statSync(full).isDirectory() ? walk(full) : e === 'route.ts' ? [full] : [];
      });

    const routes = walk(base);
    expect(routes.length).toBeGreaterThan(0);
    for (const r of routes) {
      // Not just `devOnlyGuard(` — it must receive the request, or the
      // cross-origin half of the guard silently does nothing.
      expect(readFileSync(r, 'utf8')).toContain('devOnlyGuard(request)');
    }
  });
});
