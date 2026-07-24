import type { Metadata } from 'next';
import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';
import { Header } from '@/components/layout/Header';

export const metadata: Metadata = {
  title: 'Greg Duck',
  description: 'A real-world animal discovery game.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" data-theme="dark">
        <body className="pt-16">
          <Header />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
