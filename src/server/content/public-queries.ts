import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import {
  blogPosts,
  experiences as demoExperiences,
  works as demoWorks,
} from '@/src/features/content/demo-data';
import { getDb, hasDatabase } from '@/src/server/db/client';
import {
  assets,
  blogRevisions,
  blogs,
  experienceRevisions,
  experiences,
  workRevisions,
  works,
  contacts,
} from '@/src/server/db/schema';

export type PublicWork = {
  id: string;
  slug: string;
  kind: 'projects' | 'publications' | 'competitions';
  title: string;
  summary: string;
  bodyMarkdown: string;
  tags: string[];
  githubUrl: string | null;
  coverUrl: string | null;
  focalX: number;
  focalY: number;
};

export type PublicExperience = {
  id: string;
  slug: string;
  title: string;
  organization: string;
  period: string;
  summary: string;
  bodyMarkdown: string;
  coverUrl: string | null;
  focalX: number;
  focalY: number;
};

export type PublicBlog = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  bodyMarkdown: string;
  tags: string[];
  publishedAt: string;
  coverUrl: string | null;
};

export type PublicContact = {
  id: string;
  key: string;
  label: string;
  value: string;
  href: string | null;
};

function assetUrl(objectKey: string | null) {
  if (!objectKey || !process.env.NEXT_PUBLIC_MEDIA_URL) return null;
  return `${process.env.NEXT_PUBLIC_MEDIA_URL.replace(/\/$/, '')}/${objectKey}`;
}

export async function getPublishedWorks(): Promise<PublicWork[]> {
  if (!hasDatabase()) {
    return demoWorks.map((item) => ({
      id: item.id,
      slug: item.id,
      kind: item.kind,
      title: item.title,
      summary: item.summary,
      bodyMarkdown: item.bodyMarkdown,
      tags: item.tags,
      githubUrl: item.githubUrl,
      coverUrl: null,
      focalX: 50,
      focalY: 50,
    }));
  }

  const db = getDb();
  const rows = await db
    .select({
      id: works.id,
      slug: works.slug,
      kind: works.kind,
      title: workRevisions.title,
      summary: workRevisions.summary,
      bodyMarkdown: workRevisions.bodyMarkdown,
      tags: workRevisions.tags,
      githubUrl: workRevisions.githubUrl,
      focalX: workRevisions.focalX,
      focalY: workRevisions.focalY,
      objectKey: assets.objectKey,
    })
    .from(works)
    .innerJoin(workRevisions, eq(works.publishedRevisionId, workRevisions.id))
    .leftJoin(assets, eq(workRevisions.coverAssetId, assets.id))
    .where(and(eq(works.status, 'published'), isNull(works.deletedAt)))
    .orderBy(asc(works.sortOrder), desc(works.updatedAt));

  return rows.map(({ objectKey, ...row }) => ({
    ...row,
    coverUrl: assetUrl(objectKey),
  }));
}

export async function getPublishedExperiences(): Promise<PublicExperience[]> {
  if (!hasDatabase()) {
    return demoExperiences.map((item) => ({
      id: item.id,
      slug: item.id,
      title: item.title,
      organization: item.organization,
      period: item.period,
      summary: item.summary,
      bodyMarkdown: item.bodyMarkdown,
      coverUrl: null,
      focalX: 50,
      focalY: 50,
    }));
  }

  const db = getDb();
  const rows = await db
    .select({
      id: experiences.id,
      slug: experiences.slug,
      title: experienceRevisions.title,
      organization: experienceRevisions.organization,
      periodStart: experienceRevisions.periodStart,
      periodEnd: experienceRevisions.periodEnd,
      summary: experienceRevisions.summary,
      bodyMarkdown: experienceRevisions.bodyMarkdown,
      focalX: experienceRevisions.focalX,
      focalY: experienceRevisions.focalY,
      objectKey: assets.objectKey,
    })
    .from(experiences)
    .innerJoin(
      experienceRevisions,
      eq(experiences.publishedRevisionId, experienceRevisions.id),
    )
    .leftJoin(assets, eq(experienceRevisions.coverAssetId, assets.id))
    .where(
      and(eq(experiences.status, 'published'), isNull(experiences.deletedAt)),
    )
    .orderBy(asc(experiences.sortOrder), desc(experiences.updatedAt));

  return rows.map(({ objectKey, periodStart, periodEnd, ...row }) => ({
    ...row,
    period: periodEnd ? `${periodStart}—${periodEnd}` : `${periodStart}—now`,
    coverUrl: assetUrl(objectKey),
  }));
}

export async function getPublishedBlogs(): Promise<PublicBlog[]> {
  if (!hasDatabase()) {
    return blogPosts.map((item) => ({
      ...item,
      publishedAt: item.date,
      coverUrl: null,
    }));
  }

  const db = getDb();
  const rows = await db
    .select({
      id: blogs.id,
      slug: blogs.slug,
      title: blogRevisions.title,
      summary: blogRevisions.summary,
      bodyMarkdown: blogRevisions.bodyMarkdown,
      tags: blogRevisions.tags,
      publishedAt: blogRevisions.createdAt,
      objectKey: assets.objectKey,
    })
    .from(blogs)
    .innerJoin(blogRevisions, eq(blogs.publishedRevisionId, blogRevisions.id))
    .leftJoin(assets, eq(blogRevisions.coverAssetId, assets.id))
    .where(and(eq(blogs.status, 'published'), isNull(blogs.deletedAt)))
    .orderBy(desc(blogRevisions.createdAt));

  return rows.map(({ objectKey, publishedAt, ...row }) => ({
    ...row,
    publishedAt: publishedAt.toISOString().slice(0, 10),
    coverUrl: assetUrl(objectKey),
  }));
}

export async function getPublishedBlog(slug: string) {
  const all = await getPublishedBlogs();
  return all.find((blog) => blog.slug === slug) ?? null;
}

export async function getPublicContacts(): Promise<PublicContact[]> {
  if (!hasDatabase())
    return [
      {
        id: 'email',
        key: 'EMAIL',
        label: 'Email',
        value: 'khoa.work424@gmail.com',
        href: 'mailto:khoa.work424@gmail.com',
      },
      {
        id: 'github',
        key: 'GITHUB',
        label: 'GitHub',
        value: 'github.com/itsmekhoathekid',
        href: 'https://github.com/itsmekhoathekid',
      },
      {
        id: 'phone',
        key: 'PHONE',
        label: 'Phone',
        value: '0934030802',
        href: 'tel:0934030802',
      },
      {
        id: 'status',
        key: 'STATUS',
        label: 'Status',
        value: 'open_to_ai_ml_opportunities',
        href: null,
      },
    ];
  return getDb()
    .select({
      id: contacts.id,
      key: contacts.key,
      label: contacts.label,
      value: contacts.value,
      href: contacts.href,
    })
    .from(contacts)
    .where(eq(contacts.visible, true))
    .orderBy(asc(contacts.sortOrder));
}

export async function getPublicPortfolio() {
  const [
    publishedWorks,
    publishedExperiences,
    publishedBlogs,
    publishedContacts,
  ] = await Promise.all([
    getPublishedWorks(),
    getPublishedExperiences(),
    getPublishedBlogs(),
    getPublicContacts(),
  ]);
  return {
    works: publishedWorks,
    experiences: publishedExperiences,
    blogs: publishedBlogs,
    contacts: publishedContacts,
  };
}
