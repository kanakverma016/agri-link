export const LANGS = ['en', 'hi', 'mr'] as const
export type Lang = (typeof LANGS)[number]

export const DEFAULT_LANG: Lang = 'en'
export const LANG_COOKIE = 'lang'

export const LANG_META: Record<Lang, { label: string; short: string; locale: string; speech: string }> = {
  en: { label: 'English', short: 'EN', locale: 'en-IN', speech: 'en-IN' },
  hi: { label: 'हिन्दी', short: 'हि', locale: 'hi-IN', speech: 'hi-IN' },
  mr: { label: 'मराठी', short: 'म', locale: 'mr-IN', speech: 'mr-IN' },
}

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (LANGS as readonly string[]).includes(value)
}
