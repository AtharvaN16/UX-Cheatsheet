export interface ScanLine {
  line: string;
  isHeading: boolean;
  headingText?: string;
  /** Whether a code fence is open *after* this line was processed. */
  inFence: boolean;
}

/** Scan lines with fence awareness. Yields info about each line. */
export function* scanLinesWithFenceState(body: string): Generator<ScanLine> {
  const lines = body.split('\n');
  let inFence = false;
  let fenceChar: string | null = null;
  let fenceLength = 0;

  for (const line of lines) {
    const fenceMatch = /^(`{3,}|~{3,})/.exec(line);

    if (fenceMatch) {
      const marker = fenceMatch[1];
      const char = marker[0];
      const length = marker.length;

      if (!inFence) {
        inFence = true;
        fenceChar = char;
        fenceLength = length;
      } else if (char === fenceChar && length >= fenceLength) {
        inFence = false;
        fenceChar = null;
        fenceLength = 0;
      }
    }

    const headingMatch = !inFence ? /^##\s+(.+?)\s*$/.exec(line) : null;

    yield { line, isHeading: !!headingMatch, headingText: headingMatch?.[1], inFence };
  }
}

/**
 * True when the text ends with a code fence still open.
 *
 * This is a safety check, not a style check. An unclosed fence makes every
 * subsequent `## ` invisible to the scanner, so a section written with one
 * swallows the rest of the file from the parser's point of view — and the next
 * edit to that section would then rewrite "everything to EOF". Rejecting the
 * fence is how that is prevented at the source.
 */
export function hasUnclosedFence(text: string): boolean {
  let open = false;
  for (const scan of scanLinesWithFenceState(text)) open = scan.inFence;
  return open;
}

/** The ordered list of top-level `## ` headings, fences respected. */
export function headingsOf(text: string): string[] {
  const out: string[] = [];
  for (const scan of scanLinesWithFenceState(text)) {
    if (scan.isHeading && scan.headingText) out.push(scan.headingText);
  }
  return out;
}
