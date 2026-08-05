import type { NextConfig } from "next";
import { execSync } from "node:child_process";

/**
 * Compile the single dark cheatsheet theme (lib/theme.ts, source of truth)
 * to static CSS + a `__built: true` theme object (lib/cheatsheet.{css,js,d.ts},
 * gitignored) *before* Next reads any file that imports them.
 *
 * This used to live as `predev`/`prebuild` scripts in package.json. Those only
 * fire for the literal `bun run dev` / `bun run build` invocations — a Vercel
 * Project Settings "Build Command" override of plain `next build` (a
 * realistic, dashboard-configurable setting that bypasses package.json
 * scripts) skipped the hook entirely and failed with
 * "Module not found: Can't resolve '@/lib/cheatsheet'" plus a Tailwind
 * CssSyntaxError on the missing `../lib/cheatsheet.css`. next.config.ts is
 * loaded by every `next dev` / `next build` / `next start` invocation no
 * matter what wraps it, so running the build here — instead of in a package
 * manager hook — removes that failure mode entirely rather than just pinning
 * one entry point. (It's harmless to over-run: `astryx theme build` is a fast,
 * idempotent, deterministic function of lib/theme.ts, and this file can be
 * evaluated more than once per build, e.g. once per Turbopack worker.)
 */
execSync("node node_modules/@astryxdesign/cli/bin/astryx.mjs theme build lib/theme.ts", {
  stdio: "inherit",
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
