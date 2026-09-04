'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Edit3,
  ImagePlus,
  Moon,
  Plus,
  Search,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import { type SyntheticEvent, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AsciiPortrait } from './ascii-portrait';
import { authClient } from '@/src/features/admin/auth-client';
import {
  CoverDropzone,
  type CoverValue,
} from '@/src/features/admin/cover-dropzone';
import {
  replaceCoverDraftAction,
  softDeleteContentAction,
} from '@/src/features/admin/actions';
import type {
  PublicBlog,
  PublicContact,
  PublicExperience,
  PublicWork,
} from '@/src/server/content/public-queries';
import type { HomeProfile } from '@/src/features/content/home-profile';
import {
  helpText,
  parseCommand,
  redactCommand,
  type WorkRoute,
} from '@/src/features/terminal/command-registry';

type Section = 'home' | 'experiences' | 'myworks' | 'contacts' | 'blogs';
type SearchResult = {
  type: string;
  title: string;
  path: string;
  text?: string;
};

const sectionCommands: Record<Section, string> = {
  home: './whoami',
  experiences: 'tail -n 3 experience.log',
  myworks: 'ls -la /myworks',
  contacts: 'cat contacts.env',
  blogs: 'ls -lt /blogs',
};

export function PortfolioShell({
  homeProfile,
  works,
  experiences,
  blogs,
  contacts,
}: {
  homeProfile: HomeProfile;
  works: PublicWork[];
  experiences: PublicExperience[];
  blogs: PublicBlog[];
  contacts: PublicContact[];
}) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const isAdmin = Boolean(session?.user);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [section, setSection] = useState<Section>('home');
  const [workKind, setWorkKind] = useState<WorkRoute | 'all'>('all');
  const [worksOpen, setWorksOpen] = useState(false);
  const [command, setCommand] = useState('./whoami');
  const [feedback, setFeedback] = useState('type “help” to list commands');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visibleWorks = useMemo(
    () =>
      workKind === 'all'
        ? works
        : works.filter((work) => work.kind === workKind),
    [workKind, works],
  );

  function navigate(next: Section, nextCommand = sectionCommands[next]) {
    setSection(next);
    setCommand(nextCommand);
    setWorksOpen(false);
    setSearchOpen(false);
    setFeedback(`route → /${next === 'home' ? 'home/anhkhoa' : next}`);
  }

  function selectWorkKind(kind: WorkRoute) {
    setWorkKind(kind);
    navigate('myworks', `ls -la /myworks/${kind}`);
  }

  async function runSearch(query: string) {
    setSearchQuery(query);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (query.trim().length < 2) return setSearchResults([]);
    searchTimer.current = setTimeout(async () => {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query)}`,
      );
      const payload = (await response.json()) as { results?: SearchResult[] };
      setSearchResults(payload.results ?? []);
    }, 180);
  }

  function openResult(path: string) {
    if (path.startsWith('/blogs/')) return router.push(path);
    if (path === '/experiences') return navigate('experiences');
    if (path.startsWith('/myworks/'))
      return selectWorkKind(path.split('/')[2] as WorkRoute);
  }

  async function execute(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    event.preventDefault();
    const raw = command.trim();
    const parsed = parseCommand(raw);
    if (!parsed) return setFeedback('command not found — type “help”');
    setCommand(redactCommand(raw));
    const action = parsed.action;
    if (action.type === 'navigate')
      return navigate(
        action.path === '/home/anhkhoa'
          ? 'home'
          : (action.path.slice(1) as Section),
      );
    if (action.type === 'work') {
      setWorkKind(action.kind);
      return navigate('myworks', raw);
    }
    if (action.type === 'blog') return router.push(`/blogs/${action.slug}`);
    if (action.type === 'theme') {
      setTheme(action.theme);
      return setFeedback(
        `${action.theme === 'dark' ? 'night' : 'light'} theme enabled`,
      );
    }
    if (action.type === 'search') {
      setSearchOpen(true);
      await runSearch(action.query);
      return setFeedback(`searching published content for “${action.query}”`);
    }
    if (action.type === 'login') {
      const result = await authClient.signIn.username({
        username: action.username,
        password: action.password,
      });
      setCommand('/login username="redacted" password="••••••••"');
      if (result.error)
        return setFeedback('login failed — credentials were not stored');
      router.refresh();
      return setFeedback(`admin session active · ${action.username}`);
    }
    if (action.type === 'passwd') {
      if (!isAdmin) return setFeedback('permission denied — login first');
      const result = await authClient.changePassword({
        currentPassword: action.currentPassword,
        newPassword: action.newPassword,
        revokeOtherSessions: true,
      });
      setCommand('/passwd current="••••••••" new="••••••••"');
      return setFeedback(
        result.error
          ? 'password change failed'
          : 'password changed · other sessions revoked',
      );
    }
    if (action.type === 'logout') {
      await authClient.signOut();
      router.refresh();
      return setFeedback('session closed · viewer mode');
    }
    setFeedback(helpText);
  }

  return (
    <main className="portfolio-app" data-theme={theme}>
      <section className="portfolio-window" aria-label="Khoa CLI portfolio">
        <div className="portfolio-statusbar">
          <span>
            <i /> khoa.dev / online
          </span>
          <span>portfolio_fs v0.1 · UTC+7</span>
        </div>
        <nav className="portfolio-nav" aria-label="Portfolio routes">
          {searchOpen ? (
            <div className="nav-search">
              <Search size={15} aria-hidden="true" />
              <label htmlFor="portfolio-search" className="sr-only">
                Search published portfolio content
              </label>
              <input
                id="portfolio-search"
                value={searchQuery}
                onChange={(event) => runSearch(event.target.value)}
                placeholder="search published files…"
              />
              <button
                aria-label="Close search"
                onClick={() => setSearchOpen(false)}
              >
                <X size={16} />
              </button>
              {searchQuery.length >= 2 ? (
                <div className="search-results">
                  {searchResults.length ? (
                    searchResults.map((result) => (
                      <button
                        key={`${result.type}-${result.path}`}
                        onClick={() => openResult(result.path)}
                      >
                        <span>{result.path}</span>
                        <strong>{result.title}</strong>
                      </button>
                    ))
                  ) : (
                    <p>no published files found</p>
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <button
                data-active={section === 'home'}
                onClick={() => navigate('home')}
              >
                /home/anhkhoa
              </button>
              <button
                data-active={section === 'experiences'}
                onClick={() => navigate('experiences')}
              >
                /experiences
              </button>
              <div className="works-menu">
                <button
                  data-active={section === 'myworks'}
                  aria-expanded={worksOpen}
                  onClick={() => setWorksOpen((open) => !open)}
                >
                  /myworks{workKind === 'all' ? '' : `/${workKind}`}
                </button>
                {worksOpen ? (
                  <div className="works-popover">
                    {(
                      ['projects', 'publications', 'competitions'] as const
                    ).map((kind) => (
                      <button key={kind} onClick={() => selectWorkKind(kind)}>
                        /{kind}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <button
                data-active={section === 'contacts'}
                onClick={() => navigate('contacts')}
              >
                /contacts
              </button>
              <button
                data-active={section === 'blogs'}
                onClick={() => navigate('blogs')}
              >
                /blogs
              </button>
            </>
          )}
          <div className="nav-actions">
            <button
              className="icon-button"
              aria-label={
                theme === 'light'
                  ? 'Switch to night theme'
                  : 'Switch to light theme'
              }
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            {!searchOpen ? (
              <button
                className="icon-button"
                aria-label="Search portfolio"
                onClick={() => setSearchOpen(true)}
              >
                <Search size={16} />
              </button>
            ) : null}
          </div>
        </nav>
        <section className="terminal-frame">
          <div className="terminal-titlebar">
            <div className="traffic-lights" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <form onSubmit={execute} className="command-line">
              <label className="command-line-field">
                <span className="sr-only">Terminal command</span>
                <span className="prompt-arrow" aria-hidden="true">
                  ➜
                </span>
                <span className="prompt-path" aria-hidden="true">
                  ~
                </span>
                <input
                  id="portfolio-command"
                  value={command}
                  style={{ width: `${Math.max(command.length, 1)}ch` }}
                  onChange={(event) => setCommand(event.target.value)}
                  onFocus={(event) => event.currentTarget.select()}
                  autoComplete="off"
                  spellCheck={false}
                />
                <i className="block-cursor" aria-hidden="true" />
              </label>
            </form>
            <span className="viewer-state">
              {isAdmin ? 'admin' : 'viewer'} · ⌘K search
            </span>
          </div>
          <div className="terminal-feedback" aria-live="polite">
            {feedback}
          </div>
          <div className="terminal-content">
            {section === 'home' ? (
              <HomePanel profile={homeProfile} isAdmin={isAdmin} />
            ) : null}
            {section === 'experiences' ? (
              <ExperiencePanel rows={experiences} isAdmin={isAdmin} />
            ) : null}
            {section === 'myworks' ? (
              <WorksPanel
                rows={visibleWorks}
                kind={workKind}
                isAdmin={isAdmin}
              />
            ) : null}
            {section === 'contacts' ? (
              <ContactsPanel rows={contacts} isAdmin={isAdmin} />
            ) : null}
            {section === 'blogs' ? (
              <BlogsPanel rows={blogs} isAdmin={isAdmin} />
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}

function HomePanel({
  profile,
  isAdmin,
}: {
  profile: HomeProfile;
  isAdmin: boolean;
}) {
  return (
    <div className="home-grid">
      <figure className="portrait-frame">
        <AsciiPortrait
          src={profile.portraitUrl ?? '/khoa-source.jpg'}
          focalX={profile.focalX}
          focalY={profile.focalY}
        />
        <div className="pixel-overlay" aria-hidden="true" />
        {isAdmin ? (
          <Link
            className="portrait-admin-link"
            href="/admin/home/edit"
            aria-label="Replace rendered portrait"
          >
            <ImagePlus size={15} /> replace image
          </Link>
        ) : null}
      </figure>
      <article className="identity-panel">
        {isAdmin ? (
          <Link
            className="identity-edit-link"
            href="/admin/home/edit"
            aria-label="Edit home profile text"
          >
            <Edit3 size={13} /> edit text
          </Link>
        ) : null}
        <h1>{profile.handle}</h1>
        <dl>
          <div>
            <dt>Role:</dt>
            <dd>{profile.role}</dd>
          </div>
          <div>
            <dt>Current quest:</dt>
            <dd>{profile.currentQuest}</dd>
          </div>
          <div>
            <dt>Status:</dt>
            <dd>{profile.statusText}</dd>
          </div>
          <div>
            <dt>Core:</dt>
            <dd>{profile.core}</dd>
          </div>
          <div>
            <dt>Systems:</dt>
            <dd>{profile.systems}</dd>
          </div>
        </dl>
        <div className="identity-metrics">
          {profile.metrics.map((metric) => (
            <span key={metric}>{metric}</span>
          ))}
        </div>
      </article>
    </div>
  );
}

function ExperiencePanel({
  rows,
  isAdmin,
}: {
  rows: PublicExperience[];
  isAdmin: boolean;
}) {
  return (
    <div>
      <PanelTitle
        command="tail -n 3 experience.log"
        addHref="/admin/experiences/new/edit"
        isAdmin={isAdmin}
      />
      <div className="media-list">
        {rows.map((item) => (
          <article className="media-row" key={item.id}>
            <EditableCover
              item={item}
              kind="experience"
              isAdmin={isAdmin}
              fallback={`experience / ${item.slug}`}
            />
            <div>
              <time>{item.period}</time>
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
              {isAdmin ? (
                <AdminRowActions
                  href={`/admin/experiences/${item.id}/edit`}
                  kind="experience"
                  id={item.id}
                />
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function WorksPanel({
  rows,
  kind,
  isAdmin,
}: {
  rows: PublicWork[];
  kind: WorkRoute | 'all';
  isAdmin: boolean;
}) {
  return (
    <div>
      <PanelTitle
        command={`ls -la /myworks/${kind === 'all' ? '*' : kind}`}
        addHref="/admin/works/new/edit"
        isAdmin={isAdmin}
      />
      <div className="media-list">
        {rows.map((work) => (
          <article className="media-row work-row" key={work.id}>
            <EditableCover
              item={work}
              kind="work"
              isAdmin={isAdmin}
              fallback={`${work.kind.slice(0, -1)} / ${work.tags[0] ?? 'work'}`}
            />
            <div>
              <h3>{work.title}</h3>
              <p>{work.summary}</p>
              <div className="tag-list">
                {work.tags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </div>
              {isAdmin ? (
                <AdminRowActions
                  href={`/admin/works/${work.id}/edit`}
                  kind="work"
                  id={work.id}
                />
              ) : null}
            </div>
            {work.githubUrl ? (
              <a
                href={work.githubUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open ${work.title} on GitHub`}
              >
                <GithubMark />
              </a>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}

function EditableCover({
  item,
  kind,
  isAdmin,
  fallback,
}: {
  item: { id: string; coverUrl: string | null; focalX: number; focalY: number };
  kind: 'work' | 'experience';
  isAdmin: boolean;
  fallback: string;
}) {
  const [cover, setCover] = useState<CoverValue>({
    assetId: null,
    url: item.coverUrl,
    focalX: item.focalX,
    focalY: item.focalY,
  });
  if (!isAdmin)
    return (
      <div className="media-placeholder">
        {item.coverUrl ? (
          <Image
            src={item.coverUrl}
            alt=""
            fill
            sizes="180px"
            style={{ objectPosition: `${item.focalX}% ${item.focalY}%` }}
          />
        ) : (
          <span>{fallback}</span>
        )}
      </div>
    );
  return (
    <CoverDropzone
      compact
      fallback={fallback}
      value={cover}
      onChange={setCover}
      onCommit={async (next) => {
        if (!next.assetId) throw new Error('Upload an image first.');
        const result = await replaceCoverDraftAction({
          kind,
          id: item.id,
          assetId: next.assetId,
          focalX: next.focalX,
          focalY: next.focalY,
        });
        if (!result.ok) throw new Error(result.error);
      }}
    />
  );
}

function ContactsPanel({
  rows,
  isAdmin,
}: {
  rows: PublicContact[];
  isAdmin: boolean;
}) {
  return (
    <div>
      <PanelTitle
        command="cat contacts.env"
        addHref="/admin/contacts/edit"
        isAdmin={isAdmin}
        addLabel="edit"
      />
      <dl className="contacts-list">
        {rows.map((item) => (
          <div key={item.id}>
            <dt>{item.key}=</dt>
            <dd>
              {item.href ? <a href={item.href}>{item.value}</a> : item.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function BlogsPanel({
  rows,
  isAdmin,
}: {
  rows: PublicBlog[];
  isAdmin: boolean;
}) {
  return (
    <div>
      <PanelTitle
        command="ls -lt /blogs"
        addHref="/admin/blogs/new/edit"
        isAdmin={isAdmin}
      />
      <div className="blog-list">
        {rows.map((post) => (
          <div className="blog-row" key={post.id}>
            <Link href={`/blogs/${post.slug}`}>
              <time>{post.publishedAt}</time>
              <strong>{post.title}</strong>
              <span>{post.tags.map((tag) => `#${tag}`).join(' ')}</span>
            </Link>
            {isAdmin ? (
              <AdminRowActions
                href={`/admin/blogs/${post.id}/edit`}
                kind="blog"
                id={post.id}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function PanelTitle({
  command,
  addHref,
  isAdmin,
  addLabel = 'add',
}: {
  command: string;
  addHref: string;
  isAdmin: boolean;
  addLabel?: string;
}) {
  return (
    <div className="panel-heading">
      <h2>
        <span>$</span> {command}
      </h2>
      {isAdmin ? (
        <Link className="admin-action" href={addHref}>
          <Plus size={14} /> {addLabel}
        </Link>
      ) : null}
    </div>
  );
}
function AdminRowActions({
  href,
  kind,
  id,
}: {
  href: string;
  kind: 'blog' | 'work' | 'experience';
  id: string;
}) {
  return (
    <div className="admin-row-actions">
      <Link href={href}>
        <Edit3 size={13} /> edit
      </Link>
      <button
        type="button"
        onClick={async () => {
          if (!window.confirm('Soft-delete this item?')) return;
          const result = await softDeleteContentAction({ kind, id });
          if (result.ok) window.location.reload();
          else window.alert(result.error);
        }}
      >
        <Trash2 size={13} /> delete
      </button>
    </div>
  );
}
function GithubMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 .7a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.23c-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23A11.5 11.5 0 0 1 12 6.5c1.02 0 2.05.14 3.01.4 2.29-1.55 3.29-1.23 3.29-1.23.66 1.66.25 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.62-5.48 5.92.43.37.81 1.1.81 2.22v3.3c0 .32.22.7.83.58A12 12 0 0 0 12 .7Z"
      />
    </svg>
  );
}
