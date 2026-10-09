import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import NavLink from '@/components/NavLink';
import './globals.css';

export const metadata: Metadata = {
  title: 'RotaFi — Trustless ROSCA on Stellar',
  description: 'Trustless rotating savings and credit associations on Stellar Soroban',
  icons: { icon: '/favicon.svg' },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'RotaFi',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#7C3AED',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="app-header">
          <Link href="/" className="app-brand" aria-label="RotaFi home">
            <img src="/rotafi-logo.svg" alt="RotaFi" />
          </Link>
          <nav className="app-nav" aria-label="Primary">
            <NavLink href="/">Browse</NavLink>
            <NavLink href="/dashboard">Dashboard</NavLink>
            <NavLink href="/bids">Bids</NavLink>
            <NavLink href="/reputation">Reputation</NavLink>
          </nav>
        </header>
        <main className="page-main">
          {children}
        </main>
      </body>
    </html>
  );
}
