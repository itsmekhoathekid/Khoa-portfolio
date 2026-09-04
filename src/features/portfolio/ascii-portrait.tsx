'use client';

import { useEffect, useRef } from 'react';

const ramp = ' .,:;irsXA253hMHGS#9B&@';

export function AsciiPortrait({
  src = '/khoa-source.jpg',
  focalX = 50,
  focalY = 50,
}: {
  src?: string;
  focalX?: number;
  focalY?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const source = new Image();
    source.src = src;
    let frame = 0;

    function render() {
      if (!canvas || !context || !source.naturalWidth) return;
      const rect = canvas.getBoundingClientRect();
      const scale = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(rect.width * scale));
      canvas.height = Math.max(1, Math.round(rect.height * scale));
      context.setTransform(scale, 0, 0, scale, 0, 0);
      context.fillStyle = '#080d13';
      context.fillRect(0, 0, rect.width, rect.height);

      const cellWidth = Math.max(7, rect.width / 105);
      const cellHeight = cellWidth * 1.55;
      const columns = Math.ceil(rect.width / cellWidth);
      const rows = Math.ceil(rect.height / cellHeight);
      const scratch = document.createElement('canvas');
      scratch.width = columns;
      scratch.height = rows;
      const sample = scratch.getContext('2d', { willReadFrequently: true });
      if (!sample) return;
      sample.fillStyle = '#080d13';
      sample.fillRect(0, 0, columns, rows);

      // Crop in source-image pixels before sampling so the ASCII output fills
      // the complete frame without stretching. The focal point lets an admin
      // keep a face or other subject in view for differently shaped uploads.
      const targetRatio = rect.width / rect.height;
      const sourceRatio = source.naturalWidth / source.naturalHeight;
      let cropWidth = source.naturalWidth;
      let cropHeight = source.naturalHeight;
      if (sourceRatio > targetRatio) cropWidth = cropHeight * targetRatio;
      else cropHeight = cropWidth / targetRatio;
      const sourceX =
        (source.naturalWidth - cropWidth) * (Math.min(100, focalX) / 100);
      const sourceY =
        (source.naturalHeight - cropHeight) * (Math.min(100, focalY) / 100);
      sample.drawImage(
        source,
        sourceX,
        sourceY,
        cropWidth,
        cropHeight,
        0,
        0,
        columns,
        rows,
      );
      const pixels = sample.getImageData(0, 0, columns, rows).data;
      context.font = `${cellHeight}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      context.textBaseline = 'top';
      for (let y = 0; y < rows; y += 1)
        for (let x = 0; x < columns; x += 1) {
          const offset = (y * columns + x) * 4;
          const r = pixels[offset],
            g = pixels[offset + 1],
            b = pixels[offset + 2];
          const luminance = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
          context.fillStyle = `rgb(${r},${g},${b})`;
          context.fillText(
            ramp[
              Math.min(ramp.length - 1, Math.floor(luminance * ramp.length))
            ],
            x * cellWidth,
            y * cellHeight,
          );
        }
    }

    source.onload = render;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(render);
    });
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [focalX, focalY, src]);

  return (
    <canvas
      ref={canvasRef}
      className="ascii-portrait"
      aria-label="Colored terminal ASCII rendering of Khoa's photo"
    >
      Colored ASCII portrait
    </canvas>
  );
}
