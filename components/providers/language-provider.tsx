'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { DEFAULT_LANG, LANG_COOKIE, LANG_META, isLang, type Lang } from '@/lib/i18n/config'
import { hi } from '@/lib/i18n/hi'
import { mr } from '@/lib/i18n/mr'

type Vars = Record<string, string | number>
export type TFunction = (key: string, vars?: Vars) => string

type LanguageContextValue = {
  lang: Lang
  setLang: (lang: Lang) => void
  t: TFunction
  /** BCP-47 locale for Intl / toLocale*String formatting. */
  locale: string
  /** BCP-47 locale for browser speech recognition. */
  speechLang: string
}

const DICTIONARIES: Record<Lang, Record<string, string>> = { en: {}, hi, mr }

function translate(lang: Lang, key: string, vars?: Vars) {
  const template = DICTIONARIES[lang][key] ?? key
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  )
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({
  initialLang = DEFAULT_LANG,
  children,
}: {
  initialLang?: Lang
  children: React.ReactNode
}) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  const setLang = useCallback((next: Lang) => {
    if (!isLang(next)) return
    setLangState(next)
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
    try {
      localStorage.setItem(LANG_COOKIE, next)
    } catch {}
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  // Cookie is the source of truth on the server; if only localStorage has a choice, adopt it once.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LANG_COOKIE)
      const hasCookie = document.cookie.split('; ').some((c) => c.startsWith(`${LANG_COOKIE}=`))
      if (!hasCookie && isLang(stored)) setLang(stored)
    } catch {}
  }, [setLang])

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      setLang,
      t: (key, vars) => translate(lang, key, vars),
      locale: LANG_META[lang].locale,
      speechLang: LANG_META[lang].speech,
    }),
    [lang, setLang],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>')
  return ctx
}
