import { jsonError, verifyUser } from '@/lib/server/verify-auth'
import { GeminiError, generateContent } from '@/lib/server/gemini'

export const maxDuration = 60

const clean = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, 80) : '')
const ALLOWED_DAYS = [7, 30, 90]

export async function POST(request: Request) {
  if (!(await verifyUser(request))) return jsonError('Unauthorized', 401)

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const crop = clean(body?.crop)
  const mandi = clean(body?.mandi)
  const district = clean(body?.district)
  const state = clean(body?.state)
  const days = Number(body?.days)
  if (!crop || !mandi) return jsonError('Missing crop or mandi.', 400)
  if (!district || !state) return jsonError('Location data is missing.', 400)
  if (!ALLOWED_DAYS.includes(days)) return jsonError('Unsupported time span.', 400)

  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - days)

  const userQuery = `Find the historical daily modal price per quintal for "${crop}" specifically in the "${mandi}" mandi, located in ${district}, ${state}, India, for the past ${days} days (from ${startDate.toDateString()} to ${endDate.toDateString()}). Provide the data ONLY as a valid JSON array of objects. Each object must have exactly two keys: "date" (string in "YYYY-MM-DD" format) and "modal_price" (number). Example: [{"date": "2025-10-21", "modal_price": 1350}, {"date": "2025-10-20", "modal_price": 1320}]. Do NOT include any text, conversation, markdown, or explanation before or after the JSON array. If no data is found, return an empty JSON array [].`

  try {
    const { text } = await generateContent({
      contents: [{ parts: [{ text: userQuery }] }],
      generationConfig: { responseMimeType: 'application/json' },
      systemInstruction: {
        parts: [
          {
            text: 'You are a historical agricultural market data API. Respond ONLY with a valid JSON array matching the requested schema. No other text.',
          },
        ],
      },
    })

    const jsonText = text.replace(/^```json\s*|```\s*$/g, '').trim()
    let parsed: unknown
    try {
      parsed = JSON.parse(jsonText)
    } catch {
      return jsonError('AI response format error (invalid JSON).', 502)
    }
    if (!Array.isArray(parsed)) return jsonError('AI response format error (not a JSON array).', 502)

    const data = parsed
      .filter(
        (p): p is { date: string; modal_price: number } =>
          typeof p?.date === 'string' && typeof p?.modal_price === 'number',
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    if (data.length === 0) {
      return jsonError(`No historical data found for ${crop} in ${mandi} for the last ${days} days.`, 404)
    }
    return Response.json({ data })
  } catch (err) {
    if (err instanceof GeminiError) return jsonError(err.message, err.status)
    return jsonError('Failed to fetch historical prices.', 500)
  }
}
