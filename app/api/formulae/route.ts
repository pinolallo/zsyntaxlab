import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/userhub'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const type = searchParams.get('type')
  const molecule = searchParams.get('molecule')
  const paperId = searchParams.get('paperId')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = 30

  const where = {
    ...(type ? { type: type as 'EVF' | 'LVF' | 'THEOREM' } : {}),
    ...(molecule ? { molecules: { has: molecule } } : {}),
    ...(paperId ? { paperId } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.zsyntaxFormula.findMany({
      where,
      orderBy: [{ confidence: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: { paper: { select: { id: true, title: true } } },
    }),
    prisma.zsyntaxFormula.count({ where }),
  ])

  return NextResponse.json({ items, total, page, pages: Math.ceil(total / limit) })
}
