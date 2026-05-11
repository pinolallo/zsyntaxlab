'use client'

import { useEffect, useRef, useState } from 'react'

interface Node { id: string; label: string }
interface Edge { id: string; source: string; target: string; label: string; type: string; confidence: number }

export default function GraphPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ nodes: 0, edges: 0 })
  const [selected, setSelected] = useState<{ id: string; type: 'node' | 'edge'; data: Record<string, unknown> } | null>(null)

  useEffect(() => {
    let cy: import('cytoscape').Core | null = null

    async function init() {
      if (!containerRef.current) return
      const [{ default: cytoscape }, { default: dagre }] = await Promise.all([
        import('cytoscape'),
        import('cytoscape-dagre'),
      ])
      cytoscape.use(dagre)

      const res = await fetch('/api/graph')
      const data = await res.json()
      setStats({ nodes: data.nodes.length, edges: data.edges.length })
      setLoading(false)

      cy = cytoscape({
        container: containerRef.current,
        elements: [
          ...data.nodes.map((n: Node) => ({ data: { id: n.id, label: n.label } })),
          ...data.edges.map((e: Edge) => ({
            data: { id: e.id, source: e.source, target: e.target, label: e.label, type: e.type, confidence: e.confidence },
          })),
        ],
        style: [
          {
            selector: 'node',
            style: {
              'background-color': '#1d4ed8',
              'border-color': '#3b82f6',
              'border-width': 1,
              label: 'data(label)',
              color: '#fff',
              'font-size': 9,
              'text-valign': 'bottom',
              'text-margin-y': 4,
              width: 24,
              height: 24,
            },
          },
          {
            selector: 'edge[type = "EVF"]',
            style: { 'line-color': '#16a34a', 'target-arrow-color': '#16a34a', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier', width: 1.5 },
          },
          {
            selector: 'edge[type = "THEOREM"]',
            style: { 'line-color': '#9333ea', 'target-arrow-color': '#9333ea', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier', width: 1, 'line-style': 'dashed' },
          },
          { selector: 'node:selected', style: { 'background-color': '#f59e0b', 'border-color': '#fcd34d' } },
        ],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        layout: { name: 'dagre', rankDir: 'LR', nodeSep: 40, rankSep: 80 } as any,
      })

      cy.on('tap', 'node', (evt) => {
        const n = evt.target
        setSelected({ id: n.id(), type: 'node', data: n.data() })
      })
      cy.on('tap', 'edge', (evt) => {
        const e = evt.target
        setSelected({ id: e.id(), type: 'edge', data: e.data() })
      })
      cy.on('tap', (evt) => {
        if (evt.target === cy) setSelected(null)
      })
    }

    init()
    return () => { cy?.destroy() }
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Knowledge Graph</h1>
        <div className="flex gap-4 text-sm text-gray-400">
          <span>{stats.nodes} molecules</span>
          <span>{stats.edges} reactions</span>
          <div className="flex gap-3">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-green-500 inline-block" /> EVF</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-purple-500 border-dashed inline-block" /> Theorem</span>
          </div>
        </div>
      </div>

      <div className="relative">
        <div ref={containerRef} className="w-full rounded-xl border border-gray-800 bg-gray-950"
          style={{ height: '70vh' }} />

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
            Loading graph…
          </div>
        )}

        {selected && (
          <div className="absolute top-3 right-3 bg-gray-900 border border-gray-700 rounded-xl p-4 text-sm max-w-xs">
            <p className="text-white font-medium capitalize mb-2">{selected.type}: {selected.id}</p>
            {Object.entries(selected.data).map(([k, v]) => (
              <div key={k} className="flex gap-2 text-xs">
                <span className="text-gray-500">{k}:</span>
                <span className="text-gray-300 truncate">{String(v)}</span>
              </div>
            ))}
            <button onClick={() => setSelected(null)} className="mt-2 text-gray-500 hover:text-white text-xs transition-colors">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
