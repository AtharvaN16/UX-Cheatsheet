import { devOnlyGuard } from '@/lib/authoring/devOnly';
import { relPathForMethod } from '@/lib/authoring/resolve';
import { validateMethodText } from '@/lib/authoring/validate';
import { getStore } from '@/lib/authoring/store';
import { imageTargetFor } from '@/lib/authoring/imageName';
import { patchFrontmatterScalar } from '@/lib/content/patch';

export async function POST(request: Request): Promise<Response> {
  const blocked = devOnlyGuard();
  if (blocked) return blocked;

  const form = await request.formData();
  const id = form.get('id');
  const file = form.get('file');

  if (typeof id !== 'string' || !(file instanceof File)) {
    return Response.json({ errors: ['id and file are required'] }, { status: 400 });
  }

  let mdxRel: string;
  let target: { rel: string; src: string };
  try {
    mdxRel = relPathForMethod(id);
    target = imageTargetFor(id, file.name);
  } catch (e) {
    return Response.json({ errors: [(e as Error).message] }, { status: 400 });
  }

  const store = getStore();
  const { text, version } = await store.read(mdxRel);

  // Replacing only: creating a first image would need `alt` of >= 20 chars,
  // which is prose and does not belong in a drop target.
  let next: string;
  try {
    next = patchFrontmatterScalar(text, '  src', target.src);
  } catch {
    return Response.json(
      { errors: ['this card has no image block yet — add the first one in Claude Code'] },
      { status: 400 },
    );
  }

  const errors = validateMethodText(next, `${id}.mdx`);
  if (errors.length > 0) return Response.json({ errors }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  await store.commit(
    [
      { path: target.rel, content: bytes, version: '' },
      { path: mdxRel, content: next, version },
    ],
    `content: replace ${id} image`,
  );

  return Response.json({ ok: true, src: target.src });
}
