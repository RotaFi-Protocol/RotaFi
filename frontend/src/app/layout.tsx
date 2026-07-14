import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RotaFi — Trustless ROSCA on Stellar',
  description: 'Trustless rotating savings and credit associations on Stellar Soroban',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header style={{
          borderBottom: '1px solid #E5E7EB',
          padding: '0.75rem 2rem',
          backgroundColor: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img src="/rotafi-logo.svg" alt="RotaFi" style={{ height: '32px' }} />
          </a>
          <nav style={{ display: 'flex', gap: '1.5rem' }}>
            <NavLink href="/">Browse</NavLink>
            <NavLink href="/dashboard">Dashboard</NavLink>
            <NavLink href="/bids">Bids</NavLink>
            <NavLink href="/reputation">Reputation</NavLink>
          </nav>
        </header>
        <main style={{ maxWidth: '900px', margin: '2rem auto', padding: '0 1rem' }}>
          {children}
        </main>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} style={{ color: '#374151', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>
      {children}
    </a>
  );
}
