import { NextResponse } from 'next/server'
import { getSession } from '@/lib/userhub'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session.token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formulae = await prisma.zsyntaxFormula.findMany({
    take: 500,
    orderBy: { confidence: 'desc' },
    select: { id: true, formula: true, type: true, molecules: true, confidence: true },
  })

  const nodes = new Map<string, { id: string; label: string; type: 'molecule' }>()
  const edges: Array<{ id: string; source: string; target: string; label: string; type: string; confidence: number }> = []

  for (const f of formulae) {
    // Parse LHS → RHS
    const arrowIdx = f.formula.search(/→|->/)
    if (arrowIdx === -1) continue

    const lhsMols = extractMolsFromSide(f.formula.slice(0, arrowIdx))
    const rhsMols = extractMolsFromSide(f.formula.slice(arrowIdx + 1))

    for (const mol of [...lhsMols, ...rhsMols]) {
      if (!nodes.has(mol)) nodes.set(mol, { id: mol, label: mol, type: 'molecule' })
    }

    // Create edge from each LHS molecule to each RHS molecule
    for (const lhs of lhsMols) {
      for (const rhs of rhsMols) {
        if (lhs !== rhs) {
          edges.push({
            id: `${f.id}_${lhs}_${rhs}`,
            source: lhs,
            target: rhs,
            label: f.type,
            type: f.type,
            confidence: f.confidence,
          })
        }
      }
    }
  }

  // Keep top-50 most-connected molecules to avoid rendering overload
  const connectivity = new Map<string, number>()
  for (const e of edges) {
    connectivity.set(e.source, (connectivity.get(e.source) ?? 0) + 1)
    connectivity.set(e.target, (connectivity.get(e.target) ?? 0) + 1)
  }

  const top50 = new Set(
    Array.from(connectivity.entries()).sort((a, b) => b[1] - a[1]).slice(0, 50).map(([id]) => id)
  )

  const filteredNodes = Array.from(nodes.values()).filter((n) => top50.has(n.id))
  const filteredEdges = edges.filter((e) => top50.has(e.source) && top50.has(e.target))

  return NextResponse.json({ nodes: filteredNodes, edges: filteredEdges })
}

function extractMolsFromSide(side: string): string[] {
  const mols = side.match(/[A-Za-z][A-Za-z0-9_\-\+\.#]*/g) ?? []
  return Array.from(new Set(mols.filter((m) => m.length > 1)))
}
