import { jsonError, verifyUser } from '@/lib/server/verify-auth'
import { GeminiError, generateContent } from '@/lib/server/gemini'
import { generateWithSarvamFallback } from '@/lib/server/ai-fallback'

export const maxDuration = 60

const clean = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, 80) : '')

export async function POST(request: Request) {
  if (!(await verifyUser(request))) return jsonError('Unauthorized', 401)

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const crop = clean(body?.crop)
  const district = clean(body?.district)
  const state = clean(body?.state)
  if (!crop) return jsonError('Crop is required.', 400)
  if (!district || !state) return jsonError('Please select a location first.', 400)

  const userQuery = `First, check relevance of "${crop}" for mandis in ${district}, ${state}, India. If relevant, find latest Mandi prices per quintal for "${crop}" from MULTIPLE DIFFERENT MANDIS within ${district}, ${state}, India using Google Search. Crucially, INCLUDE THE SPECIFIC VARIETY NAME (including common local names like 'Desi', 'Red', 'Hybrid' etc. if available) for each entry. Present results ONLY as a simple list. Each item MUST follow this EXACT format: Market Name: Variety Name - Min ₹PRICE - Max ₹PRICE - Modal ₹PRICE - DATE (DD/MM/YYYY). List multiple markets and varieties separately. NO extra text, intros, summaries, bolding. If not relevant or no specific price data, respond ONLY with: Price data not found for ${crop} in ${district}, ${state}.`

  const systemInstruction = {
    parts: [
      {
        text: "You are an agricultural market data API... provide ONLY Mandi price data from Google Search covering MULTIPLE MANDIS and SPECIFIC VARIETIES (including local names). Use format: Market: Variety - Min ₹PRICE - Max ₹PRICE - Modal ₹PRICE - DATE (DD/MM/YYYY). If no data, provide ONLY the 'not found' message.",
      },
    ],
  }

  try {
    try {
      const { text, candidate } = await generateContent({
        contents: [{ parts: [{ text: userQuery }] }],
        tools: [{ google_search: {} }],
        systemInstruction,
      })

      const meta = candidate.groundingMetadata
      const raw = meta?.groundingAttributions ?? meta?.groundingChunks ?? []
      const sources = raw
        .map((a) => ({ uri: a.web?.uri, title: a.web?.title }))
        .filter((s): s is { uri: string; title: string } => Boolean(s.uri && s.title))
        .slice(0, 5)

      return Response.json({ text, sources, approximate: false })
    } catch (err) {
      // Search grounding is quota-limited on free-tier keys (429), so fall back to an ungrounded estimate.
      if (!(err instanceof GeminiError) || err.status === 422) throw err
    }

    const today = new Date().toLocaleDateString('en-GB')
    const { text } = await generateWithSarvamFallback({
      contents: [
        {
          parts: [
            {
              text: `${userQuery}\n\nLive search is unavailable. Give your best typical recent wholesale mandi price estimates for these markets and use today's date ${today} in the DATE field.`,
            },
          ],
        },
      ],
      systemInstruction,
    })
    return Response.json({ text, sources: [], approximate: true })
  } catch (err) {
    if (err instanceof GeminiError) return jsonError(err.message, err.status)
    return jsonError('Failed to fetch mandi prices.', 500)
  }
}
