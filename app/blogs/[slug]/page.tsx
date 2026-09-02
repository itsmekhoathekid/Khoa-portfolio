import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MarkdownRenderer } from '@/src/features/content/markdown-renderer';
import { getAdminSession } from '@/src/server/auth/guard';
import { getPublishedBlog } from '@/src/server/content/public-queries';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const blog = await getPublishedBlog(slug);
  return {
    title: blog ? `${blog.title} — Khoa` : 'Article not found',
    description: blog?.summary,
  };
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [blog, session] = await Promise.all([
    getPublishedBlog(slug),
    getAdminSession(),
  ]);
  if (!blog) notFound();

  return (
    <main className="portfolio-app">
      <div className="article-shell">
        <article className="article-chrome">
          <header className="article-header">
            <Link className="article-path" href="/">
              ← /blogs
            </Link>
            <p className="article-path">bat /blogs/{blog.slug}.md</p>
            <h1>{blog.title}</h1>
            <div className="article-meta">
              {blog.publishedAt} · {blog.tags.map((tag) => `#${tag}`).join(' ')}
            </div>
          </header>
          <MarkdownRenderer markdown={blog.bodyMarkdown} />
          {session?.user ? (
            <div className="article-actions">
              <Link
                className="admin-action"
                href={`/admin/blogs/${blog.id}/edit`}
              >
                edit article
              </Link>
            </div>
          ) : null}
        </article>
      </div>
    </main>
  );
}
