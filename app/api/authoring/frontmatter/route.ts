import { devOnlyGuard } from '@/lib/authoring/devOnly';
import { relPathForMethod } from '@/lib/authoring/resolve';
import { validateMethodText } from '@/lib/authoring/validate';
import { getStore } from '@/lib/authoring/store';
import { patchFrontmatterScalar } from '@/lib/content/patch';
import { KIND, GIVES, EFFORT, TIMEFRAME } from '@/lib/content/schema';

/** Only closed-enum scalars are editable, so a value can never need quoting. */
const EDITABLE: Record<string, readonly string[]> = {
  kind: KIND,
  gives: GIVES,
  effort: EFFORT,
  timeframe: TIMEFRAME,
};

export async function POST(request: Request): Promise<Response> {
  const blocked = devOnlyGuard(request);
  if (blocked) return blocked;

  const { id, field, value } = (await request.json()) as {
    id?: string;
    field?: string;
    value?: string;
  };

  if (!id || !field || !value) {
    return Response.json({ errors: ['id, field and value are required'] }, { status: 400 });
  }

  const allowed = EDITABLE[field];
  if (!allowed) {
    return Response.json({ errors: [`field "${field}" is not editable`] }, { status: 400 });
  }
  if (!allowed.includes(value)) {
    return Response.json(
      { errors: [`${field} must be one of ${allowed.join(', ')}`] },
      { status: 400 },
    );
  }

  let rel: string;
  try {
    rel = relPathForMethod(id);
  } catch (e) {
    return Response.json({ errors: [(e as Error).message] }, { status: 400 });
  }

  const store = getStore();
  const { text, version } = await store.read(rel);

  let next: string;
  try {
    next = patchFrontmatterScalar(text, field, value);
  } catch (e) {
    return Response.json({ errors: [(e as Error).message] }, { status: 400 });
  }

  const errors = validateMethodText(next, `${id}.mdx`);
  if (errors.length > 0) return Response.json({ errors }, { status: 400 });

  await store.commit([{ path: rel, content: next, version }], `content: ${id} ${field}=${value}`);
  return Response.json({ ok: true });
}
