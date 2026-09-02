'use client';

import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { MarkdownRenderer } from '@/src/features/content/markdown-renderer';
import type { EditorDraft } from '@/src/server/content/admin-queries';
import {
  publishContentAction,
  saveDraftAction,
  softDeleteContentAction,
} from './actions';
import { uploadAsset } from './asset-upload';
import { CoverDropzone, type CoverValue } from './cover-dropzone';

export function ContentEditor({ initial }: { initial: EditorDraft }) {
  const router = useRouter();
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const [draft, setDraft] = useState(initial);
  const [savedSignature, setSavedSignature] = useState(
    contentSignature(initial),
  );
  const [status, setStatus] = useState('draft loaded');
  const [busy, setBusy] = useState(false);
  const [mobileView, setMobileView] = useState<'editor' | 'preview'>('editor');
  const unsaved = contentSignature(draft) !== savedSignature;

  const virtualPath = useMemo(() => {
    if (draft.kind === 'blog') return `/blogs/${draft.slug}.md`;
    if (draft.kind === 'work')
      return `/myworks/${draft.workKind}/${draft.slug}.md`;
    return `/experiences/${draft.slug}.md`;
  }, [draft]);

  function payload() {
    const common = {
      id: draft.id,
      slug: draft.slug,
      title: draft.title,
      summary: draft.summary,
      bodyMarkdown: draft.bodyMarkdown,
      coverAssetId: draft.coverAssetId,
      focalX: draft.focalX,
      focalY: draft.focalY,
    };
    if (draft.kind === 'blog')
      return { kind: 'blog' as const, ...common, tags: draft.tags };
    if (draft.kind === 'work')
      return {
        kind: 'work' as const,
        ...common,
        workKind: draft.workKind,
        tags: draft.tags,
        githubUrl: draft.githubUrl || null,
      };
    return {
      kind: 'experience' as const,
      ...common,
      organization: draft.organization,
      periodStart: draft.periodStart,
      periodEnd: draft.periodEnd || null,
    };
  }

  async function save() {
    setBusy(true);
    setStatus('saving revision…');
    const result = await saveDraftAction(payload());
    setBusy(false);
    if (!result.ok) {
      setStatus(result.error);
      return null;
    }
    setDraft((current) => ({
      ...current,
      id: result.id,
      revision: current.revision + 1,
    }));
    setSavedSignature(contentSignature(draft));
    setStatus('draft saved · public page unchanged');
    return result.id;
  }

  async function publish() {
    const id = await save();
    if (!id) return;
    setBusy(true);
    setStatus('publishing + refreshing search…');
    const result = await publishContentAction({ kind: draft.kind, id });
    setBusy(false);
    if (!result.ok) {
      setStatus(result.error);
      return;
    }
    setStatus('published · opening public page…');
    if (draft.kind === 'blog') {
      router.replace(`/blogs/${draft.slug}`);
      return;
    }
    router.replace('/');
  }

  async function remove() {
    if (!draft.id || !window.confirm(`Soft-delete ${virtualPath}?`)) return;
    setBusy(true);
    const result = await softDeleteContentAction({
      kind: draft.kind,
      id: draft.id,
    });
    setBusy(false);
    if (result.ok) router.push('/');
    else setStatus(result.error);
  }

  async function inlineImage(file?: File) {
    if (!file) return;
    setStatus('uploading inline image…');
    try {
      const asset = await uploadAsset(
        file,
        'markdown',
        file.name.replace(/\.[^.]+$/, ''),
      );
      const insertion = `\n![${file.name.replace(/\.[^.]+$/, '')}](${asset.url})\n`;
      const view = editorRef.current?.view;
      if (view) {
        const cursor = view.state.selection.main.head;
        view.dispatch({
          changes: { from: cursor, insert: insertion },
          selection: { anchor: cursor + insertion.length },
        });
      } else
        setDraft((current) => ({
          ...current,
          bodyMarkdown: `${current.bodyMarkdown}${insertion}`,
        }));
      setStatus('image uploaded and inserted · save draft when ready');
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : 'Image upload failed.',
      );
    }
  }

  const cover: CoverValue = {
    assetId: draft.coverAssetId,
    url: draft.coverUrl,
    focalX: draft.focalX,
    focalY: draft.focalY,
  };

  return (
    <main className="portfolio-app" data-theme="dark">
      <section className="editor-window">
        <header className="editor-header">
          <div>
            <p>anhkhoa@portfolio:~$ vim {virtualPath}</p>
            <h1>{virtualPath}</h1>
            <span>
              revision {draft.revision}{' '}
              {unsaved ? '· unsaved changes' : '· saved'}
            </span>
          </div>
          <div className="editor-actions">
            <button onClick={() => router.push('/')} disabled={busy}>
              discard
            </button>
            {draft.id ? (
              <button
                className="danger-button"
                onClick={remove}
                disabled={busy}
              >
                delete
              </button>
            ) : null}
            <button onClick={save} disabled={busy}>
              save draft
            </button>
            <button
              className="primary-button"
              onClick={publish}
              disabled={busy}
            >
              publish
            </button>
          </div>
        </header>
        <div className="editor-fields">
          <label>
            title
            <input
              value={draft.title}
              onChange={(event) =>
                setDraft({ ...draft, title: event.target.value })
              }
            />
          </label>
          <label>
            slug
            <input
              value={draft.slug}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  slug: event.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, '-'),
                })
              }
            />
          </label>
          <label className="field-wide">
            summary
            <textarea
              value={draft.summary}
              onChange={(event) =>
                setDraft({ ...draft, summary: event.target.value })
              }
            />
          </label>
          {draft.kind !== 'experience' ? (
            <label>
              tags
              <input
                value={draft.tags.join(', ')}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    tags: event.target.value
                      .split(',')
                      .map((tag) => tag.trim())
                      .filter(Boolean),
                  })
                }
              />
            </label>
          ) : null}
          {draft.kind === 'work' ? (
            <>
              <label>
                type
                <select
                  value={draft.workKind}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      workKind: event.target.value as EditorDraft['workKind'],
                    })
                  }
                >
                  <option value="projects">projects</option>
                  <option value="publications">publications</option>
                  <option value="competitions">competitions</option>
                </select>
              </label>
              <label className="field-wide">
                GitHub URL
                <input
                  value={draft.githubUrl}
                  onChange={(event) =>
                    setDraft({ ...draft, githubUrl: event.target.value })
                  }
                />
              </label>
            </>
          ) : null}
          {draft.kind === 'experience' ? (
            <>
              <label>
                organization
                <input
                  value={draft.organization}
                  onChange={(event) =>
                    setDraft({ ...draft, organization: event.target.value })
                  }
                />
              </label>
              <label>
                start
                <input
                  value={draft.periodStart}
                  onChange={(event) =>
                    setDraft({ ...draft, periodStart: event.target.value })
                  }
                />
              </label>
              <label>
                end
                <input
                  value={draft.periodEnd}
                  onChange={(event) =>
                    setDraft({ ...draft, periodEnd: event.target.value })
                  }
                />
              </label>
            </>
          ) : null}
          <div className="field-wide">
            <span className="field-label">cover + focal point</span>
            <CoverDropzone
              value={cover}
              onChange={(next) =>
                setDraft({
                  ...draft,
                  coverAssetId: next.assetId,
                  coverUrl: next.url,
                  focalX: next.focalX,
                  focalY: next.focalY,
                })
              }
            />
          </div>
        </div>
        <div className="mobile-editor-tabs">
          <button
            data-active={mobileView === 'editor'}
            onClick={() => setMobileView('editor')}
          >
            editor
          </button>
          <button
            data-active={mobileView === 'preview'}
            onClick={() => setMobileView('preview')}
          >
            preview
          </button>
        </div>
        <div className="editor-split">
          <section
            data-mobile-visible={mobileView === 'editor'}
            className="code-pane"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void inlineImage(event.dataTransfer.files[0]);
            }}
          >
            <div className="pane-title">
              {virtualPath} · drop images anywhere
            </div>
            <CodeMirror
              ref={editorRef}
              value={draft.bodyMarkdown}
              height="620px"
              theme={oneDark}
              extensions={[markdown()]}
              onChange={(value) =>
                setDraft((current) => ({ ...current, bodyMarkdown: value }))
              }
            />
          </section>
          <section
            data-mobile-visible={mobileView === 'preview'}
            className="preview-pane"
          >
            <div className="pane-title">live preview</div>
            <MarkdownRenderer markdown={draft.bodyMarkdown} />
          </section>
        </div>
        <footer className="editor-status" aria-live="polite">
          {busy ? '● ' : '○ '}
          {status}
        </footer>
      </section>
    </main>
  );
}

function contentSignature(draft: EditorDraft) {
  return JSON.stringify(draft, (key, value) =>
    ['id', 'revision', 'coverUrl'].includes(key) ? undefined : value,
  );
}
