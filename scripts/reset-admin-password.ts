import 'dotenv/config';
import { and, eq } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { closeDb, getDb } from '../src/server/db/client';
import { accounts, sessions, users } from '../src/server/db/schema';

const username = process.env.ADMIN_USERNAME;
const password = process.env.ADMIN_PASSWORD;

if (!username || !password)
  throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD are required.');
if (password.length < 10)
  throw new Error('ADMIN_PASSWORD must be at least 10 characters.');

const db = getDb();

try {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (!user) throw new Error(`Admin “${username}” does not exist.`);

  const updated = await db
    .update(accounts)
    .set({
      password: await hashPassword(password),
      updatedAt: new Date(),
    })
    .where(
      and(eq(accounts.userId, user.id), eq(accounts.providerId, 'credential')),
    )
    .returning({ id: accounts.id });
  if (updated.length !== 1)
    throw new Error(
      `Expected one credential account for “${username}”; found ${updated.length}.`,
    );

  await db.delete(sessions).where(eq(sessions.userId, user.id));
  console.log(
    `Reset password for “${username}” and revoked existing sessions.`,
  );
} finally {
  await closeDb();
}
