'use client'

import { LANGS, LANG_META } from '@/lib/i18n/config'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/components/providers/language-provider'

export function LanguageToggle({
  className,
  tone = 'default',
}: {
  className?: string
  /** "onDark" is for use over the green header gradient. */
  tone?: 'default' | 'onDark'
}) {
  const { lang, setLang, t } = useLanguage()

  return (
    <div
      role="group"
      aria-label={t('Language')}
      className={cn(
        'inline-flex items-center rounded-full p-0.5',
        tone === 'onDark' ? 'bg-white/15' : 'bg-stone-200/80 dark:bg-white/10',
        className,
      )}
    >
      {LANGS.map((code) => {
        const active = code === lang
        return (
          <button
            key={code}
            type="button"
            lang={code}
            onClick={() => setLang(code)}
            aria-pressed={active}
            title={LANG_META[code].label}
            className={cn(
              'min-w-8 rounded-full px-2.5 py-1 text-xs font-bold leading-none transition-colors',
              active
                ? tone === 'onDark'
                  ? 'bg-white text-green-800 shadow-sm'
                  : 'bg-green-700 text-white shadow-sm'
                : tone === 'onDark'
                  ? 'text-green-50 hover:bg-white/20'
                  : 'text-stone-600 hover:text-green-700 dark:text-stone-300',
            )}
          >
            {LANG_META[code].short}
          </button>
        )
      })}
    </div>
  )
}
