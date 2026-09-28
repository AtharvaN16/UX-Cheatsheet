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
 *  3. The branch did not move *during the commit sequence*. `GitHubStore`
 *     updates the ref non-forced, so GitHub rejects a stale write rather than
 *     clobbering a newer commit.
 *
 * Be precise about the limit of (3): a push landing in the narrow window
 * between the sha check above and `GitHubStore`'s own `GET /git/ref` is read as
 * the base commit, so the resulting commit is a clean fast-forward and is
 * accepted. Closing that would need a compare-and-swap GitHub does not offer.
 * For a single-author tool the window is not worth more machinery, but it is a
 * window, not an impossibility.
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
