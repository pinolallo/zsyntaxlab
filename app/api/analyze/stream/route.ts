import { NextRequest } from 'next/server'
import { pipelineEvents } from '../route'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const paperId = req.nextUrl.searchParams.get('paperId')
  if (!paperId) return new Response('paperId required', { status: 400 })

  let cursor = 0
  let done = false

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      while (!done) {
        const events = pipelineEvents.get(paperId) ?? []
        while (cursor < events.length) {
          const ev = events[cursor++]
          send(ev)
          if (ev.stage === 'DONE' || ev.stage === 'ERROR') {
            done = true
            break
          }
        }

        if (!done) {
          await new Promise((r) => setTimeout(r, 800))
        }
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
