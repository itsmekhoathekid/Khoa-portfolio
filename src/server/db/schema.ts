import { sql } from 'drizzle-orm';
import {
  boolean,
  customType,
  index,
  integer,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const tsvector = customType<{ data: string }>({ dataType: () => 'tsvector' });

export const contentStatus = pgEnum('content_status', [
  'draft',
  'published',
  'archived',
]);
export const workKind = pgEnum('work_kind', [
  'projects',
  'publications',
  'competitions',
]);
export const assetStatus = pgEnum('asset_status', [
  'pending',
  'ready',
  'rejected',
]);

export const users = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  username: text('username').unique(),
  displayUsername: text('display_username'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sessions = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

export const accounts = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    issuer: text('issuer').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
      withTimezone: true,
    }),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('account_issuer_account_idx').on(
      table.issuer,
      table.accountId,
    ),
  ],
);

export const verifications = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  objectKey: text('object_key').notNull().unique(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  width: integer('width'),
  height: integer('height'),
  checksum: text('checksum'),
  altText: text('alt_text').notNull().default(''),
  status: assetStatus('status').notNull().default('pending'),
  createdBy: text('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const blogs = pgTable('blogs', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  status: contentStatus('status').notNull().default('draft'),
  sortOrder: integer('sort_order').notNull().default(0),
  draftRevisionId: uuid('draft_revision_id'),
  publishedRevisionId: uuid('published_revision_id'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const blogRevisions = pgTable(
  'blog_revisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    blogId: uuid('blog_id')
      .notNull()
      .references(() => blogs.id, { onDelete: 'cascade' }),
    revision: integer('revision').notNull(),
    title: text('title').notNull(),
    summary: text('summary').notNull().default(''),
    bodyMarkdown: text('body_markdown').notNull().default(''),
    tags: text('tags')
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    coverAssetId: uuid('cover_asset_id').references(() => assets.id),
    focalX: real('focal_x').notNull().default(50),
    focalY: real('focal_y').notNull().default(50),
    createdBy: text('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('blog_revision_idx').on(table.blogId, table.revision),
  ],
);

export const works = pgTable('works', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  kind: workKind('kind').notNull(),
  status: contentStatus('status').notNull().default('draft'),
  sortOrder: integer('sort_order').notNull().default(0),
  draftRevisionId: uuid('draft_revision_id'),
  publishedRevisionId: uuid('published_revision_id'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const workRevisions = pgTable(
  'work_revisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workId: uuid('work_id')
      .notNull()
      .references(() => works.id, { onDelete: 'cascade' }),
    revision: integer('revision').notNull(),
    title: text('title').notNull(),
    summary: text('summary').notNull().default(''),
    bodyMarkdown: text('body_markdown').notNull().default(''),
    tags: text('tags')
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    githubUrl: text('github_url'),
    coverAssetId: uuid('cover_asset_id').references(() => assets.id),
    focalX: real('focal_x').notNull().default(50),
    focalY: real('focal_y').notNull().default(50),
    createdBy: text('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('work_revision_idx').on(table.workId, table.revision),
  ],
);

export const experiences = pgTable('experiences', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  status: contentStatus('status').notNull().default('draft'),
  sortOrder: integer('sort_order').notNull().default(0),
  draftRevisionId: uuid('draft_revision_id'),
  publishedRevisionId: uuid('published_revision_id'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const experienceRevisions = pgTable(
  'experience_revisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    experienceId: uuid('experience_id')
      .notNull()
      .references(() => experiences.id, { onDelete: 'cascade' }),
    revision: integer('revision').notNull(),
    title: text('title').notNull(),
    organization: text('organization').notNull().default(''),
    periodStart: text('period_start').notNull(),
    periodEnd: text('period_end'),
    summary: text('summary').notNull().default(''),
    bodyMarkdown: text('body_markdown').notNull().default(''),
    coverAssetId: uuid('cover_asset_id').references(() => assets.id),
    focalX: real('focal_x').notNull().default(50),
    focalY: real('focal_y').notNull().default(50),
    createdBy: text('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('experience_revision_idx').on(
      table.experienceId,
      table.revision,
    ),
  ],
);

export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  label: text('label').notNull(),
  value: text('value').notNull(),
  href: text('href'),
  visible: boolean('visible').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Better Auth resolves its core models by these singular schema keys. Keep the
// descriptive plural exports above for application repositories, and expose
// aliases so the Drizzle adapter can find the same physical tables.
export const user = users;
export const session = sessions;
export const account = accounts;
export const verification = verifications;

export const searchDocuments = pgTable(
  'search_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contentType: text('content_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    slug: text('slug').notNull(),
    path: text('path').notNull(),
    title: text('title').notNull(),
    document: tsvector('document').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('search_entity_idx').on(table.contentType, table.entityId),
    index('search_document_gin_idx').using('gin', table.document),
  ],
);
