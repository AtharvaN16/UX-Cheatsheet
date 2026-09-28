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
