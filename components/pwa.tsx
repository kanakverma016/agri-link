'use client'

import { useEffect, useSyncExternalStore } from 'react'

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

let deferred: InstallPrompt | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch((e) => console.error('SW registration failed', e))
    }
    const onPrompt = (e: Event) => {
      e.preventDefault()
      deferred = e as InstallPrompt
      emit()
    }
    const onInstalled = () => {
      deferred = null
      emit()
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])
  return null
}

export function InstallButton({ className }: { className?: string }) {
  const canInstall = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => deferred !== null,
    () => false,
  )
  if (!canInstall) return null
  return (
    <div className={className}>
      <button
        type="button"
        className="flex items-center gap-1.5"
        onClick={async () => {
          if (!deferred) return
          await deferred.prompt()
          await deferred.userChoice
          deferred = null
          emit()
        }}
      >
        <i className="ph-fill ph-download-simple text-lg" aria-hidden="true" /> Install app
      </button>
      <button
        type="button"
        aria-label="Dismiss install prompt"
        className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/20"
        onClick={() => {
          deferred = null
          emit()
        }}
      >
        <i className="ph ph-x" aria-hidden="true" />
      </button>
    </div>
  )
}
