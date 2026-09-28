export interface ScanLine {
  line: string;
  isHeading: boolean;
  headingText?: string;
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

    yield { line, isHeading: !!headingMatch, headingText: headingMatch?.[1] };
  }
}
