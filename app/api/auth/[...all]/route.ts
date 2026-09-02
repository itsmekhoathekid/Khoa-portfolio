import { toNextJsHandler } from 'better-auth/next-js';
import { getAuth } from '@/src/server/auth/auth';

function unavailable() {
  return Response.json(
    { error: 'Authentication is not configured.' },
    { status: 503 },
  );
}

async function handle(request: Request) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET) {
    if (new URL(request.url).pathname.endsWith('/get-session'))
      return Response.json(null);
    return unavailable();
  }
  return getAuth().handler(request);
}

const handlers = toNextJsHandler(handle);
export const GET = handlers.GET!;
export const POST = handlers.POST!;
