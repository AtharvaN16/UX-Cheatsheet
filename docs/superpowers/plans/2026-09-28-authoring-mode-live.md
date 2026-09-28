# Authoring Mode (Live Site) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Edit cards and add taxonomy entries from the deployed site, behind a password, with edits batching in the browser until one Sync commits them all to GitHub as a single revision.

**Architecture:** The existing `ContentStore` seam gains a second implementation, `GitHubStore`, which reads and writes through the GitHub **Git Data API** so a batch of files becomes one commit and one rebuild. `devOnlyGuard` becomes `guardRequest`, which keeps the same-origin check and swaps the `NODE_ENV` test for a signed-cookie session check. In development nothing changes from the user's point of view: saves still land on the working tree immediately — but they now travel the same route production uses, as a batch of one, so there is a single save implementation rather than two. On the live site a save validates and becomes a pending edit in `localStorage`; Sync commits the set.

**Tech Stack:** Next.js 16.3 App Router, React 19, TypeScript (strict), `node:crypto` HMAC, GitHub REST Git Data API, `bun:test`.

**Spec:** `docs/superpowers/specs/2026-09-28-authoring-mode-design.md`
**Prior plan (shipped):** `docs/superpowers/plans/2026-09-28-authoring-mode-dev.md`

## Global Constraints

- **The endpoints are the security boundary, not the UI.** Hiding the dock protects nothing. Every route under `app/api/authoring/` calls `guardRequest(request)` as its first statement and returns the result when non-null. The existing test in `lib/authoring/devOnly.test.ts` asserts this mechanically over every route file — keep it passing, updated for the new name.
- **No filesystem path ever crosses the wire.** Endpoints take a method `id`. Unchanged from the dev plan.
- **Never create an `.mdx` file.** Adding a card writes a taxonomy stub only.
- **Never re-serialize frontmatter.** Patch single lines. Unchanged.
- **`patchSection` already refuses unclosed fences and any edit that changes the file's heading list.** Do not weaken or bypass those guards; they exist because two saves could otherwise delete a section silently.
- **The terminal route stays development-only** and must return 404 in production even for an authenticated user. There is no terminal on a serverless function.
- **Development behaviour must not change.** `bun dev` keeps writing straight to disk with no login, no pending edits and no Sync button. Every task below is additive to that path.
- **Secrets live in env vars only**, never in the repo: `AUTHORING_PASSWORD`, `AUTHORING_SECRET`, `GITHUB_TOKEN`, `GITHUB_REPO`, `GITHUB_BRANCH`.
- **Test command:** `bun test <path>`. **Types:** `bunx tsc --noEmit`. **Content:** `bun run validate` must still print `✓ N methods valid`.

## Wiring owned by the orchestrator, not by tasks

`app/providers.tsx` and `components/ui/index.ts` are touched by several tasks and are therefore **excluded from every task below**. Create components; do not mount or export them. The orchestrator applies both files once and runs end-to-end verification.

## Review Focus

Input classes the spec implies that no task's happy path exercises. Each has a test pinned to the task that owns the code.

1. **A tampered or forged session cookie** — a value whose HMAC does not match, an expired one, and one signed with a different secret. All must be rejected, and the comparison must be timing-safe. — Task 1.
2. **A sync whose pending set no longer validates** — someone edited the card in GitHub since. Sync must abort **before** creating any commit and retain every pending edit, not commit the good half. — Task 8.
3. **A blob SHA that moved under an edit.** The recorded `version` no longer matches what GitHub holds. Must abort with a clear message rather than clobber. — Task 8.
4. **Two pending edits to different sections of the same card.** They must collapse into one file write applied in order, not two writes where the last wins. — Task 6.
5. **A missing or malformed env var in production** — no `GITHUB_TOKEN`, or `GITHUB_REPO` without a slash. Must fail loudly at the first request with a message naming the variable, never silently no-op a sync. — Task 4.

---

## File Structure

**Create:**
- `lib/authoring/auth.ts` — password check, cookie signing/verification
- `lib/authoring/github.ts` — `GitHubStore` over the Git Data API
- `lib/authoring/pending.ts` — pending-edit model and reducer (pure)
- `app/api/authoring/login/route.ts`
- `app/api/authoring/session/route.ts`
- `app/api/authoring/validate/route.ts`
- `app/api/authoring/sync/route.ts`
- `components/ui/LoginPrompt.tsx`

**Modify:**
- `lib/authoring/devOnly.ts` → rename to `lib/authoring/guard.ts`, export `guardRequest`
- `lib/authoring/devOnly.test.ts` → `lib/authoring/guard.test.ts`
- `lib/authoring/store.ts` — `getStore()` picks `GitHubStore` outside development
- `app/api/authoring/{section,frontmatter,image,card,terminal}/route.ts` — call `guardRequest`
- `components/ui/AuthoringProvider.tsx` — session state, pending edits, `saveEdit`, `sync`
- `components/ui/AuthorDock.tsx` — Sync button, login affordance, hide terminal outside dev
- `components/ui/EditableSection.tsx`, `FrontmatterPanel.tsx`, `AddCardPalette.tsx` — call `saveEdit` instead of fetching routes directly

---

## Task 1: Password check and signed session cookie

**Files:**
- Create: `lib/authoring/auth.ts`, `lib/authoring/auth.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:

```ts
export function checkPassword(supplied: string): boolean
export function signSession(issuedAt: number): string
export function verifySession(value: string | null, now?: number): boolean
export const SESSION_COOKIE = 'ux_authoring'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30
```

- [ ] **Step 1: Write the failing test**

```ts
// lib/authoring/auth.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/authoring/auth.test.ts`
Expected: FAIL — `Cannot find module './auth'`

- [ ] **Step 3: Write the implementation**

```ts
// lib/authoring/auth.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test lib/authoring/auth.test.ts`
Expected: PASS — 11 tests

- [ ] **Step 5: Commit**

```bash
git add lib/authoring/auth.ts lib/authoring/auth.test.ts
git commit -m "feat: add password check and signed session cookie"
```

---

## Task 2: Turn the dev guard into an auth guard

**Files:**
- Create: `lib/authoring/guard.ts`, `lib/authoring/guard.test.ts`
- Delete: `lib/authoring/devOnly.ts`, `lib/authoring/devOnly.test.ts`
- Modify: `app/api/authoring/{section,frontmatter,image,card,terminal}/route.ts`

**Interfaces:**
- Consumes: `verifySession`, `SESSION_COOKIE` from Task 1
- Produces: `export function guardRequest(request?: Request): Response | null`, `export function devOnlyRoute(): Response | null`, `export function readCookie(request: Request, name: string): string | null`

- [ ] **Step 1: Write the failing test**

Copy the whole of `lib/authoring/devOnly.test.ts` to `lib/authoring/guard.test.ts`, rename the import to `./guard` and every `devOnlyGuard` to `guardRequest`, then change the route-walk assertion and add the session cases:

```ts
// in the 'authoring routes' describe, replace the assertion with:
      expect(readFileSync(r, 'utf8')).toContain('guardRequest(request)');

// and append this describe:
import { signSession } from './auth';

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/authoring/guard.test.ts`
Expected: FAIL — `Cannot find module './guard'`

- [ ] **Step 3: Write the guard**

```ts
// lib/authoring/guard.ts
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
```

- [ ] **Step 4: Update every route**

In `app/api/authoring/{section,frontmatter,image,card}/route.ts`, change the import and the first statement:

```ts
import { guardRequest } from '@/lib/authoring/guard';
// ...
  const blocked = guardRequest(request);
  if (blocked) return blocked;
```

In `app/api/authoring/terminal/route.ts`, keep **both** checks, dev-only first:

```ts
import { guardRequest, devOnlyRoute } from '@/lib/authoring/guard';
// ...
  const notDev = devOnlyRoute();
  if (notDev) return notDev;
  const blocked = guardRequest(request);
  if (blocked) return blocked;
```

Then delete `lib/authoring/devOnly.ts` and `lib/authoring/devOnly.test.ts`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun test lib/authoring/ && bunx tsc --noEmit`
Expected: PASS, no type errors. The route-walk test now asserts `guardRequest(request)` across five route files.

- [ ] **Step 6: Commit**

```bash
git add lib/authoring/guard.ts lib/authoring/guard.test.ts app/api/authoring
git rm lib/authoring/devOnly.ts lib/authoring/devOnly.test.ts
git commit -m "feat: gate authoring routes on a session outside development"
```

---

## Task 3: Login and session routes

**Files:**
- Create: `app/api/authoring/login/route.ts`, `app/api/authoring/session/route.ts`

**Interfaces:**
- Consumes: `checkPassword`, `signSession`, `SESSION_COOKIE`, `SESSION_MAX_AGE_SECONDS`, `verifySession`, `readCookie`, `guardRequest`
- Produces: `POST /api/authoring/login` taking `{ password }` → `{ ok: true }` + `Set-Cookie`, or `401`. `GET /api/authoring/session` → `{ authed: boolean, dev: boolean }`.

- [ ] **Step 1: Write the login route**

```ts
// app/api/authoring/login/route.ts
import { checkPassword, signSession, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from '@/lib/authoring/auth';
import { guardRequest } from '@/lib/authoring/guard';

/**
 * Exchange the password for a signed session cookie.
 *
 * Note this route calls `guardRequest` like every other one, which is not
 * circular: in production the session check inside it would reject an
 * unauthenticated caller, so login must run the origin half only. That is why
 * the session check is skipped here explicitly rather than by omission — the
 * route-walk test requires every route to call the guard, and a reader should
 * see why this one differs.
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
  void guardRequest; // referenced so the route-walk convention is explicit

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
```

> **Note for the implementer:** the `void guardRequest;` line above exists only so the
> route-walk test's `guardRequest(request)` substring check does not fail on this file.
> That is a poor reason to keep dead code. Instead, **add `login` to the exemption list
> in the route-walk test** and delete both the `void` line and the import. Update the
> test like this, then remove the import from the route:
>
> ```ts
> const EXEMPT = new Set(['login']); // unauthenticated by definition; does its own origin check
> for (const r of routes) {
>   if (EXEMPT.has(basename(dirname(r)))) continue;
>   expect(readFileSync(r, 'utf8')).toContain('guardRequest(request)');
> }
> ```
>
> Import `basename` and `dirname` from `node:path` in the test.

- [ ] **Step 2: Write the session route**

```ts
// app/api/authoring/session/route.ts
import { SESSION_COOKIE, verifySession } from '@/lib/authoring/auth';
import { guardRequest, readCookie } from '@/lib/authoring/guard';

/**
 * Whether this browser is signed in. Deliberately not guarded by the session
 * check itself — its whole job is to answer "am I signed in?" for a caller who
 * may not be.
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
  void guardRequest;

  return Response.json({
    authed:
      process.env.NODE_ENV === 'development' ||
      verifySession(readCookie(request, SESSION_COOKIE)),
    dev: process.env.NODE_ENV === 'development',
  });
}
```

Apply the same exemption treatment as the login route: add `session` to the test's
`EXEMPT` set and drop the `void guardRequest;` line and its import.

- [ ] **Step 3: Verify**

Run: `bun test lib/authoring/ && bunx tsc --noEmit`
Expected: PASS with the two exempt routes skipped by the route-walk test.

- [ ] **Step 4: Commit**

```bash
git add app/api/authoring/login app/api/authoring/session lib/authoring/guard.test.ts
git commit -m "feat: add login and session routes"
```

---

## Task 4: `GitHubStore`

**Files:**
- Create: `lib/authoring/github.ts`, `lib/authoring/github.test.ts`
- Modify: `lib/authoring/store.ts` (only `getStore`)

**Interfaces:**
- Consumes: `ContentStore`, `FileWrite` from `lib/authoring/store`
- Produces: `export class GitHubStore implements ContentStore { constructor(cfg?: GitHubConfig) }`, `export function githubConfig(): GitHubConfig` where `GitHubConfig = { token: string; owner: string; repo: string; branch: string }`

- [ ] **Step 1: Write the failing test**

```ts
// lib/authoring/github.test.ts
import { expect, test, describe, beforeEach, afterEach } from 'bun:test';
import { GitHubStore, githubConfig } from './github';

const env = process.env as Record<string, string | undefined>;
const saved = { t: env.GITHUB_TOKEN, r: env.GITHUB_REPO, b: env.GITHUB_BRANCH };
const realFetch = globalThis.fetch;

beforeEach(() => {
  env.GITHUB_TOKEN = 'ghp_test';
  env.GITHUB_REPO = 'AtharvaN16/UX-Cheatsheet';
  env.GITHUB_BRANCH = 'main';
});
afterEach(() => {
  env.GITHUB_TOKEN = saved.t;
  env.GITHUB_REPO = saved.r;
  env.GITHUB_BRANCH = saved.b;
  globalThis.fetch = realFetch;
});

const cfg = () => ({ token: 't', owner: 'o', repo: 'r', branch: 'main' });

/** Record every call and answer from a scripted table keyed by method+path. */
function stubFetch(table: Record<string, unknown>) {
  const calls: { method: string; url: string; body: unknown }[] = [];
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, url: u, body });
    const key = Object.keys(table).find((k) => u.includes(k.split(' ')[1]) && k.startsWith(method));
    if (!key) return new Response('not scripted: ' + method + ' ' + u, { status: 500 });
    return new Response(JSON.stringify(table[key]), { status: 200 });
  }) as typeof fetch;
  return calls;
}

describe('githubConfig', () => {
  // Review Focus 5
  test('throws naming the variable when the token is missing', () => {
    delete env.GITHUB_TOKEN;
    expect(() => githubConfig()).toThrow('GITHUB_TOKEN');
  });

  test('throws naming the variable when the repo is malformed', () => {
    env.GITHUB_REPO = 'no-slash-here';
    expect(() => githubConfig()).toThrow('GITHUB_REPO');
  });

  test('parses owner and repo', () => {
    expect(githubConfig()).toEqual({
      token: 'ghp_test',
      owner: 'AtharvaN16',
      repo: 'UX-Cheatsheet',
      branch: 'main',
    });
  });
});

describe('GitHubStore.read', () => {
  test('returns decoded text and the blob sha as version', async () => {
    stubFetch({
      'GET /contents/': {
        content: Buffer.from('hello world\n').toString('base64'),
        sha: 'blob-sha-1',
      },
    });
    const store = new GitHubStore(cfg());
    expect(await store.read('content/methods/x/a.mdx')).toEqual({
      text: 'hello world\n',
      version: 'blob-sha-1',
    });
  });
});

describe('GitHubStore.commit', () => {
  const script = {
    'GET /git/ref/': { object: { sha: 'base-commit' } },
    'GET /git/commits/': { tree: { sha: 'base-tree' } },
    'POST /git/blobs': { sha: 'new-blob' },
    'POST /git/trees': { sha: 'new-tree' },
    'POST /git/commits': { sha: 'new-commit' },
    'PATCH /git/refs/': { object: { sha: 'new-commit' } },
  };

  test('many files produce exactly one commit', async () => {
    const calls = stubFetch(script);
    await new GitHubStore(cfg()).commit(
      [
        { path: 'a.mdx', content: 'A', version: '' },
        { path: 'b.mdx', content: 'B', version: '' },
        { path: 'lib/taxonomy.json', content: '[]', version: '' },
      ],
      'content: batch',
    );
    expect(calls.filter((c) => c.url.includes('/git/commits') && c.method === 'POST').length).toBe(1);
    expect(calls.filter((c) => c.url.includes('/git/blobs')).length).toBe(3);
    expect(calls.filter((c) => c.method === 'PATCH').length).toBe(1);
  });

  test('the tree is built on base_tree so untouched files survive', async () => {
    const calls = stubFetch(script);
    await new GitHubStore(cfg()).commit([{ path: 'a.mdx', content: 'A', version: '' }], 'msg');
    const tree = calls.find((c) => c.url.includes('/git/trees'))!;
    expect((tree.body as { base_tree: string }).base_tree).toBe('base-tree');
  });

  test('binary content is sent base64 and text as utf-8', async () => {
    const calls = stubFetch(script);
    await new GitHubStore(cfg()).commit(
      [
        { path: 'x.png', content: new Uint8Array([1, 2, 3]), version: '' },
        { path: 'y.mdx', content: 'text', version: '' },
      ],
      'msg',
    );
    const blobs = calls.filter((c) => c.url.includes('/git/blobs')).map((c) => c.body as { encoding: string });
    expect(blobs.map((b) => b.encoding).sort()).toEqual(['base64', 'utf-8']);
  });

  test('the ref update is not forced', async () => {
    const calls = stubFetch(script);
    await new GitHubStore(cfg()).commit([{ path: 'a.mdx', content: 'A', version: '' }], 'msg');
    const patch = calls.find((c) => c.method === 'PATCH')!;
    expect((patch.body as { force?: boolean }).force).toBe(false);
  });

  test('a failed ref update surfaces rather than being retried', async () => {
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const u = String(url);
      if ((init?.method ?? 'GET') === 'PATCH') {
        return new Response(JSON.stringify({ message: 'Update is not a fast forward' }), { status: 422 });
      }
      const table: Record<string, unknown> = {
        '/git/ref/': { object: { sha: 'base-commit' } },
        '/git/commits/': { tree: { sha: 'base-tree' } },
        '/git/blobs': { sha: 'new-blob' },
        '/git/trees': { sha: 'new-tree' },
        '/git/commits': { sha: 'new-commit' },
      };
      const key = Object.keys(table).find((k) => u.includes(k))!;
      return new Response(JSON.stringify(table[key]), { status: 200 });
    }) as typeof fetch;

    await expect(
      new GitHubStore(cfg()).commit([{ path: 'a.mdx', content: 'A', version: '' }], 'msg'),
    ).rejects.toThrow('fast forward');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/authoring/github.test.ts`
Expected: FAIL — `Cannot find module './github'`

- [ ] **Step 3: Write the implementation**

```ts
// lib/authoring/github.ts
import type { ContentStore, FileWrite } from './store';

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

/**
 * Read the GitHub settings, failing loudly and by name.
 *
 * A missing variable must not degrade into a sync that quietly does nothing —
 * the user would believe their edits were published.
 */
export function githubConfig(): GitHubConfig {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is not set');

  const repo = process.env.GITHUB_REPO;
  if (!repo || !repo.includes('/')) {
    throw new Error('GITHUB_REPO must be set as "owner/repo"');
  }

  const [owner, name] = repo.split('/');
  if (!owner || !name) throw new Error('GITHUB_REPO must be set as "owner/repo"');

  return { token, owner, repo: name, branch: process.env.GITHUB_BRANCH || 'main' };
}

/**
 * Content storage backed by a GitHub repository.
 *
 * Reads come from GitHub rather than disk because `content/` is not traced into
 * the serverless bundle (the path is built at runtime, so Next cannot see it),
 * and because patching the currently committed text is the correct thing to do
 * anyway.
 *
 * Writes use the **Git Data API**, not the simpler contents API, because the
 * contents endpoint commits one file per call: N edits would mean N commits and
 * N rebuilds, which is exactly what batching exists to avoid. The sequence is
 * ref -> commit -> blobs -> tree -> commit -> move ref: six requests regardless
 * of file count, and atomic — either every edit lands or none does.
 */
export class GitHubStore implements ContentStore {
  private readonly cfg: GitHubConfig;

  constructor(cfg?: GitHubConfig) {
    this.cfg = cfg ?? githubConfig();
  }

  private get base(): string {
    return `https://api.github.com/repos/${this.cfg.owner}/${this.cfg.repo}`;
  }

  private async api<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${this.cfg.token}`,
        accept: 'application/vnd.github+json',
        'content-type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    const text = await res.text();
    if (!res.ok) {
      let message = text;
      try {
        message = (JSON.parse(text) as { message?: string }).message ?? text;
      } catch {
        /* keep the raw body */
      }
      throw new Error(`GitHub ${init?.method ?? 'GET'} ${path} failed (${res.status}): ${message}`);
    }
    return JSON.parse(text) as T;
  }

  async read(path: string): Promise<{ text: string; version: string }> {
    const data = await this.api<{ content: string; sha: string }>(
      `/contents/${path}?ref=${encodeURIComponent(this.cfg.branch)}`,
    );
    return {
      text: Buffer.from(data.content, 'base64').toString('utf8'),
      version: data.sha,
    };
  }

  /** The blob sha a path currently has, for detecting a file that moved. */
  async versionOf(path: string): Promise<string> {
    return (await this.read(path)).version;
  }

  async commit(files: FileWrite[], message: string): Promise<void> {
    const branch = encodeURIComponent(this.cfg.branch);

    const ref = await this.api<{ object: { sha: string } }>(`/git/ref/heads/${branch}`);
    const baseCommit = ref.object.sha;

    const commit = await this.api<{ tree: { sha: string } }>(`/git/commits/${baseCommit}`);
    const baseTree = commit.tree.sha;

    const blobs = await Promise.all(
      files.map(async (f) => {
        const isBinary = typeof f.content !== 'string';
        const blob = await this.api<{ sha: string }>('/git/blobs', {
          method: 'POST',
          body: JSON.stringify({
            content: isBinary
              ? Buffer.from(f.content as Uint8Array).toString('base64')
              : (f.content as string),
            encoding: isBinary ? 'base64' : 'utf-8',
          }),
        });
        return { path: f.path, mode: '100644' as const, type: 'blob' as const, sha: blob.sha };
      }),
    );

    const tree = await this.api<{ sha: string }>('/git/trees', {
      method: 'POST',
      body: JSON.stringify({ base_tree: baseTree, tree: blobs }),
    });

    const created = await this.api<{ sha: string }>('/git/commits', {
      method: 'POST',
      body: JSON.stringify({ message, tree: tree.sha, parents: [baseCommit] }),
    });

    // force:false so a branch that moved between the read above and now is
    // rejected rather than clobbered.
    await this.api(`/git/refs/heads/${branch}`, {
      method: 'PATCH',
      body: JSON.stringify({ sha: created.sha, force: false }),
    });
  }
}
```

- [ ] **Step 4: Point `getStore` at it outside development**

In `lib/authoring/store.ts`, replace `getStore`:

```ts
import { GitHubStore } from './github';

/**
 * Disk in development, GitHub everywhere else. This is the only place the two
 * differ; nothing above this line knows which is in play.
 */
export function getStore(): ContentStore {
  if (process.env.NODE_ENV === 'development') return new DiskStore(process.cwd());
  return new GitHubStore();
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun test lib/authoring/ && bunx tsc --noEmit`
Expected: PASS — including 10 new GitHub tests

- [ ] **Step 6: Commit**

```bash
git add lib/authoring/github.ts lib/authoring/github.test.ts lib/authoring/store.ts
git commit -m "feat: add GitHubStore over the Git Data API"
```

---

## Task 5: The pending-edit model

**Files:**
- Create: `lib/authoring/pending.ts`, `lib/authoring/pending.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:

```ts
export type PendingEdit =
  | { kind: 'section'; id: string; heading: string; markdown: string }
  | { kind: 'frontmatter'; id: string; field: string; value: string }
  | { kind: 'image'; id: string; filename: string; base64: string }
  | { kind: 'card'; title: string; cardKind: string; domainId: string; groupTitle: string | null };

export function addEdit(list: PendingEdit[], edit: PendingEdit): PendingEdit[]
export function describeEdit(edit: PendingEdit): string
export function loadPending(): PendingEdit[]
export function savePending(list: PendingEdit[]): void
export const PENDING_KEY = 'ux-authoring-pending'
```

- [ ] **Step 1: Write the failing test**

```ts
// lib/authoring/pending.test.ts
import { expect, test, describe } from 'bun:test';
import { addEdit, describeEdit, type PendingEdit } from './pending';

const sec = (id: string, heading: string, markdown: string): PendingEdit => ({
  kind: 'section', id, heading, markdown,
});

describe('addEdit', () => {
  // Review Focus 4
  test('two edits to different sections of one card are both kept, in order', () => {
    const list = addEdit(addEdit([], sec('a', 'Tips', 'one')), sec('a', 'Purpose', 'two'));
    expect(list).toEqual([sec('a', 'Tips', 'one'), sec('a', 'Purpose', 'two')]);
  });

  test('re-editing the same section replaces rather than stacks', () => {
    const list = addEdit(addEdit([], sec('a', 'Tips', 'first')), sec('a', 'Tips', 'second'));
    expect(list).toEqual([sec('a', 'Tips', 'second')]);
  });

  test('re-editing keeps its original position in the queue', () => {
    let list = addEdit([], sec('a', 'Tips', 'one'));
    list = addEdit(list, sec('b', 'Tips', 'two'));
    list = addEdit(list, sec('a', 'Tips', 'one-updated'));
    expect(list.map((e) => (e.kind === 'section' ? e.id : ''))).toEqual(['a', 'b']);
    expect(list[0]).toEqual(sec('a', 'Tips', 'one-updated'));
  });

  test('a frontmatter field replaces only itself', () => {
    let list = addEdit([], { kind: 'frontmatter', id: 'a', field: 'effort', value: 'low' });
    list = addEdit(list, { kind: 'frontmatter', id: 'a', field: 'kind', value: 'method' });
    list = addEdit(list, { kind: 'frontmatter', id: 'a', field: 'effort', value: 'high' });
    expect(list.length).toBe(2);
    expect(list[0]).toEqual({ kind: 'frontmatter', id: 'a', field: 'effort', value: 'high' });
  });

  test('a second image for one card replaces the first', () => {
    let list = addEdit([], { kind: 'image', id: 'a', filename: 'x.svg', base64: 'AA' });
    list = addEdit(list, { kind: 'image', id: 'a', filename: 'y.png', base64: 'BB' });
    expect(list.length).toBe(1);
    expect(list[0]).toMatchObject({ filename: 'y.png' });
  });

  test('two new cards both queue', () => {
    let list = addEdit([], { kind: 'card', title: 'A', cardKind: 'method', domainId: 'd', groupTitle: null });
    list = addEdit(list, { kind: 'card', title: 'B', cardKind: 'method', domainId: 'd', groupTitle: null });
    expect(list.length).toBe(2);
  });
});

describe('describeEdit', () => {
  test('names what changed in words a person can scan', () => {
    expect(describeEdit(sec('tree-testing', 'Tips', 'x'))).toBe('tree-testing — Tips');
    expect(describeEdit({ kind: 'frontmatter', id: 'a', field: 'effort', value: 'high' }))
      .toBe('a — effort: high');
    expect(describeEdit({ kind: 'image', id: 'a', filename: 'x.svg', base64: '' }))
      .toBe('a — image');
    expect(describeEdit({ kind: 'card', title: 'New Thing', cardKind: 'method', domainId: 'd', groupTitle: null }))
      .toBe('new card — New Thing');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/authoring/pending.test.ts`
Expected: FAIL — `Cannot find module './pending'`

- [ ] **Step 3: Write the implementation**

```ts
// lib/authoring/pending.ts

export type PendingEdit =
  | { kind: 'section'; id: string; heading: string; markdown: string }
  | { kind: 'frontmatter'; id: string; field: string; value: string }
  | { kind: 'image'; id: string; filename: string; base64: string }
  | { kind: 'card'; title: string; cardKind: string; domainId: string; groupTitle: string | null };

export const PENDING_KEY = 'ux-authoring-pending';

/**
 * Identity of an edit for replacement purposes.
 *
 * Two edits collide when they would write the same thing: the same section of
 * the same card, the same frontmatter field, that card's image. They do NOT
 * collide merely by touching the same file — editing Tips and Purpose on one
 * card must keep both, because sync applies them in order to one file write.
 * New cards never collide; each is its own entry.
 */
function slot(edit: PendingEdit): string {
  switch (edit.kind) {
    case 'section':
      return `section:${edit.id}:${edit.heading}`;
    case 'frontmatter':
      return `frontmatter:${edit.id}:${edit.field}`;
    case 'image':
      return `image:${edit.id}`;
    case 'card':
      return `card:${edit.title}:${edit.domainId}`;
  }
}

/** Append an edit, replacing any earlier edit to the same slot in place. */
export function addEdit(list: PendingEdit[], edit: PendingEdit): PendingEdit[] {
  const key = slot(edit);
  const at = list.findIndex((e) => slot(e) === key);
  if (at === -1) return [...list, edit];
  const next = [...list];
  next[at] = edit;
  return next;
}

/** One scannable line per pending change, for the dock. */
export function describeEdit(edit: PendingEdit): string {
  switch (edit.kind) {
    case 'section':
      return `${edit.id} — ${edit.heading}`;
    case 'frontmatter':
      return `${edit.id} — ${edit.field}: ${edit.value}`;
    case 'image':
      return `${edit.id} — image`;
    case 'card':
      return `new card — ${edit.title}`;
  }
}

/**
 * Pending edits live in the browser. There is no server-side draft store, and
 * adding a KV store for one is a far larger commitment than this feature
 * warrants. Consequences, stated rather than designed around: edits survive a
 * reload, and are per-browser.
 */
export function loadPending(): PendingEdit[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingEdit[]) : [];
  } catch {
    return [];
  }
}

export function savePending(list: PendingEdit[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(list));
  } catch {
    /* quota or private mode — the in-memory set still works this session */
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test lib/authoring/pending.test.ts`
Expected: PASS — 10 tests

- [ ] **Step 5: Commit**

```bash
git add lib/authoring/pending.ts lib/authoring/pending.test.ts
git commit -m "feat: add the pending-edit model"
```

---

## Task 6: Content manifest, then apply a pending set to files

The shared core of both the validate and sync routes: turn N edits into the exact file writes they imply, validating as it goes.

**This task begins with a blocker.** `relPathForMethod` resolves an id to a path
via `getAllMethods()`, which reads `join(process.cwd(), 'content', 'methods')`
off the local disk. That path is built at runtime, so Next cannot statically
analyse it and does not trace `content/` into the serverless bundle — the exact
reason documented in `lib/content/images.ts`. **In production the directory is
not there**, so every route would fail at its first step. Steps 1-4 fix that with
a committed manifest; the rest of the task is `applyEdits`.

**Files:**
- Create: `lib/content/manifest.json`, `lib/content/manifest.test.ts`
- Modify: `lib/authoring/resolve.ts`, `scripts/validate-content.ts`
- Create: `lib/authoring/apply.ts`, `lib/authoring/apply.test.ts`

**Interfaces:**
- Consumes: `PendingEdit`, `ContentStore`, `patchSection`, `patchFrontmatterScalar`, `validateMethodText`, `relPathForMethod`, `insertTaxonomyItem`, `imageTargetFor`, `sniffImage`
- Produces:

```ts
export interface ApplyResult { files: FileWrite[]; errors: string[] }
export async function applyEdits(store: ContentStore, edits: PendingEdit[]): Promise<ApplyResult>
```

Never writes. Returns the files a caller may commit, or the errors that stop it.

- [ ] **Step 1: Generate the manifest and have the validate script keep it current**

The manifest is an id -> domain map, committed, and statically imported so it is
bundled. It is regenerated by `bun run validate`, which already loads every
method, so it cannot drift without the build noticing.

Append to `scripts/validate-content.ts`, just before the final success log:

```ts
// Written here rather than in a separate step because this script already has
// the parsed methods in hand, and because anything that changes the content
// tree must run validate anyway. lib/authoring/resolve.ts imports this file
// statically so it survives into the serverless bundle, where content/ does not.
const manifest = Object.fromEntries(methods.map((m) => [m.id, m.domain]));
await Bun.write(
  join(root, 'lib', 'content', 'manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
```

Then run it to create the file:

```bash
bun run validate
```

- [ ] **Step 2: Write the failing test**

```ts
// lib/content/manifest.test.ts
import { expect, test, describe } from 'bun:test';
import { join } from 'node:path';
import manifest from './manifest.json';
import { loadMethods } from './load';

describe('content manifest', () => {
  test('lists every method with its real domain', () => {
    const { methods } = loadMethods(join(import.meta.dir, '../../content/methods'));
    const actual = Object.fromEntries(methods.map((m) => [m.id, m.domain]));
    expect(manifest).toEqual(actual);
  });

  test('is not empty, so the check above cannot pass vacuously', () => {
    expect(Object.keys(manifest).length).toBeGreaterThan(100);
  });

  test("every entry's domain matches the directory the file is actually in", () => {
    const { methods } = loadMethods(join(import.meta.dir, '../../content/methods'));
    // loadMethods enforces filename == id but never directory == domain, and
    // relPathForMethod reconstructs the path from the domain. If those ever
    // disagree, a write would land at an invented path.
    for (const m of methods) {
      expect((manifest as Record<string, string>)[m.id]).toBe(m.domain);
    }
  });
});
```

- [ ] **Step 3: Run test to verify it passes**

Run: `bun test lib/content/manifest.test.ts`
Expected: PASS — 3 tests

- [ ] **Step 4: Point `relPathForMethod` at the manifest**

Replace `lib/authoring/resolve.ts` entirely:

```ts
import manifest from '../content/manifest.json';

/**
 * Turn a method id into its repo-relative file path.
 *
 * This is why no endpoint accepts a path: an id is looked up in a fixed set, so
 * traversal is not something to sanitize against — an attacker-supplied string
 * simply is not in the set.
 *
 * The lookup is a committed manifest rather than `getAllMethods()`, which reads
 * `content/` from disk. That directory is not traced into the serverless bundle
 * (the path is constructed at runtime, so Next cannot see it), so on the live
 * site the filesystem answer does not exist. A statically imported JSON file
 * does. `bun run validate` regenerates it, and a test asserts it matches the
 * real tree, so it cannot silently drift.
 */
export function relPathForMethod(id: string): string {
  const domain = (manifest as Record<string, string>)[id];
  if (!domain) throw new Error(`unknown method "${id}"`);
  return `content/methods/${domain}/${id}.mdx`;
}
```

The existing `lib/authoring/resolve.test.ts` must still pass unchanged — it only
asserts behaviour, not mechanism.

- [ ] **Step 5: Write the failing test**

```ts
// lib/authoring/apply.test.ts
import { expect, test, describe } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { applyEdits } from './apply';
import type { ContentStore, FileWrite } from './store';
import type { PendingEdit } from './pending';

const REAL = readFileSync(
  join(import.meta.dir, '../../content/methods/ia-structure/tree-testing.mdx'),
  'utf8',
);
const TAX = readFileSync(join(import.meta.dir, '../taxonomy.json'), 'utf8');

function fakeStore(overrides: Record<string, string> = {}): ContentStore {
  return {
    async read(path: string) {
      if (path in overrides) return { text: overrides[path], version: 'v1' };
      if (path.endsWith('tree-testing.mdx')) return { text: REAL, version: 'v1' };
      if (path === 'lib/taxonomy.json') return { text: TAX, version: 'v2' };
      throw new Error(`unexpected read: ${path}`);
    },
    async commit() {
      throw new Error('applyEdits must never commit');
    },
  };
}

describe('applyEdits', () => {
  test('a single section edit produces one file write', async () => {
    const edits: PendingEdit[] = [
      { kind: 'section', id: 'tree-testing', heading: 'Tips', markdown: 'Fresh tips.' },
    ];
    const { files, errors } = await applyEdits(fakeStore(), edits);
    expect(errors).toEqual([]);
    expect(files.length).toBe(1);
    expect(String(files[0].content)).toContain('Fresh tips.');
    expect(files[0].version).toBe('v1');
  });

  // Review Focus 4
  test('two sections of one card collapse into a single file write with both applied', async () => {
    const edits: PendingEdit[] = [
      { kind: 'section', id: 'tree-testing', heading: 'Tips', markdown: 'Tips text.' },
      { kind: 'section', id: 'tree-testing', heading: 'Purpose', markdown: 'Purpose text.' },
    ];
    const { files, errors } = await applyEdits(fakeStore(), edits);
    expect(errors).toEqual([]);
    expect(files.length).toBe(1);
    expect(String(files[0].content)).toContain('Tips text.');
    expect(String(files[0].content)).toContain('Purpose text.');
  });

  test('a section edit and a frontmatter edit on one card also collapse', async () => {
    const edits: PendingEdit[] = [
      { kind: 'section', id: 'tree-testing', heading: 'Tips', markdown: 'Tips text.' },
      { kind: 'frontmatter', id: 'tree-testing', field: 'effort', value: 'high' },
    ];
    const { files } = await applyEdits(fakeStore(), edits);
    expect(files.length).toBe(1);
    expect(String(files[0].content)).toContain('effort: high');
    expect(String(files[0].content)).toContain('Tips text.');
  });

  test('an invalid edit reports an error and produces no files at all', async () => {
    const edits: PendingEdit[] = [
      { kind: 'section', id: 'tree-testing', heading: 'Tips', markdown: 'ok' },
      { kind: 'section', id: 'tree-testing', heading: 'Nope', markdown: 'x' },
    ];
    const { files, errors } = await applyEdits(fakeStore(), edits);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('Nope');
    expect(files).toEqual([]);
  });

  test('an unclosed fence is still refused through this path', async () => {
    const edits: PendingEdit[] = [
      { kind: 'section', id: 'tree-testing', heading: 'Tips', markdown: 'a\n\n```\nopen' },
    ];
    const { errors, files } = await applyEdits(fakeStore(), edits);
    expect(errors.some((e) => e.includes('unclosed code fence'))).toBe(true);
    expect(files).toEqual([]);
  });

  test('a new card produces a taxonomy.json write', async () => {
    const edits: PendingEdit[] = [
      { kind: 'card', title: 'Applied Test Card', cardKind: 'method', domainId: 'ia-structure', groupTitle: null },
    ];
    const { files, errors } = await applyEdits(fakeStore(), edits);
    expect(errors).toEqual([]);
    expect(files.length).toBe(1);
    expect(files[0].path).toBe('lib/taxonomy.json');
    expect(String(files[0].content)).toContain('applied-test-card');
  });

  test('two new cards produce one taxonomy write containing both', async () => {
    const edits: PendingEdit[] = [
      { kind: 'card', title: 'Card One Here', cardKind: 'method', domainId: 'ia-structure', groupTitle: null },
      { kind: 'card', title: 'Card Two Here', cardKind: 'concept', domainId: 'ia-structure', groupTitle: null },
    ];
    const { files, errors } = await applyEdits(fakeStore(), edits);
    expect(errors).toEqual([]);
    expect(files.length).toBe(1);
    expect(String(files[0].content)).toContain('card-one-here');
    expect(String(files[0].content)).toContain('card-two-here');
  });

  test('an image edit produces both the binary and the patched mdx', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>').toString('base64');
    const withImage = REAL.replace(
      '---\n\n##',
      'image:\n  src: /images/methods/tree-testing.svg\n  alt: A tree test diagram showing nesting\n---\n\n##',
    );
    const store = fakeStore({ 'content/methods/ia-structure/tree-testing.mdx': withImage });
    const edits: PendingEdit[] = [
      { kind: 'image', id: 'tree-testing', filename: 'new.svg', base64: svg },
    ];
    const { files, errors } = await applyEdits(store, edits);
    expect(errors).toEqual([]);
    expect(files.map((f) => f.path).sort()).toEqual([
      'content/methods/ia-structure/tree-testing.mdx',
      'public/images/methods/tree-testing.svg',
    ]);
  });

  test('an image whose bytes are not an image is refused', async () => {
    const edits: PendingEdit[] = [
      { kind: 'image', id: 'tree-testing', filename: 'x.png', base64: Buffer.from('nope').toString('base64') },
    ];
    const { errors, files } = await applyEdits(fakeStore(), edits);
    expect(errors.some((e) => e.includes('not a PNG'))).toBe(true);
    expect(files).toEqual([]);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `bun test lib/authoring/apply.test.ts`
Expected: FAIL — `Cannot find module './apply'`

- [ ] **Step 7: Write the implementation**

```ts
// lib/authoring/apply.ts
import type { ContentStore, FileWrite } from './store';
import type { PendingEdit } from './pending';
import { patchSection, patchFrontmatterScalar } from '../content/patch';
import { validateMethodText } from './validate';
import { relPathForMethod } from './resolve';
import { insertTaxonomyItem } from './taxonomyEdit';
import { imageTargetFor, sniffImage } from './imageName';

export interface ApplyResult {
  files: FileWrite[];
  errors: string[];
}

const TAXONOMY_PATH = 'lib/taxonomy.json';

/**
 * Turn a set of pending edits into the file writes they imply.
 *
 * Never writes anything. The same function backs both the validate endpoint
 * (which throws the result away) and sync (which commits it), so what you are
 * told at save time is produced by the identical code path that later runs.
 *
 * Edits are grouped by target file and applied in queue order, so two edits to
 * one card become one write with both changes — not two writes where the last
 * one wins.
 *
 * All-or-nothing: any error returns zero files. A partial sync would leave the
 * pending set in a state neither the user nor the code could reason about.
 */
export async function applyEdits(store: ContentStore, edits: PendingEdit[]): Promise<ApplyResult> {
  const errors: string[] = [];
  const files: FileWrite[] = [];

  // --- method files: group every section/frontmatter/image edit by card ---
  const byMethod = new Map<string, PendingEdit[]>();
  for (const e of edits) {
    if (e.kind === 'card') continue;
    byMethod.set(e.id, [...(byMethod.get(e.id) ?? []), e]);
  }

  for (const [id, group] of byMethod) {
    let rel: string;
    try {
      rel = relPathForMethod(id);
    } catch (err) {
      errors.push((err as Error).message);
      continue;
    }

    let current: { text: string; version: string };
    try {
      current = await store.read(rel);
    } catch (err) {
      errors.push(`${id}.mdx: ${(err as Error).message}`);
      continue;
    }

    let text = current.text;
    let failed = false;

    for (const e of group) {
      try {
        if (e.kind === 'section') {
          text = patchSection(text, e.heading, e.markdown);
        } else if (e.kind === 'frontmatter') {
          text = patchFrontmatterScalar(text, e.field, e.value);
        } else {
          const bytes = new Uint8Array(Buffer.from(e.base64, 'base64'));
          const target = imageTargetFor(id, e.filename);
          const bad = sniffImage(bytes, target.rel.split('.').pop()!);
          if (bad) throw new Error(bad);
          text = patchFrontmatterScalar(text, '  src', target.src);
          files.push({ path: target.rel, content: bytes, version: '' });
        }
      } catch (err) {
        errors.push(`${id}.mdx: ${(err as Error).message}`);
        failed = true;
        break;
      }
    }

    if (failed) continue;

    const invalid = validateMethodText(text, `${id}.mdx`);
    if (invalid.length > 0) {
      errors.push(...invalid);
      continue;
    }

    files.push({ path: rel, content: text, version: current.version });
  }

  // --- taxonomy: every new card folds into one write ---
  const cards = edits.filter((e): e is Extract<PendingEdit, { kind: 'card' }> => e.kind === 'card');
  if (cards.length > 0) {
    try {
      const current = await store.read(TAXONOMY_PATH);
      let json = current.text;
      for (const c of cards) {
        json = insertTaxonomyItem(json, {
          title: c.title,
          kind: c.cardKind as 'concept' | 'framework' | 'method',
          domainId: c.domainId,
          groupTitle: c.groupTitle,
        });
      }
      files.push({ path: TAXONOMY_PATH, content: json, version: current.version });
    } catch (err) {
      errors.push((err as Error).message);
    }
  }

  return errors.length > 0 ? { files: [], errors } : { files, errors: [] };
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `bun test lib/authoring/apply.test.ts && bunx tsc --noEmit`
Expected: PASS — 9 tests, no type errors

- [ ] **Step 9: Commit**

```bash
git add lib/content/manifest.json lib/content/manifest.test.ts lib/authoring/resolve.ts scripts/validate-content.ts lib/authoring/apply.ts lib/authoring/apply.test.ts
git commit -m "feat: resolve paths from a committed manifest and apply pending edits"
```

---

## Task 7: The validate route

**Files:**
- Create: `app/api/authoring/validate/route.ts`

**Interfaces:**
- Consumes: `guardRequest`, `getStore`, `applyEdits`
- Produces: `POST /api/authoring/validate` taking `{ edits: PendingEdit[] }` → `{ ok: true }` or `{ errors: string[] }` with `400`. Writes nothing.

- [ ] **Step 1: Write the route**

```ts
// app/api/authoring/validate/route.ts
import { guardRequest } from '@/lib/authoring/guard';
import { getStore } from '@/lib/authoring/store';
import { applyEdits } from '@/lib/authoring/apply';
import type { PendingEdit } from '@/lib/authoring/pending';

/**
 * Check a pending set without writing anything.
 *
 * This is what makes save-time errors possible on the live site: the whole set
 * for the affected card is applied to the current file and validated, so a bad
 * edit is reported while the text is still on screen rather than minutes later
 * inside a failed sync.
 */
export async function POST(request: Request): Promise<Response> {
  const blocked = guardRequest(request);
  if (blocked) return blocked;

  const { edits } = (await request.json()) as { edits?: PendingEdit[] };
  if (!Array.isArray(edits)) {
    return Response.json({ errors: ['edits must be an array'] }, { status: 400 });
  }

  let result;
  try {
    result = await applyEdits(getStore(), edits);
  } catch (e) {
    return Response.json({ errors: [(e as Error).message] }, { status: 500 });
  }

  if (result.errors.length > 0) {
    return Response.json({ errors: result.errors }, { status: 400 });
  }
  return Response.json({ ok: true });
}
```

- [ ] **Step 2: Verify the guard test covers it**

Run: `bun test lib/authoring/guard.test.ts && bunx tsc --noEmit`
Expected: PASS — the route-walk test now sees the validate route and confirms it calls `guardRequest(request)`

- [ ] **Step 3: Commit**

```bash
git add app/api/authoring/validate
git commit -m "feat: add the validate-only route"
```

---

## Task 8: The sync route

**Files:**
- Create: `app/api/authoring/sync/route.ts`

**Interfaces:**
- Consumes: `guardRequest`, `getStore`, `applyEdits`, `GitHubStore`
- Produces: `POST /api/authoring/sync` taking `{ edits: PendingEdit[] }` → `{ ok: true, files: number }` or `{ errors: string[] }` with `400`/`409`/`500`.

- [ ] **Step 1: Write the route**

```ts
// app/api/authoring/sync/route.ts
import { guardRequest } from '@/lib/authoring/guard';
import { getStore } from '@/lib/authoring/store';
import { applyEdits } from '@/lib/authoring/apply';
import { GitHubStore } from '@/lib/authoring/github';
import type { PendingEdit } from '@/lib/authoring/pending';

/**
 * Commit every pending edit as one revision.
 *
 * Three things have to hold, and each aborts the whole batch rather than
 * committing part of it:
 *
 *  1. The set still validates. Files may have changed since the edit was made.
 *  2. No file moved underneath an edit. The blob sha recorded at read time is
 *     compared against what the repo holds now.
 *  3. The branch did not move. `GitHubStore` updates the ref non-forced, so
 *     GitHub rejects a stale write rather than clobbering a newer commit.
 *
 * A partial sync would leave the client's pending set in a state neither it nor
 * the user could reason about, so there is no partial path at all.
 */
export async function POST(request: Request): Promise<Response> {
  const blocked = guardRequest(request);
  if (blocked) return blocked;

  const { edits } = (await request.json()) as { edits?: PendingEdit[] };
  if (!Array.isArray(edits) || edits.length === 0) {
    return Response.json({ errors: ['nothing to sync'] }, { status: 400 });
  }

  const store = getStore();

  let result;
  try {
    result = await applyEdits(store, edits);
  } catch (e) {
    return Response.json({ errors: [(e as Error).message] }, { status: 500 });
  }

  // Review Focus 2 — abort before creating anything.
  if (result.errors.length > 0) {
    return Response.json({ errors: result.errors }, { status: 400 });
  }

  // Review Focus 3 — a file that moved under an edit.
  if (store instanceof GitHubStore) {
    for (const f of result.files) {
      if (!f.version) continue; // newly created binaries carry no prior version
      try {
        const now = await store.versionOf(f.path);
        if (now !== f.version) {
          return Response.json(
            {
              errors: [
                `${f.path} changed in the repository since you edited it — reload and redo that edit`,
              ],
            },
            { status: 409 },
          );
        }
      } catch (e) {
        return Response.json({ errors: [(e as Error).message] }, { status: 500 });
      }
    }
  }

  const summary =
    result.files.length === 1 ? '1 file' : `${result.files.length} files`;

  try {
    await store.commit(result.files, `content: authoring sync (${summary})`);
  } catch (e) {
    return Response.json({ errors: [(e as Error).message] }, { status: 500 });
  }

  return Response.json({ ok: true, files: result.files.length });
}
```

- [ ] **Step 2: Verify**

Run: `bun test && bunx tsc --noEmit && bun run validate`
Expected: all pass; the route-walk test now covers six guarded routes

- [ ] **Step 3: Commit**

```bash
git add app/api/authoring/sync
git commit -m "feat: add the all-or-nothing sync route"
```

---

## Task 9: Session, pending edits and Sync in the provider

**Files:**
- Modify: `components/ui/AuthoringProvider.tsx`
- Create: `components/ui/LoginPrompt.tsx`

**Interfaces:**
- Consumes: `PendingEdit`, `addEdit`, `describeEdit`, `loadPending`, `savePending`
- Produces: the `useAuthoring()` context gains:

```ts
authed: boolean;
checkingSession: boolean;
needsLogin: boolean;            // true when a shortcut fired while signed out
setNeedsLogin: (v: boolean) => void;
login: (password: string) => Promise<{ ok: boolean; error?: string }>;
pending: PendingEdit[];
saveEdit: (edit: PendingEdit) => Promise<{ ok: boolean; errors?: string[] }>;
sync: () => Promise<{ ok: boolean; errors?: string[] }>;
syncing: boolean;
justSynced: boolean;
```

`IS_DEV` keeps its current meaning and export.

- [ ] **Step 1: Extend the provider**

Replace the body of `AuthoringProvider` with this, keeping the existing `IS_DEV`
export, the `useAuthoring` hook and the keyboard effect exactly as they are, and
adding `⌘⇧S` for sync alongside the existing chords:

```tsx
const [authed, setAuthed] = useState(IS_DEV);
const [checkingSession, setChecking] = useState(!IS_DEV);
const [needsLogin, setNeedsLogin] = useState(false);
const [pending, setPending] = useState<PendingEdit[]>([]);
const [syncing, setSyncing] = useState(false);
const [justSynced, setJustSynced] = useState(false);

// Asked on mount rather than read during render: a cookies() call in a layout
// opts the whole route out of static rendering, and every visitor-facing page
// here is prerendered.
useEffect(() => {
  if (IS_DEV) return;
  let alive = true;
  fetch('/api/authoring/session')
    .then((r) => r.json() as Promise<{ authed: boolean }>)
    .then((d) => { if (alive) { setAuthed(d.authed); setChecking(false); } })
    .catch(() => { if (alive) setChecking(false); });
  return () => { alive = false; };
}, []);

useEffect(() => { if (!IS_DEV) setPending(loadPending()); }, []);
useEffect(() => { if (!IS_DEV) savePending(pending); }, [pending]);

// Unsynced work is only in this browser, so leaving silently loses it.
useEffect(() => {
  if (IS_DEV || pending.length === 0) return;
  const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
  window.addEventListener('beforeunload', warn);
  return () => window.removeEventListener('beforeunload', warn);
}, [pending.length]);

const login = async (password: string) => {
  const res = await fetch('/api/authoring/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (res.ok) { setAuthed(true); setNeedsLogin(false); return { ok: true }; }
  return { ok: false, error: 'Wrong password' };
};

/**
 * One save path for every editor.
 *
 * In development the edit is written to the working tree immediately, because
 * the files are right there. On the live site it is validated against the
 * current repository contents and then queued; Sync commits the queue. Callers
 * do not branch on environment — this is the only place that does.
 */
const saveEdit = async (edit: PendingEdit) => {
  // Development commits a batch of one, straight through the same code the
  // live site uses: applyEdits -> DiskStore.commit, which is a plain file
  // write. Sharing the path is the point — dev exercises production's logic
  // every time you save, and there is no second implementation to keep honest.
  if (IS_DEV) {
    const res = await fetch('/api/authoring/sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ edits: [edit] }),
    });
    if (res.ok) return { ok: true };
    const d = (await res.json()) as { errors?: string[] };
    return { ok: false, errors: d.errors ?? ['save failed'] };
  }

  const next = addEdit(pending, edit);
  const res = await fetch('/api/authoring/validate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ edits: next }),
  });
  if (!res.ok) {
    const d = (await res.json()) as { errors?: string[] };
    return { ok: false, errors: d.errors ?? ['this edit is not valid'] };
  }
  setPending(next);
  return { ok: true };
};

const sync = async () => {
  if (pending.length === 0) return { ok: true };
  setSyncing(true);
  const res = await fetch('/api/authoring/sync', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ edits: pending }),
  });
  setSyncing(false);
  if (!res.ok) {
    const d = (await res.json()) as { errors?: string[] };
    return { ok: false, errors: d.errors ?? ['sync failed'] };
  }
  setPending([]);            // committed; the queue is now the repo's problem
  setJustSynced(true);
  setTimeout(() => setJustSynced(false), 90_000);
  return { ok: true };
};
```

Images travel as base64 inside the JSON body in both environments, so there is
no multipart branch anywhere. `applyEdits` decodes and sniffs the bytes before
anything is written.

Add `⌘⇧S` to the keyboard effect, matching the existing `e.code` style:

```tsx
if (e.code === 'KeyS' && cmd && e.shiftKey) {
  e.preventDefault();
  void sync();
}
```

- [ ] **Step 2: Write the login prompt**

```tsx
// components/ui/LoginPrompt.tsx
'use client';

import { useState } from 'react';
import { useAuthoring } from './AuthoringProvider';

/**
 * The password gate. Styled as the command palette is — same cream surface,
 * 14px radius, beige header — so it reads as part of the product rather than
 * a browser dialog.
 *
 * `data-authoring` exempts it from the global 500px dialog rules in
 * globals.css, which exist to pin the search palette.
 */
export function LoginPrompt() {
  const { needsLogin, setNeedsLogin, login } = useAuthoring();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!needsLogin) return null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    const r = await login(password);
    setBusy(false);
    if (r.ok) setPassword('');
    else setError(r.error ?? 'Wrong password');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sign in to edit"
      data-authoring
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/40 pt-[18vh]"
      onClick={() => setNeedsLogin(false)}
    >
      <div
        className="w-full max-w-[420px] overflow-hidden rounded-[14px] border border-[#DCD7CC] bg-[#FAF8F5] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-[52px] items-center border-b border-[#DCD7CC] bg-[#EAE6DD] px-5 text-[15px] font-semibold text-[#2D2B28]">
          Sign in to edit
        </div>
        <div className="space-y-3 p-5">
          <input
            autoFocus
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submit();
              if (e.key === 'Escape') { e.stopPropagation(); setNeedsLogin(false); }
            }}
            placeholder="Password"
            className="w-full rounded-[9px] border border-[#E4DED2] bg-white px-3 py-2 text-[15px] text-[#23211D] outline-none focus:border-[#5A92C6]"
          />
          {error && <p className="text-[14px] text-[#A33]">{error}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={busy || password === ''}
            className="w-full rounded-[8px] bg-[#5A92C6] py-2 text-[14px] font-semibold text-white disabled:opacity-60"
          >
            {busy ? 'Checking…' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run: `bunx tsc --noEmit && bun test`
Expected: clean, all tests pass

- [ ] **Step 4: Commit**

```bash
git add components/ui/AuthoringProvider.tsx components/ui/LoginPrompt.tsx
git commit -m "feat: add session, pending edits and sync to the authoring provider"
```

---

## Task 10: Dock and editors on the new save path

**Files:**
- Modify: `components/ui/AuthorDock.tsx`, `components/ui/EditableSection.tsx`, `components/ui/FrontmatterPanel.tsx`, `components/ui/AddCardPalette.tsx`

**Interfaces:**
- Consumes: everything Task 9 added to `useAuthoring()`
- Produces: no new exports

- [ ] **Step 1: Route every editor through `saveEdit`**

In `EditableSection.tsx`, replace the direct `fetch('/api/authoring/section', …)` in `save` with:

```tsx
const r = await saveEdit({ kind: 'section', id: methodId, heading, markdown: draft });
setSaving(false);
if (r.ok) {
  setOpen(false);
  if (IS_DEV) router.refresh();
} else {
  setErrors(r.errors ?? ['save failed']);
}
```

taking `saveEdit` from `useAuthoring()`. Do the same in `FrontmatterPanel.tsx`
(`{ kind: 'frontmatter', id: method.id, field, value }` and, for the drop slot,
`{ kind: 'image', id: method.id, filename: file.name, base64 }` where `base64`
comes from reading the `File` with `FileReader`), and in `AddCardPalette.tsx`
(`{ kind: 'card', title, cardKind: kind, domainId, groupTitle }`).

On the live site `router.refresh()` is pointless — the page is a build artefact —
so it is guarded on `IS_DEV`.

- [ ] **Step 2: Rewrite the dock**

`AuthorDock` renders when `IS_DEV || authed`. It gains a Sync control, hides the
terminal button outside development, and offers sign-in when signed out:

```tsx
const { isEditing, toggleEditing, setAddOpen, authed, checkingSession, setNeedsLogin,
        pending, sync, syncing, justSynced } = useAuthoring();

if (checkingSession) return null;

if (!IS_DEV && !authed) {
  return (
    <button
      type="button"
      onClick={() => setNeedsLogin(true)}
      className="fixed bottom-[14px] left-[14px] z-50 rounded-[11px] border border-[#E4DED2] bg-white px-3 py-2 text-[13px] font-semibold text-[#5C574A] shadow-[0_6px_20px_rgba(35,33,29,0.11)]"
    >
      Sign in to edit
    </button>
  );
}
```

and, inside the existing pill, after the add button:

```tsx
{!IS_DEV && pending.length > 0 && (
  <button
    type="button"
    onClick={() => void sync()}
    disabled={syncing}
    title={pending.map(describeEdit).join('\n')}
    className="rounded-[8px] bg-[#5A92C6] px-2.5 py-1 text-[12px] font-semibold text-white disabled:opacity-60"
  >
    {syncing ? 'Syncing…' : `Sync ${pending.length}`}
  </button>
)}
{!IS_DEV && justSynced && pending.length === 0 && (
  <span className="text-[12px] text-[#2E8A75]">live in ~1 min</span>
)}
{IS_DEV && (
  <button type="button" onClick={openTerminal} title="Open terminal here" className={`${ICON} ${IDLE}`}>▶_</button>
)}
```

The `DEV` label becomes `DEV` in development and `EDIT` otherwise, and the status
dot turns amber while anything is pending so unsynced work is visible from any page.

- [ ] **Step 3: Delete the now-dead per-type routes**

Every save goes through `/api/authoring/sync` now, so these four have no
callers and would be four more unguarded surfaces to keep correct:

```bash
git rm -r app/api/authoring/section app/api/authoring/frontmatter \
          app/api/authoring/image app/api/authoring/card
```

Confirm nothing references them:

```bash
grep -rn "authoring/\(section\|frontmatter\|image\|card\)" app components lib
```

Expected: no output. The route-walk guard test now covers `sync`, `validate`
and `terminal`.

- [ ] **Step 4: Verify**

Run: `bun test && bunx tsc --noEmit && bun run validate`
Expected: all pass

- [ ] **Step 5: Confirm development is unchanged**

Run `bun dev`, open a card, press `⌘⇧E`, edit a section, press `⌘S`.
Expected: saves immediately, `git diff` shows the change, **no Sync button appears**.

- [ ] **Step 6: Commit**

```bash
git add -A components/ui app/api/authoring
git commit -m "feat: unify saves on one path and add the Sync control"
```

---

## Task 11: Deployment setup

**Files:**
- Create: `docs/authoring-setup.md`

Not code, but the feature does not work without it and the steps are easy to get
subtly wrong.

- [ ] **Step 1: Write the setup guide**

Document, with exact commands:

1. **Generate the password and secret.** `openssl rand -base64 32` for each. The
   password must be generated, not chosen — serverless instances share no memory,
   so there is no effective rate limiting, and entropy is the actual defence.
2. **Create a fine-grained GitHub token** scoped to **only** `AtharvaN16/UX-Cheatsheet`,
   with `Contents: Read and write` and nothing else.
3. **Set the variables on Vercel**, production environment:
   ```bash
   vercel env add AUTHORING_PASSWORD production
   vercel env add AUTHORING_SECRET production
   vercel env add GITHUB_TOKEN production
   vercel env add GITHUB_REPO production      # AtharvaN16/UX-Cheatsheet
   vercel env add GITHUB_BRANCH production    # main
   ```
4. **Redeploy**, because env vars are read at runtime but the deployment must be
   rebuilt to pick up new ones reliably.
5. **Verify**: visit the site, confirm "Sign in to edit" appears, sign in, edit one
   section, press Sync, and watch a commit appear on `main`.
6. **The branch-drift note**: live edits land on `main` while feature work happens
   on `dev`. Pull `main` into `dev` regularly or a later merge will revert live edits.

- [ ] **Step 2: Commit**

```bash
git add docs/authoring-setup.md
git commit -m "docs: how to configure authoring on the deployed site"
```

---

## Sequencing

Tasks 1–8 are server-side and independently testable with no deployment.
Tasks 9–10 are the client. Task 11 is configuration.

Parallel-safe groupings (disjoint files):

- **Wave 1:** Task 1 (auth) ∥ Task 4 (GitHubStore) ∥ Task 5 (pending)
- **Wave 2:** Task 2 (guard + routes) — touches all existing route files, run alone
- **Wave 3:** Task 3 (login/session routes) ∥ Task 6 (apply)
- **Wave 4:** Task 7 (validate route) ∥ Task 8 (sync route)
- **Wave 5:** Task 9 (provider + login prompt) — then Task 10 (dock + editors), which depends on it
- **Wave 6:** Task 11 (docs)

The first deployment-dependent verification is after Task 10: cookie `Secure` and
`SameSite` behaviour cannot be exercised on `localhost` alone.
