import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import {
  blogPosts,
  experiences,
  works,
} from '@/src/features/content/demo-data';
import { getDb, hasDatabase } from '@/src/server/db/client';
import { searchDocuments } from '@/src/server/db/schema';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (query.length < 2) return NextResponse.json({ results: [] });
  if (query.length > 120)
    return NextResponse.json({ error: 'Query is too long.' }, { status: 400 });

  if (!hasDatabase()) {
    const needle = query.toLowerCase();
    const results = [
      ...works.map((item) => ({
        type: 'work',
        title: item.title,
        path: `/myworks/${item.kind}`,
        text: `${item.summary} ${item.tags.join(' ')}`,
      })),
      ...experiences.map((item) => ({
        type: 'experience',
        title: item.title,
        path: '/experiences',
        text: `${item.summary} ${item.period}`,
      })),
      ...blogPosts.map((item) => ({
        type: 'blog',
        title: item.title,
        path: `/blogs/${item.slug}`,
        text: `${item.summary} ${item.bodyMarkdown} ${item.tags.join(' ')}`,
      })),
    ].filter((item) =>
      `${item.title} ${item.text}`.toLowerCase().includes(needle),
    );
    return NextResponse.json({ results: results.slice(0, 12) });
  }

  const db = getDb();
  const queryResult = await db.execute(sql`
    select content_type as "type", title, path,
      ts_headline('english', title, websearch_to_tsquery('english', ${query}), 'StartSel=<mark>, StopSel=</mark>') as "text"
    from ${searchDocuments}
    where document @@ websearch_to_tsquery('english', ${query})
    order by ts_rank_cd(document, websearch_to_tsquery('english', ${query})) desc, updated_at desc
    limit 12
  `);

  // drizzle-neon returns a QueryResult object while postgres-js returns its
  // RowList directly. Normalize both so local CI and Vercel behave identically.
  const results = Array.isArray(queryResult)
    ? queryResult
    : (queryResult as unknown as { rows: unknown[] }).rows;
  return NextResponse.json({ results });
}
