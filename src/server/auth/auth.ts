import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { username } from 'better-auth/plugins';
import { getDb } from '@/src/server/db/client';
import * as schema from '@/src/server/db/schema';

function createAuth() {
  return betterAuth({
    appName: 'Khoa CLI Portfolio',
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDb(), { provider: 'pg', schema }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      revokeSessionsOnPasswordReset: true,
      minPasswordLength: 10,
    },
    disabledPaths: ['/is-username-available'],
    plugins: [
      username({ displayUsername: false, immutableUsername: true }),
      nextCookies(),
    ],
  });
}

let authInstance: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  authInstance ??= createAuth();
  return authInstance!;
}
