# Authoring mode — deployment setup

How to turn on password-protected editing on the deployed site.

Once configured, visiting the production URL shows a **Sign in to edit** control.
After signing in, edits are saved into a pending set held in the browser's
`localStorage`; pressing **Sync** sends the whole set to
`POST /api/authoring/sync`, which commits it to GitHub as **one commit** on
`main`, which triggers **one Vercel rebuild**.

Related reading:

- Design: `docs/superpowers/specs/2026-09-28-authoring-mode-design.md`
- Plan: `docs/superpowers/plans/2026-09-28-authoring-mode-live.md` (Task 11)

## What you are configuring

Five environment variables, all read at runtime by the authoring code. None of
them may ever be committed to the repository.

| Name | Read by | Missing behaviour |
|---|---|---|
| `AUTHORING_PASSWORD` | `lib/authoring/auth.ts` → `checkPassword` | **Every** password is rejected — the site is closed, not open |
| `AUTHORING_SECRET` | `lib/authoring/auth.ts` → `signSession` / `verifySession` | `signSession` throws `AUTHORING_SECRET is not set`; sign-in returns a 500 |
| `GITHUB_TOKEN` | `lib/authoring/github.ts` → `githubConfig` | `githubConfig` throws `GITHUB_TOKEN is not set` |
| `GITHUB_REPO` | `lib/authoring/github.ts` → `githubConfig` | throws `GITHUB_REPO must be set as "owner/repo"` |
| `GITHUB_BRANCH` | `lib/authoring/github.ts` → `githubConfig` | falls back to `main` — set it explicitly anyway |

Set them on **Production only**. Preview deployments then have no
`AUTHORING_PASSWORD`, so `checkPassword` rejects everything and previews stay
closed. That is deliberate, and is why `checkPassword` returns `false` rather
than `true` when the variable is unset.

### Prerequisites

The repository is already linked to the Vercel project `ux-cheatsheet`
(`.vercel/project.json`). If you are on a fresh machine:

```bash
vercel login
vercel link
```

Confirm the CLI is new enough to have the flags used below:

```bash
vercel --version
```

These instructions were checked against **Vercel CLI 59.10.0**.

---

## 1. Generate `AUTHORING_PASSWORD` and `AUTHORING_SECRET`

Run this twice — once for each variable. Do not reuse one value for both.

```bash
openssl rand -base64 32    # AUTHORING_PASSWORD
openssl rand -base64 32    # AUTHORING_SECRET
```

Each produces a 44-character base64 string (32 bytes of entropy). Put both in a
password manager immediately — you will need `AUTHORING_PASSWORD` to sign in,
and neither can be read back out of Vercel if you store it as a Secret.

### Why the password must be generated, not chosen

This is the part that is easy to get wrong, so it is stated plainly.

There is **no rate limiting** on the login endpoint. Vercel Functions are
serverless: instances share no memory, so an in-process attempt counter is
per-instance and close to useless. Rather than ship something that looks like
protection and is not, `app/api/authoring/login/route.ts` applies a **fixed
500 ms delay on every attempt** — success or failure, before the password is
even compared:

```ts
await new Promise((r) => setTimeout(r, 500));
```

That delay is a cheap extra cost imposed on an attacker; it is not a defence.
**Entropy is the defence.** 32 random bytes makes online brute force infeasible
without any shared state. A memorable password would not, because nothing stops
an attacker from trying as fast as the platform will answer.

Real rate limiting would need a KV store. That is a deliberate later decision,
not an oversight — see the "On rate limiting, honestly" section of the design
spec.

To be clear about the level of assurance: this is **deliberately soft auth for a
personal site**. It keeps out drive-by traffic and search engines. It is not a
security boundary you should put anything valuable behind. See
[What this does not protect against](#what-this-does-not-protect-against).

---

## 2. Create the GitHub fine-grained personal access token

The token is what lets the running site commit. It must be scoped as narrowly as
GitHub allows.

**Where in the GitHub UI:**

> Click your avatar (top right) → **Settings** → **Developer settings** (bottom
> of the left sidebar) → **Personal access tokens** → **Fine-grained tokens** →
> **Generate new token**

Direct link: <https://github.com/settings/personal-access-tokens/new>

Fill it in as follows:

1. **Token name** — something you will recognise later, e.g.
   `ux-cheatsheet-authoring`.
2. **Expiration** — pick a date you will actually notice. Fine-grained tokens
   expire; when this one does, every Sync fails with
   `GitHub GET /contents/... failed (401): Bad credentials`. Put the expiry in
   your calendar.
3. **Resource owner** — `AtharvaN16`.
4. **Repository access** — select **Only select repositories**, then choose
   **`AtharvaN16/UX-Cheatsheet`** and nothing else. Do not use *All
   repositories* or *Public repositories*.
5. **Permissions → Repository permissions** — find **Contents** and set it to
   **Read and write**. Leave every other permission at *No access*.

   GitHub will automatically add **Metadata: Read-only** as soon as any
   repository permission is selected. That one is mandatory and cannot be turned
   off; it is expected. Nothing else should appear in the summary.

6. **Generate token**, then copy the value. GitHub shows it exactly once.

The resulting token's entire capability is: read and write file contents in one
repository. It cannot touch Actions, settings, other repositories, or anything
else.

> Note on API cost: the GitHub REST API is free on all plans, the authenticated
> limit is 5,000 requests/hour, and one sync makes roughly six requests. GitHub
> *Actions* — the metered product — is not used at all. The only metered
> resource here is Vercel build minutes, at one build per **sync**, not per edit.

---

## 3. Set the five variables on Vercel

Run each of these from the repository root. Each command prompts for the value
interactively, which keeps the secret out of your shell history:

```bash
vercel env add AUTHORING_PASSWORD production
vercel env add AUTHORING_SECRET production
vercel env add GITHUB_TOKEN production
vercel env add GITHUB_REPO production        # value: AtharvaN16/UX-Cheatsheet
vercel env add GITHUB_BRANCH production      # value: main
```

Paste the values at the prompt. `GITHUB_REPO` must be exactly
`AtharvaN16/UX-Cheatsheet` — `githubConfig()` splits on `/` and throws if there
is no slash.

Useful, verified variations:

```bash
# Store a value as a write-only Secret (you can never read it back)
vercel env add AUTHORING_PASSWORD production --sensitive

# Replace a value you already set
vercel env add AUTHORING_PASSWORD production --force

# Non-interactive (leaks the value into shell history — prefer the prompt)
vercel env add GITHUB_BRANCH production --value main
```

Confirm all five landed:

```bash
vercel env list production
```

Expected: five rows — `AUTHORING_PASSWORD`, `AUTHORING_SECRET`, `GITHUB_TOKEN`,
`GITHUB_REPO`, `GITHUB_BRANCH` — all with a Production target. The list shows
names and targets, not values.

---

## 4. Redeploy

Environment variables are bound to a deployment when that deployment is built.
The deployment currently serving production was built **before** these variables
existed, so it will not see them. You must rebuild.

Either rebuild the existing production deployment (no code change):

```bash
vercel list --environment production --limit 1    # copy the deployment URL
vercel redeploy <that-url> --target production
```

Or push to `main` and let the Git integration rebuild:

```bash
git checkout main
git pull
git commit --allow-empty -m "chore: rebuild to pick up authoring env vars"
git push origin main
```

Wait for the build to report ready:

```bash
vercel list --environment production --limit 3
```

---

## 5. Verify it works end to end

Do this once, all the way through. Half of the failure modes only appear on a
real deployment.

1. **Visit the production site.** Find the URL with
   `vercel list --environment production --limit 1`, or from the Vercel
   dashboard.

2. **Confirm "Sign in to edit" appears.** A small pill in the bottom-left
   corner. If nothing appears at all, the session check
   (`GET /api/authoring/session`) has not returned yet or returned an error —
   open the browser devtools Network tab and look at that request. It should
   return `{"authed":false,"dev":false}`.

   If it returns `{"authed":true,...}` on a page you have never signed into,
   stop: `NODE_ENV` is not `production` in that deployment and everything is
   open.

3. **Sign in.** Click the pill, paste `AUTHORING_PASSWORD`, press Enter. Expect
   roughly a half-second pause (the fixed delay), then the pill becomes the full
   authoring dock. In devtools, `POST /api/authoring/login` returns `200` and a
   `Set-Cookie: ux_authoring=...; Path=/; HttpOnly; SameSite=Lax; Secure;
   Max-Age=2592000` header.

   A wrong password returns `401` with body `{"errors":["wrong password"]}`.

4. **Edit one section.** Open any card, toggle edit mode, click the pencil on a
   `##` section, change a word, save. The save round-trips through
   `POST /api/authoring/validate`, which returns `{"ok":true}` — it writes
   nothing. The edit is now pending, and the dock's Sync button appears showing
   the count.

   Reload the page: the pending count survives, because pending edits live in
   `localStorage` under the key `ux-authoring-pending`.

5. **Press Sync.** `POST /api/authoring/sync` runs the whole set through
   `applyEdits`, re-checks that no file moved underneath an edit, then makes one
   commit. Success returns `{"ok":true,"files":1}` and the dock shows
   "live in ~1 min".

6. **Watch the commit land on `main`:**

   ```bash
   git fetch origin main
   git log --oneline origin/main -3
   ```

   or without a local checkout:

   ```bash
   gh api repos/AtharvaN16/UX-Cheatsheet/commits --jq '.[0].commit.message'
   ```

   Expected message: `content: authoring sync (1 file)` — or
   `content: authoring sync (N files)` for a larger batch. One commit, however
   many edits were in the set.

7. **Watch the rebuild finish:**

   ```bash
   vercel list --environment production --limit 3
   ```

   The newest deployment should move from `Building` to `Ready`. Then reload the
   site — the edit is now in the served HTML rather than only in your browser's
   pending set.

If all seven steps pass, the feature is configured correctly.

---

## What this does not protect against

On the record, so these are known limits rather than assumptions:

- **One shared password, no per-user identity.** Anyone who has the password is
  "the author". There is no user list, no per-person credential, and no audit
  trail of who made an edit. Every commit is authored by whoever owns
  `GITHUB_TOKEN`, regardless of who pressed Sync.
- **No revocation short of changing the environment variable.** There is no
  session store and no deny-list. To lock someone out you must change
  `AUTHORING_PASSWORD` **and** rotate `AUTHORING_SECRET` — changing the password
  alone does nothing to sessions that already exist, because a session's validity
  depends only on its HMAC and its age. Rotating `AUTHORING_SECRET` invalidates
  every outstanding cookie at once, including your own. Both require a redeploy
  to take effect.
- **A session cookie valid for 30 days.** `SESSION_MAX_AGE_SECONDS` in
  `lib/authoring/auth.ts` is `60 * 60 * 24 * 30`. The cookie is `HttpOnly`,
  `Secure` and `SameSite=Lax`, and its payload is `<issuedAtMs>.<hmac>` — it
  carries its own proof, so a stolen cookie works from anywhere for the
  remainder of those 30 days.
- **No rate limiting.** Only the fixed 500 ms delay described above.
- **The token's blast radius is the whole repository, not just `content/`.**
  `Contents: Read and write` covers every file. The application only ever writes
  paths it constructs itself — `content/methods/<domain>/<id>.mdx`,
  `public/images/methods/<id>.<ext>`, `lib/taxonomy.json` — but the credential
  itself is not that narrow.
- **Anyone who signs in can commit to `main` and trigger production deploys.**
  Edits are validated before committing, and the API restricts frontmatter
  changes to four closed enums (`kind`, `gives`, `effort`, `timeframe`) so no
  other line can be rewritten — a security review found that allowlist missing
  and it was restored. `validateMethodText` also refuses an `id` that no longer
  matches its filename, which is the one edit that would commit cleanly and then
  fail every later build. That said, the authoring path validates *less* than
  `bun run validate` does: it does not re-check cross-references across the whole
  content set. A valid, unwanted edit will go live, and an exotic one could still
  in principle produce a repo state the build rejects.
- **The endpoints are the boundary, not the UI.** Hiding the dock protects
  nothing. Every route under `app/api/authoring/` calls `guardRequest(request)`
  before reading the request body (`terminal` calls the stricter `devOnlyRoute()`
  first, so it 404s in production even for a signed-in user; `login` and
  `session` do their own origin check inline and are exempted by name in
  `lib/authoring/guard.test.ts`). Cross-origin
  protection is the `Origin` / `Sec-Fetch-Site` header check in
  `guardRequest` — adequate for modern browsers, and not a substitute for the
  session check.

---

## Troubleshooting

Every string below was read out of the code, not invented. The **Source** column
says where to look when the message changes.

### Sign-in problems

| What you see | Cause | Fix | Source |
|---|---|---|---|
| `401` with `{"errors":["wrong password"]}` | Wrong password — **or** `AUTHORING_PASSWORD` is unset, in which case `checkPassword` rejects everything, including an empty string | Re-check the value with `vercel env list production`; re-add with `--force` and redeploy | `app/api/authoring/login/route.ts`, `lib/authoring/auth.ts` |
| Sign-in returns `500`; logs show `AUTHORING_SECRET is not set` | `signSession` throws when the secret is missing. `verifySession` catches the same error and returns `false` (closed, not open), so you get a 500 on login and a silent 401 everywhere else | Set `AUTHORING_SECRET` and redeploy | `lib/authoring/auth.ts` |
| Sign-in appears to succeed but you are signed out on the next request | The cookie is set `Secure`, so it is dropped over plain HTTP on a non-local host | Use the HTTPS URL. Note `http://localhost` is exempt: browsers treat it as a trustworthy origin, so sign-in *does* work against `next start` locally — verified in Chrome | `app/api/authoring/login/route.ts` |
| Sign-in worked a month ago, now every request is `401` | `SESSION_MAX_AGE_SECONDS` is 30 days; `verifySession` rejects anything older | Sign in again | `lib/authoring/auth.ts` |

### Guard rejections

| What you see | Cause | Source |
|---|---|---|
| `401` with `{"errors":["not signed in"]}` | No session cookie, an expired one, a tampered one, or one signed with a different `AUTHORING_SECRET`. Also returned if `AUTHORING_SECRET` is missing, because `verifySession` fails closed | `lib/authoring/guard.ts` |
| `403` with an **empty body** | The origin half of the guard. Either `Sec-Fetch-Site` was something other than `same-origin`/`none`, or the `Origin` header's host did not match the `Host` header. Usually means the request came from another site, a rewriting proxy, or a tool sending a stray `Origin` | `lib/authoring/guard.ts` |
| `404` with an empty body on `/api/authoring/terminal` | `devOnlyRoute()` — there is no terminal on a serverless function, so this route is 404 in production even for an authenticated user | `lib/authoring/guard.ts` |

### GitHub configuration

These come from `githubConfig()` in `lib/authoring/github.ts` and surface as a
`500` from the sync route with the message in `errors[0]`.

| Message | Cause | Fix |
|---|---|---|
| `GITHUB_TOKEN is not set` | Variable missing from the Production environment, or set after the current deployment was built | `vercel env add GITHUB_TOKEN production`, then redeploy |
| `GITHUB_REPO must be set as "owner/repo"` | Unset, or has no `/` — e.g. `UX-Cheatsheet` instead of `AtharvaN16/UX-Cheatsheet`. Also thrown when either side of the slash is empty | Set it to exactly `AtharvaN16/UX-Cheatsheet` |

### GitHub API failures

All GitHub errors are wrapped by the same line in `lib/authoring/github.ts`:

```
GitHub <METHOD> <path> failed (<status>): <the API's own message>
```

so the status code and the path tell you which step of the six-request sequence
(ref → commit → blobs → tree → commit → move ref) failed.

| Message | Cause | Fix |
|---|---|---|
| `GitHub GET /contents/... failed (401): Bad credentials` | Token is wrong, revoked, or expired | Generate a new fine-grained token (section 2) and re-add `GITHUB_TOKEN` with `--force`, then redeploy |
| `GitHub POST /git/blobs failed (403): Resource not accessible by personal access token` | The token lacks **Contents: Read and write**, or the repository was not added to its *Only select repositories* list | Edit the token's permissions in the GitHub UI; the change takes effect immediately, no redeploy needed |
| `GitHub GET /contents/... failed (404): Not Found` | Wrong `GITHUB_REPO`, or a token that cannot see the repository at all (a 404 rather than a 403 is how GitHub hides repositories from unauthorised tokens). Can also mean `GITHUB_BRANCH` names a branch that does not exist | Check `GITHUB_REPO` and `GITHUB_BRANCH` |
| `GitHub GET /git/ref/heads/... failed (404): Not Found` | `GITHUB_BRANCH` does not name a real branch | Set it to `main` |
| `GitHub PATCH /git/refs/heads/main failed (422): Update is not a fast forward` | `main` moved between reading the tree and moving the ref. The ref update is deliberately **not forced**, so GitHub refuses rather than clobbering the newer commit | Press Sync again. Nothing was lost — every pending edit is retained |

### Sync failures

| What you see | Meaning | Source |
|---|---|---|
| `409` with `<path> changed in the repository since you edited it — reload and redo that edit` | The blob SHA recorded when you made the edit no longer matches what the repo holds. Someone (or something) changed that file in GitHub in the meantime. **Nothing was committed** — the check runs before any blob is created | `app/api/authoring/sync/route.ts` |
| `400` with `{"errors":["nothing to sync"]}` | The request carried an empty or non-array `edits` | `app/api/authoring/sync/route.ts` |
| `400` with a list of validation errors | The pending set no longer produces valid content. Sync is all-or-nothing: **zero** files are committed and every pending edit is retained | `app/api/authoring/sync/route.ts`, `lib/authoring/apply.ts` |

Validation errors inside that `400` come from the shared apply path. Method-file
errors are prefixed with `<id>.mdx: `:

| Message | Meaning | Source |
|---|---|---|
| `unknown method "<id>"` | The id is not in `lib/content/manifest.json`. Regenerate it with `bun run validate` and commit the result | `lib/authoring/resolve.ts` |
| `<id>.mdx: sections — missing <list>` | The edit removed a section the card's `kind` requires — most often after changing `kind` in the frontmatter panel | `lib/authoring/validate.ts` |
| `<id>.mdx: sections — duplicate heading(s) <list>` | Two sections now share a heading | `lib/authoring/validate.ts` |
| `<id>.mdx: unclosed code fence — …` (full text below) | A section's markdown opens a fence it never closes. Refused because an unclosed fence hides every following `## ` from the scanner | `lib/content/patch.ts` |
| `<id>.mdx: unknown section "<heading>"` | The heading being patched is not in the file — usually a stale pending edit against a card that has since been restructured | `lib/content/patch.ts` |
| `<id>.mdx: edit would restructure the card: headings went from [...] to [...] — a section edit may only change that section's text` | The submitted markdown added or removed a `##` heading. A section edit may only change text inside its own section | `lib/content/patch.ts` |
| `<id>.mdx: unknown frontmatter field "<field>"` | The field is not present in the file's leading `---` block. Frontmatter is patched line-by-line and never re-serialized | `lib/content/patch.ts` |
| `<id>.mdx: not a PNG (bad file signature)` (also `not a JPEG`, `not a WebP`, `not an SVG (no <svg> root element found)`) | The uploaded bytes do not match the extension. Extension alone is a claim, not evidence | `lib/authoring/imageName.ts` |
| `<id>.mdx: unsupported image type "<ext>" — use one of png, jpg, jpeg, svg, webp` | Wrong file type dropped on the image slot | `lib/authoring/imageName.ts` |
| `id "<id>" already exists` | Add-card collided with an existing taxonomy id | `lib/authoring/taxonomyEdit.ts` |
| `unknown domain "<id>"` / `unknown group "<title>"` | Add-card targeted a domain or group that is not in `lib/taxonomy.json` | `lib/authoring/taxonomyEdit.ts` |

The unclosed-fence message in full, as thrown by `lib/content/patch.ts`:

~~~text
unclosed code fence — every ``` or ~~~ must be closed, or the rest of the card becomes invisible
~~~

If the browser shows a bare `save failed`, `this edit is not valid` or
`sync failed`, that is the client's fallback in
`components/ui/AuthoringProvider.tsx` for a response with no `errors` array —
check the Network tab for the real status code, and `vercel logs` for the
server-side message.

```bash
vercel logs --environment production --follow
```

---

## Branch drift — read this before it bites you

**Live edits commit to `main`. Feature work happens on `dev`.** These two
diverge, and the divergence is silent.

The commit target is forced: the point of the feature is to change the live site,
and the live site builds from `main`. There is nothing to configure here — it is
a workflow cost of editing production directly, and it is not solvable in code.

The consequence: if you branch off `dev`, work for a week, and merge `dev` into
`main`, that merge can **conflict with — or silently revert — every live edit
made in the meantime**. The live edits are real commits on `main` that `dev` has
never seen.

**So merge `main` back into `dev` regularly**, and always immediately before
merging `dev` into `main`:

```bash
git checkout dev
git fetch origin
git merge origin/main
git push origin dev
```

Do this after any session of live editing. A good habit is to run it as part of
starting feature work, not only at the end — resolving one conflict in one
`.mdx` file is easy; resolving a week of them is not.

To see whether `main` has edits `dev` does not:

```bash
git fetch origin
git log --oneline dev..origin/main
```

Any `content: authoring sync (...)` commits in that output are live edits `dev`
has not absorbed yet.
