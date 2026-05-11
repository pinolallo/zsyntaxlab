'use client'

import { useEffect, useState } from 'react'
import { FormulaCard } from '@/components/FormulaCard'

interface Formula {
  id: string; formula: string; type: 'EVF' | 'LVF' | 'THEOREM'
  molecules: string[]; confidence: number; paper?: { id: string; title: string }
  score?: number
}

export default function TheoremsPage() {
  const [items, setItems] = useState<Formula[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState('')
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchMode, setSearchMode] = useState(false)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!searchMode) loadFormulae() }, [page, typeFilter, searchMode])

  async function loadFormulae() {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (typeFilter) params.set('type', typeFilter)
    const r = await fetch(`/api/formulae?${params}`)
    const d = await r.json()
    setItems(d.items ?? [])
    setTotal(d.total ?? 0)
    setLoading(false)
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) { setSearchMode(false); loadFormulae(); return }
    setSearching(true)
    setSearchMode(true)
    const r = await fetch('/api/formulae/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })
    const d = await r.json()
    setItems(d.results ?? [])
    setTotal(d.results?.length ?? 0)
    setSearching(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Theorems & EVFs</h1>
        <span className="text-gray-400 text-sm">{total} total</span>
      </div>

      {/* Controls */}
      <div className="flex gap-3 flex-wrap">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-64">
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Semantic search: 'TP53 ubiquitination pathway'…"
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600"
          />
          <button type="submit" disabled={searching}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition-colors">
            {searching ? '…' : 'Search'}
          </button>
          {searchMode && (
            <button type="button" onClick={() => { setQuery(''); setSearchMode(false); setPage(1) }}
              className="text-gray-400 hover:text-white text-sm px-2 transition-colors">
              Clear
            </button>
          )}
        </form>

        {!searchMode && (
          <div className="flex gap-2">
            {['', 'EVF', 'THEOREM'].map((t) => (
              <button key={t} onClick={() => { setTypeFilter(t); setPage(1) }}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${typeFilter === t ? 'bg-blue-600 text-white' : 'bg-gray-900 border border-gray-700 text-gray-400 hover:text-white'}`}>
                {t || 'All'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-gray-500 text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-gray-500 text-sm">No formulae found. Analyze a paper to get started.</div>
      ) : (
        <div className="space-y-3">
          {items.map((f) => <FormulaCard key={f.id} formula={f} />)}
        </div>
      )}

      {/* Pagination */}
      {!searchMode && total > 30 && (
        <div className="flex gap-2 justify-center">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 bg-gray-900 border border-gray-700 text-gray-400 rounded-lg text-sm disabled:opacity-40 hover:text-white transition-colors">
            Prev
          </button>
          <span className="px-3 py-1.5 text-gray-400 text-sm">Page {page}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={items.length < 30}
            className="px-3 py-1.5 bg-gray-900 border border-gray-700 text-gray-400 rounded-lg text-sm disabled:opacity-40 hover:text-white transition-colors">
            Next
          </button>
        </div>
      )}
    </div>
  )
}
