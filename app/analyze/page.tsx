'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'

interface Paper { id: string; title: string; status: string }
interface Event { stage: string; message: string; progress: number }

const STAGES = ['EXTRACTING', 'TRANSLATING', 'INFERRING', 'VECTORIZING', 'DONE']

function AnalyzeContent() {
  const searchParams = useSearchParams()
  const [papers, setPapers] = useState<Paper[]>([])
  const [selectedId, setSelectedId] = useState(searchParams.get('paperId') ?? '')
  const [running, setRunning] = useState(false)
  const [events, setEvents] = useState<Event[]>([])
  const [currentStage, setCurrentStage] = useState('')
  const [progress, setProgress] = useState(0)
  const evtRef = useRef<EventSource | null>(null)

  useEffect(() => {
    fetch('/api/papers').then((r) => r.json()).then((d) => {
      const eligible = (d.papers ?? []).filter((p: Paper) => ['PENDING', 'ERROR'].includes(p.status))
      setPapers(eligible)
    })
  }, [])

  async function startAnalysis() {
    if (!selectedId) return
    setEvents([])
    setProgress(0)
    setRunning(true)

    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paperId: selectedId }),
    })
    if (!res.ok) { setRunning(false); return }

    const es = new EventSource(`/api/analyze/stream?paperId=${selectedId}`)
    evtRef.current = es

    es.onmessage = (e) => {
      const ev: Event = JSON.parse(e.data)
      setEvents((prev) => [...prev, ev])
      setCurrentStage(ev.stage)
      setProgress(ev.progress)
      if (ev.stage === 'DONE' || ev.stage === 'ERROR') {
        es.close()
        setRunning(false)
      }
    }
    es.onerror = () => { es.close(); setRunning(false) }
  }

  const stageIdx = STAGES.indexOf(currentStage)

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Analyze Paper</h1>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="text-white font-semibold">Select a paper to analyze</h2>
        {papers.length === 0 ? (
          <p className="text-gray-500 text-sm">No papers ready for analysis. Download papers first.</p>
        ) : (
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select a paper…</option>
            {papers.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        )}
        <button onClick={startAnalysis} disabled={!selectedId || running}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors">
          {running ? 'Analyzing…' : 'Start Analysis'}
        </button>
      </div>

      {(running || events.length > 0) && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{currentStage || 'Starting…'}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Step indicators */}
          <div className="space-y-2">
            {STAGES.filter((s) => s !== 'DONE').map((stage, i) => {
              const done = stageIdx > i || currentStage === 'DONE'
              const active = stageIdx === i && running
              return (
                <div key={stage} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                    ${done ? 'bg-green-600 text-white' : active ? 'bg-blue-600 text-white animate-pulse' : 'bg-gray-700 text-gray-400'}`}>
                    {done ? '✓' : i + 1}
                  </div>
                  <span className={`text-sm ${done ? 'text-green-400' : active ? 'text-white' : 'text-gray-500'}`}>
                    {stage.charAt(0) + stage.slice(1).toLowerCase().replace('_', ' ')}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Log */}
          <div className="bg-gray-950 rounded-lg p-3 space-y-1 max-h-48 overflow-y-auto font-mono text-xs">
            {events.map((ev, i) => (
              <div key={i} className={ev.stage === 'ERROR' ? 'text-red-400' : ev.stage === 'DONE' ? 'text-green-400' : 'text-gray-300'}>
                [{ev.stage}] {ev.message}
              </div>
            ))}
          </div>

          {currentStage === 'DONE' && (
            <div className="flex gap-3">
              <a href="/theorems" className="bg-purple-600 hover:bg-purple-500 text-white text-sm px-4 py-2 rounded-lg transition-colors">
                View Theorems
              </a>
              <a href="/graph" className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded-lg transition-colors">
                View Graph
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={<div className="text-gray-400 text-sm">Loading…</div>}>
      <AnalyzeContent />
    </Suspense>
  )
}
