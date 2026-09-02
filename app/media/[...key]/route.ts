import { and, eq } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/src/server/db/client';
import { assets } from '@/src/server/db/schema';
import { isValidAssetKey } from '@/src/server/storage/media';
import { getObjectBytes, headObject } from '@/src/server/storage/r2';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const immutableCache = 'public, max-age=31536000, immutable';

async function getReadyAsset(key: string) {
  if (!hasDatabase() || !isValidAssetKey(key)) return null;
  const [asset] = await getDb()
    .select({
      objectKey: assets.objectKey,
      mimeType: assets.mimeType,
      size: assets.size,
      checksum: assets.checksum,
      originalName: assets.originalName,
    })
    .from(assets)
    .where(and(eq(assets.objectKey, key), eq(assets.status, 'ready')))
    .limit(1);
  return asset ?? null;
}

function responseHeaders(
  asset: NonNullable<Awaited<ReturnType<typeof getReadyAsset>>>,
) {
  return {
    'Cache-Control': immutableCache,
    'Content-Type': asset.mimeType,
    'Content-Disposition': 'inline',
    'X-Content-Type-Options': 'nosniff',
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string[] }> },
) {
  const key = (await context.params).key.join('/');
  const asset = await getReadyAsset(key);
  if (!asset) return new Response('Not found', { status: 404 });

  try {
    const object = await getObjectBytes(asset.objectKey);
    if (!object.Body) return new Response('Not found', { status: 404 });
    const headers = new Headers(responseHeaders(asset));
    headers.set('Content-Length', String(object.ContentLength ?? asset.size));
    if (object.ETag) headers.set('ETag', object.ETag);
    else if (asset.checksum) headers.set('ETag', `"sha256-${asset.checksum}"`);
    return new Response(object.Body.transformToWebStream(), { headers });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}

export async function HEAD(
  _request: Request,
  context: { params: Promise<{ key: string[] }> },
) {
  const key = (await context.params).key.join('/');
  const asset = await getReadyAsset(key);
  if (!asset) return new Response(null, { status: 404 });

  try {
    const object = await headObject(asset.objectKey);
    const headers = new Headers(responseHeaders(asset));
    headers.set('Content-Length', String(object.ContentLength ?? asset.size));
    if (object.ETag) headers.set('ETag', object.ETag);
    else if (asset.checksum) headers.set('ETag', `"sha256-${asset.checksum}"`);
    return new Response(null, { headers });
  } catch {
    return new Response(null, { status: 404 });
  }
}
