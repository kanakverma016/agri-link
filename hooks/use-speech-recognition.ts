'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
}

type RecognitionCtor = new () => SpeechRecognitionLike

export function useSpeechRecognition(onTranscript: (text: string) => void, lang = 'hi-IN') {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const callbackRef = useRef(onTranscript)

  useEffect(() => {
    callbackRef.current = onTranscript
  }, [onTranscript])

  useEffect(() => {
    const Ctor = (window as unknown as { webkitSpeechRecognition?: RecognitionCtor })
      .webkitSpeechRecognition
    if (!Ctor) return
    const recognition = new Ctor()
    recognition.lang = lang
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (e) => callbackRef.current(e.results[0][0].transcript)
    recognition.onend = () => setListening(false)
    recognition.onerror = (e) => {
      console.error('Speech recognition error', e.error)
      setListening(false)
    }
    recognitionRef.current = recognition
    setSupported(true)
    return () => {
      recognition.onresult = null
      recognition.onend = null
      recognition.onerror = null
      try {
        recognition.stop()
      } catch {
        /* not started */
      }
    }
  }, [lang])

  const start = useCallback(() => {
    if (!recognitionRef.current) return
    setListening(true)
    try {
      recognitionRef.current.start()
    } catch (error) {
      console.error('Mic start error', error)
      setListening(false)
    }
  }, [])

  return { supported, listening, start }
}
