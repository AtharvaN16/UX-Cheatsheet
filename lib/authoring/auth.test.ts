import { expect, test, describe, beforeEach, afterEach } from 'bun:test';
import { checkPassword, signSession, verifySession, SESSION_MAX_AGE_SECONDS } from './auth';

const env = process.env as Record<string, string | undefined>;
const saved = { p: env.AUTHORING_PASSWORD, s: env.AUTHORING_SECRET };

beforeEach(() => {
  env.AUTHORING_PASSWORD = 'correct horse battery staple';
  env.AUTHORING_SECRET = 'test-secret-value';
});
afterEach(() => {
  env.AUTHORING_PASSWORD = saved.p;
  env.AUTHORING_SECRET = saved.s;
});

describe('checkPassword', () => {
  test('accepts the configured password', () => {
    expect(checkPassword('correct horse battery staple')).toBe(true);
  });

  test('rejects a wrong password', () => {
    expect(checkPassword('hunter2')).toBe(false);
  });

  test('rejects a password of a different length without throwing', () => {
    expect(checkPassword('short')).toBe(false);
    expect(checkPassword('')).toBe(false);
  });

  test('rejects everything when no password is configured', () => {
    delete env.AUTHORING_PASSWORD;
    expect(checkPassword('')).toBe(false);
    expect(checkPassword('anything')).toBe(false);
  });
});

describe('session cookie', () => {
  test('a freshly signed session verifies', () => {
    expect(verifySession(signSession(Date.now()))).toBe(true);
  });

  // Review Focus 1
  test('rejects a tampered payload', () => {
    const token = signSession(Date.now());
    const [issued, sig] = token.split('.');
    expect(verifySession(`${Number(issued) + 1}.${sig}`)).toBe(false);
  });

  test('rejects a tampered signature', () => {
    const token = signSession(Date.now());
    expect(verifySession(`${token.split('.')[0]}.deadbeef`)).toBe(false);
  });

  test('rejects a session signed with a different secret', () => {
    const token = signSession(Date.now());
    env.AUTHORING_SECRET = 'a-completely-different-secret';
    expect(verifySession(token)).toBe(false);
  });

  test('rejects an expired session', () => {
    const old = Date.now() - (SESSION_MAX_AGE_SECONDS + 60) * 1000;
    expect(verifySession(signSession(old))).toBe(false);
  });

  test('rejects null, empty and malformed values', () => {
    expect(verifySession(null)).toBe(false);
    expect(verifySession('')).toBe(false);
    expect(verifySession('no-dot-here')).toBe(false);
    expect(verifySession('a.b.c')).toBe(false);
  });
});
