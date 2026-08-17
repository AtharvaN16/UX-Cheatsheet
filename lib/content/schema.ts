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
});

export type Frontmatter = z.infer<typeof frontmatterSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type UseInstead = z.infer<typeof useInsteadSchema>;
