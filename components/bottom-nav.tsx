import Link from 'next/link'
import { cn } from '@/lib/utils'

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
  return (
    <nav
      aria-label="Main"
      className="absolute inset-x-3 bottom-3 z-10 flex items-center justify-around rounded-3xl border border-green-100 bg-white/95 p-1.5 shadow-xl shadow-green-900/15 backdrop-blur"
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
              'flex min-w-14 flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5',
              isActive
                ? 'bg-green-700 text-white shadow-md shadow-green-700/30'
                : 'text-stone-500 hover:bg-green-50 hover:text-green-700',
            )}
          >
            <i
              className={cn('ph text-2xl', isActive ? 'ph-fill' : 'ph', item.icon)}
              aria-hidden="true"
            />
            <span className="text-[11px] font-bold leading-none">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
