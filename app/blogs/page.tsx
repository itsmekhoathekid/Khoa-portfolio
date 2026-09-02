import Link from 'next/link';
import { getAdminSession } from '@/src/server/auth/guard';
import { getPublishedBlogs } from '@/src/server/content/public-queries';

export const metadata = {
  title: 'Blogs — Khoa',
  description: 'Notes on ML systems, recommenders, and agents.',
};

export default async function BlogsPage() {
  const [blogs, session] = await Promise.all([
    getPublishedBlogs(),
    getAdminSession(),
  ]);
  return (
    <main className="portfolio-app">
      <div className="article-shell">
        <section className="article-chrome">
          <header className="article-header">
            <Link className="article-path" href="/">
              ← /home/anhkhoa
            </Link>
            <p className="article-path">$ ls -lt /blogs</p>
            <h1>/blogs</h1>
            <div className="article-meta">published Markdown files only</div>
          </header>
          <div className="blog-list">
            {blogs.map((post) => (
              <div className="blog-row" key={post.id}>
                <Link href={`/blogs/${post.slug}`}>
                  <time>{post.publishedAt}</time>
                  <strong>{post.title}</strong>
                  <span>{post.tags.map((tag) => `#${tag}`).join(' ')}</span>
                </Link>
              </div>
            ))}
          </div>
          {session?.user ? (
            <div className="article-actions">
              <Link className="admin-action" href="/admin/blogs/new/edit">
                add article
              </Link>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
