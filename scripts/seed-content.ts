import 'dotenv/config';
import { eq, sql } from 'drizzle-orm';
import {
  blogPosts as resumeBlogs,
  experiences as resumeExperiences,
  works as resumeWorks,
} from '../src/features/content/demo-data';
import { closeDb, getDb } from '../src/server/db/client';
import {
  blogRevisions,
  blogs,
  contacts,
  experienceRevisions,
  experiences,
  searchDocuments,
  workRevisions,
  works,
} from '../src/server/db/schema';

const db = getDb();

for (const [sortOrder, item] of resumeBlogs.entries()) {
  const existing = await db
    .select({ id: blogs.id })
    .from(blogs)
    .where(eq(blogs.slug, item.slug))
    .limit(1);
  if (existing.length) continue;
  const [entity] = await db
    .insert(blogs)
    .values({ slug: item.slug, sortOrder })
    .returning({ id: blogs.id });
  const [revision] = await db
    .insert(blogRevisions)
    .values({
      blogId: entity.id,
      revision: 1,
      title: item.title,
      summary: item.summary,
      bodyMarkdown: item.bodyMarkdown,
      tags: item.tags,
      createdAt: new Date(`${item.date}T00:00:00.000Z`),
    })
    .returning({ id: blogRevisions.id });
  await db
    .update(blogs)
    .set({
      status: 'published',
      draftRevisionId: revision.id,
      publishedRevisionId: revision.id,
    })
    .where(eq(blogs.id, entity.id));
  const searchable = [
    item.title,
    item.summary,
    item.bodyMarkdown,
    ...item.tags,
  ].join(' ');
  await db.insert(searchDocuments).values({
    contentType: 'blog',
    entityId: entity.id,
    slug: item.slug,
    path: `/blogs/${item.slug}`,
    title: item.title,
    document: sql`to_tsvector('english', ${searchable})`,
  });
}

for (const [sortOrder, item] of resumeWorks.entries()) {
  const existing = await db
    .select({ id: works.id })
    .from(works)
    .where(eq(works.slug, item.id))
    .limit(1);
  if (existing.length) continue;
  const [entity] = await db
    .insert(works)
    .values({ slug: item.id, kind: item.kind, sortOrder })
    .returning({ id: works.id });
  const [revision] = await db
    .insert(workRevisions)
    .values({
      workId: entity.id,
      revision: 1,
      title: item.title,
      summary: item.summary,
      bodyMarkdown: item.bodyMarkdown,
      tags: item.tags,
      githubUrl: item.githubUrl,
    })
    .returning({ id: workRevisions.id });
  await db
    .update(works)
    .set({
      status: 'published',
      draftRevisionId: revision.id,
      publishedRevisionId: revision.id,
    })
    .where(eq(works.id, entity.id));
  const searchable = [
    item.title,
    item.summary,
    item.bodyMarkdown,
    ...item.tags,
  ].join(' ');
  await db.insert(searchDocuments).values({
    contentType: 'work',
    entityId: entity.id,
    slug: item.id,
    path: `/myworks/${item.kind}/${item.id}`,
    title: item.title,
    document: sql`to_tsvector('english', ${searchable})`,
  });
}

for (const [sortOrder, item] of resumeExperiences.entries()) {
  const existing = await db
    .select({ id: experiences.id })
    .from(experiences)
    .where(eq(experiences.slug, item.id))
    .limit(1);
  if (existing.length) continue;
  const [entity] = await db
    .insert(experiences)
    .values({ slug: item.id, sortOrder })
    .returning({ id: experiences.id });
  const [periodStart, periodEnd] = item.period.split('—');
  const [revision] = await db
    .insert(experienceRevisions)
    .values({
      experienceId: entity.id,
      revision: 1,
      title: item.title,
      organization: item.organization,
      periodStart,
      periodEnd: periodEnd || null,
      summary: item.summary,
      bodyMarkdown: item.bodyMarkdown,
    })
    .returning({ id: experienceRevisions.id });
  await db
    .update(experiences)
    .set({
      status: 'published',
      draftRevisionId: revision.id,
      publishedRevisionId: revision.id,
    })
    .where(eq(experiences.id, entity.id));
  const searchable = [
    item.title,
    item.organization,
    item.summary,
    item.bodyMarkdown,
  ].join(' ');
  await db.insert(searchDocuments).values({
    contentType: 'experience',
    entityId: entity.id,
    slug: item.id,
    path: `/experiences/${item.id}`,
    title: item.title,
    document: sql`to_tsvector('english', ${searchable})`,
  });
}

const resumeContacts = [
  {
    key: 'EMAIL',
    label: 'Email',
    value: 'khoa.work424@gmail.com',
    href: 'mailto:khoa.work424@gmail.com',
    sortOrder: 0,
  },
  {
    key: 'GITHUB',
    label: 'GitHub',
    value: 'github.com/itsmekhoathekid',
    href: 'https://github.com/itsmekhoathekid',
    sortOrder: 1,
  },
  {
    key: 'PHONE',
    label: 'Phone',
    value: '0934030802',
    href: 'tel:0934030802',
    sortOrder: 2,
  },
  {
    key: 'STATUS',
    label: 'Status',
    value: 'open_to_ai_ml_opportunities',
    href: null,
    sortOrder: 3,
  },
];
for (const item of resumeContacts)
  await db
    .insert(contacts)
    .values(item)
    .onConflictDoUpdate({ target: contacts.key, set: item });

console.log(
  `Seeded ${resumeBlogs.length} blogs, ${resumeWorks.length} works, ${resumeExperiences.length} experience/education entries, and ${resumeContacts.length} contacts from the CV.`,
);
await closeDb();
