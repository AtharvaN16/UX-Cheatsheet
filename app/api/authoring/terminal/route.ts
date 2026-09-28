import { execFile } from 'node:child_process';
import { devOnlyGuard } from '@/lib/authoring/devOnly';

/**
 * Open a terminal at the repo root so Claude Code is one keystroke away.
 *
 * No part of the command comes from the request: the path is process.cwd() and
 * the body is ignored. Combined with the dev guard, the entire input space of
 * this shell-executing endpoint is "was it called".
 */
export async function POST(): Promise<Response> {
  const blocked = devOnlyGuard();
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
