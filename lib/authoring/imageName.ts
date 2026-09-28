/** Mirrors the LOCAL_IMAGE regex in lib/content/schema.ts, which is lowercase-only. */
const ALLOWED = ['png', 'jpg', 'jpeg', 'svg', 'webp'];

/**
 * Decide where an uploaded image goes.
 *
 * The name comes from the method id, never from the upload: it keeps the
 * one-image-per-card convention, and it means an uploaded filename is data
 * that is read and discarded rather than data that becomes a path.
 *
 * The extension is lower-cased because the schema's LOCAL_IMAGE pattern only
 * accepts lowercase — accepting `.PNG` verbatim would write the binary and then
 * fail validation, leaving an orphan in public/ and a broken build.
 */
export function imageTargetFor(methodId: string, filename: string): { rel: string; src: string } {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (!filename.includes('.') || !ALLOWED.includes(ext)) {
    throw new Error(`unsupported image type "${ext}" — use one of ${ALLOWED.join(', ')}`);
  }
  return {
    rel: `public/images/methods/${methodId}.${ext}`,
    src: `/images/methods/${methodId}.${ext}`,
  };
}

/** 2 MB. Diagrams on these cards are SVGs of a few KB; this is a sanity bound. */
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/**
 * Check that the bytes really are the image type the filename claims.
 *
 * `validateMethodText` gates the frontmatter patch, but it has no jurisdiction
 * over the other half of the commit — the binary. Without this, posting 31
 * bytes of plain text named `whatever.png` is accepted, `checkImageFiles` only
 * tests `existsSync`, so `bun run validate` passes and the card ships a broken
 * <img>. Extension alone is a claim, not evidence.
 */
export function sniffImage(bytes: Uint8Array, ext: string): string | null {
  if (bytes.length === 0) return 'the uploaded file is empty';
  if (bytes.length > MAX_IMAGE_BYTES) {
    return `image is ${Math.round(bytes.length / 1024)}KB — the limit is ${MAX_IMAGE_BYTES / 1024}KB`;
  }

  const starts = (...sig: number[]) => sig.every((b, i) => bytes[i] === b);

  switch (ext) {
    case 'png':
      return starts(0x89, 0x50, 0x4e, 0x47) ? null : 'not a PNG (bad file signature)';
    case 'jpg':
    case 'jpeg':
      return starts(0xff, 0xd8, 0xff) ? null : 'not a JPEG (bad file signature)';
    case 'webp':
      return starts(0x52, 0x49, 0x46, 0x46) &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
        ? null
        : 'not a WebP (bad file signature)';
    case 'svg': {
      // SVG is text, so there is no magic number — look for a root element in
      // the opening bytes, past any BOM, XML declaration or comment.
      const head = new TextDecoder().decode(bytes.slice(0, 1024)).trimStart();
      return /^(﻿)?(<\?xml|<!--|<!DOCTYPE\s+svg|<svg)/i.test(head)
        ? null
        : 'not an SVG (no <svg> root element found)';
    }
    default:
      return `unsupported image type "${ext}"`;
  }
}
