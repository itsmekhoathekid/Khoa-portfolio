'use client';

import { useEffect, useId, useRef, useState } from 'react';

export function MermaidDiagram({ chart }: { chart: string }) {
  const container = useRef<HTMLDivElement>(null);
  const renderId = `mermaid-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      try {
        const { default: mermaid } = await import('mermaid');
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'base',
          themeVariables: {
            primaryColor: '#eef2ff',
            primaryTextColor: '#172033',
            primaryBorderColor: '#7789e7',
            lineColor: '#7c8aa5',
            secondaryColor: '#e9fbf7',
            tertiaryColor: '#fff7e8',
            fontFamily: 'var(--font-mono), ui-monospace, monospace',
          },
          flowchart: { curve: 'basis', htmlLabels: false },
        });
        const { svg } = await mermaid.render(renderId, chart.trim());
        if (cancelled || !container.current) return;
        container.current.innerHTML = svg;
        setError('');
      } catch (reason) {
        if (!cancelled)
          setError(
            reason instanceof Error ? reason.message : 'Diagram failed to render.',
          );
      }
    }

    void renderDiagram();
    return () => {
      cancelled = true;
    };
  }, [chart, renderId]);

  if (error)
    return (
      <div className="mermaid-error" role="note">
        <strong>mermaid render error</strong>
        <pre>
          <code>{chart}</code>
        </pre>
      </div>
    );

  return (
    <figure className="mermaid-diagram">
      <div ref={container} aria-label="Mermaid diagram" />
      <figcaption>interactive system flow · rendered from Mermaid</figcaption>
    </figure>
  );
}
