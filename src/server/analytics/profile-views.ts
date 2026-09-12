import { eq, sql } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/src/server/db/client';
import { siteMetrics } from '@/src/server/db/schema';

const PROFILE_VIEWS_KEY = 'profile_views';

export type ProfileViewsResult = {
  views: number;
  mode: 'demo' | 'production';
};

export async function getProfileViews(): Promise<ProfileViewsResult> {
  if (!hasDatabase()) return { views: 0, mode: 'demo' };

  const [metric] = await getDb()
    .select({ value: siteMetrics.value })
    .from(siteMetrics)
    .where(eq(siteMetrics.key, PROFILE_VIEWS_KEY))
    .limit(1);

  return { views: metric?.value ?? 0, mode: 'production' };
}

export async function incrementProfileViews(): Promise<ProfileViewsResult> {
  if (!hasDatabase()) return { views: 0, mode: 'demo' };

  const [metric] = await getDb()
    .insert(siteMetrics)
    .values({ key: PROFILE_VIEWS_KEY, value: 1 })
    .onConflictDoUpdate({
      target: siteMetrics.key,
      set: {
        value: sql`${siteMetrics.value} + 1`,
        updatedAt: new Date(),
      },
    })
    .returning({ value: siteMetrics.value });

  if (!metric) throw new Error('Profile view counter did not return a value.');
  return { views: metric.value, mode: 'production' };
}
