'use client'

import { useSyncExternalStore } from 'react'
import { cn } from '@/lib/utils'

const subscribe = (cb: () => void) => {
  const obs = new MutationObserver(cb)
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => obs.disconnect()
}
const getSnapshot = () => document.documentElement.classList.contains('dark')

export function ThemeToggle({ className }: { className?: string }) {
  const dark = useSyncExternalStore(subscribe, getSnapshot, () => false)

  const toggle = () => {
    const next = !dark
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {}
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', next ? '#0b1512' : '#047857')
  }

  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={dark}
      aria-label="Dark theme"
      suppressHydrationWarning
      className={cn(
        'relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xl text-amber-500 neu-btn dark:text-sky-300',
        className,
      )}
    >
      <i className={cn('ph-fill', dark ? 'ph-moon-stars' : 'ph-sun')} aria-hidden="true" suppressHydrationWarning />
    </button>
  )
}
