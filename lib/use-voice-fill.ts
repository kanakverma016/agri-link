'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}

/** Dictate into one of several text fields; transcript is appended to the active field. */
export function useVoiceFill<K extends string>(onAppend: (key: K, text: string) => void, lang = 'hi-IN') {
  const [supported, setSupported] = useState(true)
  const [activeKey, setActiveKey] = useState<K | null>(null)
  const recognitionRef = useRef<Recognition | null>(null)
  const targetRef = useRef<K | null>(null)
  const appendRef = useRef(onAppend)

  useEffect(() => {
    appendRef.current = onAppend
  }, [onAppend])

  useEffect(() => {
    const w = window as unknown as { webkitSpeechRecognition?: new () => Recognition }
    if (!w.webkitSpeechRecognition) {
      setSupported(false)
      return
    }
    const r = new w.webkitSpeechRecognition()
    r.lang = lang
    r.continuous = false
    r.interimResults = false
    r.onresult = (e) => {
      if (targetRef.current) appendRef.current(targetRef.current, e.results[0][0].transcript)
    }
    const reset = () => {
      targetRef.current = null
      setActiveKey(null)
    }
    r.onerror = (e) => {
      console.error('Speech recognition error', e.error)
      reset()
    }
    r.onend = reset
    recognitionRef.current = r
    return () => {
      r.onresult = r.onerror = r.onend = null
      r.stop()
    }
  }, [lang])

  const listen = useCallback((key: K) => {
    const r = recognitionRef.current
    if (!r) return
    r.stop()
    targetRef.current = key
    setActiveKey(key)
    try {
      r.start()
    } catch (err) {
      console.error('Mic start error', err)
      targetRef.current = null
      setActiveKey(null)
    }
  }, [])

  return { supported, activeKey, listen }
}
