import { execFile } from 'node:child_process';
import { guardRequest, devOnlyRoute } from '@/lib/authoring/guard';

/**
 * Open a terminal at the repo root so Claude Code is one keystroke away.
 *
 * No part of the command comes from the request: the path is process.cwd() and
 * the body is ignored. Combined with the dev guard — which also rejects
 * cross-origin callers, or any web page you visit could spawn terminals — the
 * entire input space of this shell-executing endpoint is "was it called".
 */
export async function POST(request: Request): Promise<Response> {
  // Both checks, dev-only first: there is no terminal on a serverless
  // function, so this route must 404 in production even for a signed-in user.
  const notDev = devOnlyRoute();
  if (notDev) return notDev;
  const blocked = guardRequest(request);
  if (blocked) return blocked;

  if (process.platform !== 'darwin') {
    return Response.json(
      { error: `opening a terminal is only wired up for macOS, not ${process.platform}` },
      { status: 501 },
    );
  }

  return new Promise((resolve) => {
    execFile('open', ['-a', 'Terminal', process.cwd()], (err) => {
      resolve(
        err
          ? Response.json({ error: err.message }, { status: 500 })
          : Response.json({ ok: true }),
      );
    });
  });
}
