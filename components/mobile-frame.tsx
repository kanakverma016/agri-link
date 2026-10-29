import { cn } from '@/lib/utils'

export function MobileFrame({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className="flex min-h-dvh justify-center bg-gradient-to-b from-green-100 via-green-50 to-amber-50 sm:items-center sm:p-4">
      <div
        className={cn(
          'relative flex h-dvh w-full max-w-md flex-col overflow-hidden bg-stone-50 sm:h-[min(52rem,calc(100dvh-2rem))] sm:rounded-[2.25rem] sm:border-8 sm:border-green-900 sm:shadow-2xl sm:shadow-green-900/30',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}
