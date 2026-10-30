'use client'

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

const SECONDS_PER_WORD = 0.34
const EQ_DELAYS = [0, 160, 320, 80, 240]

type ReplyBubbleProps = {
  text: string
  speaking: boolean
  audioRef: RefObject<HTMLAudioElement | null>
}

/**
 * Shows the reply word by word, following the audio playback position so the
 * text appears as Krishi Dost says it. All words stay in the DOM so the card
 * never changes height while it fills in.
 */
export function ReplyBubble({ text, speaking, audioRef }: ReplyBubbleProps) {
  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text])
  const [count, setCount] = useState(() => (speaking ? 1 : words.length))
  const currentWordRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!speaking) {
      setCount(words.length)
      return
    }
    const startedAt = performance.now()
    let frame = 0
    const tick = () => {
      const audio = audioRef.current
      const hasAudioClock = audio && !audio.paused && Number.isFinite(audio.duration) && audio.duration > 0
      const fraction = hasAudioClock
        ? audio.currentTime / audio.duration
        : (performance.now() - startedAt) / 1000 / (words.length * SECONDS_PER_WORD)
      setCount(Math.min(words.length, Math.max(1, Math.ceil(fraction * words.length) + 1)))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [speaking, words.length, audioRef])

  useEffect(() => {
    if (speaking) currentWordRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [count, speaking])

  return (
    <div className="animate-fade-up self-start overflow-hidden rounded-3xl rounded-bl-md bg-gradient-to-br from-white/15 to-white/5 shadow-lg shadow-black/20 ring-1 ring-white/15 backdrop-blur-md">
      <div className="flex items-center gap-2 border-b border-white/10 px-3.5 py-2">
        <span className="relative h-6 w-6 flex-shrink-0 overflow-hidden rounded-full bg-emerald-200 ring-2 ring-emerald-300/60">
          <Image src="/images/krishi-tree.png" alt="" width={48} height={48} className="h-full w-full scale-125 object-cover" />
        </span>
        <span className="text-xs font-extrabold tracking-wide text-emerald-200">कृषि दोस्त</span>
        {speaking && (
          <span aria-hidden="true" className="ml-auto flex h-4 items-center gap-[3px]">
            {EQ_DELAYS.map((delay, i) => (
              <span
                key={i}
                style={{ animationDelay: `${delay}ms` }}
                className="h-full w-[3px] origin-center animate-eq rounded-full bg-emerald-300 motion-reduce:animate-none"
              />
            ))}
          </span>
        )}
      </div>
      <p className="px-4 py-3 text-base leading-relaxed">
        {words.map((word, i) => (
          <span key={i}>
            <span
              ref={i === count - 1 ? currentWordRef : undefined}
              className={cn(
                'inline-block transition-colors duration-500',
                i < count ? 'animate-word-in' : 'opacity-0',
                speaking && i === count - 1 ? 'font-bold text-emerald-200' : 'text-white',
              )}
            >
              {word}
            </span>{' '}
          </span>
        ))}
      </p>
    </div>
  )
}
