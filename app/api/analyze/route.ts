import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/userhub'
import { prisma } from '@/lib/prisma'
import { runAnalysisPipeline } from '@/lib/zsyntax/pipeline'

// In-memory event store for SSE (single-server / local dev)
export const pipelineEvents = new Map<string, Array<{ stage: string; message: string; progress: number }>>()

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { paperId } = await req.json()
  if (!paperId) return NextResponse.json({ error: 'paperId required' }, { status: 400 })

  const paper = await prisma.paper.findUnique({ where: { id: paperId } })
  if (!paper) return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
  if (!['PENDING', 'ERROR'].includes(paper.status)) {
    return NextResponse.json({ error: `Paper is already ${paper.status}` }, { status: 409 })
  }

  pipelineEvents.set(paperId, [])

  // Fire-and-forget — response returns immediately
  setImmediate(() => {
    runAnalysisPipeline(paperId, (event) => {
      const events = pipelineEvents.get(paperId) ?? []
      events.push(event)
      pipelineEvents.set(paperId, events)
    }).catch(() => {})
  })

  return NextResponse.json({ ok: true, paperId })
}
