import Link from 'next/link'
import { cn } from '@/lib/utils'

export type NavKey = 'home' | 'mandi' | 'plots' | 'questions' | 'menu'

const ITEMS: { key: NavKey; href: string; icon: string; label: string }[] = [
  { key: 'home', href: '/', icon: 'ph-house', label: 'Home' },
  { key: 'mandi', href: '/mandi', icon: 'ph-storefront', label: 'Live Mandi' },
  { key: 'plots', href: '/my-plots', icon: 'ph-plant', label: 'My Plots' },
  { key: 'questions', href: '/questions', icon: 'ph-question', label: 'Questions' },
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
    <footer className="absolute bottom-0 z-10 flex w-full items-center justify-around border-t border-gray-200 bg-white p-2">
      {ITEMS.map((item) => {
        const isActive = item.key === active
        return (
          <Link
            key={item.key}
            href={item.href}
            onClick={item.key === 'home' && isActive ? onHomeClick : undefined}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center rounded-md p-1 transition-colors',
              isActive ? 'text-green-600' : 'text-gray-500 hover:text-green-600',
            )}
          >
            <i className={`ph ${item.icon} text-2xl`} aria-hidden="true" />
            <span className={cn('text-xs', isActive && 'font-semibold')}>{item.label}</span>
          </Link>
        )
      })}
    </footer>
  )
}
