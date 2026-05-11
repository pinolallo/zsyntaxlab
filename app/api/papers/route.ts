import { NextResponse } from 'next/server'
import { getSession } from '@/lib/userhub'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session.token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const papers = await prisma.paper.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, title: true, authors: true, doi: true, year: true,
      status: true, url: true, createdAt: true,
      _count: { select: { formulae: true, theorems: true } },
    },
  })
  return NextResponse.json({ papers })
}
