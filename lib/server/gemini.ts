import 'server-only'

const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'

export type GeminiCandidate = {
  content?: { parts?: { text?: string }[] }
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

/** Calls Gemini generateContent, retrying on 429/5xx with exponential backoff. */
export async function generateContent(body: Record<string, unknown>, maxAttempts = 4) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new GeminiError('Mandi data service is not configured (GEMINI_API_KEY).', 503)

  let delay = 1000
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let res: Response
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
        cache: 'no-store',
      })
    } catch {
      if (attempt === maxAttempts) throw new GeminiError('Network error contacting the data service.', 502)
      await new Promise((r) => setTimeout(r, delay))
      delay *= 2
      continue
    }

    if (res.ok) {
      const result = (await res.json()) as GeminiResult
      const candidate = result.candidates?.[0]
      const text = candidate?.content?.parts?.[0]?.text
      if (!text) {
        const reason = result.promptFeedback?.blockReason
        if (reason) throw new GeminiError(`Request blocked: ${reason}`, 422)
        if (candidate?.finishReason === 'SAFETY') throw new GeminiError('Blocked due to safety filters.', 422)
        throw new GeminiError('No information found.', 404)
      }
      return { text, candidate: candidate as GeminiCandidate }
    }

    if ((res.status === 429 || res.status >= 500) && attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, delay))
      delay *= 2
      continue
    }
    const err = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
    throw new GeminiError(
      err?.error?.message ?? `API Error (${res.status})`,
      res.status === 429 ? 429 : 502,
    )
  }
  throw new GeminiError('API call failed after multiple attempts.', 502)
}
