import { NextRequest, NextResponse } from 'next/server'
import { join } from 'path'
import { getSession } from '@/lib/userhub'
import { getSetting, SETTING_KEYS } from '@/lib/settings'
import { downloadPaper } from '@/lib/brave'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url, title, authors, doi, year, abstract } = await req.json()
  if (!url || !title) return NextResponse.json({ error: 'url and title required' }, { status: 400 })

  // Check for duplicate DOI
  if (doi) {
    const existing = await prisma.paper.findUnique({ where: { doi } })
    if (existing) return NextResponse.json({ paper: existing, duplicate: true })
  }

  const storagePath = await getSetting(SETTING_KEYS.PDF_STORAGE_PATH, './papers')
  const fileName = `${Date.now()}_${title.slice(0, 40).replace(/[^a-z0-9]/gi, '_')}.pdf`
  const destPath = join(process.cwd(), storagePath, fileName)

  const paper = await prisma.paper.create({
    data: {
      title,
      authors: authors ?? [],
      doi: doi ?? undefined,
      year: year ? Number(year) : undefined,
      url,
      abstract: abstract ?? undefined,
      status: 'DOWNLOADING',
      rawPath: destPath,
    },
  })

  // Download asynchronously — don't block the response
  downloadPaper(url, destPath)
    .then(() => prisma.paper.update({ where: { id: paper.id }, data: { status: 'PENDING' } }))
    .catch((e) =>
      prisma.paper.update({ where: { id: paper.id }, data: { status: 'ERROR', errorMsg: String(e) } })
    )

  return NextResponse.json({ paper })
}
