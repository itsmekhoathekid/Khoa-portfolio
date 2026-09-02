import { describe, expect, it } from 'vitest';
import { readImageDimensions } from './image-metadata';
import { MAX_IMAGE_SIZE, sanitizeFilename, validateImageUpload } from './r2';

describe('readImageDimensions', () => {
  it('reads PNG IHDR dimensions', () => {
    const bytes = new Uint8Array(24);
    const view = new DataView(bytes.buffer);
    view.setUint32(16, 1280);
    view.setUint32(20, 720);
    expect(readImageDimensions(bytes, 'image/png')).toEqual({
      width: 1280,
      height: 720,
    });
  });

  it('rejects unverified formats', () => {
    expect(() =>
      readImageDimensions(new Uint8Array(8), 'image/avif'),
    ).toThrow();
  });
});

describe('image upload validation', () => {
  it('accepts supported image types within the size limit', () => {
    expect(() => validateImageUpload('image/jpeg', 1)).not.toThrow();
    expect(() =>
      validateImageUpload('image/avif', MAX_IMAGE_SIZE),
    ).not.toThrow();
  });

  it('rejects SVG, empty files, and oversized files', () => {
    expect(() => validateImageUpload('image/svg+xml', 100)).toThrow(
      'Unsupported image type.',
    );
    expect(() => validateImageUpload('image/png', 0)).toThrow();
    expect(() =>
      validateImageUpload('image/png', MAX_IMAGE_SIZE + 1),
    ).toThrow();
  });

  it('sanitizes uploaded filenames', () => {
    expect(sanitizeFilename('../../My Portrait (Final).PNG')).toBe(
      'my-portrait-final.png',
    );
  });
});
