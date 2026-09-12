import { type NextRequest, NextResponse } from 'next/server';
import {
  getProfileViews,
  incrementProfileViews,
} from '@/src/server/analytics/profile-views';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VIEWED_COOKIE = 'khoa_profile_viewed';
const ONE_DAY_SECONDS = 60 * 60 * 24;

export async function GET() {
  return noStore(await getProfileViews());
}

export async function POST(request: NextRequest) {
  const alreadyCounted = request.cookies.has(VIEWED_COOKIE);
  const result = alreadyCounted
    ? await getProfileViews()
    : await incrementProfileViews();
  const response = noStore({ ...result, counted: !alreadyCounted });

  if (!alreadyCounted) {
    response.cookies.set(VIEWED_COOKIE, '1', {
      httpOnly: true,
      maxAge: ONE_DAY_SECONDS,
      path: '/',
      sameSite: 'lax',
      secure: request.nextUrl.protocol === 'https:',
    });
  }

  return response;
}

function noStore(body: object) {
  return NextResponse.json(body, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
}
