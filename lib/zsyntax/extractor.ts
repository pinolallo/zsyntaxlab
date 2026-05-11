import { chatComplete } from '../openrouter'
import { chunkText } from '../pdf'
import { parseFormula, deduplicateFormulae } from './parser'

export interface ExtractedFormula {
  formula: string
  type: 'EVF'
  confidence: number
  sourceText: string
}

const EXTRACTION_SYSTEM_PROMPT = `You are an expert in molecular biology and formal logic (Zsyntax).

Zsyntax operators:
- \`*\` (Z-interaction): A*B means molecule A physically interacts with B, forming a compound. NOT associative: (A*B)*C ≠ A*(B*C).
- \`&\` (Z-conjunction): A&B means an aggregate/multiset of A and B. Fully associative, NOT idempotent (A&A ≠ A, stoichiometry matters).
- \`→\` (Z-arrow): A→B means transition/reaction from aggregate A to aggregate B.

Translation rules:
1. Binding: A&B → A*B  (molecules aggregate then interact)
2. Enzymatic reaction: Enzyme*Substrate → Product
3. Gene activation: TF*PromoterRegion → Gene_mRNA
4. Phosphorylation: Kinase*Target → phospho_Target
5. Ubiquitination: E3_ligase*Target → ubiquitin_Target
6. Cleavage: Protease*Substrate → Fragment1&Fragment2
7. Use stoichiometry with &: two copies = A&A
8. Use official HGNC gene/protein symbols (e.g. TP53, MDM2, KRAS, EGFR)
9. List ALL reactions you find, including intermediate steps

Output ONLY a valid JSON array, no markdown, no explanation:
[{"formula": "...", "confidence": 0.95, "source_text": "exact quote from text"}]`

export async function extractFormulaeFromText(text: string): Promise<ExtractedFormula[]> {
  const chunks = chunkText(text, 4000, 400)
  const allFormulae: ExtractedFormula[] = []

  for (const chunk of chunks) {
    try {
      const response = await chatComplete(
        [
          { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Extract all molecular reactions as Zsyntax EVFs from this text:\n\n${chunk}`,
          },
        ],
        { json: true, temperature: 0.1 }
      )

      const raw = parseJsonArray(response)
      for (const item of raw) {
        if (typeof item.formula !== 'string') continue
        const parsed = parseFormula(item.formula)
        if (!parsed.isValid) continue
        allFormulae.push({
          formula: parsed.normalized,
          type: 'EVF',
          confidence: Math.min(1, Math.max(0, typeof item.confidence === 'number' ? item.confidence : 0.8)),
          sourceText: typeof item.source_text === 'string' ? item.source_text : '',
        })
      }
    } catch {
      // Skip failed chunks — partial results are fine
    }
  }

  return deduplicateFormulae(allFormulae)
}

function parseJsonArray(text: string): Array<Record<string, unknown>> {
  // Strip markdown code fences if present
  const cleaned = text.replace(/```(?:json)?\n?/g, '').trim()
  try {
    const parsed = JSON.parse(cleaned)
    return Array.isArray(parsed) ? parsed : parsed.formulae ?? parsed.reactions ?? []
  } catch {
    // Try extracting first JSON array from the text
    const match = cleaned.match(/\[[\s\S]*\]/)
    if (match) {
      try { return JSON.parse(match[0]) } catch { /* ignore */ }
    }
    return []
  }
}
