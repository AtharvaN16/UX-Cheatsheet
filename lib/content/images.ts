import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { isRemoteImage } from './schema';
import type { Method } from './load';

/**
 * Check that every local `image.src` points at a file that exists.
 *
 * This lives outside `loadMethods` on purpose. `loadMethods` is imported by
 * Server Components, and a non-statically-analyzable `fs` read there makes
 * Turbopack trace the whole project — `public/` and all source — into the
 * server bundle. This module is imported only by `scripts/validate-content.ts`,
 * which runs as a plain Bun script before `next build`, so the same check
 * still blocks a bad path from ever shipping.
 *
 * Remote images are skipped: verifying them would require network access at
 * build time. The schema compensates by requiring a credit for those.
 */
export function checkImageFiles(methods: Method[], publicDir: string): string[] {
  const errors: string[] = [];

  for (const m of methods) {
    if (!m.image || isRemoteImage(m.image.src)) continue;
    if (!existsSync(join(publicDir, m.image.src))) {
      errors.push(`${m.id}.mdx: image.src — file not found at public${m.image.src}`);
    }
  }

  return errors;
}
