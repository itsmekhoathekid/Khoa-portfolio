import { eq } from 'drizzle-orm';
import { fileTypeFromBuffer } from 'file-type';
import { createHash } from 'node:crypto';
import { requireAdmin } from '@/src/server/auth/guard';
import { getDb } from '@/src/server/db/client';
import { assets } from '@/src/server/db/schema';
import {
  deleteObject,
  getObjectBytes,
  headObject,
  publicAssetUrl,
  validateImageUpload,
} from '@/src/server/storage/r2';
import { readImageDimensions } from '@/src/server/storage/image-metadata';
import { finalizeAssetSchema } from '@/src/server/storage/schemas';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const input = finalizeAssetSchema.parse(await request.json());
    const [asset] = await getDb()
      .select()
      .from(assets)
      .where(eq(assets.id, id))
      .limit(1);
    if (!asset || asset.status !== 'pending')
      return Response.json({ error: 'Asset not found.' }, { status: 404 });

    const metadata = await headObject(asset.objectKey);
    const body = await getObjectBytes(asset.objectKey);
    const bytes = await body.Body?.transformToByteArray();
    if (!bytes) throw new Error('Unable to read the uploaded object.');
    const detected = await fileTypeFromBuffer(bytes);
    const size = metadata.ContentLength ?? asset.size;
    if (!detected || detected.mime !== asset.mimeType) {
      await deleteObject(asset.objectKey);
      await getDb()
        .update(assets)
        .set({ status: 'rejected' })
        .where(eq(assets.id, id));
      return Response.json(
        { error: 'Uploaded bytes do not match the declared image type.' },
        { status: 400 },
      );
    }
    validateImageUpload(detected.mime, size);
    const dimensions = readImageDimensions(bytes, detected.mime);
    if (
      dimensions.width !== input.width ||
      dimensions.height !== input.height
    ) {
      await deleteObject(asset.objectKey);
      await getDb()
        .update(assets)
        .set({ status: 'rejected' })
        .where(eq(assets.id, id));
      return Response.json(
        { error: 'Image dimensions could not be verified.' },
        { status: 400 },
      );
    }
    const checksum = createHash('sha256').update(bytes).digest('hex');
    if (input.checksum && checksum !== input.checksum) {
      await deleteObject(asset.objectKey);
      await getDb()
        .update(assets)
        .set({ status: 'rejected' })
        .where(eq(assets.id, id));
      return Response.json(
        { error: 'Image checksum mismatch.' },
        { status: 400 },
      );
    }
    const [ready] = await getDb()
      .update(assets)
      .set({
        status: 'ready',
        width: input.width,
        height: input.height,
        altText: input.altText,
        checksum,
        size,
      })
      .where(eq(assets.id, id))
      .returning();
    return Response.json({
      asset: ready,
      publicUrl: publicAssetUrl(ready.objectKey),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to finalize upload.';
    return Response.json(
      { error: message },
      { status: message === 'Unauthorized' ? 401 : 400 },
    );
  }
}
