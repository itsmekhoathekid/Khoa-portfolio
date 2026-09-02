'use client';

import React, {
  isValidElement,
  type ReactNode,
  useEffect,
  useState,
} from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import githubDark from 'shiki/themes/github-dark-default.mjs';
import bash from 'shiki/langs/bash.mjs';
import javascript from 'shiki/langs/javascript.mjs';
import json from 'shiki/langs/json.mjs';
import markdownLanguage from 'shiki/langs/markdown.mjs';
import python from 'shiki/langs/python.mjs';
import typescript from 'shiki/langs/typescript.mjs';
import { MermaidDiagram } from './mermaid-diagram';

const highlighterPromise = createHighlighterCore({
  themes: [githubDark],
  langs: [bash, javascript, json, markdownLanguage, python, typescript],
  engine: createJavaScriptRegexEngine(),
});

const languageAliases: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  sh: 'bash',
  shell: 'bash',
  md: 'markdown',
  text: 'markdown',
};

function HighlightedCode({ code, language }: { code: string; language: string }) {
  const [html, setHtml] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function highlight() {
      try {
        const highlighter = await highlighterPromise;
        const rendered = highlighter.codeToHtml(code, {
          lang: languageAliases[language] ?? language,
          theme: 'github-dark-default',
        });
        if (!cancelled) setHtml(rendered);
      } catch {
        if (!cancelled) setHtml('');
      }
    }
    void highlight();
    return () => {
      cancelled = true;
    };
  }, [code, language]);

  if (!html)
    return (
      <pre>
        <code className={`language-${language}`}>{code}</code>
      </pre>
    );
  return <div className="shiki-block" dangerouslySetInnerHTML={{ __html: html }} />;
}

export function MarkdownRenderer({ markdown }: { markdown: string }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          table({ children, ...props }) {
            return (
              <div className="markdown-table-wrap">
                <table {...props}>{children}</table>
              </div>
            );
          },
          pre({ children, ...props }) {
            const child = React.Children.toArray(children)[0];
            if (
              isValidElement<{
                className?: string;
                children?: ReactNode;
              }>(child) &&
              child.props.className?.split(' ').includes('language-mermaid')
            )
              return <MermaidDiagram chart={String(child.props.children ?? '')} />;
            if (isValidElement<{ className?: string; children?: ReactNode }>(child)) {
              const language =
                child.props.className
                  ?.split(' ')
                  .find((name) => name.startsWith('language-'))
                  ?.slice(9) ?? 'text';
              return (
                <HighlightedCode
                  code={String(child.props.children ?? '')}
                  language={language}
                />
              );
            }
            return <pre {...props}>{children}</pre>;
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
