import { getSetting, SETTING_KEYS } from './settings'
import { getIronSession, IronSession } from 'iron-session'
import { cookies } from 'next/headers'

export interface UserHubUser {
  id: string
  email: string
  displayName?: string
  groups: string[]
}

export interface SessionData {
  token: string
  user: UserHubUser
  role: 'admin' | 'user' | 'public'
}

declare module 'iron-session' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface IronSessionData extends SessionData {}
}

export async function getSessionOptions() {
  return {
    password: process.env.IRON_SESSION_SECRET ?? 'change-me-to-a-random-32-char-secret!!',
    cookieName: 'zsyntax_session',
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
    },
  }
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies()
  return getIronSession<SessionData>(cookieStore, await getSessionOptions())
}

export async function loginWithUserHub(
  email: string,
  password: string
): Promise<{ token: string; user: UserHubUser } | null> {
  const baseUrl = process.env.USERHUB_URL
  const apiKey = process.env.USERHUB_API_KEY

  if (!baseUrl || !apiKey) throw new Error('UserHub not configured')

  const res = await fetch(`${baseUrl}/api/external/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) return null

  const data = await res.json()
  const user = await resolveUser(data.token)
  if (!user) return null

  return { token: data.token, user }
}

export async function resolveUser(token: string): Promise<UserHubUser | null> {
  const baseUrl = process.env.USERHUB_URL
  const apiKey = process.env.USERHUB_API_KEY

  if (!baseUrl || !apiKey) return null

  const res = await fetch(`${baseUrl}/api/external/auth/validate`, {
    headers: { 'x-api-key': apiKey, Authorization: `Bearer ${token}` },
  })

  if (!res.ok) return null

  const data = await res.json()
  const groups = await resolveGroups(data.user?.id ?? data.id, token)

  return {
    id: data.user?.id ?? data.id,
    email: data.user?.email ?? data.email,
    displayName: data.user?.displayName ?? data.displayName,
    groups,
  }
}

async function resolveGroups(userId: string, token: string): Promise<string[]> {
  const baseUrl = process.env.USERHUB_URL
  const apiKey = process.env.USERHUB_API_KEY

  if (!baseUrl || !apiKey) return []

  try {
    const res = await fetch(`${baseUrl}/api/external/groups/resolve?userId=${userId}`, {
      headers: { 'x-api-key': apiKey, Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return []
    const data = await res.json()
    // UserHub may return group names or UUIDs — normalize to names
    const groups: Array<{ name?: string; id?: string }> = data.groups ?? data
    return groups.map((g) => g.name ?? g.id ?? '').filter(Boolean)
  } catch {
    return []
  }
}

export async function getUserRole(user: UserHubUser): Promise<'admin' | 'user' | 'public'> {
  const adminGroup = await getSetting(SETTING_KEYS.ADMIN_GROUP, 'zsyntax_admin')
  const userGroup = await getSetting(SETTING_KEYS.USER_GROUP, 'zsyntax_user')

  if (user.groups.includes(adminGroup)) return 'admin'
  if (user.groups.includes(userGroup)) return 'user'
  return 'public'
}
