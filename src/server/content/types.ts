import { z } from 'zod';

export const contentKindSchema = z.enum(['blog', 'work', 'experience']);
export const workKindSchema = z.enum([
  'projects',
  'publications',
  'competitions',
]);

const sharedDraft = {
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1).max(180),
  summary: z.string().max(500).default(''),
  bodyMarkdown: z.string().max(500_000).default(''),
  coverAssetId: z.string().uuid().nullable().default(null),
  focalX: z.number().min(0).max(100).default(50),
  focalY: z.number().min(0).max(100).default(50),
};

export const draftInputSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('blog'),
    ...sharedDraft,
    tags: z.array(z.string().min(1).max(40)).max(12).default([]),
  }),
  z.object({
    kind: z.literal('work'),
    ...sharedDraft,
    workKind: workKindSchema,
    tags: z.array(z.string().min(1).max(40)).max(12).default([]),
    githubUrl: z.string().url().nullable().default(null),
  }),
  z.object({
    kind: z.literal('experience'),
    ...sharedDraft,
    organization: z.string().max(180).default(''),
    periodStart: z.string().min(1).max(40),
    periodEnd: z.string().max(40).nullable().default(null),
  }),
]);

export type DraftInput = z.infer<typeof draftInputSchema>;

export interface ContentRepository<TDraft, TPublished = TDraft> {
  getPublished(slug?: string): Promise<TPublished | TPublished[] | null>;
  getDraft(id: string): Promise<TDraft | null>;
  saveDraft(input: TDraft, actorId: string): Promise<TDraft>;
  publish(id: string, actorId: string): Promise<TPublished>;
  softDelete(id: string, actorId: string): Promise<void>;
}
