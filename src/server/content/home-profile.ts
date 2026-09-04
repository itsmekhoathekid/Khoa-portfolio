import { and, eq, inArray } from 'drizzle-orm';
import {
  defaultHomeProfile,
  homeProfileSettingKey,
  homeProfileSuffixes,
  parseHomeProfileSettings,
  type HomeProfile,
  type HomeProfilePrefix,
} from '@/src/features/content/home-profile';
import { getDb, hasDatabase } from '@/src/server/db/client';
import { assets, contacts } from '@/src/server/db/schema';

export async function getPublishedHomeProfile(): Promise<HomeProfile> {
  if (!hasDatabase()) return defaultHomeProfile;
  return readHomeProfile('HOME', defaultHomeProfile);
}

export async function getDraftHomeProfile(): Promise<HomeProfile> {
  if (!hasDatabase()) return defaultHomeProfile;
  const published = await readHomeProfile('HOME', defaultHomeProfile);
  return readHomeProfile('HOME_DRAFT', published);
}

async function readHomeProfile(
  prefix: HomeProfilePrefix,
  fallback: HomeProfile,
) {
  const db = getDb();
  const keys = homeProfileSuffixes.map((suffix) =>
    homeProfileSettingKey(prefix, suffix),
  );
  const rows = await db
    .select({ key: contacts.key, value: contacts.value })
    .from(contacts)
    .where(inArray(contacts.key, keys));
  const profile = parseHomeProfileSettings(
    new Map(rows.map((row) => [row.key, row.value])),
    prefix,
    fallback,
  );
  if (
    !profile.portraitAssetId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      profile.portraitAssetId,
    )
  )
    return { ...profile, portraitAssetId: null, portraitUrl: null };
  const [asset] = await db
    .select({ objectKey: assets.objectKey })
    .from(assets)
    .where(
      and(eq(assets.id, profile.portraitAssetId), eq(assets.status, 'ready')),
    )
    .limit(1);
  return { ...profile, portraitUrl: mediaUrl(asset?.objectKey ?? null) };
}

function mediaUrl(objectKey: string | null) {
  if (!objectKey || !process.env.NEXT_PUBLIC_MEDIA_URL) return null;
  return `${process.env.NEXT_PUBLIC_MEDIA_URL.replace(/\/$/, '')}/${objectKey}`;
}
