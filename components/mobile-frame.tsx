import Image from 'next/image'
import { cn } from '@/lib/utils'
import { InstallButton } from '@/components/pwa'

export function MobileFrame({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className="relative isolate flex h-dvh justify-center overflow-hidden bg-[#ecf4f0] md:items-center md:p-3 lg:p-4 dark:bg-[#0b1512]">
      <div aria-hidden="true" className="absolute inset-0 -z-10 hidden md:block">
        <Image
          src="/images/crops-backdrop.png"
          alt=""
          fill
          sizes="100vw"
          quality={70}
          className="object-cover object-bottom opacity-90 dark:opacity-30 dark:brightness-75"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-transparent to-emerald-900/25 dark:from-black/50 dark:to-black/60" />
      </div>

      <div
        className={cn(
          'relative isolate flex h-dvh w-full max-w-md flex-col overflow-hidden bg-[var(--neu-bg)] md:h-full md:max-w-3xl md:rounded-[2rem] md:border md:border-white/60 md:shadow-2xl md:shadow-emerald-950/30 lg:max-w-5xl dark:md:border-white/10',
          className,
        )}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-80 opacity-35 [mask-image:linear-gradient(to_top,black,transparent)] dark:opacity-15"
        >
          <Image
            src="/images/crops-backdrop.png"
            alt=""
            fill
            sizes="(min-width: 1024px) 64rem, 100vw"
            quality={50}
            className="object-cover object-bottom"
          />
        </div>
        {children}
        <InstallButton className="absolute bottom-24 left-4 z-20 flex animate-fade-up items-center gap-1 rounded-full bg-green-700 py-1 pl-4 pr-1 text-sm font-bold text-white shadow-lg" />
      </div>
    </div>
  )
}
