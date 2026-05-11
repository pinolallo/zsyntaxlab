import { chatComplete } from '../openrouter'
import { parseFormula } from './parser'

export interface TheoremCandidate {
  formula: string
  derivationChain: string[]
  confidence: number
  reasoning: string
  summary: string
}

interface StoredEVF {
  id: string
  formula: string
  molecules: string[]
}

const THEOREM_SYSTEM_PROMPT = `You are an expert in molecular biology and substructural logic (Zsyntax).

Zsyntax operators (reminder):
- \`*\` Z-interaction: NOT associative — (A*B)*C ≠ A*(B*C)
- \`&\` Z-conjunction: commutative, NOT idempotent
- \`→\` Z-arrow: reaction/transition

Your task is to discover NEW molecular biology theorems by:

1. CHAIN REACTIONS: If EVF₁ produces molecule X and EVF₂ consumes molecule X as reactant, infer the chain.
   Example: (A&B → A*B) + (A*B&C → D) ⟹ theorem: A&B&C → D (with intermediate A*B)

2. ABDUCTION: Given a known biological endpoint from the literature, propose likely intermediates.
   Example: if EGFR activation is known to lead to cell proliferation, and we have EGFR EVFs, propose the signal cascade intermediates.

3. TRANSITIVE CLOSURE: Multi-step chains where product of one EVF is reactant of another.

Rules:
- NEVER simplify * parenthesization — (A*B)*C and A*(B*C) are biologically distinct
- Only propose theorems with at least 2 supporting EVFs in the derivation chain
- Confidence: 0.9+ for direct one-step chains, 0.7-0.89 for two-step, 0.5-0.69 for abductive hypotheses
- Use the exact formula IDs from the input EVFs in derivationChain

Output ONLY valid JSON, no markdown:
{"theorems": [{"formula": "...", "derivationChain": ["evf_id_1","evf_id_2"], "confidence": 0.85, "reasoning": "...", "summary": "one sentence plain English"}]}`

export async function inferTheorems(
  paperEvfs: StoredEVF[],
  relatedEvfs: StoredEVF[] = []
): Promise<TheoremCandidate[]> {
  if (paperEvfs.length < 2) return []

  const allEvfs = [...paperEvfs, ...relatedEvfs]
  const evfsJson = JSON.stringify(
    allEvfs.map((e) => ({ id: e.id, formula: e.formula, molecules: e.molecules })),
    null,
    2
  )

  // Build molecule index for context
  const moleculeIndex = buildMoleculeIndex(allEvfs)
  const sharedMolecules = findSharedMolecules(paperEvfs, relatedEvfs)

  const contextNote =
    sharedMolecules.length > 0
      ? `\n\nKey molecules shared between paper EVFs and related knowledge: ${sharedMolecules.join(', ')}`
      : ''

  try {
    const response = await chatComplete(
      [
        { role: 'system', content: THEOREM_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Analyze these Zsyntax EVFs and infer new theorems (novel predicted reactions):

${evfsJson}${contextNote}

Molecule connectivity map:
${JSON.stringify(moleculeIndex, null, 2)}

Discover chain reactions, transitive closures, and abductive hypotheses. Return JSON.`,
        },
      ],
      { json: true, temperature: 0.3 }
    )

    const parsed = parseTheoremResponse(response)
    return parsed.filter((t) => {
      const f = parseFormula(t.formula)
      return f.isValid && t.derivationChain.length >= 2
    })
  } catch {
    return []
  }
}

function buildMoleculeIndex(evfs: StoredEVF[]): Record<string, string[]> {
  const index: Record<string, string[]> = {}
  for (const evf of evfs) {
    for (const mol of evf.molecules) {
      if (!index[mol]) index[mol] = []
      index[mol].push(evf.id)
    }
  }
  // Only include molecules that appear in 2+ EVFs (potential chain points)
  return Object.fromEntries(Object.entries(index).filter(([, ids]) => ids.length >= 2))
}

function findSharedMolecules(paperEvfs: StoredEVF[], relatedEvfs: StoredEVF[]): string[] {
  const paperMols = new Set(paperEvfs.flatMap((e) => e.molecules))
  const relatedMols = new Set(relatedEvfs.flatMap((e) => e.molecules))
  return Array.from(paperMols).filter((m) => relatedMols.has(m))
}

function parseTheoremResponse(text: string): TheoremCandidate[] {
  const cleaned = text.replace(/```(?:json)?\n?/g, '').trim()
  try {
    const data = JSON.parse(cleaned)
    const items = Array.isArray(data) ? data : data.theorems ?? []
    return items.map((t: Record<string, unknown>) => ({
      formula: String(t.formula ?? ''),
      derivationChain: Array.isArray(t.derivationChain) ? t.derivationChain.map(String) : [],
      confidence: Math.min(1, Math.max(0, Number(t.confidence ?? 0.5))),
      reasoning: String(t.reasoning ?? ''),
      summary: String(t.summary ?? ''),
    }))
  } catch {
    return []
  }
}
