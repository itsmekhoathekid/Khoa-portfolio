import { describe, expect, it } from 'vitest';
import { isValidAssetKey, mediaPath } from './media';

describe('media asset keys', () => {
  const id = '123e4567-e89b-42d3-a456-426614174000';

  it('accepts the generated asset layout', () => {
    expect(isValidAssetKey(`assets/${id}/cover-image.webp`)).toBe(true);
    expect(mediaPath(`assets/${id}/cover-image.webp`)).toBe(
      `/media/assets/${id}/cover-image.webp`,
    );
  });

  it('rejects traversal and keys outside the asset namespace', () => {
    expect(isValidAssetKey(`assets/${id}/../secret`)).toBe(false);
    expect(isValidAssetKey(`drafts/${id}/cover.png`)).toBe(false);
    expect(isValidAssetKey(`assets/not-a-uuid/cover.png`)).toBe(false);
  });
});
