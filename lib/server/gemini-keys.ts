import 'server-only'

/** Primary key first, then any comma-separated keys from GEMINI_API_KEY_FALLBACKS. */
export function getGeminiKeys(): string[] {
  const keys = [
    process.env.GEMINI_API_KEY,
    ...(process.env.GEMINI_API_KEY_FALLBACKS ?? '').split(','),
  ]
    .map((key) => key?.trim())
    .filter((key): key is string => Boolean(key))
  return Array.from(new Set(keys))
}

/** True when a different key might succeed (quota exhausted, revoked, or invalid key). */
export function shouldRotateKey(status: number, message?: string) {
  if (status === 429 || status === 401 || status === 403) return true
  return status === 400 && /api key|api_key/i.test(message ?? '')
}
