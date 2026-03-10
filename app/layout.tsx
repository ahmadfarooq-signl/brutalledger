'use client'
import './globals.css'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { SessionProvider } from 'next-auth/react'

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard' },
  { href: '/habits', label: 'Habits' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/sleep', label: 'Sleep' },
  { href: '/outreach', label: 'Outreach' },
  { href: '/content', label: 'Content' },
  { href: '/finance', label: 'Finance' },
  { href: '/scorecard', label: 'Scorecard' },
  { href: '/pomodoro', label: 'Pomodoro' },
]

function Nav({ dark, setDark }: { dark: boolean; setDark: (d: boolean) => void }) {
  const pathname = usePathname()
  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      background: 'var(--color-nav-bg)', backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--color-nav-border)',
    }}>
      <div style={{
        maxWidth: '1400px', margin: '0 auto', padding: '0 2rem',
        height: '52px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: '2rem',
      }}>
        <Link href="/" style={{
          fontFamily: 'var(--font-playfair)', fontSize: '0.95rem',
          fontWeight: '600', color: 'var(--color-text)', letterSpacing: '0.02em',
          textDecoration: 'none', flexShrink: 0,
        }}>Brutal Ledger</Link>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {NAV_ITEMS.map(item => (
            <Link key={item.href} href={item.href}
              className={`nav-link ${pathname === item.href ? 'active' : ''}`}
              style={{ textDecoration: 'none' }}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flexShrink: 0 }}>
          <button
            onClick={() => setDark(!dark)}
            style={{
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: '5px',
              color: 'var(--color-text-muted)',
              padding: '0.2rem 0.625rem',
              cursor: 'pointer',
              fontSize: '0.68rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              transition: 'all 0.2s ease',
              fontFamily: 'var(--font-dm-sans)',
            }}
          >
            {dark ? '☀ Light' : '◑ Dark'}
          </button>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-placeholder)', letterSpacing: '0.06em' }}>Ahmad</div>
        </div>
      </div>
    </header>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('bl-theme')
    if (saved === 'dark') setDark(true)
  }, [])

  const toggleDark = (d: boolean) => {
    setDark(d)
    localStorage.setItem('bl-theme', d ? 'dark' : 'light')
  }

  return (
    <html lang="en">
      <body data-theme={dark ? 'dark' : undefined}>
        <SessionProvider>
          <Nav dark={dark} setDark={toggleDark} />
          <main style={{ paddingTop: '52px', minHeight: '100vh' }}>{children}</main>
        </SessionProvider>
      </body>
    </html>
  )
}
