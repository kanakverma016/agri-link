'use client'

import Image from 'next/image'
import type { Timestamp } from 'firebase/firestore'
import { Spinner } from '@/components/ui/spinner'

export type QuestionDoc = {
  id: string
  questionText: string
  questionImageURL?: string | null
  status: 'pending' | 'answered'
  answerText?: string
  audioURL?: string | null
  createdAt?: Timestamp | null
}

const NO_AUDIO_MARKERS = ['माफ़ करें', 'Stopped by user.']

export function QACard({
  q,
  playing,
  loadingAudio,
  onStop,
  onPlay,
}: {
  q: QuestionDoc
  playing: boolean
  loadingAudio: boolean
  onStop: (id: string) => void
  onPlay: (q: QuestionDoc) => void
}) {
  const date = q.createdAt ? q.createdAt.toDate().toLocaleString() : 'Just now'
  const answer = q.answerText || 'No answer provided.'
  const canSpeak = !NO_AUDIO_MARKERS.some((m) => answer.includes(m))
  const generating = q.audioURL === null

  return (
    <article className="w-full">
      <div className="ml-auto max-w-xs rounded-lg bg-white p-3 shadow-sm">
        <p className="font-semibold text-gray-700">{q.questionText}</p>
        {q.questionImageURL && (
          <Image
            src={q.questionImageURL}
            alt="Attached to question"
            width={320}
            height={192}
            unoptimized
            className="mt-2 max-h-48 w-auto rounded-lg"
          />
        )}
        <p className="mt-2 text-right text-xs text-gray-400">{date}</p>
      </div>
      <div className="mt-2 max-w-xs">
        {q.status === 'pending' ? (
          <div className="mt-3 flex items-center justify-between rounded-lg bg-gray-100 p-3">
            <div className="flex items-center space-x-2">
              <Spinner className="h-5 w-5" />
              <span className="text-sm italic text-gray-500">Thinking...</span>
            </div>
            <button
              type="button"
              onClick={() => onStop(q.id)}
              className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200"
            >
              Stop
            </button>
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3">
            <div className="flex items-start">
              <p className="flex-grow whitespace-pre-wrap text-gray-800">{answer}</p>
              {canSpeak &&
                (generating || (loadingAudio && !playing) ? (
                  <div className="ml-2 flex h-8 w-8 items-center justify-center" title="Generating audio..." role="status">
                    <Spinner className="h-4 w-4" />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onPlay(q)}
                    aria-label={playing ? 'Stop audio' : 'Listen to answer'}
                    className="ml-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 hover:bg-green-200"
                  >
                    <i className={`ph ${playing ? 'ph-stop' : 'ph-speaker-simple-high'}`} aria-hidden="true" />
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </article>
  )
}
