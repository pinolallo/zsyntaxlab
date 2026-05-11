import { NextResponse } from 'next/server'
import { getSession } from '@/lib/userhub'

export async function GET() {
  const session = await getSession()
  if (!session.token) return NextResponse.json({ user: null }, { status: 401 })
  return NextResponse.json({ user: session.user, role: session.role })
}
