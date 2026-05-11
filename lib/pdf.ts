import { readFile } from 'fs/promises'

export interface PDFContent {
  text: string
  pages: number
  info: Record<string, unknown>
}

export async function extractTextFromPDF(filePath: string): Promise<PDFContent> {
  const buffer = await readFile(filePath)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse')
  const result = await pdfParse(buffer)
  return {
    text: result.text as string,
    pages: result.numpages as number,
    info: result.info as Record<string, unknown>,
  }
}

export function chunkText(text: string, chunkSize = 4000, overlap = 400): string[] {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 50)
  const chunks: string[] = []
  let current = ''

  for (const para of paragraphs) {
    if (current.length + para.length > chunkSize && current.length > 0) {
      chunks.push(current.trim())
      current = current.slice(-overlap) + '\n\n' + para
    } else {
      current += (current ? '\n\n' : '') + para
    }
  }

  if (current.trim()) chunks.push(current.trim())
  return chunks
}
