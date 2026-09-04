'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { HomeProfile } from '@/src/features/content/home-profile';
import { AsciiPortrait } from '@/src/features/portfolio/ascii-portrait';
import {
  publishHomeProfileAction,
  saveHomeProfileDraftAction,
} from './actions';
import { CoverDropzone, type CoverValue } from './cover-dropzone';

export function HomeProfileEditor({ initial }: { initial: HomeProfile }) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [savedSignature, setSavedSignature] = useState(
    profileSignature(initial),
  );
  const [status, setStatus] = useState('home profile draft loaded');
  const [busy, setBusy] = useState(false);
  const unsaved = profileSignature(draft) !== savedSignature;

  const cover: CoverValue = {
    assetId: draft.portraitAssetId,
    url: draft.portraitUrl,
    focalX: draft.focalX,
    focalY: draft.focalY,
  };

  function payload() {
    return {
      handle: draft.handle,
      role: draft.role,
      currentQuest: draft.currentQuest,
      statusText: draft.statusText,
      core: draft.core,
      systems: draft.systems,
      metrics: draft.metrics.map((metric) => metric.trim()).filter(Boolean),
      portraitAssetId: draft.portraitAssetId,
      focalX: draft.focalX,
      focalY: draft.focalY,
    };
  }

  async function save() {
    setBusy(true);
    setStatus('saving home profile draft…');
    const result = await saveHomeProfileDraftAction(payload());
    setBusy(false);
    if (!result.ok) {
      setStatus(result.error);
      return false;
    }
    setSavedSignature(profileSignature(draft));
    setStatus('draft saved · public home unchanged');
    return true;
  }

  async function publish() {
    if (!(await save())) return;
    setBusy(true);
    setStatus('publishing home profile…');
    const result = await publishHomeProfileAction(payload());
    setBusy(false);
    if (!result.ok) {
      setStatus(result.error);
      return;
    }
    setStatus('published · opening /home/anhkhoa…');
    router.replace('/');
    router.refresh();
  }

  return (
    <main className="portfolio-app" data-theme="dark">
      <section className="editor-window home-profile-editor">
        <header className="editor-header">
          <div>
            <p>anhkhoa@portfolio:~$ vim /home/anhkhoa.profile</p>
            <h1>/home/anhkhoa</h1>
            <span>{unsaved ? 'unsaved changes' : status}</span>
          </div>
          <div className="editor-actions">
            <button onClick={() => router.push('/')} disabled={busy}>
              discard
            </button>
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

        <div className="home-profile-editor-grid">
          <section className="home-portrait-editor">
            <div className="home-editor-section-title">
              <span>portrait source</span>
              <small>Uploaded images are rendered as colored ASCII.</small>
            </div>
            <CoverDropzone
              value={cover}
              fallback="upload portrait source"
              onChange={(next) =>
                setDraft({
                  ...draft,
                  portraitAssetId: next.assetId,
                  portraitUrl: next.url,
                  focalX: next.focalX,
                  focalY: next.focalY,
                })
              }
            />
            <figure className="portrait-frame home-editor-ascii-preview">
              <AsciiPortrait
                src={draft.portraitUrl ?? '/khoa-source.jpg'}
                focalX={draft.focalX}
                focalY={draft.focalY}
              />
              <div className="pixel-overlay" aria-hidden="true" />
              <figcaption>live ASCII preview</figcaption>
            </figure>
          </section>

          <section className="home-copy-editor">
            <div className="home-editor-section-title">
              <span>identity text</span>
              <small>
                Every field maps directly to the home terminal card.
              </small>
            </div>
            <label>
              handle
              <input
                value={draft.handle}
                onChange={(event) =>
                  setDraft({ ...draft, handle: event.target.value })
                }
              />
            </label>
            <label>
              role
              <input
                value={draft.role}
                onChange={(event) =>
                  setDraft({ ...draft, role: event.target.value })
                }
              />
            </label>
            <label>
              current quest
              <textarea
                value={draft.currentQuest}
                onChange={(event) =>
                  setDraft({ ...draft, currentQuest: event.target.value })
                }
              />
            </label>
            <label>
              status
              <textarea
                value={draft.statusText}
                onChange={(event) =>
                  setDraft({ ...draft, statusText: event.target.value })
                }
              />
            </label>
            <label>
              core
              <textarea
                value={draft.core}
                onChange={(event) =>
                  setDraft({ ...draft, core: event.target.value })
                }
              />
            </label>
            <label>
              systems
              <textarea
                value={draft.systems}
                onChange={(event) =>
                  setDraft({ ...draft, systems: event.target.value })
                }
              />
            </label>
            <label>
              metrics · one per line
              <textarea
                className="home-metrics-input"
                value={draft.metrics.join('\n')}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    metrics: event.target.value.split('\n'),
                  })
                }
              />
            </label>
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

function profileSignature(profile: HomeProfile) {
  return JSON.stringify(profile, (key, value) =>
    key === 'portraitUrl' ? undefined : value,
  );
}
