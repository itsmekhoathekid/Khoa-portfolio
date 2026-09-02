import 'dotenv/config';
import { randomBytes, randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { closeDb, getDb } from '../src/server/db/client';
import { accounts, users } from '../src/server/db/schema';

const username = process.env.ADMIN_USERNAME;
const email = process.env.ADMIN_EMAIL;
const generated = process.argv.slice(2).includes('--generate-password');
const password = generated
  ? randomBytes(24).toString('base64url')
  : process.env.ADMIN_PASSWORD;
if (!username || !email || !password)
  throw new Error(
    'ADMIN_USERNAME and ADMIN_EMAIL are required. Set ADMIN_PASSWORD or use --generate-password.',
  );
if (password.length < 10)
  throw new Error('ADMIN_PASSWORD must be at least 10 characters.');

const db = getDb();
const existing = await db
  .select({ id: users.id })
  .from(users)
  .where(eq(users.username, username))
  .limit(1);
if (existing.length) {
  console.log(`Admin “${username}” already exists; no changes made.`);
  await closeDb();
} else {
  const userId = randomUUID();
  await db.insert(users).values({
    id: userId,
    name: username,
    username,
    email,
    emailVerified: true,
  });
  await db.insert(accounts).values({
    id: randomUUID(),
    accountId: userId,
    providerId: 'credential',
    issuer: 'local:credential',
    userId,
    password: await hashPassword(password),
  });
  console.log(
    `Created admin “${username}”. Remove ADMIN_PASSWORD from the environment now.`,
  );
  if (generated)
    console.log(
      `One-time production password for “${username}”: ${password}\nStore it now; this value is not written to disk.`,
    );
  await closeDb();
}
