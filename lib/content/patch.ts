import { scanLinesWithFenceState, hasUnclosedFence, headingsOf } from './scan';

/**
 * Replace the body of one `## ` section, leaving every other byte of the file
 * as it was.
 *
 * Section bounds are found with the same fence-aware scanner the parser uses,
 * so a `## ` inside a code block is never mistaken for a boundary. The body is
 * written back with one blank line before the next heading, matching how every
 * existing card is laid out.
 */
export function patchSection(fileText: string, heading: string, markdown: string): string {
  const lines = fileText.split('\n');
  let start = -1;
  let end = -1;
  let i = 0;

  for (const scan of scanLinesWithFenceState(fileText)) {
    if (scan.isHeading) {
      if (scan.headingText === heading && start === -1) {
        start = i;
      } else if (start !== -1 && end === -1) {
        end = i;
      }
    }
    i++;
  }

  if (start === -1) throw new Error(`unknown section "${heading}"`);

  // GUARD 1 — refuse an unclosed code fence.
  //
  // An unclosed fence hides every following `## ` from the scanner. The file
  // still looks fine and `bun run validate` still passes, because `Using AI`
  // and `Notes` are not in the required set. But the NEXT edit to this section
  // finds no heading after it, concludes it is the last section, and rewrites
  // everything to EOF — silently deleting the sections in between. Two
  // successful-looking saves, one destroyed card. Rejecting here is what stops
  // that chain at step one.
  if (hasUnclosedFence(markdown)) {
    throw new Error(
      'unclosed code fence — every ``` or ~~~ must be closed, or the rest of the card becomes invisible',
    );
  }

  const body = markdown.replace(/\s+$/, '');

  // Preserve the blank line between heading and body when the section already
  // had one. Every one of the 1357 sections in content/ is written that way, so
  // dropping it would reformat the file on every edit and bury the real change
  // in whitespace noise. Preserving beats imposing: a file that does it
  // differently keeps doing it differently.
  const gap = lines[start + 1] === '' ? [''] : [];

  const next =
    end === -1
      ? // Last section: keep exactly one trailing newline at end of file.
        [...lines.slice(0, start + 1), ...gap, body, ''].join('\n')
      : [...lines.slice(0, start + 1), ...gap, body, '', ...lines.slice(end)].join('\n');

  // GUARD 2 — a section edit may change one section's prose and nothing else.
  //
  // Comparing the ordered heading list before and after is a single check that
  // catches every structural accident at once: a section lost (the fence case,
  // if the file was already damaged), a new `## ` pasted in from another
  // document, or a `## ` YAML comment in frontmatter being treated as a
  // heading. Cheaper and far harder to outwit than enumerating those cases.
  const before = headingsOf(fileText);
  const after = headingsOf(next);
  if (before.join('\u0000') !== after.join('\u0000')) {
    throw new Error(
      `edit would restructure the card: headings went from [${before.join(', ')}] ` +
        `to [${after.join(', ')}] — a section edit may only change that section's text`,
    );
  }

  return next;
}

/**
 * Replace one scalar field on one line inside the leading `---` block.
 *
 * Deliberately not `matter.stringify`: re-serializing reformats quoting across
 * the whole block, and the authoring brief documents YAML traps (an unquoted
 * scalar containing ": " parses as a mapping) that have already broken a file.
 * A one-line replacement produces a one-line diff and cannot disturb a field
 * nobody edited.
 *
 * `field` is matched as a literal line prefix, indentation included, so a nested
 * key is addressed as `"  src"`. That is how the image replacer reaches
 * `image.src` without a YAML round-trip.
 *
 * Only ever used for closed-enum fields and paths, so `value` needs no quoting.
 */
export function patchFrontmatterScalar(fileText: string, field: string, value: string): string {
  const lines = fileText.split('\n');
  if (lines[0] !== '---') throw new Error('no frontmatter block');

  const close = lines.indexOf('---', 1);
  if (close === -1) throw new Error('no frontmatter block');

  const pattern = new RegExp(`^${field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s`);
  const target = lines.slice(1, close).findIndex((l) => pattern.test(l));
  if (target === -1) throw new Error(`unknown frontmatter field "${field}"`);

  lines[target + 1] = `${field}: ${value}`;
  return lines.join('\n');
}
