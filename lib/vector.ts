import { prisma } from './prisma'

export interface SimilarFormula {
  id: string
  formula: string
  type: string
  molecules: string[]
  confidence: number
  paperId: string
  score: number
}

export async function upsertEmbedding(formulaId: string, embedding: number[]): Promise<void> {
  const vector = `[${embedding.join(',')}]`
  await prisma.$executeRaw`
    UPDATE zsyntax_formulae
    SET embedding = ${vector}::vector
    WHERE id = ${formulaId}
  `
}

export async function searchSimilarFormulae(
  embedding: number[],
  limit = 10,
  excludePaperId?: string
): Promise<SimilarFormula[]> {
  const vector = `[${embedding.join(',')}]`

  const rows = excludePaperId
    ? await prisma.$queryRaw<SimilarFormula[]>`
        SELECT id, formula, type, molecules, confidence, paper_id as "paperId",
               1 - (embedding <=> ${vector}::vector) AS score
        FROM zsyntax_formulae
        WHERE embedding IS NOT NULL AND paper_id != ${excludePaperId}
        ORDER BY embedding <=> ${vector}::vector
        LIMIT ${limit}
      `
    : await prisma.$queryRaw<SimilarFormula[]>`
        SELECT id, formula, type, molecules, confidence, paper_id as "paperId",
               1 - (embedding <=> ${vector}::vector) AS score
        FROM zsyntax_formulae
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> ${vector}::vector
        LIMIT ${limit}
      `

  return rows
}

export async function searchTheoremsByText(embedding: number[], limit = 10): Promise<Array<{
  id: string
  summary: string
  confidence: number
  paperId: string
  score: number
}>> {
  const vector = `[${embedding.join(',')}]`
  return prisma.$queryRaw`
    SELECT t.id, t.summary, t.confidence, t.paper_id as "paperId",
           1 - (f.embedding <=> ${vector}::vector) AS score
    FROM theorems t
    JOIN theorem_formulae tf ON tf.theorem_id = t.id
    JOIN zsyntax_formulae f ON f.id = tf.formula_id
    WHERE f.embedding IS NOT NULL
    ORDER BY f.embedding <=> ${vector}::vector
    LIMIT ${limit}
  `
}
