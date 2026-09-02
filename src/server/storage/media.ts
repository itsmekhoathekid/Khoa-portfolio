const assetKeyPattern =
  /^assets\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[a-z0-9][a-z0-9._-]*$/i;

export function isValidAssetKey(key: string) {
  return key.length <= 512 && assetKeyPattern.test(key);
}

export function mediaPath(objectKey: string) {
  return `/media/${objectKey}`;
}
