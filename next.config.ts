import type { NextConfig } from 'next';

const mediaUrl = process.env.NEXT_PUBLIC_MEDIA_URL;
const isAbsoluteMediaUrl = Boolean(mediaUrl && /^https?:\/\//.test(mediaUrl));
const mediaHost = isAbsoluteMediaUrl ? new URL(mediaUrl!).hostname : '';
const localMedia = mediaHost === '127.0.0.1' || mediaHost === 'localhost';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  images: isAbsoluteMediaUrl
    ? {
        remotePatterns: [new URL(`${mediaUrl!.replace(/\/$/, '')}/assets/**`)],
        // Local development uses MinIO. Production R2 stays protected by the
        // default private-network restriction because its hostname is public.
        dangerouslyAllowLocalIP: localMedia,
      }
    : undefined,
};

export default nextConfig;
