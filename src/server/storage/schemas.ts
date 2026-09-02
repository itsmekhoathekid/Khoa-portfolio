import { z } from 'zod';
import { MAX_IMAGE_SIZE } from './r2';

export const presignAssetSchema = z.object({
  filename: z.string().min(1).max(180),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  size: z.number().int().positive().max(MAX_IMAGE_SIZE),
  purpose: z.enum(['cover', 'markdown']),
});

export const finalizeAssetSchema = z.object({
  altText: z.string().max(300).default(''),
  width: z.number().int().positive().max(20_000),
  height: z.number().int().positive().max(20_000),
  checksum: z.string().max(128).optional(),
});
