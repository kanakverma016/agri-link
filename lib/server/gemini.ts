import 'server-only'
import { getGeminiKeys, shouldRotateKey } from '@/lib/server/gemini-keys'

const MODEL = process.env.GEMINI_MODEL ?? 'gemini-flash-latest'

export type GeminiCandidate = {
  content?: { parts?: { text?: string; thought?: boolean }[] }
  finishReason?: string
  groundingMetadata?: {
    groundingChunks?: { web?: { uri?: string; title?: string } }[]
    groundingAttributions?: { web?: { uri?: string; title?: string } }[]
  }
}

type GeminiResult = {
  candidates?: GeminiCandidate[]
  promptFeedback?: { blockReason?: string }
}

export class GeminiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

/** Tried in order when the preferred model is overloaded (503/429) or unavailable (404). */
const MODEL_CHAIN = Array.from(
  new Set([MODEL, 'gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite']),
)

const REQUEST_TIMEOUT_MS = 12_000

/**
 * Calls Gemini generateContent. Walks every key for a model before moving to the next model,
 * so one overloaded model or exhausted key never surfaces as a user-facing failure.
 */
export async function generateContent(body: Record<string, unknown>, maxAttempts = 3) {
  const keys = getGeminiKeys()
  if (keys.length === 0) throw new GeminiError('Mandi data service is not configured (GEMINI_API_KEY).', 503)

  const deadKeys = new Set<string>()
  let lastError = new GeminiError('API call failed after multiple attempts.', 502)

  for (const model of MODEL_CHAIN) {
    for (let pass = 0; pass < maxAttempts; pass++) {
      const liveKeys = keys.filter((key) => !deadKeys.has(key))
      if (liveKeys.length === 0) throw lastError
      let modelUnavailable = false

      for (const key of liveKeys) {
        const outcome = await callModel(model, key, body)
        if (outcome.ok) return outcome.value
        lastError = outcome.error
        if (outcome.error.status === 422) throw outcome.error
        if (outcome.kind === 'dead-key') deadKeys.add(key)
        if (outcome.kind === 'missing-model') {
          modelUnavailable = true
          break
        }
      }

      if (modelUnavailable) break
      // Every live key was busy: short pause, then retry the same model once more before downgrading.
      if (pass < maxAttempts - 1) await new Promise((r) => setTimeout(r, 600 * (pass + 1)))
      else break
    }
  }
  throw lastError
}

type CallOutcome =
  | { ok: true; value: { text: string; candidate: GeminiCandidate } }
  | { ok: false; kind: 'dead-key' | 'busy' | 'missing-model'; error: GeminiError }

async function callModel(model: string, key: string, body: Record<string, unknown>): Promise<CallOutcome> {
  {
    let res: Response
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body),
        cache: 'no-store',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
    } catch {
      return { ok: false, kind: 'busy', error: new GeminiError('Network error contacting the data service.', 502) }
    }

    if (res.ok) {
      const result = (await res.json()) as GeminiResult
      const candidate = result.candidates?.[0]
      const text = candidate?.content?.parts
        ?.filter((part) => part.text && !part.thought)
        .map((part) => part.text)
        .join('')
      if (!text) {
        const reason = result.promptFeedback?.blockReason
        if (reason) throw new GeminiError(`Request blocked: ${reason}`, 422)
        if (candidate?.finishReason === 'SAFETY') throw new GeminiError('Blocked due to safety filters.', 422)
        throw new GeminiError('No information found.', 404)
      }
      return { ok: true, value: { text, candidate: candidate as GeminiCandidate } }
    }

    const err = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
    const message = err?.error?.message
    const error = new GeminiError(message ?? `API Error (${res.status})`, res.status === 429 ? 429 : 502)

    if (res.status === 404) return { ok: false, kind: 'missing-model', error }
    if (res.status !== 429 && shouldRotateKey(res.status, message)) return { ok: false, kind: 'dead-key', error }
    return { ok: false, kind: 'busy', error }
  }
}
