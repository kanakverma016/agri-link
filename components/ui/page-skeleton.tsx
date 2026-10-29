import { MobileFrame } from '@/components/mobile-frame'

export function PageSkeleton() {
  return (
    <MobileFrame>
      <div role="status" aria-label="Loading" className="flex flex-col gap-4 p-4">
        <div className="skeleton h-28 rounded-3xl" />
        <div className="skeleton h-12 rounded-full" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-48 rounded-2xl" />
      </div>
    </MobileFrame>
  )
}
