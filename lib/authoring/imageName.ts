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
