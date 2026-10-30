'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Spinner } from '@/components/ui/spinner'
import { useLanguage } from '@/components/providers/language-provider'
import { ExpertRequestModal } from '@/components/info/expert-request-modal'
import { confidenceLevel, readStoredAnswer, type ConfidenceLevel } from '@/lib/answer-confidence'

const LEVEL_STYLE: Record<ConfidenceLevel, { label: string; icon: string; badge: string; bar: string }> = {
  high: { label: 'High confidence', icon: 'ph-seal-check', badge: 'bg-green-100 text-green-800', bar: 'bg-green-600' },
  medium: { label: 'Medium confidence', icon: 'ph-warning-circle', badge: 'bg-amber-100 text-amber-800', bar: 'bg-amber-500' },
  low: { label: 'Low confidence', icon: 'ph-warning', badge: 'bg-red-100 text-red-800', bar: 'bg-red-600' },
}

export type QuestionDoc = {
  id: string
  questionText: string
  questionImageURL?: string | null
  status: 'pending' | 'answered'
  answerText?: string
  audioURL?: string | null
  createdAt?: string | null
}

const STOPPED_MARKER = 'Stopped by user.'
const NO_AUDIO_MARKERS = ['माफ़ करें', 'क्षमस्व', 'Sorry, I am an agriculture assistant', STOPPED_MARKER]

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
  const { t, locale } = useLanguage()
  const date = q.createdAt ? new Date(q.createdAt).toLocaleString(locale) : t('Just now')
  const [expertOpen, setExpertOpen] = useState(false)
  const { answer: storedAnswer, confidence } = readStoredAnswer(q.answerText)
  const level = confidence === null ? null : confidenceLevel(confidence)
  const rawAnswer = storedAnswer || 'No answer provided.'
  const answer = rawAnswer === STOPPED_MARKER || rawAnswer === 'No answer provided.' ? t(rawAnswer) : rawAnswer
  const canSpeak = !NO_AUDIO_MARKERS.some((m) => rawAnswer.includes(m))
  const generating = q.audioURL === null

  return (
    <article className="w-full">
      <div className="ml-auto max-w-xs rounded-lg bg-white p-3 shadow-sm">
        <p className="font-semibold text-gray-700">{q.questionText}</p>
        {q.questionImageURL && (
          <Image
            src={q.questionImageURL}
            alt={t('Attached to question')}
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
              <span className="text-sm italic text-gray-500">{t('Thinking...')}</span>
            </div>
            <button
              type="button"
              onClick={() => onStop(q.id)}
              className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200"
            >
              {t('Stop')}
            </button>
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3">
            <div className="flex items-start">
              <p className="flex-grow whitespace-pre-wrap text-gray-800">{answer}</p>
              {canSpeak &&
                (generating || (loadingAudio && !playing) ? (
                  <div className="ml-2 flex h-8 w-8 items-center justify-center" title={t('Generating audio...')} role="status">
                    <Spinner className="h-4 w-4" />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onPlay(q)}
                    aria-label={playing ? t('Stop audio') : t('Listen to answer')}
                    className="ml-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 hover:bg-green-200"
                  >
                    <i className={`ph ${playing ? 'ph-stop' : 'ph-speaker-simple-high'}`} aria-hidden="true" />
                  </button>
                ))}
            </div>
            {confidence !== null && level && (
              <div className="mt-3 border-t border-green-200 pt-3">
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${LEVEL_STYLE[level].badge}`}>
                    <i className={`ph-fill ${LEVEL_STYLE[level].icon}`} aria-hidden="true" />
                    {t(LEVEL_STYLE[level].label)}
                  </span>
                  <span className="text-xs font-semibold text-gray-700">{confidence}%</span>
                </div>
                <div
                  role="meter"
                  aria-label={t('Answer confidence')}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={confidence}
                  className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200"
                >
                  <div className={`h-full rounded-full ${LEVEL_STYLE[level].bar}`} style={{ width: `${confidence}%` }} />
                </div>
                {level === 'low' && (
                  <div role="alert" className="mt-3 rounded-lg bg-red-50 p-2.5">
                    <p className="text-xs text-red-800">
                      {t('The AI is not sure about this answer. Please talk to an expert before acting on it.')}
                    </p>
                    <button
                      type="button"
                      onClick={() => setExpertOpen(true)}
                      className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
                    >
                      <i className="ph ph-headset" aria-hidden="true" />
                      {t('Connect to Expert')}
                    </button>
                  </div>
                )}
                {level === 'medium' && (
                  <button
                    type="button"
                    onClick={() => setExpertOpen(true)}
                    className="mt-2 flex items-center gap-1 text-xs font-semibold text-green-700 underline-offset-2 hover:underline"
                  >
                    <i className="ph ph-headset" aria-hidden="true" />
                    {t('Not sure? Connect to Expert')}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {expertOpen && (
        <ExpertRequestModal
          policyTitle={q.questionText ? q.questionText.slice(0, 80) : 'my farming question'}
          onClose={() => setExpertOpen(false)}
        />
      )}
    </article>
  )
}
