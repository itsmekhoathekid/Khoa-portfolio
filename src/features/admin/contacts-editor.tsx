'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { PublicContact } from '@/src/server/content/public-queries';
import { saveContactsAction } from './actions';

type EditableContact = PublicContact & { visible: boolean; sortOrder: number };

export function ContactsEditor({ initial }: { initial: PublicContact[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<EditableContact[]>(
    initial.map((item, index) => ({
      ...item,
      visible: true,
      sortOrder: index,
    })),
  );
  const [status, setStatus] = useState('editing contacts.env');
  async function save() {
    const result = await saveContactsAction(
      rows.map((item, index) => ({
        ...item,
        id: /^[0-9a-f-]{36}$/.test(item.id) ? item.id : undefined,
        href: item.href ?? '',
        sortOrder: index,
      })),
    );
    setStatus(result.ok ? 'contacts saved' : result.error);
    if (result.ok) router.refresh();
  }
  return (
    <main className="portfolio-app" data-theme="dark">
      <section className="editor-window">
        <header className="editor-header">
          <div>
            <p>anhkhoa@portfolio:~$ nano contacts.env</p>
            <h1>/contacts.env</h1>
            <span>{status}</span>
          </div>
          <div className="editor-actions">
            <button onClick={() => router.push('/')}>discard</button>
            <button className="primary-button" onClick={save}>
              save contacts
            </button>
          </div>
        </header>
        <div className="contact-editor-list">
          {rows.map((row, index) => (
            <div className="contact-editor-row" key={row.id}>
              <input
                aria-label="Key"
                value={row.key}
                onChange={(event) =>
                  setRows(
                    rows.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...item,
                            key: event.target.value
                              .toUpperCase()
                              .replace(/[^A-Z0-9_]/g, ''),
                          }
                        : item,
                    ),
                  )
                }
              />
              <input
                aria-label="Label"
                value={row.label}
                onChange={(event) =>
                  setRows(
                    rows.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, label: event.target.value }
                        : item,
                    ),
                  )
                }
              />
              <input
                aria-label="Value"
                value={row.value}
                onChange={(event) =>
                  setRows(
                    rows.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, value: event.target.value }
                        : item,
                    ),
                  )
                }
              />
              <input
                aria-label="URL"
                value={row.href ?? ''}
                onChange={(event) =>
                  setRows(
                    rows.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, href: event.target.value }
                        : item,
                    ),
                  )
                }
              />
              <button
                aria-label={`Remove ${row.key}`}
                onClick={() =>
                  setRows(rows.filter((_, itemIndex) => itemIndex !== index))
                }
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button
          className="add-contact"
          onClick={() =>
            setRows([
              ...rows,
              {
                id: crypto.randomUUID(),
                key: 'NEW_FIELD',
                label: 'New field',
                value: '',
                href: null,
                visible: true,
                sortOrder: rows.length,
              },
            ])
          }
        >
          <Plus size={14} /> add field
        </button>
      </section>
    </main>
  );
}
