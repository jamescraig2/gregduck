'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Show, SignInButton, UserButton } from '@clerk/nextjs';

export function SignedIn({ children }: { children: React.ReactNode }) {
  return <Show when="signed-in">{children}</Show>;
}

export function SignedOut({ children }: { children: React.ReactNode }) {
  return <Show when="signed-out">{children}</Show>;
}

export function Header() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 glass-panel border-b border-t-0 border-x-0 rounded-none px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-lg text-white hover:opacity-90 transition-opacity"
        >
          <span className="text-xl">🦆</span>
          <span>Greg Duck</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/"
            className={`text-sm font-medium transition-colors ${
              pathname === '/' ? 'text-white font-semibold' : 'text-gray-400 hover:text-white'
            }`}
          >
            Map
          </Link>
          <Link
            href="/journal"
            className={`text-sm font-medium transition-colors ${
              pathname === '/journal'
                ? 'text-white font-semibold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Journal
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <SignedIn>
          <UserButton />
        </SignedIn>
        <SignedOut>
          <SignInButton mode="modal">
            <button className="journal-reset-btn" style={{ padding: '0.375rem 0.875rem' }}>
              Sign In
            </button>
          </SignInButton>
        </SignedOut>
      </div>
    </header>
  );
}

export default Header;
