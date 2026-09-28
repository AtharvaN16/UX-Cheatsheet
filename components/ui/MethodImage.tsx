import type { MethodImage as MethodImageData } from '@/lib/content/schema';

/**
 * The optional diagram on a method card.
 *
 * Deliberately a plain `<img>` rather than `next/image`. `next/image` with a
 * string `src` needs explicit `width`/`height` on every entry — pushing two
 * more required fields into frontmatter for 124 hand-authored files — and a
 * remote `src` additionally needs `images.remotePatterns` in next.config.ts.
 * Since `image.src` accepts both local paths and remote URLs of unknown
 * aspect ratio, and these render inside a scrolling modal where the
 * constraint that matters is "don't dominate the viewport", CSS containment
 * does the job with no config and no extra authoring burden. Upgradeable
 * later by adding dimensions to the schema.
 */
export function MethodImage({ image }: { image?: MethodImageData }) {
  if (!image) return null;

  const { src, caption, credit } = image;

  return (
    <figure className="my-2">
      <div className="overflow-hidden rounded-xl border border-border/40 bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element -- see component doc comment */}
        <img
          src={src}
          // Empty, not absent: alt="" marks the image decorative, whereas an
          // <img> with no alt attribute makes screen readers read the filename.
          alt=""
          loading="lazy"
          decoding="async"
          className="mx-auto block max-h-[60vh] w-full object-contain"
        />
      </div>

      {(caption || credit) && (
        <figcaption className="mt-3 text-base leading-relaxed text-secondary">
          {caption}
          {credit && (
            <>
              {caption ? ' ' : null}
              <a
                href={credit.url}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-border/60 underline-offset-2 hover:decoration-current"
              >
                {credit.title}
              </a>
            </>
          )}
        </figcaption>
      )}
    </figure>
  );
}
