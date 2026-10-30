const SARVAM_CLONE_URL = 'https://api.sarvam.ai/voices/clone'
const SARVAM_TTS_URL = 'https://api.sarvam.ai/text-to-speech'
const DEFAULT_SPEAKER = 'sumit'
const DEFAULT_VOICE_ID = 'svc-b3369650-5a40-47b8-a593-44607c5e7960'
const TIMEOUT_MS = 30_000

export function detectLanguageCode(text: string, devanagariLanguage: 'hi-IN' | 'mr-IN' = 'hi-IN') {
  if (/[\u0900-\u097F]/.test(text)) return devanagariLanguage
  if (/[\u0980-\u09FF]/.test(text)) return 'bn-IN'
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gu-IN'
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn-IN'
  if (/[\u0D00-\u0D7F]/.test(text)) return 'ml-IN'
  if (/[\u0A00-\u0A7F]/.test(text)) return 'pa-IN'
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta-IN'
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te-IN'
  if (/[\u0B00-\u0B7F]/.test(text)) return 'od-IN'
  return 'en-IN'
}

/** Speaks `text` with the Sarvam "sumit" conversational speaker (bulbul:v3). Returns base64 WAV audio, or null on any failure. */
async function speakWithSumit(text: string, languageCode: string) {
  const apiKey = process.env.SARVAM_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch(SARVAM_TTS_URL, {
      method: 'POST',
      headers: { 'api-subscription-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        target_language_code: languageCode,
        speaker: process.env.SARVAM_SPEAKER || DEFAULT_SPEAKER,
        model: 'bulbul:v3',
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) {
      console.error('[sarvam-voice] sumit request failed', res.status)
      return null
    }
    const data = (await res.json()) as { audios?: string[] }
    return data.audios?.[0] || null
  } catch (error) {
    console.error('[sarvam-voice] sumit request error', error instanceof Error ? error.message : error)
    return null
  }
}

/** Voice agent: Sumit first, then the cloned "shahvez" voice. Returns base64 WAV audio, or null. */
export async function speakWithAgentVoice(text: string, languageCode: string) {
  return (await speakWithSumit(text, languageCode)) ?? (await speakWithClonedVoice(text, languageCode))
}

/** Speaks `text` in the cloned "shahvez" voice. Returns base64 WAV audio, or null on any failure. */
export async function speakWithClonedVoice(text: string, languageCode: string) {
  const apiKey = process.env.SARVAM_API_KEY
  if (!apiKey) return null

  const body = new FormData()
  body.append('voice_id', process.env.SARVAM_VOICE_ID || DEFAULT_VOICE_ID)
  body.append('text', text)
  body.append('language_code', languageCode)

  try {
    const res = await fetch(SARVAM_CLONE_URL, {
      method: 'POST',
      headers: { 'api-subscription-key': apiKey },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) {
      console.error('[sarvam-voice] clone request failed', res.status)
      return null
    }
    const data = (await res.json()) as { audio_b64?: string; audio?: string }
    return data.audio_b64 || data.audio || null
  } catch (error) {
    console.error('[sarvam-voice] clone request error', error instanceof Error ? error.message : error)
    return null
  }
}
