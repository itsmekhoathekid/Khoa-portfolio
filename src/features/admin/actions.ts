'use server';

import { and, eq, isNull, max, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/src/server/auth/guard';
import { draftInputSchema } from '@/src/server/content/types';
import { getDb } from '@/src/server/db/client';
import {
  blogRevisions,
  blogs,
  experienceRevisions,
  experiences,
  searchDocuments,
  workRevisions,
  works,
  contacts,
} from '@/src/server/db/schema';

const mutationTargetSchema = z.object({
  kind: z.enum(['blog', 'work', 'experience']),
  id: z.string().uuid(),
});

const replaceCoverSchema = mutationTargetSchema.extend({
  assetId: z.string().uuid(),
  focalX: z.number().min(0).max(100),
  focalY: z.number().min(0).max(100),
});

type SaveResult =
  | { ok: true; id: string; revisionId: string }
  | { ok: false; error: string };

export async function saveDraftAction(raw: unknown): Promise<SaveResult> {
  try {
    const session = await requireAdmin();
    const input = draftInputSchema.parse(raw);
    const db = getDb();

    if (input.kind === 'blog') {
      const entityId =
        input.id ??
        (
          await db
            .insert(blogs)
            .values({ slug: input.slug })
            .returning({ id: blogs.id })
        )[0].id;
      if (input.id)
        await db
          .update(blogs)
          .set({ slug: input.slug, deletedAt: null, updatedAt: new Date() })
          .where(eq(blogs.id, entityId));
      const [{ value }] = await db
        .select({ value: max(blogRevisions.revision) })
        .from(blogRevisions)
        .where(eq(blogRevisions.blogId, entityId));
      const nextRevision = (value ?? 0) + 1;
      const [revision] = await db
        .insert(blogRevisions)
        .values({
          blogId: entityId,
          revision: nextRevision,
          title: input.title,
          summary: input.summary,
          bodyMarkdown: input.bodyMarkdown,
          tags: input.tags,
          coverAssetId: input.coverAssetId,
          focalX: input.focalX,
          focalY: input.focalY,
          createdBy: session.user.id,
        })
        .returning({ id: blogRevisions.id });
      await db
        .update(blogs)
        .set({ draftRevisionId: revision.id, updatedAt: new Date() })
        .where(eq(blogs.id, entityId));
      return { ok: true, id: entityId, revisionId: revision.id };
    }

    if (input.kind === 'work') {
      const entityId =
        input.id ??
        (
          await db
            .insert(works)
            .values({ slug: input.slug, kind: input.workKind })
            .returning({ id: works.id })
        )[0].id;
      if (input.id)
        await db
          .update(works)
          .set({
            slug: input.slug,
            kind: input.workKind,
            deletedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(works.id, entityId));
      const [{ value }] = await db
        .select({ value: max(workRevisions.revision) })
        .from(workRevisions)
        .where(eq(workRevisions.workId, entityId));
      const nextRevision = (value ?? 0) + 1;
      const [revision] = await db
        .insert(workRevisions)
        .values({
          workId: entityId,
          revision: nextRevision,
          title: input.title,
          summary: input.summary,
          bodyMarkdown: input.bodyMarkdown,
          tags: input.tags,
          githubUrl: input.githubUrl,
          coverAssetId: input.coverAssetId,
          focalX: input.focalX,
          focalY: input.focalY,
          createdBy: session.user.id,
        })
        .returning({ id: workRevisions.id });
      await db
        .update(works)
        .set({ draftRevisionId: revision.id, updatedAt: new Date() })
        .where(eq(works.id, entityId));
      return { ok: true, id: entityId, revisionId: revision.id };
    }

    const entityId =
      input.id ??
      (
        await db
          .insert(experiences)
          .values({ slug: input.slug })
          .returning({ id: experiences.id })
      )[0].id;
    if (input.id)
      await db
        .update(experiences)
        .set({ slug: input.slug, deletedAt: null, updatedAt: new Date() })
        .where(eq(experiences.id, entityId));
    const [{ value }] = await db
      .select({ value: max(experienceRevisions.revision) })
      .from(experienceRevisions)
      .where(eq(experienceRevisions.experienceId, entityId));
    const nextRevision = (value ?? 0) + 1;
    const [revision] = await db
      .insert(experienceRevisions)
      .values({
        experienceId: entityId,
        revision: nextRevision,
        title: input.title,
        organization: input.organization,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        summary: input.summary,
        bodyMarkdown: input.bodyMarkdown,
        coverAssetId: input.coverAssetId,
        focalX: input.focalX,
        focalY: input.focalY,
        createdBy: session.user.id,
      })
      .returning({ id: experienceRevisions.id });
    await db
      .update(experiences)
      .set({ draftRevisionId: revision.id, updatedAt: new Date() })
      .where(eq(experiences.id, entityId));
    return { ok: true, id: entityId, revisionId: revision.id };
  } catch (error) {
    return { ok: false, error: mutationError(error) };
  }
}

export async function publishContentAction(raw: unknown) {
  try {
    await requireAdmin();
    const target = mutationTargetSchema.parse(raw);
    const db = getDb();

    if (target.kind === 'blog') {
      const [entity] = await db
        .select()
        .from(blogs)
        .where(and(eq(blogs.id, target.id), isNull(blogs.deletedAt)))
        .limit(1);
      if (!entity?.draftRevisionId)
        throw new Error('Save a draft before publishing.');
      const [revision] = await db
        .select()
        .from(blogRevisions)
        .where(eq(blogRevisions.id, entity.draftRevisionId))
        .limit(1);
      await db
        .update(blogs)
        .set({
          status: 'published',
          publishedRevisionId: entity.draftRevisionId,
          updatedAt: new Date(),
        })
        .where(eq(blogs.id, target.id));
      await upsertSearch(
        target.id,
        'blog',
        entity.slug,
        `/blogs/${entity.slug}`,
        revision.title,
        revision.summary,
        revision.bodyMarkdown,
        revision.tags,
      );
      revalidatePath(`/blogs/${entity.slug}`);
      revalidatePath('/blogs');
    } else if (target.kind === 'work') {
      const [entity] = await db
        .select()
        .from(works)
        .where(and(eq(works.id, target.id), isNull(works.deletedAt)))
        .limit(1);
      if (!entity?.draftRevisionId)
        throw new Error('Save a draft before publishing.');
      const [revision] = await db
        .select()
        .from(workRevisions)
        .where(eq(workRevisions.id, entity.draftRevisionId))
        .limit(1);
      await db
        .update(works)
        .set({
          status: 'published',
          publishedRevisionId: entity.draftRevisionId,
          updatedAt: new Date(),
        })
        .where(eq(works.id, target.id));
      await upsertSearch(
        target.id,
        'work',
        entity.slug,
        `/myworks/${entity.kind}/${entity.slug}`,
        revision.title,
        revision.summary,
        revision.bodyMarkdown,
        revision.tags,
      );
    } else {
      const [entity] = await db
        .select()
        .from(experiences)
        .where(
          and(eq(experiences.id, target.id), isNull(experiences.deletedAt)),
        )
        .limit(1);
      if (!entity?.draftRevisionId)
        throw new Error('Save a draft before publishing.');
      const [revision] = await db
        .select()
        .from(experienceRevisions)
        .where(eq(experienceRevisions.id, entity.draftRevisionId))
        .limit(1);
      await db
        .update(experiences)
        .set({
          status: 'published',
          publishedRevisionId: entity.draftRevisionId,
          updatedAt: new Date(),
        })
        .where(eq(experiences.id, target.id));
      await upsertSearch(
        target.id,
        'experience',
        entity.slug,
        `/experiences/${entity.slug}`,
        revision.title,
        revision.summary,
        revision.bodyMarkdown,
        [revision.organization],
      );
    }

    revalidatePath('/');
    return { ok: true } as const;
  } catch (error) {
    return { ok: false, error: mutationError(error) } as const;
  }
}

export async function softDeleteContentAction(raw: unknown) {
  try {
    await requireAdmin();
    const target = mutationTargetSchema.parse(raw);
    const db = getDb();
    const table =
      target.kind === 'blog'
        ? blogs
        : target.kind === 'work'
          ? works
          : experiences;
    await db
      .update(table)
      .set({ deletedAt: new Date(), status: 'archived', updatedAt: new Date() })
      .where(eq(table.id, target.id));
    await db
      .delete(searchDocuments)
      .where(
        and(
          eq(searchDocuments.contentType, target.kind),
          eq(searchDocuments.entityId, target.id),
        ),
      );
    revalidatePath('/');
    revalidatePath('/blogs');
    return { ok: true } as const;
  } catch (error) {
    return { ok: false, error: mutationError(error) } as const;
  }
}

export async function replaceCoverDraftAction(raw: unknown) {
  try {
    const session = await requireAdmin();
    const target = replaceCoverSchema.parse(raw);
    const db = getDb();
    const { assets } = await import('@/src/server/db/schema');
    const [asset] = await db
      .select({ status: assets.status })
      .from(assets)
      .where(eq(assets.id, target.assetId))
      .limit(1);
    if (asset?.status !== 'ready')
      throw new Error('The uploaded asset is not ready.');

    if (target.kind === 'work') {
      const [entity] = await db
        .select()
        .from(works)
        .where(eq(works.id, target.id))
        .limit(1);
      const sourceId = entity?.draftRevisionId ?? entity?.publishedRevisionId;
      if (!sourceId) throw new Error('Work revision not found.');
      const [source] = await db
        .select()
        .from(workRevisions)
        .where(eq(workRevisions.id, sourceId))
        .limit(1);
      const [{ value }] = await db
        .select({ value: max(workRevisions.revision) })
        .from(workRevisions)
        .where(eq(workRevisions.workId, target.id));
      const [created] = await db
        .insert(workRevisions)
        .values({
          ...source,
          id: undefined,
          revision: (value ?? 0) + 1,
          coverAssetId: target.assetId,
          focalX: target.focalX,
          focalY: target.focalY,
          createdBy: session.user.id,
          createdAt: new Date(),
        })
        .returning({ id: workRevisions.id });
      await db
        .update(works)
        .set({ draftRevisionId: created.id, updatedAt: new Date() })
        .where(eq(works.id, target.id));
    } else if (target.kind === 'experience') {
      const [entity] = await db
        .select()
        .from(experiences)
        .where(eq(experiences.id, target.id))
        .limit(1);
      const sourceId = entity?.draftRevisionId ?? entity?.publishedRevisionId;
      if (!sourceId) throw new Error('Experience revision not found.');
      const [source] = await db
        .select()
        .from(experienceRevisions)
        .where(eq(experienceRevisions.id, sourceId))
        .limit(1);
      const [{ value }] = await db
        .select({ value: max(experienceRevisions.revision) })
        .from(experienceRevisions)
        .where(eq(experienceRevisions.experienceId, target.id));
      const [created] = await db
        .insert(experienceRevisions)
        .values({
          ...source,
          id: undefined,
          revision: (value ?? 0) + 1,
          coverAssetId: target.assetId,
          focalX: target.focalX,
          focalY: target.focalY,
          createdBy: session.user.id,
          createdAt: new Date(),
        })
        .returning({ id: experienceRevisions.id });
      await db
        .update(experiences)
        .set({ draftRevisionId: created.id, updatedAt: new Date() })
        .where(eq(experiences.id, target.id));
    } else throw new Error('Blog covers are edited in the article editor.');
    return { ok: true } as const;
  } catch (error) {
    return { ok: false, error: mutationError(error) } as const;
  }
}

const contactsInputSchema = z
  .array(
    z.object({
      id: z.string().uuid().optional(),
      key: z
        .string()
        .min(1)
        .max(40)
        .regex(/^[A-Z0-9_]+$/),
      label: z.string().min(1).max(80),
      value: z.string().min(1).max(300),
      href: z.union([z.string().url(), z.literal('')]).default(''),
      visible: z.boolean().default(true),
      sortOrder: z.number().int().min(0),
    }),
  )
  .max(30);

export async function saveContactsAction(raw: unknown) {
  try {
    await requireAdmin();
    const input = contactsInputSchema.parse(raw);
    const db = getDb();
    for (const item of input) {
      const values = {
        key: item.key,
        label: item.label,
        value: item.value,
        href: item.href || null,
        visible: item.visible,
        sortOrder: item.sortOrder,
        updatedAt: new Date(),
      };
      if (item.id)
        await db.update(contacts).set(values).where(eq(contacts.id, item.id));
      else
        await db
          .insert(contacts)
          .values(values)
          .onConflictDoUpdate({ target: contacts.key, set: values });
    }
    revalidatePath('/');
    return { ok: true } as const;
  } catch (error) {
    return { ok: false, error: mutationError(error) } as const;
  }
}

async function upsertSearch(
  entityId: string,
  contentType: string,
  slug: string,
  path: string,
  title: string,
  summary: string,
  body: string,
  tags: string[],
) {
  const db = getDb();
  const searchable = [title, summary, body, ...tags].join(' ');
  await db
    .insert(searchDocuments)
    .values({
      contentType,
      entityId,
      slug,
      path,
      title,
      document: sql`to_tsvector('english', ${searchable})`,
    })
    .onConflictDoUpdate({
      target: [searchDocuments.contentType, searchDocuments.entityId],
      set: {
        slug,
        path,
        title,
        document: sql`to_tsvector('english', ${searchable})`,
        updatedAt: new Date(),
      },
    });
}

function mutationError(error: unknown) {
  if (error instanceof z.ZodError)
    return error.issues[0]?.message ?? 'Invalid content.';
  if (error instanceof Error) return error.message;
  return 'Mutation failed.';
}
