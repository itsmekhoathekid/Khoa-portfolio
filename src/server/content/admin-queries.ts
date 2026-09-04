import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/src/server/auth/guard';
import { getDraftHomeProfile } from '@/src/server/content/home-profile';
import { getDb } from '@/src/server/db/client';
import {
  assets,
  blogRevisions,
  blogs,
  experienceRevisions,
  experiences,
  workRevisions,
  works,
} from '@/src/server/db/schema';

export type EditorDraft = {
  id?: string;
  kind: 'blog' | 'work' | 'experience';
  slug: string;
  title: string;
  summary: string;
  bodyMarkdown: string;
  tags: string[];
  coverAssetId: string | null;
  coverUrl: string | null;
  focalX: number;
  focalY: number;
  revision: number;
  workKind: 'projects' | 'publications' | 'competitions';
  githubUrl: string;
  organization: string;
  periodStart: string;
  periodEnd: string;
};

export async function getAdminHomeProfile() {
  await requireAdmin();
  return getDraftHomeProfile();
}

const emptyDraft: EditorDraft = {
  kind: 'blog',
  slug: 'untitled',
  title: 'Untitled',
  summary: '',
  bodyMarkdown: '# Untitled\n\nStart writing…',
  tags: [],
  coverAssetId: null,
  coverUrl: null,
  focalX: 50,
  focalY: 50,
  revision: 0,
  workKind: 'projects',
  githubUrl: '',
  organization: '',
  periodStart: new Date().getFullYear().toString(),
  periodEnd: '',
};

function mediaUrl(objectKey: string | null) {
  return objectKey && process.env.NEXT_PUBLIC_MEDIA_URL
    ? `${process.env.NEXT_PUBLIC_MEDIA_URL.replace(/\/$/, '')}/${objectKey}`
    : null;
}

export async function getEditorDraft(
  collection: string,
  id: string,
): Promise<EditorDraft | null> {
  await requireAdmin();
  const kind =
    collection === 'blogs'
      ? 'blog'
      : collection === 'works'
        ? 'work'
        : collection === 'experiences'
          ? 'experience'
          : null;
  if (!kind) return null;
  if (id === 'new') return { ...emptyDraft, kind };
  const db = getDb();

  if (kind === 'blog') {
    const [row] = await db
      .select({
        entity: blogs,
        revision: blogRevisions,
        objectKey: assets.objectKey,
      })
      .from(blogs)
      .innerJoin(blogRevisions, eq(blogs.draftRevisionId, blogRevisions.id))
      .leftJoin(assets, eq(blogRevisions.coverAssetId, assets.id))
      .where(eq(blogs.id, id))
      .limit(1);
    if (!row) return null;
    return {
      ...emptyDraft,
      id: row.entity.id,
      kind,
      slug: row.entity.slug,
      title: row.revision.title,
      summary: row.revision.summary,
      bodyMarkdown: row.revision.bodyMarkdown,
      tags: row.revision.tags,
      coverAssetId: row.revision.coverAssetId,
      coverUrl: mediaUrl(row.objectKey),
      focalX: row.revision.focalX,
      focalY: row.revision.focalY,
      revision: row.revision.revision,
    };
  }
  if (kind === 'work') {
    const [row] = await db
      .select({
        entity: works,
        revision: workRevisions,
        objectKey: assets.objectKey,
      })
      .from(works)
      .innerJoin(workRevisions, eq(works.draftRevisionId, workRevisions.id))
      .leftJoin(assets, eq(workRevisions.coverAssetId, assets.id))
      .where(eq(works.id, id))
      .limit(1);
    if (!row) return null;
    return {
      ...emptyDraft,
      id: row.entity.id,
      kind,
      slug: row.entity.slug,
      title: row.revision.title,
      summary: row.revision.summary,
      bodyMarkdown: row.revision.bodyMarkdown,
      tags: row.revision.tags,
      coverAssetId: row.revision.coverAssetId,
      coverUrl: mediaUrl(row.objectKey),
      focalX: row.revision.focalX,
      focalY: row.revision.focalY,
      revision: row.revision.revision,
      workKind: row.entity.kind,
      githubUrl: row.revision.githubUrl ?? '',
    };
  }
  const [row] = await db
    .select({
      entity: experiences,
      revision: experienceRevisions,
      objectKey: assets.objectKey,
    })
    .from(experiences)
    .innerJoin(
      experienceRevisions,
      eq(experiences.draftRevisionId, experienceRevisions.id),
    )
    .leftJoin(assets, eq(experienceRevisions.coverAssetId, assets.id))
    .where(eq(experiences.id, id))
    .limit(1);
  if (!row) return null;
  return {
    ...emptyDraft,
    id: row.entity.id,
    kind,
    slug: row.entity.slug,
    title: row.revision.title,
    summary: row.revision.summary,
    bodyMarkdown: row.revision.bodyMarkdown,
    coverAssetId: row.revision.coverAssetId,
    coverUrl: mediaUrl(row.objectKey),
    focalX: row.revision.focalX,
    focalY: row.revision.focalY,
    revision: row.revision.revision,
    organization: row.revision.organization,
    periodStart: row.revision.periodStart,
    periodEnd: row.revision.periodEnd ?? '',
  };
}
