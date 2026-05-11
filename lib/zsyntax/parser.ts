export interface ParsedFormula {
  raw: string
  normalized: string
  lhs: string
  rhs: string
  molecules: string[]
  isValid: boolean
  errors: string[]
}

const MOLECULE_RE = /[A-Za-z][A-Za-z0-9_\-\+\.#]*/g
// Accept both unicode → and ASCII ->
const ARROW_RE = /→|->|=>/

export function parseFormula(input: string): ParsedFormula {
  const raw = input.trim()
  const errors: string[] = []

  const arrowMatch = raw.match(ARROW_RE)
  if (!arrowMatch) {
    return { raw, normalized: raw, lhs: '', rhs: '', molecules: [], isValid: false, errors: ['Missing → operator'] }
  }

  const arrowIdx = raw.indexOf(arrowMatch[0])
  const lhs = raw.slice(0, arrowIdx).trim()
  const rhs = raw.slice(arrowIdx + arrowMatch[0].length).trim()

  if (!lhs) errors.push('Empty left-hand side')
  if (!rhs) errors.push('Empty right-hand side')

  const molecules = extractMolecules(raw)

  const normalized = normalizeFomula(lhs, rhs)

  return { raw, normalized, lhs, rhs, molecules, isValid: errors.length === 0, errors }
}

export function extractMolecules(formula: string): string[] {
  const side = formula.replace(ARROW_RE, ' ')
  const matches = side.match(MOLECULE_RE) ?? []
  // Deduplicate, filter out single-char noise
  return Array.from(new Set(matches.filter((m) => m.length > 1)))
}

export function normalizeFomula(lhs: string, rhs: string): string {
  // Normalize whitespace around operators
  const normSide = (s: string) =>
    s
      .replace(/\s*\*\s*/g, '*')
      .replace(/\s*&\s*/g, '&')
      .replace(/\s+/g, ' ')
      .trim()

  // Sort & operands (Z-conjunction is commutative) but NOT * operands (Z-interaction is directional)
  const sortConjunction = (s: string): string => {
    // Only sort top-level & splits (not inside * groups)
    if (!s.includes('&')) return s
    const parts = splitTopLevel(s, '&')
    return parts.map(sortConjunction).sort().join('&')
  }

  return `${sortConjunction(normSide(lhs))}→${sortConjunction(normSide(rhs))}`
}

function splitTopLevel(s: string, op: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const ch of s) {
    if (ch === '(') depth++
    else if (ch === ')') depth--
    else if (ch === op && depth === 0) {
      parts.push(current)
      current = ''
      continue
    }
    current += ch
  }
  parts.push(current)
  return parts
}

export function deduplicateFormulae<T extends { formula: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const { normalized } = parseFormula(item.formula)
    if (seen.has(normalized)) return false
    seen.add(normalized)
    return true
  })
}
