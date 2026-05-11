import OpenAI from 'openai'
import { getSetting, SETTING_KEYS } from './settings'

export async function getOpenRouterClient(): Promise<OpenAI> {
  const apiKey = await getSetting(SETTING_KEYS.OPENROUTER_API_KEY)
  if (!apiKey) throw new Error('OpenRouter API key not configured')
  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    defaultHeaders: {
      'HTTP-Referer': 'https://zsyntaxlab.local',
      'X-Title': 'ZsyntaxLab',
    },
  })
}

export async function getModel(): Promise<string> {
  return getSetting(SETTING_KEYS.OPENROUTER_MODEL, 'anthropic/claude-3.5-sonnet')
}

export async function chatComplete(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  opts: { json?: boolean; temperature?: number } = {}
): Promise<string> {
  const client = await getOpenRouterClient()
  const model = await getModel()

  const res = await client.chat.completions.create({
    model,
    messages,
    temperature: opts.temperature ?? 0.2,
    response_format: opts.json ? { type: 'json_object' } : undefined,
  })

  return res.choices[0]?.message?.content ?? ''
}

export async function getEmbedding(text: string): Promise<number[]> {
  const provider = await getSetting(SETTING_KEYS.EMBEDDING_PROVIDER, 'openai')

  if (provider === 'openai') {
    const apiKey = await getSetting(SETTING_KEYS.OPENAI_API_KEY)
    if (!apiKey) throw new Error('OpenAI API key not configured for embeddings')
    const client = new OpenAI({ apiKey })
    const res = await client.embeddings.create({ model: 'text-embedding-3-small', input: text })
    return res.data[0].embedding
  }

  if (provider === 'voyage') {
    const apiKey = await getSetting(SETTING_KEYS.VOYAGE_API_KEY)
    if (!apiKey) throw new Error('Voyage API key not configured')
    const res = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'voyage-3', input: [text] }),
    })
    const data = await res.json()
    return data.data[0].embedding
  }

  if (provider === 'ollama') {
    const ollamaUrl = await getSetting(SETTING_KEYS.OLLAMA_URL, 'http://localhost:11434')
    const res = await fetch(`${ollamaUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'nomic-embed-text', prompt: text }),
    })
    const data = await res.json()
    return data.embedding
  }

  throw new Error(`Unknown embedding provider: ${provider}`)
}
