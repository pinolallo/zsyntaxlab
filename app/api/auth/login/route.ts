import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { loginWithUserHub, getUserRole, getSessionOptions } from '@/lib/userhub'
import type { SessionData } from '@/lib/userhub'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    const result = await loginWithUserHub(email, password)
    if (!result) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const role = await getUserRole(result.user)
    if (role === 'public') {
      return NextResponse.json({ error: 'Access denied: not a ZsyntaxLab member' }, { status: 403 })
    }

    const cookieStore = await cookies()
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions())
    session.token = result.token
    session.user = result.user
    session.role = role
    await session.save()

    return NextResponse.json({ ok: true, role })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Login failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
