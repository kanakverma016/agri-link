import { cn } from '@/lib/utils'

export function MobileFrame({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className="flex justify-center bg-gray-200">
      <div
        className={cn(
          'relative flex h-dvh w-full max-w-sm flex-col overflow-hidden bg-gray-50',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}
