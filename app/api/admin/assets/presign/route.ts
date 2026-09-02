import { randomUUID } from 'node:crypto';
import { requireAdmin } from '@/src/server/auth/guard';
import { getDb } from '@/src/server/db/client';
import { assets } from '@/src/server/db/schema';
import {
  createUploadUrl,
  publicAssetUrl,
  sanitizeFilename,
  validateImageUpload,
} from '@/src/server/storage/r2';
import { presignAssetSchema } from '@/src/server/storage/schemas';

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const input = presignAssetSchema.parse(await request.json());
    validateImageUpload(input.mimeType, input.size);
    const id = randomUUID();
    const objectKey = `assets/${id}/${sanitizeFilename(input.filename)}`;
    const [asset] = await getDb()
      .insert(assets)
      .values({
        id,
        objectKey,
        originalName: input.filename,
        mimeType: input.mimeType,
        size: input.size,
        createdBy: session.user.id,
      })
      .returning();
    return Response.json({
      assetId: asset.id,
      objectKey,
      publicUrl: publicAssetUrl(objectKey),
      uploadUrl: await createUploadUrl(objectKey, input.mimeType),
      expiresIn: 300,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to prepare upload.';
    return Response.json(
      { error: message },
      { status: message === 'Unauthorized' ? 401 : 400 },
    );
  }
}
