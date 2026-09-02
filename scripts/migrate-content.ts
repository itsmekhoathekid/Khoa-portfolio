import { createHash } from 'node:crypto';
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import postgres from 'postgres';
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });
config({ quiet: true });

type SqlValue = string | number | boolean | Date | null | string[];
type Row = Record<string, SqlValue>;

const arguments_ = process.argv.slice(2);
const apply = arguments_.includes('--apply');
if (
  arguments_.length !== 1 ||
  arguments_.some((argument) => !['--apply', '--dry-run'].includes(argument))
)
  throw new Error('Usage: pnpm content:migrate --dry-run | --apply');

function required(name: string, fallback?: string) {
  const value =
    process.env[name] ?? (fallback ? process.env[fallback] : undefined);
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

const sourceUrl = required('SOURCE_DATABASE_URL', 'DATABASE_URL');
const targetUrl = required('TARGET_DATABASE_URL');
if (sourceUrl === targetUrl)
  throw new Error('Source and target databases must differ.');

const source = postgres(sourceUrl, { max: 1 });
const target = postgres(targetUrl, { max: 1 });

function storageClient(prefix: 'SOURCE' | 'TARGET') {
  return new S3Client({
    region: 'auto',
    endpoint: required(
      `${prefix}_R2_ENDPOINT`,
      prefix === 'SOURCE' ? 'R2_ENDPOINT' : undefined,
    ),
    forcePathStyle:
      process.env[`${prefix}_R2_FORCE_PATH_STYLE`] === 'true' ||
      (prefix === 'SOURCE' && process.env.R2_FORCE_PATH_STYLE === 'true'),
    credentials: {
      accessKeyId: required(
        `${prefix}_R2_ACCESS_KEY_ID`,
        prefix === 'SOURCE' ? 'R2_ACCESS_KEY_ID' : undefined,
      ),
      secretAccessKey: required(
        `${prefix}_R2_SECRET_ACCESS_KEY`,
        prefix === 'SOURCE' ? 'R2_SECRET_ACCESS_KEY' : undefined,
      ),
    },
  });
}

const sourceStorage = storageClient('SOURCE');
const targetStorage = storageClient('TARGET');
const sourceBucket = required('SOURCE_R2_BUCKET', 'R2_BUCKET');
const targetBucket = required('TARGET_R2_BUCKET');

function rewriteMediaUrls(markdown: string) {
  return markdown.replace(
    /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/(?:[^)\s]+\/)?(assets\/[0-9a-f-]{36}\/[a-z0-9._-]+)/gi,
    '/media/$1',
  );
}

function collectInlineAssetKeys(markdown: string) {
  return Array.from(
    markdown.matchAll(
      /(?:\/media\/|\/)(assets\/[0-9a-f-]{36}\/[a-z0-9._-]+)/gi,
    ),
    (match) => match[1],
  );
}

function normalize(row: Row, overrides: Row = {}) {
  return { ...row, ...overrides };
}

function comparable(row: Row, fields: string[]) {
  return JSON.stringify(
    Object.fromEntries(
      fields.map((field) => {
        const value = row[field];
        return [field, value instanceof Date ? value.toISOString() : value];
      }),
    ),
  );
}

function ensureNoConflicts(
  table: string,
  sourceRows: Row[],
  targetRows: Row[],
  fields: string[],
  uniqueFields: string[] = [],
) {
  const byId = new Map(targetRows.map((row) => [row.id, row]));
  for (const row of sourceRows) {
    const sameId = byId.get(row.id);
    if (sameId && comparable(row, fields) !== comparable(sameId, fields))
      throw new Error(`${table} conflict for id ${String(row.id)}.`);
    for (const field of uniqueFields) {
      const collision = targetRows.find(
        (candidate) =>
          candidate[field] === row[field] && candidate.id !== row.id,
      );
      if (collision)
        throw new Error(
          `${table} conflict: ${field}=${String(row[field])} belongs to another id.`,
        );
    }
  }
}

async function objectBytes(client: S3Client, bucket: string, key: string) {
  const response = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  const bytes = await response.Body?.transformToByteArray();
  if (!bytes) throw new Error(`Unable to read s3://${bucket}/${key}.`);
  return bytes;
}

async function copyAsset(asset: Row) {
  const key = String(asset.object_key);
  const bytes = await objectBytes(sourceStorage, sourceBucket, key);
  const checksum = createHash('sha256').update(bytes).digest('hex');
  if (asset.checksum && checksum !== asset.checksum)
    throw new Error(`Source checksum mismatch for ${key}.`);
  if (bytes.byteLength !== Number(asset.size))
    throw new Error(`Source size mismatch for ${key}.`);

  try {
    await targetStorage.send(
      new HeadObjectCommand({ Bucket: targetBucket, Key: key }),
    );
    const targetBytes = await objectBytes(targetStorage, targetBucket, key);
    const targetChecksum = createHash('sha256')
      .update(targetBytes)
      .digest('hex');
    if (targetChecksum !== checksum)
      throw new Error(`Target object checksum conflict for ${key}.`);
    return 'verified';
  } catch (error) {
    if (error instanceof Error && error.message.includes('checksum conflict'))
      throw error;
  }

  await targetStorage.send(
    new PutObjectCommand({
      Bucket: targetBucket,
      Key: key,
      Body: bytes,
      ContentType: String(asset.mime_type),
    }),
  );
  return 'copied';
}

const [blogs, works, experiences, contacts] = await Promise.all([
  source<
    Row[]
  >`select * from blogs where deleted_at is null order by created_at`,
  source<
    Row[]
  >`select * from works where deleted_at is null order by created_at`,
  source<
    Row[]
  >`select * from experiences where deleted_at is null order by created_at`,
  source<Row[]>`select * from contacts order by sort_order, key`,
]);

const [rawBlogRevisions, rawWorkRevisions, rawExperienceRevisions] =
  await Promise.all([
    source<
      Row[]
    >`select r.* from blog_revisions r join blogs b on b.id = r.blog_id where b.deleted_at is null order by r.blog_id, r.revision`,
    source<
      Row[]
    >`select r.* from work_revisions r join works w on w.id = r.work_id where w.deleted_at is null order by r.work_id, r.revision`,
    source<
      Row[]
    >`select r.* from experience_revisions r join experiences e on e.id = r.experience_id where e.deleted_at is null order by r.experience_id, r.revision`,
  ]);

const blogRevisions = rawBlogRevisions.map((row) =>
  normalize(row, {
    body_markdown: rewriteMediaUrls(String(row.body_markdown)),
    created_by: null,
  }),
);
const workRevisions = rawWorkRevisions.map((row) =>
  normalize(row, {
    body_markdown: rewriteMediaUrls(String(row.body_markdown)),
    created_by: null,
  }),
);
const experienceRevisions = rawExperienceRevisions.map((row) =>
  normalize(row, {
    body_markdown: rewriteMediaUrls(String(row.body_markdown)),
    created_by: null,
  }),
);

const coverIds = new Set(
  [...blogRevisions, ...workRevisions, ...experienceRevisions]
    .map((row) => row.cover_asset_id)
    .filter(Boolean),
);
const inlineKeys = new Set(
  [...blogRevisions, ...workRevisions, ...experienceRevisions].flatMap((row) =>
    collectInlineAssetKeys(String(row.body_markdown)),
  ),
);
const readyAssets = await source<
  Row[]
>`select * from assets where status = 'ready' order by created_at`;
const assets = readyAssets
  .filter(
    (row) => coverIds.has(row.id) || inlineKeys.has(String(row.object_key)),
  )
  .map((row) => normalize(row, { created_by: null }));

for (const coverId of coverIds) {
  if (!assets.some((asset) => asset.id === coverId))
    throw new Error(`Referenced cover asset ${String(coverId)} is not ready.`);
}
for (const key of inlineKeys) {
  if (!assets.some((asset) => asset.object_key === key))
    throw new Error(`Referenced Markdown asset ${key} is not ready.`);
}

const targetRows = {
  assets: await target<Row[]>`select * from assets`,
  blogs: await target<Row[]>`select * from blogs`,
  blogRevisions: await target<Row[]>`select * from blog_revisions`,
  works: await target<Row[]>`select * from works`,
  workRevisions: await target<Row[]>`select * from work_revisions`,
  experiences: await target<Row[]>`select * from experiences`,
  experienceRevisions: await target<Row[]>`select * from experience_revisions`,
};

ensureNoConflicts(
  'assets',
  assets,
  targetRows.assets,
  ['object_key', 'mime_type', 'size', 'width', 'height', 'checksum', 'status'],
  ['object_key'],
);
ensureNoConflicts(
  'blogs',
  blogs,
  targetRows.blogs,
  [
    'slug',
    'status',
    'sort_order',
    'draft_revision_id',
    'published_revision_id',
  ],
  ['slug'],
);
ensureNoConflicts('blog_revisions', blogRevisions, targetRows.blogRevisions, [
  'blog_id',
  'revision',
  'title',
  'summary',
  'body_markdown',
  'tags',
  'cover_asset_id',
  'focal_x',
  'focal_y',
]);
ensureNoConflicts(
  'works',
  works,
  targetRows.works,
  [
    'slug',
    'kind',
    'status',
    'sort_order',
    'draft_revision_id',
    'published_revision_id',
  ],
  ['slug'],
);
ensureNoConflicts('work_revisions', workRevisions, targetRows.workRevisions, [
  'work_id',
  'revision',
  'title',
  'summary',
  'body_markdown',
  'tags',
  'github_url',
  'cover_asset_id',
  'focal_x',
  'focal_y',
]);
ensureNoConflicts(
  'experiences',
  experiences,
  targetRows.experiences,
  [
    'slug',
    'status',
    'sort_order',
    'draft_revision_id',
    'published_revision_id',
  ],
  ['slug'],
);
ensureNoConflicts(
  'experience_revisions',
  experienceRevisions,
  targetRows.experienceRevisions,
  [
    'experience_id',
    'revision',
    'title',
    'organization',
    'period_start',
    'period_end',
    'summary',
    'body_markdown',
    'cover_asset_id',
    'focal_x',
    'focal_y',
  ],
);

console.table({
  blogs: blogs.length,
  blogRevisions: blogRevisions.length,
  works: works.length,
  workRevisions: workRevisions.length,
  experiences: experiences.length,
  experienceRevisions: experienceRevisions.length,
  contacts: contacts.length,
  readyReferencedAssets: assets.length,
});

if (!apply) {
  console.log(
    'Dry run passed. Re-run with --apply to copy objects and content.',
  );
  await Promise.all([source.end(), target.end()]);
  process.exit(0);
}

for (const asset of assets) {
  const result = await copyAsset(asset);
  console.log(`${result}: ${String(asset.object_key)}`);
}

await target.begin(async (tx) => {
  for (const asset of assets)
    await tx`
      insert into assets (id, object_key, original_name, mime_type, size, width, height, checksum, alt_text, status, created_by, created_at)
      values (${asset.id}, ${asset.object_key}, ${asset.original_name}, ${asset.mime_type}, ${asset.size}, ${asset.width}, ${asset.height}, ${asset.checksum}, ${asset.alt_text}, ${asset.status}, null, ${asset.created_at})
      on conflict (id) do nothing
    `;

  for (const row of blogs)
    await tx`
      insert into blogs (id, slug, status, sort_order, draft_revision_id, published_revision_id, deleted_at, created_at, updated_at)
      values (${row.id}, ${row.slug}, ${row.status}, ${row.sort_order}, null, null, null, ${row.created_at}, ${row.updated_at})
      on conflict (id) do nothing
    `;
  for (const row of blogRevisions)
    await tx`
      insert into blog_revisions (id, blog_id, revision, title, summary, body_markdown, tags, cover_asset_id, focal_x, focal_y, created_by, created_at)
      values (${row.id}, ${row.blog_id}, ${row.revision}, ${row.title}, ${row.summary}, ${row.body_markdown}, ${row.tags}, ${row.cover_asset_id}, ${row.focal_x}, ${row.focal_y}, null, ${row.created_at})
      on conflict (id) do nothing
    `;
  for (const row of blogs)
    await tx`update blogs set draft_revision_id = ${row.draft_revision_id}, published_revision_id = ${row.published_revision_id} where id = ${row.id}`;

  for (const row of works)
    await tx`
      insert into works (id, slug, kind, status, sort_order, draft_revision_id, published_revision_id, deleted_at, created_at, updated_at)
      values (${row.id}, ${row.slug}, ${row.kind}, ${row.status}, ${row.sort_order}, null, null, null, ${row.created_at}, ${row.updated_at})
      on conflict (id) do nothing
    `;
  for (const row of workRevisions)
    await tx`
      insert into work_revisions (id, work_id, revision, title, summary, body_markdown, tags, github_url, cover_asset_id, focal_x, focal_y, created_by, created_at)
      values (${row.id}, ${row.work_id}, ${row.revision}, ${row.title}, ${row.summary}, ${row.body_markdown}, ${row.tags}, ${row.github_url}, ${row.cover_asset_id}, ${row.focal_x}, ${row.focal_y}, null, ${row.created_at})
      on conflict (id) do nothing
    `;
  for (const row of works)
    await tx`update works set draft_revision_id = ${row.draft_revision_id}, published_revision_id = ${row.published_revision_id} where id = ${row.id}`;

  for (const row of experiences)
    await tx`
      insert into experiences (id, slug, status, sort_order, draft_revision_id, published_revision_id, deleted_at, created_at, updated_at)
      values (${row.id}, ${row.slug}, ${row.status}, ${row.sort_order}, null, null, null, ${row.created_at}, ${row.updated_at})
      on conflict (id) do nothing
    `;
  for (const row of experienceRevisions)
    await tx`
      insert into experience_revisions (id, experience_id, revision, title, organization, period_start, period_end, summary, body_markdown, cover_asset_id, focal_x, focal_y, created_by, created_at)
      values (${row.id}, ${row.experience_id}, ${row.revision}, ${row.title}, ${row.organization}, ${row.period_start}, ${row.period_end}, ${row.summary}, ${row.body_markdown}, ${row.cover_asset_id}, ${row.focal_x}, ${row.focal_y}, null, ${row.created_at})
      on conflict (id) do nothing
    `;
  for (const row of experiences)
    await tx`update experiences set draft_revision_id = ${row.draft_revision_id}, published_revision_id = ${row.published_revision_id} where id = ${row.id}`;

  for (const row of contacts)
    await tx`
      insert into contacts (id, key, label, value, href, visible, sort_order, updated_at)
      values (${row.id}, ${row.key}, ${row.label}, ${row.value}, ${row.href}, ${row.visible}, ${row.sort_order}, ${row.updated_at})
      on conflict (key) do update set label = excluded.label, value = excluded.value, href = excluded.href, visible = excluded.visible, sort_order = excluded.sort_order, updated_at = excluded.updated_at
    `;

  await tx`delete from search_documents where content_type in ('blog', 'work', 'experience')`;
  await tx`
    insert into search_documents (content_type, entity_id, slug, path, title, document)
    select 'blog', b.id, b.slug, '/blogs/' || b.slug, r.title,
      to_tsvector('english', concat_ws(' ', r.title, r.summary, r.body_markdown, array_to_string(r.tags, ' ')))
    from blogs b join blog_revisions r on r.id = b.published_revision_id
    where b.status = 'published' and b.deleted_at is null
  `;
  await tx`
    insert into search_documents (content_type, entity_id, slug, path, title, document)
    select 'work', w.id, w.slug, '/myworks/' || w.kind::text || '/' || w.slug, r.title,
      to_tsvector('english', concat_ws(' ', r.title, r.summary, r.body_markdown, array_to_string(r.tags, ' ')))
    from works w join work_revisions r on r.id = w.published_revision_id
    where w.status = 'published' and w.deleted_at is null
  `;
  await tx`
    insert into search_documents (content_type, entity_id, slug, path, title, document)
    select 'experience', e.id, e.slug, '/experiences/' || e.slug, r.title,
      to_tsvector('english', concat_ws(' ', r.title, r.organization, r.summary, r.body_markdown))
    from experiences e join experience_revisions r on r.id = e.published_revision_id
    where e.status = 'published' and e.deleted_at is null
  `;
});

console.log(
  'Content, revision history, referenced assets, and search index migrated.',
);
await Promise.all([source.end(), target.end()]);
