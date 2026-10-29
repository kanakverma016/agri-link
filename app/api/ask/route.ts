import { jsonError, verifyUser } from '@/lib/server/verify-auth'
import { GeminiError, generateContent } from '@/lib/server/gemini'

export const maxDuration = 60

const MAX_QUESTION_CHARS = 2000
const MAX_IMAGE_BASE64_CHARS = 7_000_000 // ~5 MB of image data
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

const buildPrompt = (question: string) => `
You are 'SmartKrishi,' an expert agricultural advisor (कृषि विशेषज्ञ).
Your response MUST be in simple Hindi (Hinglish is also okay). Use language a kisan (farmer) can easily understand.
FIRST, check if the user's question (and image, if provided) is related to farming (खेती-बाड़ी, फसल, मिट्टी, कीड़े, बीमारी, खाद).
IF IT IS NOT a farming question, you MUST respond ONLY with this exact Hindi text:
"माफ़ करें, मैं एक कृषि सहायक हूँ। मैं केवल खेती, फसल, और मिट्टी से जुड़े सवालों का जवाब दे सकता हूँ।"
IF IT IS a farming question, you MUST provide your answer using this EXACT format.
DO NOT use markdown like '**' or '*'.
Use plain text headings. Put an empty line (a gap) after each heading.
For lists, use numbers like 1., 2., 3.

समस्या (Problem):
(Explain the problem in simple Hindi.)

समाधान (Solution):
(Provide numbered steps. e.g., "1. [Step 1 in Hindi]")
(e.g., "2. [Step 2 in Hindi]")

बचाव (Prevention):
(Provide 2-3 numbered steps for prevention in Hindi.)

सलाह (Disclaimer):
यह सलाह AI द्वारा दी गई है। किसी भी बड़े फैसले के लिए, कृपया स्थानीय कृषि विशेषज्ञ से सलाह लें।
---
Here is the farmer's question:
"${question}"
`

export async function POST(request: Request) {
  if (!(await verifyUser(request))) return jsonError('Unauthorized', 401)

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const questionText = typeof body?.question === 'string' ? body.question.trim() : ''
  const imageBase64 = typeof body?.imageBase64 === 'string' ? body.imageBase64 : ''
  const imageMimeType = typeof body?.imageMimeType === 'string' ? body.imageMimeType : ''

  if (!questionText && !imageBase64) return jsonError('Please type a question or upload an image.', 400)
  if (questionText.length > MAX_QUESTION_CHARS) {
    return jsonError(`Question must be ${MAX_QUESTION_CHARS} characters or fewer.`, 400)
  }
  if (imageBase64) {
    if (imageBase64.length > MAX_IMAGE_BASE64_CHARS) return jsonError('Image is too large (max 5 MB).', 413)
    if (!IMAGE_TYPES.includes(imageMimeType)) return jsonError('Unsupported image type.', 400)
  }

  const parts: Record<string, unknown>[] = [
    { text: buildPrompt(questionText || 'Please identify the problem in this image.') },
  ]
  if (imageBase64) parts.push({ inlineData: { mimeType: imageMimeType, data: imageBase64 } })

  try {
    const { text } = await generateContent({ contents: [{ parts }] }, 1)
    return Response.json({ answer: text })
  } catch (err) {
    if (err instanceof GeminiError) return jsonError(err.message, err.status)
    return jsonError('Failed to get an answer.', 500)
  }
}
