'use client'

import { useEffect, useState } from 'react'

const FIELDS = [
  { section: 'AI', key: 'openrouter_api_key', label: 'OpenRouter API Key', type: 'password', placeholder: 'sk-or-...' },
  { section: 'AI', key: 'openrouter_model', label: 'OpenRouter Model', type: 'text', placeholder: 'anthropic/claude-3.5-sonnet' },
  { section: 'Embeddings', key: 'embedding_provider', label: 'Embedding Provider', type: 'select', options: ['openai', 'voyage', 'ollama'] },
  { section: 'Embeddings', key: 'openai_api_key', label: 'OpenAI API Key (embeddings)', type: 'password', placeholder: 'sk-...' },
  { section: 'Embeddings', key: 'voyage_api_key', label: 'Voyage API Key', type: 'password', placeholder: '' },
  { section: 'Embeddings', key: 'ollama_url', label: 'Ollama URL', type: 'text', placeholder: 'http://localhost:11434' },
  { section: 'Search', key: 'brave_key', label: 'Brave Search API Key', type: 'password', placeholder: '' },
  { section: 'Papers', key: 'pdf_storage_path', label: 'PDF Storage Path', type: 'text', placeholder: './papers' },
  { section: 'Auth', key: 'admin_group', label: 'Admin Group Name', type: 'text', placeholder: 'zsyntax_admin' },
  { section: 'Auth', key: 'user_group', label: 'User Group Name', type: 'text', placeholder: 'zsyntax_user' },
]

const SECTIONS = Array.from(new Set(FIELDS.map((f) => f.section)))

export default function AdminPage() {
  const [values, setValues] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then(setValues)
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Configure API keys and application settings.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {SECTIONS.map((section) => (
          <div key={section} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <h2 className="text-white font-semibold text-sm uppercase tracking-wider">{section}</h2>
            {FIELDS.filter((f) => f.section === section).map((field) => (
              <div key={field.key}>
                <label className="block text-sm text-gray-400 mb-1">{field.label}</label>
                {field.type === 'select' ? (
                  <select
                    value={values[field.key] ?? ''}
                    onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {field.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    value={values[field.key] ?? ''}
                    onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600"
                  />
                )}
              </div>
            ))}
          </div>
        ))}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit" disabled={saving}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors"
          >
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
          {saved && <span className="text-green-400 text-sm">Saved.</span>}
        </div>
      </form>
    </div>
  )
}
