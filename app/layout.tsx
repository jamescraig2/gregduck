import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Greg Duck',
  description: 'A real-world animal discovery game.',
};

import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" data-theme="dark">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
