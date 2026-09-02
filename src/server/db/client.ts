import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

type Database = ReturnType<typeof drizzleNeon<typeof schema>>;

let database: Database | undefined;
let localClient: ReturnType<typeof postgres> | undefined;

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for database-backed operations.');
  }
  if (!database && process.env.DATABASE_DRIVER === 'postgres-js') {
    localClient = postgres(process.env.DATABASE_URL);
    database = drizzlePostgres(localClient, { schema }) as unknown as Database;
  }
  database ??= drizzleNeon(neon(process.env.DATABASE_URL), { schema });
  return database;
}

export async function closeDb() {
  await localClient?.end({ timeout: 5 });
  localClient = undefined;
  database = undefined;
}
