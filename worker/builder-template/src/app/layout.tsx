import type { Metadata } from 'next';
import Script from 'next/script';
import type { ReactNode } from 'react';
import { SiteRuntime } from '@/components/foundation/site-runtime';
import { WorkspaceCodexPanel } from '@/components/foundation/workspace-codex-panel';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Private preview',
    template: '%s',
  },
  description: 'Private Made Solid Studio website preview.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <Script src="/made-solid-codex-bridge.js" strategy="beforeInteractive" />
      </head>
      <body>
        <SiteRuntime />
        <WorkspaceCodexPanel />
        {children}
      </body>
    </html>
  );
}
