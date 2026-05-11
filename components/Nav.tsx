'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface Me { role: 'admin' | 'user'; user: { displayName?: string; email: string } }

export function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const [me, setMe] = useState<Me | null>(null)

  useEffect(() => {
    fetch('/api/auth/me').then((r) => (r.ok ? r.json() : null)).then((d) => d?.user && setMe(d))
  }, [pathname])

  if (!me || pathname === '/login') return null

  const links = [
    { href: '/', label: 'Dashboard' },
    { href: '/papers', label: 'Papers' },
    { href: '/analyze', label: 'Analyze' },
    { href: '/theorems', label: 'Theorems' },
    { href: '/graph', label: 'Graph' },
    ...(me.role === 'admin' ? [{ href: '/admin', label: 'Admin' }] : []),
  ]

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="border-b border-gray-800 bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-white font-bold text-lg">ZsyntaxLab</Link>
          <div className="flex gap-1">
            {links.map((l) => (
              <Link
                key={l.href} href={l.href}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  pathname === l.href || (l.href !== '/' && pathname.startsWith(l.href))
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm">{me.user.displayName ?? me.user.email}</span>
          {me.role === 'admin' && (
            <span className="text-xs bg-yellow-600 text-yellow-100 px-2 py-0.5 rounded-full">admin</span>
          )}
          <button onClick={logout} className="text-gray-400 hover:text-white text-sm transition-colors">
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}
