import { getGeminiKeys, shouldRotateKey } from '@/lib/server/gemini-keys'
import { jsonError, verifyUser } from '@/lib/server/verify-auth'
import { detectLanguageCode, speakWithClonedVoice } from '@/lib/server/sarvam-voice'

const MAX_CHARS = 1000

function pcmToWav(pcm: Buffer, sampleRate: number) {
  const channels = 1
  const bytesPerSample = 2
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + pcm.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(channels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * channels * bytesPerSample, 28)
  header.writeUInt16LE(channels * bytesPerSample, 32)
  header.writeUInt16LE(bytesPerSample * 8, 34)
  header.write('data', 36)
  header.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([header, pcm])
}

export async function POST(request: Request) {
  if (!(await verifyUser(request))) return jsonError('Unauthorized', 401)

  const body = (await request.json().catch(() => null)) as { text?: unknown } | null
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  if (!text) return jsonError('Text is required.', 400)
  if (text.length > MAX_CHARS) return jsonError(`Text must be ${MAX_CHARS} characters or fewer.`, 400)

  const clonedAudio = await speakWithClonedVoice(text, detectLanguageCode(text))
  if (clonedAudio) {
    return new Response(new Uint8Array(Buffer.from(clonedAudio, 'base64')), {
      headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'private, max-age=3600' },
    })
  }

  const keys = getGeminiKeys()
  if (keys.length === 0) return jsonError('Text-to-speech is not configured.', 503)

  const payload = JSON.stringify({
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
    },
    model: 'gemini-2.5-flash-preview-tts',
  })

  let upstream!: Response
  let err: { error?: { message?: string } } | null = null
  for (const apiKey of keys) {
    upstream = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: payload,
      },
    )
    if (upstream.ok) break
    err = (await upstream.json().catch(() => null)) as { error?: { message?: string } } | null
    if (!shouldRotateKey(upstream.status, err?.error?.message)) break
  }

  if (!upstream.ok) {
    if (upstream.status === 429) return jsonError('API rate limit exceeded. Please try again later.', 429)
    return jsonError(err?.error?.message ?? 'Text-to-speech request failed.', 502)
  }

  const result = (await upstream.json()) as {
    candidates?: { content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] } }[]
  }
  const inline = result.candidates?.[0]?.content?.parts?.[0]?.inlineData
  const rate = inline?.mimeType?.match(/rate=(\d+)/)?.[1]
  if (!inline?.data || !inline.mimeType?.startsWith('audio/') || !rate) {
    return jsonError('Invalid audio data received from API.', 502)
  }

  const wav = pcmToWav(Buffer.from(inline.data, 'base64'), parseInt(rate, 10))
  return new Response(new Uint8Array(wav), {
    headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'private, max-age=3600' },
  })
}
