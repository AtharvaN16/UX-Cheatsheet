import { z } from 'zod';

export const KIND = ['concept', 'framework', 'method'] as const;
export const GIVES = ['quantitative', 'qualitative', 'mixed', 'conceptual'] as const;
export const EFFORT = ['low', 'medium', 'high'] as const;
export const TIMEFRAME = ['hours', 'days', 'weeks', 'months', 'ongoing'] as const;
export const SOURCE_TYPE = ['book', 'article', 'paper', 'video', 'standard', 'tool'] as const;

export const REQUIRED_SECTIONS = [
  'What is it',
  'Purpose',
  'When to use',
  'How to do it',
  'Common mistakes',
  'Tips',
  'Using AI',
] as const;

export const OPTIONAL_SECTIONS = ['Notes'] as const;

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const sourceSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  url: z.url(),
  type: z.enum(SOURCE_TYPE),
  year: z.number().int().min(1900).max(2100).optional(),
  seminal: z.boolean().default(false),
});

/**
 * A local image must live under `public/images/methods/` and be named in
 * kebab-case, so paths can't drift and `loadMethods` can check the file
 * actually exists on disk. Remote images are permitted but unverifiable at
 * build time, so they carry a stricter editorial requirement instead: a
 * credit. A remote diagram is almost always someone else's work.
 */
const LOCAL_IMAGE = /^\/images\/methods\/[a-z0-9]+(-[a-z0-9]+)*\.(png|jpe?g|svg|webp)$/;

export const imageSchema = z
  .object({
    src: z.union([
      z.string().regex(LOCAL_IMAGE, 'must be /images/methods/<kebab-name>.(png|jpg|svg|webp) or a URL'),
      z.url(),
    ]),
    /**
     * Optional, defaulting to empty. It used to carry a 20-character minimum,
     * which meant an image could only ever be added by hand — a drop target
     * has no way to invent a description. This is a personal tool, and the
     * owner's call is that dropping an image in should just work; alt text
     * stays available for the entries that want it.
     */
    alt: z.string().default(''),
    caption: z.string().min(1).optional(),
    credit: z.object({ title: z.string().min(1), url: z.url() }).optional(),
  })
  .refine((i) => !isRemoteImage(i.src) || i.credit !== undefined, {
    message: 'a remote image must include credit { title, url }',
    path: ['credit'],
  });

/** True for images fetched over the network, which the build cannot verify. */
export function isRemoteImage(src: string): boolean {
  return /^https?:\/\//.test(src);
}

export const useInsteadSchema = z.object({
  when: z.string().min(1),
  method: z.string().regex(KEBAB),
});

export const relatedSchema = z.object({
  before: z.array(z.string().regex(KEBAB)).default([]),
  after: z.array(z.string().regex(KEBAB)).default([]),
  alongside: z.array(z.string().regex(KEBAB)).default([]),
});

export const frontmatterSchema = z.object({
  id: z.string().regex(KEBAB),
  title: z.string().min(1),
  aka: z.array(z.string()).default([]),
  domain: z.string().regex(KEBAB),
  alsoIn: z.array(z.string().regex(KEBAB)).default([]),
  kind: z.enum(KIND),
  gives: z.enum(GIVES),
  effort: z.enum(EFFORT),
  timeframe: z.enum(TIMEFRAME),
  needs: z.array(z.string()).default([]),
  useCases: z.array(z.string().regex(KEBAB)).default([]),
  useInstead: z.array(useInsteadSchema).min(1),
  related: relatedSchema.default({ before: [], after: [], alongside: [] }),
  sources: z.array(sourceSchema).min(2),
  /**
   * Optional: only present on entries where a diagram genuinely adds
   * something the prose can't. There is no schema rule for "benefits from an
   * image" — that is a per-entry editorial call. What the schema does enforce
   * is that an image, once added, is complete and locatable.
   */
  image: imageSchema.optional(),
});

export type Frontmatter = z.infer<typeof frontmatterSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type UseInstead = z.infer<typeof useInsteadSchema>;
export type MethodImage = z.infer<typeof imageSchema>;
