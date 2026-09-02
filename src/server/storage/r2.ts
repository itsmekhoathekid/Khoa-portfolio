import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function getClient() {
  return new S3Client({
    region: 'auto',
    endpoint: env('R2_ENDPOINT'),
    forcePathStyle: process.env.R2_FORCE_PATH_STYLE === 'true',
    credentials: {
      accessKeyId: env('R2_ACCESS_KEY_ID'),
      secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
    },
  });
}

export function validateImageUpload(mimeType: string, size: number) {
  if (!allowedMimeTypes.has(mimeType))
    throw new Error('Unsupported image type.');
  if (!Number.isFinite(size) || size <= 0 || size > MAX_IMAGE_SIZE) {
    throw new Error('Image must be between 1 byte and 10 MB.');
  }
}

export function sanitizeFilename(filename: string) {
  const basename = filename.split(/[\\/]/).pop() ?? '';
  return (
    basename
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^\.+/, '')
      .replace(/-+(?=\.)/g, '')
      .replace(/^-+|-+$/g, '') || 'image'
  );
}

export function publicAssetUrl(objectKey: string) {
  const base = env('NEXT_PUBLIC_MEDIA_URL').replace(/\/$/, '');
  return `${base}/${objectKey}`;
}

export async function createUploadUrl(objectKey: string, mimeType: string) {
  return getSignedUrl(
    getClient(),
    new PutObjectCommand({
      Bucket: env('R2_BUCKET'),
      Key: objectKey,
      ContentType: mimeType,
    }),
    { expiresIn: 300 },
  );
}

export async function headObject(objectKey: string) {
  return getClient().send(
    new HeadObjectCommand({ Bucket: env('R2_BUCKET'), Key: objectKey }),
  );
}

export async function getObjectBytes(objectKey: string) {
  return getClient().send(
    new GetObjectCommand({
      Bucket: env('R2_BUCKET'),
      Key: objectKey,
    }),
  );
}

export async function deleteObject(objectKey: string) {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: env('R2_BUCKET'), Key: objectKey }),
  );
}
