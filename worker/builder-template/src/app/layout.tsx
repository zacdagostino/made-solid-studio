import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SiteRuntime } from '@/components/foundation/site-runtime';
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
      <body>
        <SiteRuntime />
        {children}
      </body>
    </html>
  );
}
