import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/userhub'
import { getEmbedding } from '@/lib/openrouter'
import { searchSimilarFormulae } from '@/lib/vector'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { query } = await req.json()
  if (!query) return NextResponse.json({ error: 'query required' }, { status: 400 })

  try {
    const embedding = await getEmbedding(query)
    const results = await searchSimilarFormulae(embedding, 20)
    return NextResponse.json({ results })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Search failed' }, { status: 500 })
  }
}
