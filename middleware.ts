import { NextRequest, NextResponse } from 'next/server'
import { unsealData } from 'iron-session'
import type { SessionData } from '@/lib/userhub'

const SESSION_OPTIONS = {
  password: process.env.IRON_SESSION_SECRET ?? 'change-me-to-a-random-32-char-secret!!',
  cookieName: 'zsyntax_session',
}

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/unauthorized', '/_next', '/favicon.ico']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next()

  const sealedCookie = req.cookies.get(SESSION_OPTIONS.cookieName)?.value

  if (!sealedCookie) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  let session: Partial<SessionData> = {}
  try {
    session = await unsealData<SessionData>(sealedCookie, { password: SESSION_OPTIONS.password })
  } catch {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (!session.token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (pathname.startsWith('/admin') && session.role !== 'admin') {
    return NextResponse.redirect(new URL('/unauthorized', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
