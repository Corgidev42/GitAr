'use client';

import Link from 'next/link';
import { IconGuitar } from './Icons';

export default function Navigation() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--surface)] border-b border-[var(--surface-light)]">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <IconGuitar className="w-6 h-6 text-[var(--accent-light)]" />
          <span><span className="text-[var(--accent-light)]">Git</span><span className="text-[var(--foreground)]">Ar</span></span>
        </Link>
      </div>
    </nav>
  );
}
