import { prisma } from './prisma'

const CACHE_TTL = 60_000
const MASKED = '****'
let cache: Record<string, string> = {}
let cacheTime = 0

export async function getAllSettings(): Promise<Record<string, string>> {
  if (Date.now() - cacheTime < CACHE_TTL) return cache
  const rows = await prisma.setting.findMany()
  cache = {}
  for (const row of rows) {
    if (row.value !== null && row.value !== undefined) cache[row.key] = row.value
  }
  cacheTime = Date.now()
  return cache
}

export async function getSetting(key: string, defaultValue = ''): Promise<string> {
  const all = await getAllSettings()
  const val = all[key]
  if (val && val !== '' && val !== MASKED) return val
  return process.env[key.toUpperCase().replace(/-/g, '_')] ?? defaultValue
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  })
  invalidateSettingsCache()
}

export async function setSettings(entries: Record<string, string>): Promise<void> {
  await prisma.$transaction(
    Object.entries(entries).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      })
    )
  )
  invalidateSettingsCache()
}

export function invalidateSettingsCache(): void {
  cacheTime = 0
}

export const SETTING_KEYS = {
  OPENROUTER_API_KEY: 'openrouter_api_key',
  OPENROUTER_MODEL: 'openrouter_model',
  BRAVE_KEY: 'brave_key',
  PDF_STORAGE_PATH: 'pdf_storage_path',
  ADMIN_GROUP: 'admin_group',
  USER_GROUP: 'user_group',
  EMBEDDING_PROVIDER: 'embedding_provider',
  OPENAI_API_KEY: 'openai_api_key',
  VOYAGE_API_KEY: 'voyage_api_key',
  OLLAMA_URL: 'ollama_url',
} as const
