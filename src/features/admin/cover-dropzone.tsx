'use client';

import * as Dialog from '@radix-ui/react-dialog';
import Image from 'next/image';
import { ImagePlus, X } from 'lucide-react';
import { ChangeEvent, DragEvent, useRef, useState } from 'react';
import { acceptedImages, uploadAsset } from './asset-upload';

export type CoverValue = {
  assetId: string | null;
  url: string | null;
  focalX: number;
  focalY: number;
};

export function CoverDropzone({
  value,
  onChange,
  onCommit,
  compact = false,
  fallback = 'add cover image',
}: {
  value: CoverValue;
  onChange: (value: CoverValue) => void;
  onCommit?: (value: CoverValue) => Promise<void>;
  compact?: boolean;
  fallback?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function receive(file?: File) {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const asset = await uploadAsset(file, 'cover', 'Cover image');
      onChange({ ...value, assetId: asset.id, url: asset.url });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (onCommit) {
      setBusy(true);
      setError('');
      try {
        await onCommit(value);
      } catch (reason) {
        setError(
          reason instanceof Error ? reason.message : 'Unable to save draft.',
        );
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    setOpen(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          className={
            compact ? 'media-placeholder editable-cover' : 'cover-trigger'
          }
          type="button"
        >
          {value.url ? (
            <Image
              src={value.url}
              alt="Draft cover"
              fill
              sizes={compact ? '180px' : '320px'}
              style={{ objectPosition: `${value.focalX}% ${value.focalY}%` }}
            />
          ) : (
            <>
              <ImagePlus size={compact ? 16 : 22} />
              <span>{fallback}</span>
            </>
          )}
          {compact ? <b>replace image</b> : null}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dropzone-dialog">
          <Dialog.Title>replace cover image</Dialog.Title>
          <Dialog.Description>
            The current public cover stays untouched until this draft is
            published.
          </Dialog.Description>
          <Dialog.Close className="dialog-close">
            <X size={16} />
          </Dialog.Close>
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            accept={acceptedImages}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              void receive(event.target.files?.[0])
            }
          />
          <button
            type="button"
            className="asset-dropzone"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event: DragEvent) => event.preventDefault()}
            onDrop={(event: DragEvent) => {
              event.preventDefault();
              void receive(event.dataTransfer.files[0]);
            }}
          >
            <ImagePlus size={24} />
            <span>
              {busy ? 'uploading + validating…' : 'drop image or choose file'}
            </span>
            <small>JPEG, PNG, WebP, AVIF · max 10 MB</small>
          </button>
          {value.url ? (
            <div className="focal-controls">
              <label>
                focal x{' '}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={value.focalX}
                  onChange={(event) =>
                    onChange({ ...value, focalX: Number(event.target.value) })
                  }
                />
              </label>
              <label>
                focal y{' '}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={value.focalY}
                  onChange={(event) =>
                    onChange({ ...value, focalY: Number(event.target.value) })
                  }
                />
              </label>
            </div>
          ) : null}
          {error ? <p className="form-error">{error}</p> : null}
          <button
            className="primary-button"
            type="button"
            onClick={commit}
            disabled={busy || !value.assetId}
          >
            use in draft
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
