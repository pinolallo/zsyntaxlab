import { prisma } from '../prisma'
import { extractTextFromPDF } from '../pdf'
import { extractFormulaeFromText } from './extractor'
import { inferTheorems } from './theorems'
import { getEmbedding } from '../openrouter'
import { upsertEmbedding, searchSimilarFormulae } from '../vector'
import { extractMolecules } from './parser'
import type { PaperStatus } from '@prisma/client'

export type PipelineStage = 'EXTRACTING' | 'TRANSLATING' | 'INFERRING' | 'VECTORIZING' | 'DONE' | 'ERROR'

export interface PipelineEvent {
  stage: PipelineStage
  message: string
  progress: number
}

type ProgressCallback = (event: PipelineEvent) => void

export async function runAnalysisPipeline(paperId: string, onProgress?: ProgressCallback): Promise<void> {
  const emit = (stage: PipelineStage, message: string, progress: number) => {
    onProgress?.({ stage, message, progress })
  }

  async function setStatus(status: PaperStatus, errorMsg?: string) {
    await prisma.paper.update({ where: { id: paperId }, data: { status, errorMsg } })
  }

  try {
    const paper = await prisma.paper.findUniqueOrThrow({ where: { id: paperId } })
    if (!paper.rawPath) throw new Error('Paper has no raw file path')

    // Stage 1: Text extraction
    emit('EXTRACTING', 'Extracting text from PDF…', 10)
    await setStatus('ANALYZING')
    const { text, pages } = await extractTextFromPDF(paper.rawPath)
    emit('EXTRACTING', `Extracted ${pages} pages`, 20)

    // Stage 2: Reaction extraction + Zsyntax translation
    emit('TRANSLATING', 'Identifying molecular reactions via AI…', 25)
    await setStatus('EXTRACTING')
    const formulae = await extractFormulaeFromText(text)
    emit('TRANSLATING', `Found ${formulae.length} reactions, translating to Zsyntax…`, 50)

    await setStatus('TRANSLATING')
    const savedFormulae = await Promise.all(
      formulae.map((f) =>
        prisma.zsyntaxFormula.create({
          data: {
            paperId,
            type: 'EVF',
            formula: f.formula,
            molecules: extractMolecules(f.formula),
            confidence: f.confidence,
            sourceText: f.sourceText,
          },
        })
      )
    )
    emit('TRANSLATING', `Saved ${savedFormulae.length} EVFs`, 60)

    // Stage 3: Theorem inference
    emit('INFERRING', 'Inferring new theorems via abduction…', 62)
    await setStatus('INFERRING')

    const evfInput = savedFormulae.map((f) => ({
      id: f.id,
      formula: f.formula,
      molecules: f.molecules,
    }))

    // Fetch related EVFs from other papers for cross-paper chaining
    const relatedEvfs = savedFormulae.length > 0
      ? await searchSimilarFormulae(
          await getEmbedding(savedFormulae[0].formula).catch(() => []),
          20,
          paperId
        ).catch(() => [])
      : []

    const theorems = await inferTheorems(evfInput, relatedEvfs)
    emit('INFERRING', `Discovered ${theorems.length} theorems`, 75)

    for (const t of theorems) {
      const theorem = await prisma.theorem.create({
        data: {
          paperId,
          derivationChain: t.derivationChain,
          confidence: t.confidence,
          summary: t.summary,
          reasoning: t.reasoning,
        },
      })

      // Link EVFs to theorem
      const linkedIds = t.derivationChain.filter((id) =>
        savedFormulae.some((f) => f.id === id)
      )
      if (linkedIds.length > 0) {
        await prisma.theoremFormula.createMany({
          data: linkedIds.map((fId, order) => ({
            theoremId: theorem.id,
            formulaId: fId,
            order,
          })),
          skipDuplicates: true,
        })
      }

      // Also save theorem formula to zsyntax_formulae
      await prisma.zsyntaxFormula.create({
        data: {
          paperId,
          type: 'THEOREM',
          formula: t.formula,
          molecules: extractMolecules(t.formula),
          confidence: t.confidence,
          metadata: { theoremId: theorem.id, reasoning: t.reasoning },
        },
      })
    }

    // Stage 4: Vectorization
    emit('VECTORIZING', 'Embedding formulae for semantic search…', 78)
    await setStatus('VECTORIZING')

    const allFormulae = await prisma.zsyntaxFormula.findMany({ where: { paperId } })
    let vectorized = 0

    for (const formula of allFormulae) {
      try {
        const embedding = await getEmbedding(formula.formula)
        await upsertEmbedding(formula.id, embedding)
        vectorized++
        if (vectorized % 5 === 0) {
          emit('VECTORIZING', `Embedded ${vectorized}/${allFormulae.length} formulae…`, 78 + Math.round((vectorized / allFormulae.length) * 20))
        }
      } catch {
        // Continue — partial embeddings are ok
      }
    }

    await setStatus('DONE')
    emit('DONE', `Complete: ${savedFormulae.length} EVFs, ${theorems.length} theorems, ${vectorized} embeddings`, 100)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await prisma.paper.update({ where: { id: paperId }, data: { status: 'ERROR', errorMsg: msg } }).catch(() => {})
    emit('ERROR', msg, 0)
    throw err
  }
}
