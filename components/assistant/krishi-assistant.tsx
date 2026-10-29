'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { apiFetch } from '@/lib/api-client'
import { cn } from '@/lib/utils'

const TreeScene = dynamic(() => import('@/components/assistant/tree-scene').then((m) => m.TreeScene), {
  ssr: false,
})

const MODEL_URL = '/models/krishi-tree.glb'
const GREETING =
  'नमस्ते! मैं कृषि दोस्त हूँ, आपका खेती का साथी। फसल, मिट्टी, मौसम या मंडी, जो भी पूछना हो पूछिए।'
const SUGGESTIONS = [
  'गेहूं में पीला रतुआ का इलाज क्या है?',
  'PM किसान योजना में आवेदन कैसे करें?',
  'खरीफ में कौन सी फसल लगाएं?',
  'मंडी भाव कहाँ देखें?',
]

function messageText(message: UIMessage) {
  return message.parts.map((part) => (part.type === 'text' ? part.text : '')).join('')
}

export function KrishiAssistant({ hidden = false }: { hidden?: boolean }) {
  const [open, setOpen] = useState(false)
  const [awake, setAwake] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const [greetingLength, setGreetingLength] = useState(0)
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/assistant',
        fetch: (url, init) => apiFetch(typeof url === 'string' ? url : url instanceof URL ? url.href : url.url, init),
      }),
    [],
  )
  const { messages, sendMessage, status, error } = useChat({ transport })

  const busy = status === 'submitted' || status === 'streaming'
  const greeting = GREETING.slice(0, greetingLength)
  const typingGreeting = awake && greetingLength < GREETING.length
  const speaking = awake && (busy || typingGreeting)

  // Warm the model file so the tree appears instantly when the assistant opens.
  useEffect(() => {
    const warm = () => void fetch(MODEL_URL).catch(() => {})
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(warm, { timeout: 4000 })
      return () => window.cancelIdleCallback(id)
    }
    const id = window.setTimeout(warm, 2500)
    return () => window.clearTimeout(id)
  }, [])

  // Wake the tree shortly after it renders, or after a fallback delay.
  useEffect(() => {
    if (!open || awake) return
    const delay = sceneReady ? 700 : 3200
    const id = window.setTimeout(() => setAwake(true), delay)
    return () => window.clearTimeout(id)
  }, [open, awake, sceneReady])

  useEffect(() => {
    if (!typingGreeting) return
    const id = window.setInterval(() => setGreetingLength((n) => Math.min(n + 1, GREETING.length)), 32)
    return () => window.clearInterval(id)
  }, [typingGreeting])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, status, greetingLength])

  const close = useCallback(() => {
    setOpen(false)
    setAwake(false)
  }, [])

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    setAwake(true)
    setGreetingLength(GREETING.length)
    void sendMessage({ text: trimmed })
    setInput('')
  }

  const statusLabel = !awake ? 'सो रहा है...' : status === 'submitted' ? 'सोच रहा है...' : speaking ? 'बोल रहा है...' : 'ऑनलाइन'

  return (
    <>
      {!open && !hidden && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Krishi Dost assistant"
          className="group absolute bottom-24 right-4 z-20 flex h-16 w-16 items-center justify-center rounded-full"
        >
          <span aria-hidden="true" className="absolute inset-0 animate-wake-ring rounded-full bg-emerald-500/40" />
          <span className="relative flex h-16 w-16 animate-bob items-center justify-center overflow-hidden rounded-full bg-gradient-to-b from-emerald-100 to-emerald-300 shadow-lg shadow-emerald-900/30 ring-2 ring-white transition-transform group-active:scale-90">
            <Image
              src="/images/krishi-tree.png"
              alt=""
              width={96}
              height={96}
              sizes="64px"
              className="h-full w-full scale-125 object-cover"
            />
          </span>
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-2 animate-zzz-float text-sm font-extrabold text-emerald-700 dark:text-emerald-300"
          >
            z<span className="text-xs">z</span>
          </span>
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Krishi Dost assistant"
          className="absolute inset-0 z-40 flex origin-[88%_86%] animate-sheet-in flex-col overflow-hidden bg-gradient-to-b from-emerald-950 via-teal-950 to-emerald-900 text-white"
        >
          <header className="flex flex-shrink-0 items-center justify-between gap-3 px-4 pb-1 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="min-w-0">
              <h2 className="text-lg font-extrabold leading-tight">कृषि दोस्त</h2>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-200">
                <span
                  aria-hidden="true"
                  className={cn('h-2 w-2 rounded-full', awake ? 'bg-emerald-400' : 'bg-stone-400')}
                />
                <span aria-live="polite">{statusLabel}</span>
              </p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              aria-label="Close assistant"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
            >
              <i className="ph ph-x text-xl" aria-hidden="true" />
            </button>
          </header>

          <button
            type="button"
            onClick={() => setAwake(true)}
            disabled={awake}
            aria-label={awake ? 'Krishi Dost is awake' : 'Wake up Krishi Dost'}
            className="relative h-[30dvh] max-h-72 min-h-40 w-full flex-shrink-0 cursor-default disabled:cursor-default"
          >
            <TreeScene awake={awake} speaking={speaking} onReady={() => setSceneReady(true)} className="absolute inset-0" />
            {!awake && (
              <span className="pointer-events-none absolute inset-x-0 bottom-3 flex flex-col items-center gap-1 text-sm font-bold text-emerald-100">
                <span aria-hidden="true" className="animate-zzz-float text-2xl font-extrabold">
                  Zzz
                </span>
                {sceneReady ? 'Tap to wake me up' : 'Loading...'}
              </span>
            )}
          </button>

          <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3" aria-live="polite">
            {awake && greeting && (
              <div className="max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-white/10 px-4 py-3 text-base leading-relaxed">
                {greeting}
              </div>
            )}

            {awake && messages.length === 0 && !typingGreeting && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="animate-fade-up rounded-full bg-emerald-400/15 px-3 py-2 text-left text-sm font-semibold text-emerald-100 ring-1 ring-emerald-300/30 hover:bg-emerald-400/25"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m) => {
              const text = messageText(m)
              if (!text) return null
              const mine = m.role === 'user'
              return (
                <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-base leading-relaxed',
                      mine ? 'rounded-br-md bg-emerald-400 text-emerald-950' : 'rounded-bl-md bg-white/10',
                    )}
                  >
                    {text}
                  </div>
                </div>
              )
            })}

            {status === 'submitted' && (
              <div className="flex" role="status" aria-label="Krishi Dost is thinking">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-white/10 px-4 py-4">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      style={{ animationDelay: `${i * 150}ms` }}
                      className="h-2 w-2 animate-bob rounded-full bg-emerald-200"
                    />
                  ))}
                </div>
              </div>
            )}

            {error && (
              <p role="alert" className="rounded-2xl bg-red-500/20 px-4 py-3 text-sm font-semibold text-red-100">
                कुछ गड़बड़ हो गई। कृपया दोबारा कोशिश करें।
              </p>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
            className="flex flex-shrink-0 items-center gap-2 border-t border-white/10 bg-emerald-950/80 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3"
          >
            <label htmlFor="assistant-input" className="sr-only">
              Message Krishi Dost
            </label>
            <input
              id="assistant-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="कृषि दोस्त से पूछिए..."
              autoComplete="off"
              className="min-w-0 flex-1 rounded-full bg-white/10 px-4 py-3 text-base text-white placeholder:text-emerald-200/60 focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send message"
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-emerald-400 text-emerald-950 transition-opacity disabled:opacity-40"
            >
              <i className="ph-fill ph-paper-plane-right text-xl" aria-hidden="true" />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
