'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type RecognitionLike = {
  continuous: boolean
  lang: string
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null
  onspeechend: (() => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
}

export function useSpeechSearch(onTranscript: (text: string) => void, lang = 'en-IN') {
  const [supported, setSupported] = useState(true)
  const [listening, setListening] = useState(false)
  const [status, setStatus] = useState('')
  const recognitionRef = useRef<RecognitionLike | null>(null)
  const callbackRef = useRef(onTranscript)

  useEffect(() => {
    callbackRef.current = onTranscript
  }, [onTranscript])

  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: new () => RecognitionLike
      webkitSpeechRecognition?: new () => RecognitionLike
    }
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!Ctor) {
      setSupported(false)
      setStatus('Speech recognition not supported.')
      return
    }
    const r = new Ctor()
    r.continuous = false
    r.lang = lang
    r.interimResults = false
    r.maxAlternatives = 1
    r.onresult = (e) => callbackRef.current(e.results[0][0].transcript)
    r.onspeechend = () => r.stop()
    r.onend = () => {
      setStatus('')
      setListening(false)
    }
    r.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'audio-capture') setStatus('Could not hear. Try again.')
      else if (e.error === 'not-allowed') setStatus('Mic permission denied.')
      else setStatus('Error, please try again.')
      setListening(false)
    }
    recognitionRef.current = r
    return () => {
      r.onresult = r.onspeechend = r.onend = r.onerror = null
      r.stop()
    }
  }, [lang])

  const start = useCallback(() => {
    try {
      recognitionRef.current?.start()
      setStatus('Listening...')
      setListening(true)
    } catch (err) {
      console.error('Speech recognition already active.', err)
    }
  }, [])

  return { supported, listening, status, start }
}
