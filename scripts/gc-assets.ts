import 'dotenv/config';
import { and, eq, lt } from 'drizzle-orm';
import { closeDb, getDb } from '../src/server/db/client';
import { assets } from '../src/server/db/schema';
import { deleteObject } from '../src/server/storage/r2';

const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
const db = getDb();
const stale = await db
  .select()
  .from(assets)
  .where(and(eq(assets.status, 'pending'), lt(assets.createdAt, cutoff)));
let deleted = 0;
for (const asset of stale) {
  try {
    await deleteObject(asset.objectKey);
  } catch {
    /* The object may never have reached R2. */
  }
  await db.delete(assets).where(eq(assets.id, asset.id));
  deleted += 1;
}
console.log(`Removed ${deleted} stale pending asset(s).`);
await closeDb();
