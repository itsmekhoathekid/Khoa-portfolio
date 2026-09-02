export const acceptedImages = 'image/jpeg,image/png,image/webp,image/avif';
export const maxImageBytes = 10 * 1024 * 1024;

export async function uploadAsset(
  file: File,
  purpose: 'cover' | 'markdown',
  altText = '',
) {
  if (!acceptedImages.split(',').includes(file.type))
    throw new Error('Use JPEG, PNG, WebP, or AVIF. SVG is disabled.');
  if (file.size <= 0 || file.size > maxImageBytes)
    throw new Error('Image must be 10 MB or smaller.');
  const bitmap = await createImageBitmap(file);
  const checksum = Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', await file.arrayBuffer()),
    ),
  )
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  const presignResponse = await fetch('/api/admin/assets/presign', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      purpose,
    }),
  });
  const presign = await presignResponse.json();
  if (!presignResponse.ok)
    throw new Error(presign.error ?? 'Unable to prepare upload.');
  const uploadResponse = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': file.type },
    body: file,
  });
  if (!uploadResponse.ok)
    throw new Error('R2 upload failed. Your existing image was not changed.');
  const finalizeResponse = await fetch(
    `/api/admin/assets/${presign.assetId}/finalize`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        width: bitmap.width,
        height: bitmap.height,
        checksum,
        altText,
      }),
    },
  );
  const finalized = await finalizeResponse.json();
  if (!finalizeResponse.ok)
    throw new Error(finalized.error ?? 'Upload validation failed.');
  return {
    id: presign.assetId as string,
    url: finalized.publicUrl as string,
    width: bitmap.width,
    height: bitmap.height,
  };
}
