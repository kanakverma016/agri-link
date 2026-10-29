import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from 'ai'
import { jsonError, verifyUser } from '@/lib/server/verify-auth'

export const maxDuration = 60

const MAX_MESSAGES = 20
const MAX_TEXT_CHARS = 1500

const SYSTEM_PROMPT = `You are "Krishi Dost" (कृषि दोस्त), a friendly talking tree who lives inside the SmartKrishi farming app.
You chat with Indian farmers (kisan) like a warm, patient friend.

Language: reply in the same language the farmer writes in. Default to simple Hindi (Hinglish is fine). Short sentences, no jargon.
Style: keep replies short (2-5 sentences) unless the farmer asks for detail. Use plain text only: no markdown, no asterisks, no headings. For steps use 1., 2., 3.
Scope: farming, crops, soil, weather, pests, fertilizer, mandi prices, government schemes, and how to use the SmartKrishi app (Home, Mandi, Plots, Ask, Menu, Marketplace, News, Insurance, Gov. Schemes, Nearby).
For off-topic requests, politely say you can only help with farming and the app.
For serious crop disease, pesticide dosage or money decisions, remind the farmer to confirm with a local krishi expert or KVK.
Never invent live prices, scheme amounts or weather; say you are not sure and point to the right app section instead.`

export async function POST(request: Request) {
  if (!(await verifyUser(request))) return jsonError('Unauthorized', 401)

  const body = (await request.json().catch(() => null)) as { messages?: UIMessage[] } | null
  const incoming = Array.isArray(body?.messages) ? body.messages : null
  if (!incoming || incoming.length === 0) return jsonError('No messages provided.', 400)

  const messages = incoming.slice(-MAX_MESSAGES).map((message) => ({
    ...message,
    parts: message.parts.map((part) =>
      part.type === 'text' ? { ...part, text: part.text.slice(0, MAX_TEXT_CHARS) } : part,
    ),
  }))

  try {
    const result = streamText({
      model: 'google/gemini-3-flash',
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
      maxOutputTokens: 700,
    })

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: result.stream }),
    })
  } catch {
    return jsonError('The assistant is unavailable right now.', 500)
  }
}
