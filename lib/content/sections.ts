import { REQUIRED_SECTIONS } from './schema';

interface ScanLine {
  line: string;
  isHeading: boolean;
  headingText?: string;
}

/** Scan lines with fence awareness. Yields info about each line. */
function* scanLinesWithFenceState(body: string): Generator<ScanLine> {
  const lines = body.split('\n');
  let inFence = false;
  let fenceChar: string | null = null;
  let fenceLength = 0;

  for (const line of lines) {
    // Check for fence markers (``` or ~~~)
    const fenceMatch = /^(`{3,}|~{3,})/.exec(line);

    if (fenceMatch) {
      const marker = fenceMatch[1];
      const char = marker[0];
      const length = marker.length;

      if (!inFence) {
        // Opening a fence
        inFence = true;
        fenceChar = char;
        fenceLength = length;
      } else if (char === fenceChar && length >= fenceLength) {
        // Closing the fence (must be same char and at least as long)
        inFence = false;
        fenceChar = null;
        fenceLength = 0;
      }
      // If we're in a fence and this doesn't close it, it's just content
    }

    // Check for heading only if not in fence
    const headingMatch = !inFence ? /^##\s+(.+?)\s*$/.exec(line) : null;

    yield {
      line,
      isHeading: !!headingMatch,
      headingText: headingMatch?.[1],
    };
  }
}

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
