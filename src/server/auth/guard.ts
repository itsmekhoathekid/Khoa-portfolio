import { headers } from 'next/headers';
import { getAuth } from './auth';

export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized');
    this.name = 'UnauthorizedError';
  }
}

export async function getAdminSession() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET) return null;
  return getAuth().api.getSession({ headers: await headers() });
}

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session?.user) throw new UnauthorizedError();
  return session;
}
