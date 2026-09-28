import { devOnlyGuard } from '@/lib/authoring/devOnly';
import { getStore } from '@/lib/authoring/store';
import { insertTaxonomyItem, toId } from '@/lib/authoring/taxonomyEdit';

const KINDS = ['concept', 'framework', 'method'];

export async function POST(request: Request): Promise<Response> {
  const blocked = devOnlyGuard();
  if (blocked) return blocked;

  const { title, kind, domainId, groupTitle } = (await request.json()) as {
    title?: string;
    kind?: string;
    domainId?: string;
    groupTitle?: string | null;
  };

  if (!title || !kind || !domainId || groupTitle === undefined) {
    return Response.json(
      { errors: ['title, kind, domainId and groupTitle are required'] },
      { status: 400 },
    );
  }
  if (!KINDS.includes(kind)) {
    return Response.json({ errors: [`kind must be one of ${KINDS.join(', ')}`] }, { status: 400 });
  }

  const store = getStore();
  const rel = 'lib/taxonomy.json';
  const { text, version } = await store.read(rel);

  let next: string;
  try {
    next = insertTaxonomyItem(text, {
      title,
      kind: kind as 'concept' | 'framework' | 'method',
      domainId,
      groupTitle,
    });
  } catch (e) {
    return Response.json({ errors: [(e as Error).message] }, { status: 400 });
  }

  await store.commit([{ path: rel, content: next, version }], `content: add ${toId(title)} stub`);
  return Response.json({ ok: true, id: toId(title) });
}
