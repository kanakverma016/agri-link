'use client'

import { useLanguage } from '@/components/providers/language-provider'

export function OfflineContent() {
  const { t } = useLanguage()
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-green-50 p-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
        <i className="ph-fill ph-wifi-slash text-4xl text-green-700" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-extrabold text-gray-800">{t('You are offline')}</h1>
      <p className="max-w-xs text-gray-600">
        {t('SmartKrishi needs internet for live prices and your farm data. Pages you opened before are still available.')}
      </p>
      <a href="/" className="rounded-xl bg-green-600 px-6 py-3 font-bold text-white">
        {t('Try again')}
      </a>
    </main>
  )
}
