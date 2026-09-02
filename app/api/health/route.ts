import { eq } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/src/server/db/client';
import { assets } from '@/src/server/db/schema';
import { headObject } from '@/src/server/storage/r2';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA ?? 'local';

  if (!hasDatabase()) {
    return Response.json({ status: 'ok', mode: 'demo', commit });
  }

  try {
    const [asset] = await getDb()
      .select({ objectKey: assets.objectKey })
      .from(assets)
      .where(eq(assets.status, 'ready'))
      .limit(1);
    if (!asset) throw new Error('No ready production asset.');
    await headObject(asset.objectKey);
    return Response.json({ status: 'ok', mode: 'production', commit });
  } catch {
    return Response.json(
      { status: 'degraded', mode: 'production', commit },
      { status: 503 },
    );
  }
}
