import { REQUIRED_SECTIONS } from './schema';
import { scanLinesWithFenceState } from './scan';

/** Split an MDX body into sections keyed by their `## ` heading text. */
export function parseSections(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  let current: string | null = null;
  let buf: string[] = [];

  const flush = () => {
    if (current !== null) out[current] = buf.join('\n').trim();
    buf = [];
  };

  for (const scan of scanLinesWithFenceState(body)) {
    if (scan.isHeading) {
      flush();
      current = scan.headingText || null;
    } else if (current !== null) {
      buf.push(scan.line);
    }
  }
  flush();

  return out;
}

/** Required section names absent from a parsed body, flexibly checked based on kind. */
export function missingSections(parsed: Record<string, string>, kind?: string): string[] {
  if (kind === 'concept') {
    const missing: string[] = [];
    const hasIntro = 'What is it' in parsed || 'Overview' in parsed || 'Why it matters' in parsed;
    if (!hasIntro) missing.push('What is it');
    const hasMechanism = 'Key ideas' in parsed || 'How it works' in parsed;
    if (!hasMechanism) missing.push('How it works');
    return missing;
  }

  if (kind === 'framework') {
    const missing: string[] = [];
    const hasIntro = 'What is it' in parsed || 'Overview' in parsed || 'Purpose' in parsed;
    if (!hasIntro) missing.push('What is it');
    const hasStructure = 'Structure' in parsed || 'How to use' in parsed || 'How to do it' in parsed;
    if (!hasStructure) missing.push('Structure');
    return missing;
  }


  // Default / method validation
  return REQUIRED_SECTIONS.filter((s) => s !== 'Using AI' && !(s in parsed));
}


/** Section names appearing more than once, in first-appearance order. */
export function duplicateSections(body: string): string[] {
  const seen = new Map<string, number>(); // heading -> count
  const order: string[] = [];

  for (const scan of scanLinesWithFenceState(body)) {
    if (scan.isHeading && scan.headingText) {
      if (!seen.has(scan.headingText)) {
        order.push(scan.headingText);
        seen.set(scan.headingText, 0);
      }
      seen.set(scan.headingText, seen.get(scan.headingText)! + 1);
    }
  }

  return order.filter((heading) => seen.get(heading)! > 1);
}
