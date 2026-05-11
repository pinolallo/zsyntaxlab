import { getSetting, SETTING_KEYS } from './settings'

export interface BraveResult {
  title: string
  url: string
  description: string
  age?: string
}

const ACADEMIC_DOMAINS = ['arxiv.org', 'pubmed.ncbi.nlm.nih.gov', 'doi.org', 'biorxiv.org', 'pmc.ncbi.nlm.nih.gov', 'nature.com', 'science.org', 'cell.com', 'plos.org']

export async function searchPapers(query: string, count = 10): Promise<BraveResult[]> {
  const apiKey = await getSetting(SETTING_KEYS.BRAVE_KEY)
  if (!apiKey) throw new Error('Brave Search API key not configured')

  const params = new URLSearchParams({
    q: `${query} molecular biology paper`,
    count: String(count),
    search_lang: 'en',
    result_filter: 'web',
  })

  const res = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': apiKey,
    },
  })

  if (!res.ok) throw new Error(`Brave Search error: ${res.status}`)

  const data = await res.json()
  const results: BraveResult[] = (data.web?.results ?? []).map((r: Record<string, string>) => ({
    title: r.title,
    url: r.url,
    description: r.description,
    age: r.age,
  }))

  // Prioritize academic sources
  return results.sort((a, b) => {
    const aAcademic = ACADEMIC_DOMAINS.some((d) => a.url.includes(d)) ? 0 : 1
    const bAcademic = ACADEMIC_DOMAINS.some((d) => b.url.includes(d)) ? 0 : 1
    return aAcademic - bAcademic
  })
}

export async function downloadPaper(url: string, destPath: string): Promise<void> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'ZsyntaxLab/1.0 (research tool)' },
  })
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)

  const buffer = Buffer.from(await res.arrayBuffer())
  const { writeFile, mkdir } = await import('fs/promises')
  const { dirname } = await import('path')

  await mkdir(dirname(destPath), { recursive: true })
  await writeFile(destPath, buffer)
}
