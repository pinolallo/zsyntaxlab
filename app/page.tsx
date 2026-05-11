import { prisma } from '@/lib/prisma'
import Link from 'next/link'

async function getStats() {
  try {
    const [papers, formulae, theorems] = await Promise.all([
      prisma.paper.count(),
      prisma.zsyntaxFormula.count(),
      prisma.theorem.count(),
    ])
    return { papers, formulae, theorems }
  } catch {
    return { papers: 0, formulae: 0, theorems: 0 }
  }
}

export default async function DashboardPage() {
  const stats = await getStats()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1 text-sm">Molecular biology theorem discovery via Zsyntax formal language</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Papers Analyzed', value: stats.papers, href: '/papers', color: 'blue' },
          { label: 'EVF Formulae', value: stats.formulae, href: '/theorems', color: 'green' },
          { label: 'Theorems Discovered', value: stats.theorems, href: '/theorems', color: 'purple' },
        ].map((s) => (
          <Link key={s.label} href={s.href}
            className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
            <div className={`text-3xl font-bold text-${s.color}-400`}>{s.value}</div>
            <div className="text-gray-400 text-sm mt-1">{s.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-3">Getting Started</h2>
          <ol className="space-y-2 text-sm text-gray-400 list-decimal list-inside">
            <li>Configure API keys in <Link href="/admin" className="text-blue-400 hover:text-blue-300">Admin settings</Link></li>
            <li>Search and download papers in <Link href="/papers" className="text-blue-400 hover:text-blue-300">Papers</Link></li>
            <li>Run the AI analysis pipeline in <Link href="/analyze" className="text-blue-400 hover:text-blue-300">Analyze</Link></li>
            <li>Explore discovered theorems in <Link href="/theorems" className="text-blue-400 hover:text-blue-300">Theorems</Link></li>
            <li>Visualize the reaction network in <Link href="/graph" className="text-blue-400 hover:text-blue-300">Graph</Link></li>
          </ol>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-3">Zsyntax Language</h2>
          <div className="space-y-2 text-sm font-mono">
            <div><span className="text-blue-400">A * B</span> <span className="text-gray-500">→ Z-interaction (A binds B)</span></div>
            <div><span className="text-green-400">A & B</span> <span className="text-gray-500">→ Z-conjunction (aggregate)</span></div>
            <div><span className="text-orange-400">A → B</span> <span className="text-gray-500">→ Z-conditional (reaction)</span></div>
            <div className="pt-2 text-gray-500">Example EVF:</div>
            <div className="text-gray-300">MDM2 <span className="text-green-400">&</span> TP53 <span className="text-orange-400">→</span> MDM2 <span className="text-blue-400">*</span> TP53</div>
          </div>
        </div>
      </div>
    </div>
  )
}
