import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/userhub'
import { getAllSettings, setSettings, SETTING_KEYS } from '@/lib/settings'

const MASKED = '****'
const SECRET_KEYS = [
  SETTING_KEYS.OPENROUTER_API_KEY,
  SETTING_KEYS.BRAVE_KEY,
  SETTING_KEYS.OPENAI_API_KEY,
  SETTING_KEYS.VOYAGE_API_KEY,
]

export async function GET() {
  const session = await getSession()
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const all = await getAllSettings()
  const safe = Object.fromEntries(
    Object.entries(all).map(([k, v]) => [k, (SECRET_KEYS as string[]).includes(k) && v ? MASKED : v])
  )
  return NextResponse.json(safe)
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body: Record<string, string> = await req.json()

  // Don't overwrite secrets if the client sent back the mask
  const toSave = Object.fromEntries(
    Object.entries(body).filter(([, v]) => v !== MASKED && v !== undefined)
  )

  await setSettings(toSave)
  return NextResponse.json({ ok: true })
}
