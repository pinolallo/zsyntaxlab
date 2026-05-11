interface Formula {
  id: string
  formula: string
  type: 'EVF' | 'LVF' | 'THEOREM'
  molecules: string[]
  confidence: number
  paper?: { id: string; title: string }
  score?: number
}

const TYPE_STYLE: Record<string, string> = {
  EVF: 'bg-blue-900 text-blue-300 border-blue-700',
  LVF: 'bg-gray-800 text-gray-300 border-gray-600',
  THEOREM: 'bg-purple-900 text-purple-300 border-purple-700',
}

function renderFormula(formula: string) {
  return formula
    .replace(/→|->/g, '<span class="text-orange-400 font-bold"> → </span>')
    .replace(/\*/g, '<span class="text-blue-400 font-bold">*</span>')
    .replace(/&/g, '<span class="text-green-400 font-bold">&</span>')
}

export function FormulaCard({ formula }: { formula: Formula }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <code
          className="text-sm text-white font-mono flex-1 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: renderFormula(formula.formula) }}
        />
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${TYPE_STYLE[formula.type]}`}>
          {formula.type}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex flex-wrap gap-1">
          {formula.molecules.slice(0, 6).map((m) => (
            <span key={m} className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">{m}</span>
          ))}
          {formula.molecules.length > 6 && (
            <span className="text-gray-500">+{formula.molecules.length - 6} more</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-gray-500 shrink-0">
          {formula.score !== undefined && (
            <span>similarity {(formula.score * 100).toFixed(0)}%</span>
          )}
          <span>confidence {(formula.confidence * 100).toFixed(0)}%</span>
        </div>
      </div>

      {formula.paper && (
        <p className="text-xs text-gray-500 truncate">
          From: <a href={`/papers?id=${formula.paper.id}`} className="text-gray-400 hover:text-white">{formula.paper.title}</a>
        </p>
      )}
    </div>
  )
}
