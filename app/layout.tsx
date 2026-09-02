import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Anh Khoa — CLI Portfolio',
  description:
    'ML engineer portfolio, projects, experience, and technical writing.',
};

const extensionAttributeGuard = `
(() => {
  const prefix = 'bis_';
  const strip = (element) => {
    for (const attribute of Array.from(element.attributes)) {
      if (attribute.name.startsWith(prefix)) {
        element.removeAttribute(attribute.name);
      }
    }
  };
  const cleanTree = (node) => {
    if (!(node instanceof Element)) return;
    strip(node);
    node.querySelectorAll('*').forEach(strip);
  };
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes') {
        strip(mutation.target);
      } else {
        mutation.addedNodes.forEach(cleanTree);
      }
    }
  });
  cleanTree(document.documentElement);
  observer.observe(document.documentElement, {
    attributes: true,
    childList: true,
    subtree: true,
  });
  window.addEventListener('load', () => {
    window.setTimeout(() => observer.disconnect(), 5000);
  }, { once: true });
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: extensionAttributeGuard }} />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
