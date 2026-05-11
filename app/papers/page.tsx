'use client'

import { useEffect, useState } from 'react'

interface BraveResult { title: string; url: string; description: string }
interface Paper { id: string; title: string; authors: string[]; status: string; year?: number; _count: { formulae: number; theorems: number } }

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'text-gray-400', DOWNLOADING: 'text-yellow-400', ANALYZING: 'text-blue-400',
  DONE: 'text-green-400', ERROR: 'text-red-400',
}

export default function PapersPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BraveResult[]>([])
  const [papers, setPapers] = useState<Paper[]>([])
  const [searching, setSearching] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => { loadPapers() }, [])

  async function loadPapers() {
    const r = await fetch('/api/papers')
    const d = await r.json()
    setPapers(d.papers ?? [])
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearching(true)
    setError('')
    try {
      const r = await fetch('/api/papers/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setResults(d.results)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  async function handleDownload(result: BraveResult) {
    setDownloading(result.url)
    try {
      const r = await fetch('/api/papers/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: result.url, title: result.title }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      await loadPapers()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Papers</h1>

      {/* Search */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="text-white font-semibold">Search Papers via Brave</h2>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. TP53 MDM2 ubiquitination pathway"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600"
          />
          <button type="submit" disabled={searching || !query}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition-colors">
            {searching ? 'Searching…' : 'Search'}
          </button>
        </form>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {results.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {results.map((r) => (
              <div key={r.url} className="flex items-start justify-between gap-4 bg-gray-800 rounded-lg p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{r.title}</p>
                  <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">{r.description}</p>
                  <p className="text-gray-500 text-xs mt-0.5 truncate">{r.url}</p>
                </div>
                <button onClick={() => handleDownload(r)} disabled={downloading === r.url}
                  className="shrink-0 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg transition-colors">
                  {downloading === r.url ? 'Downloading…' : 'Download'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Downloaded papers */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="text-white font-semibold">Downloaded Papers ({papers.length})</h2>
        {papers.length === 0 ? (
          <p className="text-gray-500 text-sm">No papers yet. Search and download papers above.</p>
        ) : (
          <div className="divide-y divide-gray-800">
            {papers.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-white text-sm font-medium">{p.title}</p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {p.authors.slice(0, 2).join(', ')}{p.authors.length > 2 ? ' et al.' : ''}{p.year ? ` · ${p.year}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-gray-500">{p._count.formulae} EVFs · {p._count.theorems} theorems</span>
                  <span className={STATUS_COLOR[p.status] ?? 'text-gray-400'}>{p.status}</span>
                  {p.status === 'PENDING' && (
                    <a href={`/analyze?paperId=${p.id}`}
                      className="bg-blue-700 hover:bg-blue-600 text-white px-2 py-1 rounded transition-colors">
                      Analyze
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
