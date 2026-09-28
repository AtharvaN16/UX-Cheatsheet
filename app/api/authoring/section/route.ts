import { devOnlyGuard } from '@/lib/authoring/devOnly';
import { relPathForMethod } from '@/lib/authoring/resolve';
import { validateMethodText } from '@/lib/authoring/validate';
import { getStore } from '@/lib/authoring/store';
import { patchSection } from '@/lib/content/patch';

export async function POST(request: Request): Promise<Response> {
  const blocked = devOnlyGuard();
  if (blocked) return blocked;

  const { id, heading, markdown } = (await request.json()) as {
    id?: string;
    heading?: string;
    markdown?: string;
  };

  if (!id || !heading || typeof markdown !== 'string') {
    return Response.json({ errors: ['id, heading and markdown are required'] }, { status: 400 });
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
    next = patchSection(text, heading, markdown);
  } catch (e) {
    return Response.json({ errors: [(e as Error).message] }, { status: 400 });
  }

  const errors = validateMethodText(next, `${id}.mdx`);
  if (errors.length > 0) return Response.json({ errors }, { status: 400 });

  await store.commit([{ path: rel, content: next, version }], `content: edit ${id} — ${heading}`);
  return Response.json({ ok: true });
}
