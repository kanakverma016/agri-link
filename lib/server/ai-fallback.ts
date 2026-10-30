import 'server-only'
import { GeminiError, generateContent, type GeminiCandidate } from '@/lib/server/gemini'

const SARVAM_CHAT_URL = 'https://api.sarvam.ai/v1/chat/completions'
const SARVAM_TIMEOUT_MS = 25_000
const SARVAM_MAX_TOKENS = 1800

type GeminiPart = { text?: string; inlineData?: unknown }
type GeminiBody = {
  contents?: { parts?: GeminiPart[] }[]
  systemInstruction?: { parts?: GeminiPart[] }
  generationConfig?: Record<string, unknown>
  tools?: unknown[]
}

export type FallbackResult = {
  text: string
  candidate: GeminiCandidate
  provider: 'gemini' | 'sarvam'
}

const joinText = (parts: GeminiPart[] | undefined) =>
  (parts ?? [])
    .map((part) => part.text)
    .filter((text): text is string => Boolean(text))
    .join('\n')

async function askSarvam(body: GeminiBody, apiKey: string) {
  const parts = (body.contents ?? []).flatMap((content) => content.parts ?? [])
  const hasImage = parts.some((part) => part.inlineData)
  let user = joinText(parts)
  if (hasImage) {
    user +=
      '\n\n(The farmer also attached a photo that you cannot see. Answer from the text only, say clearly that the photo could not be checked, and give a LOW confidence.)'
  }
  const system = joinText(body.systemInstruction?.parts)

  const res = await fetch(SARVAM_CHAT_URL, {
    method: 'POST',
    headers: {
      'api-subscription-key': apiKey,
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.SARVAM_CHAT_MODEL || 'sarvam-105b',
      messages: [...(system ? [{ role: 'system', content: system }] : []), { role: 'user', content: user }],
      max_tokens: SARVAM_MAX_TOKENS,
      temperature: 0.4,
      reasoning_effort: null,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(SARVAM_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`sarvam_chat_${res.status}`)
  const data = (await res.json()) as { choices?: { message?: { content?: string | null } }[] }
  const text = (data.choices?.[0]?.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>/g, '').trim()
  if (!text) throw new Error('sarvam_chat_empty')
  return text
}

/**
 * Gemini first. If Gemini cannot answer (quota, overload, bad keys, network, not configured),
 * the same prompt is sent to Sarvam AI. Content-policy blocks (422) are never retried elsewhere.
 * Do not use this for Krishi Dost (/api/tree/talk), which has its own model routing.
 */
export async function generateWithSarvamFallback(body: GeminiBody, maxAttempts = 3): Promise<FallbackResult> {
  try {
    const { text, candidate } = await generateContent(body as Record<string, unknown>, maxAttempts)
    return { text, candidate, provider: 'gemini' }
  } catch (geminiError) {
    if (geminiError instanceof GeminiError && geminiError.status === 422) throw geminiError

    const apiKey = process.env.SARVAM_API_KEY
    if (!apiKey) throw geminiError

    console.error('[ai-fallback] gemini failed, using sarvam', geminiError instanceof Error ? geminiError.message : geminiError)
    try {
      const text = await askSarvam(body, apiKey)
      return { text, candidate: {}, provider: 'sarvam' }
    } catch (sarvamError) {
      console.error('[ai-fallback] sarvam failed', sarvamError instanceof Error ? sarvamError.message : sarvamError)
      throw geminiError
    }
  }
}
