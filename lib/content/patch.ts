import { scanLinesWithFenceState } from './scan';

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

  const body = markdown.replace(/\s+$/, '');

  if (end === -1) {
    // Last section: keep exactly one trailing newline at end of file.
    return [...lines.slice(0, start + 1), body, ''].join('\n');
  }

  return [...lines.slice(0, start + 1), body, '', ...lines.slice(end)].join('\n');
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
