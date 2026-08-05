import { REQUIRED_SECTIONS } from './schema';

/** Split an MDX body into sections keyed by their `## ` heading text. */
export function parseSections(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  const lines = body.split('\n');
  let current: string | null = null;
  let buf: string[] = [];

  const flush = () => {
    if (current !== null) out[current] = buf.join('\n').trim();
    buf = [];
  };

  for (const line of lines) {
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (m) {
      flush();
      current = m[1];
    } else if (current !== null) {
      buf.push(line);
    }
  }
  flush();

  return out;
}

/** Required section names absent from a parsed body, in spec order. */
export function missingSections(parsed: Record<string, string>): string[] {
  return [...REQUIRED_SECTIONS].filter((s) => !(s in parsed));
}
