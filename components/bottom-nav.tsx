'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme-toggle'
import { useLanguage } from '@/components/providers/language-provider'

export type NavKey = 'home' | 'mandi' | 'plots' | 'questions' | 'menu'

const ITEMS: { key: NavKey; href: string; icon: string; label: string }[] = [
  { key: 'home', href: '/', icon: 'ph-house', label: 'Home' },
  { key: 'mandi', href: '/mandi', icon: 'ph-storefront', label: 'Mandi' },
  { key: 'plots', href: '/my-plots', icon: 'ph-plant', label: 'Plots' },
  { key: 'questions', href: '/questions', icon: 'ph-question', label: 'Ask' },
  { key: 'menu', href: '/menu', icon: 'ph-user-circle', label: 'Menu' },
]

export function BottomNav({
  active,
  onHomeClick,
}: {
  active?: NavKey
  onHomeClick?: (e: React.MouseEvent) => void
}) {
  const { t } = useLanguage()
  return (
    <nav
      aria-label={t('Main')}
      className="neu absolute inset-x-2 bottom-3 z-10 flex items-center justify-between gap-0.5 rounded-3xl p-1.5 md:inset-x-auto md:left-1/2 md:w-[34rem] md:-translate-x-1/2"
    >
      {ITEMS.map((item) => {
        const isActive = item.key === active
        return (
          <Link
            key={item.key}
            href={item.href}
            prefetch
            onClick={item.key === 'home' && isActive ? onHomeClick : undefined}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex min-w-12 flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5',
              isActive
                ? 'bg-green-700 text-white shadow-md shadow-emerald-900/30'
                : 'text-stone-500 hover:text-green-700',
            )}
          >
            <i
              className={cn('ph text-2xl', isActive ? 'ph-fill' : 'ph', item.icon)}
              aria-hidden="true"
            />
            <span className="text-[11px] font-bold leading-none">{t(item.label)}</span>
          </Link>
        )
      })}
      <ThemeToggle className="ml-1" />
    </nav>
  )
}
