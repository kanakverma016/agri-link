'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { apiFetch } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { ReplyBubble } from '@/components/assistant/reply-bubble'

const TreeScene = dynamic(() => import('@/components/assistant/tree-scene').then((m) => m.TreeScene), {
  ssr: false,
})

const MODEL_URL = '/models/krishi-tree.glb'
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA='
const MAX_RECORDING_MS = 28_000
const NO_SPEECH_TIMEOUT_MS = 8_000
const SILENCE_AFTER_SPEECH_MS = 1_600
const SPEECH_RMS_THRESHOLD = 0.035
const BAR_SHAPE = [0.45, 0.75, 1, 0.8, 0.55, 0.85, 0.5]

const QUICK_QUESTIONS = [
  { text: 'मेरी फसल का हाल बताओ', icon: 'ph-plant' },
  { text: 'आज खेत में क्या करूँ?', icon: 'ph-sun-horizon' },
  { text: 'अब तक कितना खर्च हुआ?', icon: 'ph-currency-inr' },
  { text: 'सिंचाई कब करनी चाहिए?', icon: 'ph-drop' },
]

const LEAVES = [
  { left: '6%', delay: 0, duration: 8, drift: 40, size: 18 },
  { left: '19%', delay: 2.4, duration: 9.5, drift: -30, size: 14 },
  { left: '33%', delay: 5.1, duration: 7.5, drift: 28, size: 20 },
  { left: '52%', delay: 1.2, duration: 10, drift: -44, size: 15 },
  { left: '68%', delay: 3.6, duration: 8.5, drift: 36, size: 19 },
  { left: '82%', delay: 6.2, duration: 9, drift: -26, size: 16 },
  { left: '92%', delay: 0.8, duration: 7.8, drift: -38, size: 14 },
]

const PHASE_ICON: Record<Phase, string> = {
  sleeping: 'ph-moon-stars',
  idle: 'ph-ear',
  listening: 'ph-microphone',
  thinking: 'ph-sparkle',
  speaking: 'ph-speaker-high',
}

type Phase = 'sleeping' | 'idle' | 'listening' | 'thinking' | 'speaking'
type Turn = { role: 'user' | 'assistant'; text: string }
type Summary = { name: string; plots: number; crops: { crop: string; plot: string; days: number }[] }
type TalkResponse = {
  transcript?: string
  reply?: string
  language?: string
  audio?: string | null
  audioType?: string
  summary?: Summary
  code?: string
  error?: string
}

const PHASE_LABEL: Record<Phase, string> = {
  sleeping: 'सो रहा है...',
  idle: 'सुन रहा हूँ, बोलने के लिए माइक दबाइए',
  listening: 'आपकी बात सुन रहा है...',
  thinking: 'सोच रहा है...',
  speaking: 'बोल रहा है...',
}

type RecognitionResultLike = { isFinal: boolean; 0: { transcript: string } }
type RecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: { results: ArrayLike<RecognitionResultLike> }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}
type RecognitionCtor = new () => RecognitionLike

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus']
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

function fileNameFor(type: string) {
  if (type.includes('mp4')) return 'speech.m4a'
  if (type.includes('ogg')) return 'speech.ogg'
  return 'speech.webm'
}

function base64ToBlob(base64: string, type: string) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type })
}

export function KrishiAssistant({ hidden = false }: { hidden?: boolean }) {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>('sleeping')
  const [sceneReady, setSceneReady] = useState(false)
  const [heard, setHeard] = useState('')
  const [reply, setReply] = useState('')
  const [notice, setNotice] = useState('')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [level, setLevel] = useState(0)

  const closeRef = useRef<HTMLButtonElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUnlockedRef = useRef(false)
  const finishPlaybackRef = useRef<(() => void) | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const recognitionRef = useRef<RecognitionLike | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const monitorRef = useRef<number | null>(null)
  const discardRef = useRef(false)
  const historyRef = useRef<Turn[]>([])
  const languageRef = useRef('hi-IN')
  const phaseRef = useRef<Phase>('sleeping')

  const updatePhase = useCallback((next: Phase) => {
    phaseRef.current = next
    setPhase(next)
  }, [])

  // Warm the 3D model so the tree appears instantly when the assistant opens.
  useEffect(() => {
    const warm = () => void fetch(MODEL_URL).catch(() => {})
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(warm, { timeout: 4000 })
      return () => window.cancelIdleCallback(id)
    }
    const id = window.setTimeout(warm, 2500)
    return () => window.clearTimeout(id)
  }, [])

  // Mobile browsers only allow audio that was started inside a tap, so prime the element on the first tap.
  const unlockAudio = useCallback(() => {
    if (!audioRef.current) audioRef.current = new Audio()
    if (audioUnlockedRef.current) return
    const audio = audioRef.current
    audio.src = SILENT_WAV
    audio
      .play()
      .then(() => {
        audio.pause()
        audioUnlockedRef.current = true
      })
      .catch(() => {})
  }, [])

  const stopSpeaking = useCallback(() => {
    audioRef.current?.pause()
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    finishPlaybackRef.current?.()
  }, [])

  const speakInBrowser = useCallback((text: string, lang: string) => {
    return new Promise<void>((resolve) => {
      if (!('speechSynthesis' in window)) return resolve()
      const synth = window.speechSynthesis
      synth.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang
      utterance.rate = 0.95
      const voice = synth.getVoices().find((v) => v.lang.replace('_', '-').toLowerCase() === lang.toLowerCase())
      if (voice) utterance.voice = voice
      let done = false
      const finish = () => {
        if (done) return
        done = true
        finishPlaybackRef.current = null
        resolve()
      }
      finishPlaybackRef.current = finish
      utterance.onend = finish
      utterance.onerror = finish
      synth.speak(utterance)
    })
  }, [])

  const playReply = useCallback((base64: string, type: string) => {
    return new Promise<void>((resolve) => {
      const audio = audioRef.current ?? new Audio()
      audioRef.current = audio
      audio.pause()
      const url = URL.createObjectURL(base64ToBlob(base64, type))
      let done = false
      const finish = () => {
        if (done) return
        done = true
        audio.onended = null
        audio.onerror = null
        finishPlaybackRef.current = null
        URL.revokeObjectURL(url)
        resolve()
      }
      finishPlaybackRef.current = finish
      audio.onended = finish
      audio.onerror = finish
      audio.src = url
      audio.play().catch(finish)
    })
  }, [])

  const releaseMicrophone = useCallback(() => {
    if (monitorRef.current !== null) {
      window.clearInterval(monitorRef.current)
      monitorRef.current = null
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    void audioContextRef.current?.close().catch(() => {})
    audioContextRef.current = null
    setLevel(0)
  }, [])

  const runTurn = useCallback(
    async (fill: (form: FormData) => void, userLabel?: string) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      updatePhase('thinking')
      setNotice('')
      if (userLabel) setHeard(userLabel)

      try {
        const form = new FormData()
        fill(form)
        form.append('lang', languageRef.current)
        form.append('history', JSON.stringify(historyRef.current.slice(-6)))

        const res = await apiFetch('/api/tree/talk', { method: 'POST', body: form, signal: controller.signal })
        const data = (await res.json().catch(() => null)) as TalkResponse | null

        if (res.status === 422 || data?.code === 'no_speech') {
          setNotice('आवाज़ साफ़ नहीं आई। माइक दबाकर फिर से बोलिए।')
          updatePhase('idle')
          return
        }
        if (!res.ok || !data?.reply) throw new Error(data?.error ?? 'request_failed')

        if (data.language) languageRef.current = data.language
        if (data.summary) setSummary(data.summary)
        if (data.transcript) {
          setHeard(data.transcript)
          historyRef.current.push({ role: 'user', text: data.transcript })
        }
        historyRef.current.push({ role: 'assistant', text: data.reply })
        historyRef.current = historyRef.current.slice(-8)
        setReply(data.reply)

        updatePhase('speaking')
        if (data.audio) await playReply(data.audio, data.audioType ?? 'audio/mpeg')
        else await speakInBrowser(data.reply, languageRef.current)
        if (!controller.signal.aborted && phaseRef.current !== 'listening') updatePhase('idle')
      } catch (error) {
        if (controller.signal.aborted) return
        console.error('[assistant] turn failed', error)
        setNotice('कुछ गड़बड़ हो गई। इंटरनेट देखकर फिर से कोशिश कीजिए।')
        updatePhase('idle')
      }
    },
    [playReply, speakInBrowser, updatePhase],
  )

  const wakeUp = useCallback(() => {
    historyRef.current = []
    setHeard('')
    setReply('')
    void runTurn((form) => form.append('mode', 'greet'))
  }, [runTurn])

  const stopListening = useCallback(
    (discard = false) => {
      discardRef.current = discard
      const recognition = recognitionRef.current
      if (recognition) {
        if (discard) recognition.abort()
        else recognition.stop()
        return
      }
      const recorder = recorderRef.current
      if (recorder && recorder.state !== 'inactive') recorder.stop()
      else releaseMicrophone()
    },
    [releaseMicrophone],
  )

  const startBrowserListening = useCallback(
    (Recognition: RecognitionCtor) => {
      const recognition = new Recognition()
      recognition.lang = languageRef.current
      recognition.continuous = false
      recognition.interimResults = true
      recognition.maxAlternatives = 1

      let finalText = ''
      let interimText = ''
      let errorCode = ''
      discardRef.current = false

      recognition.onresult = (event) => {
        let finals = ''
        let interims = ''
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) finals += result[0].transcript
          else interims += result[0].transcript
        }
        finalText = finals
        interimText = interims
        setHeard((finals + interims).trim())
      }
      recognition.onerror = (event) => {
        errorCode = event.error
      }
      recognition.onend = () => {
        recognitionRef.current = null
        releaseMicrophone()
        if (discardRef.current) return
        const text = (finalText || interimText).trim()
        if (errorCode === 'not-allowed' || errorCode === 'service-not-allowed') {
          setNotice('माइक की अनुमति नहीं मिल��। फ़ोन की सेटिंग में माइक की अनुमति दीजिए।')
          updatePhase('idle')
        } else if (errorCode === 'network') {
          setNotice('इंटरनेट नहीं चल रहा। नेटवर्क देखकर फिर से बोलिए।')
          updatePhase('idle')
        } else if (!text) {
          setNotice('आवाज़ साफ़ नहीं आई। माइक दबाकर फिर से बोलिए।')
          updatePhase('idle')
        } else {
          void runTurn((form) => form.append('text', text), text)
        }
      }

      recognitionRef.current = recognition
      try {
        recognition.start()
      } catch {
        recognitionRef.current = null
        setNotice('माइक शुरू नहीं हो पाया। फिर से कोशिश कीजिए।')
        updatePhase('idle')
        return
      }
      setHeard('')
      updatePhase('listening')
      monitorRef.current = window.setInterval(() => setLevel(0.25 + Math.random() * 0.6), 120)
    },
    [releaseMicrophone, runTurn, updatePhase],
  )

  const startListening = useCallback(async () => {
    stopSpeaking()
    abortRef.current?.abort()
    setNotice('')

    const Recognition = getRecognitionCtor()
    if (Recognition) {
      startBrowserListening(Recognition)
      return
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setNotice('इस फ़ोन या ब्राउज़र में माइक सपोर्ट नहीं है। नीचे दिए सवालों में से चुनिए।')
      return
    }

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
    } catch {
      setNotice('माइक की अनुमति नहीं मिली। फ़ोन की सेटिंग में माइक की अनुमति दीजिए।')
      updatePhase('idle')
      return
    }

    streamRef.current = stream
    discardRef.current = false
    const mimeType = pickMimeType()
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    const chunks: Blob[] = []
    recorderRef.current = recorder

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data)
    }
    recorder.onstop = () => {
      const type = recorder.mimeType || mimeType || 'audio/webm'
      const blob = new Blob(chunks, { type })
      const discard = discardRef.current
      recorderRef.current = null
      releaseMicrophone()
      if (discard) return
      if (blob.size < 2000) {
        setNotice('आवाज़ सुनाई नहीं दी। माइक दबाकर फिर से बोलिए।')
        updatePhase('idle')
        return
      }
      void runTurn((form) => form.append('audio', blob, fileNameFor(type)))
    }

    recorder.start()
    updatePhase('listening')

    try {
      const context = new AudioContext()
      audioContextRef.current = context
      void context.resume()
      const analyser = context.createAnalyser()
      analyser.fftSize = 1024
      context.createMediaStreamSource(stream).connect(analyser)
      const samples = new Float32Array(analyser.fftSize)
      const startedAt = performance.now()
      let lastVoiceAt = startedAt
      let heardVoice = false

      monitorRef.current = window.setInterval(() => {
        analyser.getFloatTimeDomainData(samples)
        let sum = 0
        for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i]
        const rms = Math.sqrt(sum / samples.length)
        setLevel(Math.min(1, rms * 9))

        const now = performance.now()
        if (rms > SPEECH_RMS_THRESHOLD) {
          heardVoice = true
          lastVoiceAt = now
        }
        if (heardVoice && now - lastVoiceAt > SILENCE_AFTER_SPEECH_MS) stopListening()
        else if (!heardVoice && now - startedAt > NO_SPEECH_TIMEOUT_MS) {
          setNotice('कुछ सुनाई नहीं दिया। माइक दबाकर फिर से बोलिए।')
          stopListening(true)
          updatePhase('idle')
        } else if (now - startedAt > MAX_RECORDING_MS) stopListening()
      }, 80)
    } catch {
      // Without level metering the farmer simply taps the mic again to finish.
    }
  }, [releaseMicrophone, runTurn, startBrowserListening, stopListening, stopSpeaking, updatePhase])

  const handlePrimaryAction = useCallback(() => {
    unlockAudio()
    switch (phaseRef.current) {
      case 'sleeping':
        wakeUp()
        break
      case 'idle':
      case 'speaking':
        void startListening()
        break
      case 'listening':
        stopListening()
        break
      case 'thinking':
        abortRef.current?.abort()
        updatePhase('idle')
        break
    }
  }, [startListening, stopListening, unlockAudio, updatePhase, wakeUp])

  const askQuick = useCallback(
    (text: string) => {
      unlockAudio()
      stopSpeaking()
      void runTurn((form) => form.append('text', text), text)
    },
    [runTurn, stopSpeaking, unlockAudio],
  )

  // Greet the farmer as soon as the tree has rendered (or after a short fallback if the 3D scene is slow).
  useEffect(() => {
    if (!open || phase !== 'sleeping') return
    const id = window.setTimeout(wakeUp, sceneReady ? 600 : 3200)
    return () => window.clearTimeout(id)
  }, [open, phase, sceneReady, wakeUp])

  const close = useCallback(() => {
    abortRef.current?.abort()
    stopListening(true)
    stopSpeaking()
    setOpen(false)
    updatePhase('sleeping')
    setHeard('')
    setReply('')
    setNotice('')
  }, [stopListening, stopSpeaking, updatePhase])

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  useEffect(
    () => () => {
      abortRef.current?.abort()
      discardRef.current = true
      recognitionRef.current?.abort()
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
      if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop()
      releaseMicrophone()
      audioRef.current?.pause()
    },
    [releaseMicrophone],
  )

  const awake = phase !== 'sleeping'
  const listening = phase === 'listening'
  const speaking = phase === 'speaking'
  const busy = phase === 'thinking'
  const thinkingStage = busy

  const micLabel =
    phase === 'listening'
      ? 'Stop recording and send'
      : phase === 'speaking'
        ? 'Interrupt and speak'
        : phase === 'thinking'
          ? 'Cancel'
          : 'Speak to Krishi Dost'

  const hint =
    phase === 'sleeping'
      ? 'पेड़ जाग रहा है...'
      : phase === 'listening'
        ? 'बोलिए... रुकने पर अपने आप भेज देगा'
        : phase === 'thinking'
          ? 'आपका खेत देखकर जवाब सोच रहा है'
          : phase === 'speaking'
            ? 'बीच में बोलने के लिए माइक दबाइए'
            : 'बोलने के लिए माइक दबाइए'

  return (
    <>
      {!open && !hidden && (
        <button
          type="button"
          onClick={() => {
            unlockAudio()
            setOpen(true)
          }}
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
          aria-label="Krishi Dost voice assistant"
          className="absolute inset-0 z-40 flex origin-[88%_86%] animate-sheet-in flex-col overflow-hidden bg-gradient-to-b from-emerald-950 via-teal-950 to-emerald-900 text-white"
        >
          <header className="flex flex-shrink-0 items-center justify-between gap-3 px-4 pb-1 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="min-w-0">
              <h2 className="text-lg font-extrabold leading-tight">कृषि दोस्त</h2>
              <p
                className={cn(
                  'mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 transition-colors duration-300',
                  phase === 'sleeping' && 'bg-white/5 text-stone-300 ring-white/10',
                  phase === 'idle' && 'bg-emerald-400/15 text-emerald-100 ring-emerald-300/30',
                  phase === 'listening' && 'bg-white text-emerald-900 ring-white',
                  phase === 'thinking' && 'bg-amber-300/20 text-amber-100 ring-amber-200/40',
                  phase === 'speaking' && 'bg-emerald-400 text-emerald-950 ring-emerald-200',
                )}
              >
                <i
                  aria-hidden="true"
                  className={cn('ph-fill text-sm', PHASE_ICON[phase], phase === 'thinking' && 'animate-pulse')}
                />
                <span aria-live="polite">{PHASE_LABEL[phase]}</span>
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

          {summary && (summary.plots > 0 || summary.crops.length > 0) && (
            <ul
              aria-label="What Krishi Dost knows about your farm"
              className="flex flex-shrink-0 gap-2 overflow-x-auto px-4 pb-1 pt-1 [scrollbar-width:none]"
            >
              <li className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-emerald-100">
                <i className="ph ph-map-trifold" aria-hidden="true" />
                {summary.plots} खेत
              </li>
              {summary.crops.map((c) => (
                <li
                  key={`${c.plot}-${c.crop}`}
                  className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-bold text-emerald-100 ring-1 ring-emerald-300/30"
                >
                  <i className="ph ph-plant" aria-hidden="true" />
                  {c.crop} · दिन {c.days}
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={handlePrimaryAction}
            aria-label={awake ? micLabel : 'Wake up Krishi Dost'}
            className="relative min-h-40 w-full flex-1 cursor-pointer overflow-hidden"
          >
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              <div
                className={cn(
                  'absolute left-1/2 top-[48%] h-[85%] w-[85%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(110,231,183,0.38),rgba(16,185,129,0.12)_55%,transparent)] transition-opacity duration-700',
                  awake ? 'animate-spotlight-pulse opacity-100' : 'opacity-20',
                  thinkingStage && 'bg-[radial-gradient(closest-side,rgba(252,211,77,0.32),rgba(16,185,129,0.1)_55%,transparent)]',
                )}
              />
              {speaking && (
                <div className="absolute left-1/2 top-[52%] -translate-x-1/2 -translate-y-1/2">
                  {[0, 0.85, 1.7].map((delay) => (
                    <span
                      key={delay}
                      style={{ animationDelay: `${delay}s` }}
                      className="absolute left-1/2 top-1/2 -ml-28 -mt-28 h-56 w-56 animate-sound-ring rounded-full border-2 border-emerald-300/50 motion-reduce:animate-none"
                    />
                  ))}
                </div>
              )}
              {listening && (
                <span
                  style={{ transform: `translate(-50%, -50%) scale(${0.9 + level * 0.5})` }}
                  className="absolute left-1/2 top-[52%] h-56 w-56 rounded-full border-2 border-white/60 transition-transform duration-100"
                />
              )}
              {awake &&
                LEAVES.map((leaf, i) => (
                  <i
                    key={i}
                    style={
                      {
                        left: leaf.left,
                        fontSize: leaf.size,
                        animationDelay: `${leaf.delay}s`,
                        animationDuration: `${speaking ? leaf.duration * 0.6 : leaf.duration}s`,
                        '--drift': `${leaf.drift}px`,
                      } as React.CSSProperties
                    }
                    className="ph-fill ph-leaf absolute bottom-6 animate-leaf-drift text-emerald-300/80 motion-reduce:hidden"
                  />
                ))}
              <div className="absolute inset-x-0 bottom-0 h-[16%] rounded-t-[50%] bg-gradient-to-t from-emerald-950 via-emerald-900/80 to-emerald-700/30" />
              <div className="absolute -left-[15%] bottom-0 h-[10%] w-[70%] rounded-t-[60%] bg-emerald-800/60" />
              <div className="absolute -right-[10%] bottom-0 h-[12%] w-[65%] rounded-t-[60%] bg-teal-900/70" />
            </div>
            <TreeScene
              awake={awake}
              speaking={speaking}
              listening={listening}
              thinking={thinkingStage}
              onReady={() => setSceneReady(true)}
              className="absolute inset-0"
            />
            {!awake && (
              <span className="pointer-events-none absolute inset-x-0 bottom-3 flex flex-col items-center gap-1 text-sm font-bold text-emerald-100">
                <span aria-hidden="true" className="animate-zzz-float text-2xl font-extrabold">
                  Zzz
                </span>
                {sceneReady ? 'Waking up...' : 'Loading...'}
              </span>
            )}
          </button>

          <div className="flex max-h-[34dvh] min-h-[7rem] flex-shrink-0 flex-col gap-2 overflow-y-auto px-4 pb-2 pt-1" aria-live="polite">
            {heard && (
              <p className="animate-fade-up flex max-w-[88%] items-start gap-2 self-end rounded-2xl rounded-br-md bg-emerald-400 px-3.5 py-2 text-sm font-semibold text-emerald-950 shadow-md shadow-black/20">
                <i className="ph-fill ph-microphone mt-0.5 flex-shrink-0 text-emerald-800" aria-hidden="true" />
                {heard}
              </p>
            )}
            {reply && !busy && <ReplyBubble key={reply} text={reply} speaking={speaking} audioRef={audioRef} />}
            {busy && (
              <div
                className="animate-fade-up flex items-center gap-2.5 self-start rounded-2xl rounded-bl-md bg-white/10 px-4 py-3 ring-1 ring-white/10"
                role="status"
              >
                <span className="flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      style={{ animationDelay: `${i * 150}ms` }}
                      className="h-2 w-2 animate-bob rounded-full bg-amber-200"
                    />
                  ))}
                </span>
                <span className="text-sm font-semibold text-emerald-100">आपका खेत देखकर सोच रहा हूँ</span>
              </div>
            )}
            {notice && (
              <p role="alert" className="rounded-2xl bg-amber-400/20 px-4 py-3 text-sm font-semibold text-amber-100">
                {notice}
              </p>
            )}
          </div>

          {awake && !listening && (
            <div className="flex flex-shrink-0 gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q.text}
                  type="button"
                  disabled={busy}
                  onClick={() => askQuick(q.text)}
                  className="flex flex-shrink-0 items-center gap-2 rounded-full bg-emerald-400/15 px-3.5 py-2 text-sm font-semibold text-emerald-100 ring-1 ring-emerald-300/30 transition-all hover:bg-emerald-400/25 active:scale-95 disabled:opacity-40"
                >
                  <i className={cn('ph-fill text-base text-emerald-300', q.icon)} aria-hidden="true" />
                  {q.text}
                </button>
              ))}
            </div>
          )}

          <footer className="flex flex-shrink-0 flex-col items-center gap-2 border-t border-white/10 bg-emerald-950/80 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <div className="relative flex h-20 w-20 items-center justify-center">
              {listening && (
                <span
                  aria-hidden="true"
                  style={{ transform: `scale(${1 + level * 0.55})` }}
                  className="absolute inset-0 rounded-full bg-emerald-400/30 transition-transform duration-100"
                />
              )}
              {(listening || speaking) && (
                <span aria-hidden="true" className="absolute inset-0 animate-wake-ring rounded-full bg-emerald-400/40" />
              )}
              <button
                type="button"
                onClick={handlePrimaryAction}
                disabled={!awake}
                aria-label={micLabel}
                aria-pressed={listening}
                className={cn(
                  'relative flex h-16 w-16 items-center justify-center rounded-full text-emerald-950 shadow-lg shadow-black/30 transition-transform active:scale-90 disabled:opacity-40',
                  listening ? 'bg-white' : 'bg-emerald-400',
                )}
              >
                {listening ? (
                  <span aria-hidden="true" className="flex h-8 items-center gap-[3px]">
                    {BAR_SHAPE.map((shape, i) => (
                      <span
                        key={i}
                        style={{ height: `${Math.max(14, Math.min(100, (0.2 + level * shape) * 100))}%` }}
                        className="w-[3px] rounded-full bg-emerald-600 transition-[height] duration-100"
                      />
                    ))}
                  </span>
                ) : busy ? (
                  <span aria-hidden="true" className="h-6 w-6 animate-spin rounded-full border-[3px] border-emerald-900/30 border-t-emerald-950" />
                ) : speaking ? (
                  <i className="ph-fill ph-microphone text-3xl" aria-hidden="true" />
                ) : (
                  <i className="ph-fill ph-microphone text-3xl" aria-hidden="true" />
                )}
              </button>
            </div>
            <p className="text-center text-sm font-semibold text-emerald-100/90">{hint}</p>
          </footer>
        </div>
      )}
    </>
  )
}
