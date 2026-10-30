import { GeminiError, generateContent } from '@/lib/server/gemini'
import { jsonError, verifyUser } from '@/lib/server/verify-auth'
import { loadFarmerContext } from '@/lib/server/farmer-context'
import { speakWithAgentVoice } from '@/lib/server/sarvam-voice'

export const maxDuration = 60

const SARVAM_URL = 'https://api.sarvam.ai'
const MAX_AUDIO_BYTES = 6 * 1024 * 1024
const MAX_TEXT_CHARS = 400
const MAX_HISTORY = 6
const MAX_REPLY_CHARS = 700
const RATE_LIMIT_PER_MINUTE = 14

const TREE_LANGUAGE = 'hi-IN'

const LANGUAGES: Record<string, string> = {
  'hi-IN': 'Hindi',
  'en-IN': 'Indian English',
  'bn-IN': 'Bengali',
  'gu-IN': 'Gujarati',
  'kn-IN': 'Kannada',
  'ml-IN': 'Malayalam',
  'mr-IN': 'Marathi',
  'od-IN': 'Odia',
  'pa-IN': 'Punjabi',
  'ta-IN': 'Tamil',
  'te-IN': 'Telugu',
}

const TTS_ATTEMPTS = [
  { model: 'bulbul:v3', speaker: 'anand' },
  { model: 'bulbul:v3', speaker: undefined },
]

const hits = new Map<string, number[]>()
function rateLimited(userId: string) {
  const now = Date.now()
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < 60_000)
  recent.push(now)
  hits.set(userId, recent)
  return recent.length > RATE_LIMIT_PER_MINUTE
}

type Turn = { role: 'user' | 'assistant'; text: string }

function parseHistory(raw: FormDataEntryValue | null): Turn[] {
  if (typeof raw !== 'string') return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (t): t is Turn =>
          typeof t === 'object' &&
          t !== null &&
          ((t as Turn).role === 'user' || (t as Turn).role === 'assistant') &&
          typeof (t as Turn).text === 'string',
      )
      .slice(-MAX_HISTORY)
      .map((t) => ({ role: t.role, text: t.text.slice(0, MAX_REPLY_CHARS) }))
  } catch {
    return []
  }
}

function supportedLanguage(code: unknown): string | null {
  return typeof code === 'string' && code in LANGUAGES ? code : null
}

async function transcribeWithGemini(file: File) {
  const mimeType = (file.type || 'audio/webm').split(';')[0] || 'audio/webm'
  const data = Buffer.from(await file.arrayBuffer()).toString('base64')
  const codes = Object.keys(LANGUAGES).join(', ')

  const { text } = await generateContent(
    {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Transcribe the speech in this audio exactly as spoken, in its original language and script (Hindi in Devanagari, English in Latin). Do not translate or answer it. Respond with JSON: {"transcript": string, "language_code": string} where language_code is one of: ${codes}. If there is no clear human speech, use an empty transcript.`,
            },
            { inlineData: { mimeType, data } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 400,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingLevel: 'minimal' },
      },
    },
    2,
  )

  const parsed = JSON.parse(text) as { transcript?: string; language_code?: string }
  return { transcript: (parsed.transcript ?? '').trim(), language: parsed.language_code ?? null }
}

async function transcribeAudio(file: File, sarvamKey: string | undefined) {
  try {
    return await transcribeWithGemini(file)
  } catch (error) {
    if (error instanceof GeminiError && error.status === 404) return { transcript: '', language: null }
    console.error('[tree/talk] gemini stt failed', error instanceof Error ? error.message : error)
    if (!sarvamKey) throw error
    return transcribe(file, sarvamKey)
  }
}

async function transcribe(file: File, apiKey: string) {
  const body = new FormData()
  body.append('file', file, file.name || 'speech.webm')
  body.append('model', 'saaras:v3')
  body.append('mode', 'transcribe')
  body.append('language_code', 'unknown')

  const res = await fetch(`${SARVAM_URL}/speech-to-text`, {
    method: 'POST',
    headers: { 'api-subscription-key': apiKey },
    body,
  })
  if (!res.ok) throw new Error(`stt_${res.status}`)
  const data = (await res.json()) as { transcript?: string; language_code?: string | null }
  return { transcript: (data.transcript ?? '').trim(), language: data.language_code ?? null }
}

async function speak(text: string, language: string, apiKey: string) {
  for (const attempt of TTS_ATTEMPTS) {
    const res = await fetch(`${SARVAM_URL}/text-to-speech`, {
      method: 'POST',
      headers: { 'api-subscription-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        target_language_code: language,
        language_code: language,
        model: attempt.model,
        ...(attempt.speaker ? { speaker: attempt.speaker } : {}),
        pace: 1,
        speech_sample_rate: 24000,
        output_audio_codec: 'mp3',
      }),
    })
    if (!res.ok) continue
    const data = (await res.json()) as { audios?: string[] }
    if (data.audios?.[0]) return data.audios[0]
  }
  return null
}

type ChatMessage = { role: 'user' | 'assistant'; content: string }

function toGeminiContents(messages: ChatMessage[]) {
  const merged: { role: 'user' | 'model'; parts: { text: string }[] }[] = []
  for (const message of messages) {
    const role = message.role === 'assistant' ? 'model' : 'user'
    const last = merged[merged.length - 1]
    if (last && last.role === role) last.parts[0].text += `\n${message.content}`
    else merged.push({ role, parts: [{ text: message.content }] })
  }
  while (merged.length > 0 && merged[0].role !== 'user') merged.shift()
  return merged
}

async function askGemini(system: string, messages: ChatMessage[]) {
  const { text } = await generateContent(
    {
      systemInstruction: { parts: [{ text: system }] },
      contents: toGeminiContents(messages),
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 400,
        thinkingConfig: { thinkingLevel: 'minimal' },
      },
    },
    3,
  )
  return text
}

async function askSarvam(system: string, messages: ChatMessage[], apiKey: string) {
  const res = await fetch(`${SARVAM_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'api-subscription-key': apiKey,
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.SARVAM_CHAT_MODEL || 'sarvam-105b',
      messages: [{ role: 'system', content: system }, ...messages],
      max_tokens: 300,
      temperature: 0.6,
      reasoning_effort: null,
    }),
    signal: AbortSignal.timeout(12_000),
  })
  if (!res.ok) throw new Error(`sarvam_chat_${res.status}`)
  const data = (await res.json()) as { choices?: { message?: { content?: string | null } }[] }
  const text = (data.choices?.[0]?.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>/g, '').trim()
  if (!text) throw new Error('sarvam_chat_empty')
  return text
}

async function askVoiceModel(system: string, messages: ChatMessage[], apiKey: string | undefined) {
  if (apiKey && process.env.VOICE_LLM !== 'gemini') {
    try {
      return await askSarvam(system, messages, apiKey)
    } catch (error) {
      console.error('[tree/talk] sarvam chat failed, using gemini', error instanceof Error ? error.message : error)
    }
  }
  return askGemini(system, messages)
}

function cleanForSpeech(text: string) {
  return text
    .replace(/[*_#`>~|]/g, '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_REPLY_CHARS)
}

function buildSystemPrompt(context: string, language: string) {
  return `You are "Krishi Dost" (कृषि दोस्त), a warm, wise talking tree who lives inside the SmartKrishi farming app and speaks aloud to Indian farmers like a trusted village friend.

You can see the farmer's real data below: their plots, crops, sowing dates, logged activities and expenses. Use it every time it is relevant: call the farmer by name, mention their actual crop, plot, crop age in days, and what they did recently or have not done yet. Never invent data that is not listed. If something is missing, say so kindly and tell them where to add it in the app (Plots).

FARMER DATA
${context}

How to speak:
- Reply ONLY in ${LANGUAGES[language]} (language code ${language}), written in Devanagari script, even if the farmer speaks or types in another language such as English or Marathi. Use simple everyday words a farmer uses, not textbook terms.
- Your words are converted to speech, so write exactly what should be heard: 1 to 3 short sentences, plain text only, no markdown, no lists, no emojis, no symbols. Write amounts and units in words where natural.
- Be practical and specific: connect advice to the crop stage (for example irrigation, weeding, fertilizer timing, pest watch for that many days after sowing) and to the expenses and activities already logged.
- For serious disease, pesticide dosage or money decisions, add a short reminder to confirm with the local KVK or krishi expert.
- Never make up live mandi prices, weather or scheme amounts. Say you are not sure and point to the Mandi, weather or Gov. Schemes section of the app.
- If asked something unrelated to farming or the app, gently bring the talk back to the farm.`
}

export async function POST(request: Request) {
  const userId = await verifyUser(request)
  if (!userId) return jsonError('Unauthorized', 401)

  const apiKey = process.env.SARVAM_API_KEY
  if (rateLimited(userId)) return jsonError('Too many requests. Please wait a moment.', 429)

  const form = await request.formData().catch(() => null)
  if (!form) return jsonError('Invalid request.', 400)

  const greet = form.get('mode') === 'greet'
  const preferred = TREE_LANGUAGE
  const history = parseHistory(form.get('history'))
  const audio = form.get('audio')
  const typed = form.get('text')

  const contextPromise = loadFarmerContext(userId)
  contextPromise.catch(() => {})

  let transcript = ''
  const language = preferred

  try {
    if (!greet) {
      if (audio instanceof File) {
        if (audio.size > MAX_AUDIO_BYTES) return jsonError('Recording is too long.', 413)
        const stt = await transcribeAudio(audio, apiKey)
        transcript = stt.transcript
      } else if (typeof typed === 'string') {
        transcript = typed.trim().slice(0, MAX_TEXT_CHARS)
      }
      if (!transcript) return Response.json({ code: 'no_speech', error: 'Could not hear anything.' }, { status: 422 })
    }

    const { text: context, summary } = await contextPromise

    const userMessage = greet
      ? 'The farmer has just opened the app and woken you up. Greet them warmly by name, then in one short sentence mention something useful from their data right now (crop age, a recent action or expense, or a gentle nudge for what to do next). If they have no plots, welcome them and suggest adding their first plot.'
      : transcript

    const system = buildSystemPrompt(context, language)
    const messages: ChatMessage[] = [
      ...history.map((turn) => ({ role: turn.role, content: turn.text })),
      { role: 'user', content: userMessage },
    ]

    const text = await askVoiceModel(system, messages, apiKey)

    const reply = cleanForSpeech(text)
    if (!reply) return jsonError('The tree could not think of a reply.', 502)

    let audioBase64 = await speakWithAgentVoice(reply, language)
    let audioType = 'audio/wav'
    if (!audioBase64 && apiKey) {
      audioBase64 = await speak(reply, language, apiKey).catch(() => null)
      audioType = 'audio/mpeg'
    }

    return Response.json({
      transcript,
      reply,
      language,
      audio: audioBase64,
      audioType,
      summary,
    })
  } catch (error) {
    console.error('[tree/talk] failed', error instanceof Error ? error.message : error)
    if (error instanceof GeminiError && error.status === 503) {
      return jsonError('The tree brain (Gemini) is not configured yet.', 503)
    }
    if (error instanceof GeminiError && error.status === 429) {
      return jsonError('The tree is a bit busy. Please try again in a moment.', 429)
    }
    return jsonError('Krishi Dost could not answer right now. Please try again.', 502)
  }
}
