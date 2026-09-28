import { expect, test, describe, afterEach } from 'bun:test';
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
      expect(readFileSync(r, 'utf8')).toContain('devOnlyGuard()');
    }
  });
});
