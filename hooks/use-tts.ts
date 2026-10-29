'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch } from '@/lib/api-client'

export function useTts(onError: (title: string, message: string) => void) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | null>(null)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }
    setPlayingId(null)
  }, [])

  useEffect(() => stop, [stop])

  const toggle = useCallback(
    async (id: string, text: string) => {
      if (!text) return
      if (id === playingId) {
        stop()
        return
      }
      stop()
      setLoadingId(id)
      try {
        const res = await apiFetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as { error?: string } | null
          throw new Error(err?.error ?? res.statusText)
        }
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audioRef.current = audio
        urlRef.current = url
        const finish = () => stop()
        audio.onended = finish
        audio.onerror = () => {
          onErrorRef.current('Audio Error', 'Could not play audio.')
          stop()
        }
        setPlayingId(id)
        await audio.play()
      } catch (error) {
        console.error('Error playing message audio:', error)
        onErrorRef.current(
          'TTS Error',
          `Could not generate audio: ${error instanceof Error ? error.message : 'Unknown error'}`,
        )
        stop()
      } finally {
        setLoadingId(null)
      }
    },
    [playingId, stop],
  )

  return { loadingId, playingId, toggle, stop }
}
