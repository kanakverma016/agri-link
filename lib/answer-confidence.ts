export type ConfidenceLevel = 'high' | 'medium' | 'low'

export const HIGH_CONFIDENCE_MIN = 75
export const MEDIUM_CONFIDENCE_MIN = 50

const SERVER_TAG = /\n?[ \t]*CONFIDENCE:[ \t]*(\d{1,3})[ \t]*%?[ \t]*$/i
const STORED_TAG = /\n?\[\[confidence:(\d{1,3})\]\]\s*$/

export const confidenceLevel = (score: number): ConfidenceLevel =>
  score >= HIGH_CONFIDENCE_MIN ? 'high' : score >= MEDIUM_CONFIDENCE_MIN ? 'medium' : 'low'

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

/** Splits the model's trailing "CONFIDENCE: NN" line off the answer text. */
export function extractModelConfidence(raw: string): { answer: string; confidence: number | null } {
  const match = raw.match(SERVER_TAG)
  if (!match) return { answer: raw.trim(), confidence: null }
  return { answer: raw.replace(SERVER_TAG, '').trim(), confidence: clamp(Number(match[1])) }
}

/** The questions table has no confidence column, so the score rides along as a trailing tag on answerText. */
export function withStoredConfidence(answer: string, confidence: number | null | undefined) {
  return typeof confidence === 'number' ? `${answer}\n[[confidence:${clamp(confidence)}]]` : answer
}

export function readStoredAnswer(stored: string | undefined | null): { answer: string; confidence: number | null } {
  const text = stored ?? ''
  const match = text.match(STORED_TAG)
  if (!match) return { answer: text, confidence: null }
  return { answer: text.replace(STORED_TAG, '').trimEnd(), confidence: clamp(Number(match[1])) }
}
