'use client'

import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { ChatDetails } from '@/lib/types'
import { KIND_STYLE, useNotifications } from '@/components/providers/notification-provider'
import { useLanguage, type TFunction } from '@/components/providers/language-provider'

function timeAgo(ts: number, t: TFunction) {
  const mins = Math.floor((Date.now() - ts) / 60000)
  if (mins < 1) return t('Just now')
  if (mins < 60) return t('{n} min ago', { n: mins })
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return t('{n} hr ago', { n: hrs })
  return t('{n} d ago', { n: Math.floor(hrs / 24) })
}

export function NotificationsPage({
  onBack,
  onOpenChat,
}: {
  onBack: () => void
  onOpenChat: (chat: ChatDetails) => void
}) {
  const { items, permission, markAllRead, clearAll, requestPermission } = useNotifications()
  const { t } = useLanguage()

  useEffect(() => {
    markAllRead()
  }, [markAllRead, items.length])

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-gray-50">
      <nav className="w-full flex-shrink-0 bg-white shadow-sm">
        <div className="flex items-center px-4 py-3">
          <button type="button" onClick={onBack} aria-label={t('Back')} className="mr-4 text-gray-600">
            <i className="ph ph-arrow-left text-2xl" aria-hidden="true" />
          </button>
          <h2 className="flex-grow text-xl font-bold text-green-900">{t('Notifications')}</h2>
          {items.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="rounded-full px-3 py-1.5 text-sm font-bold text-green-700 hover:bg-green-50"
            >
              {t('Clear all')}
            </button>
          )}
        </div>
      </nav>

      <main className="flex-grow overflow-y-auto overscroll-contain p-4">
        {permission === 'default' && (
          <div className="neu mb-4 flex items-center gap-3 rounded-2xl p-4">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
              <i className="ph-fill ph-bell-ringing text-2xl" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-grow">
              <p className="text-sm font-extrabold text-stone-800">{t('Turn on alerts')}</p>
              <p className="text-sm text-stone-600">
                {t('Get notified about new messages, even when the app is closed.')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void requestPermission()}
              className="flex-shrink-0 rounded-full bg-green-700 px-4 py-2 text-sm font-bold text-white shadow-md"
            >
              {t('Allow')}
            </button>
          </div>
        )}
        {permission === 'denied' && (
          <p className="mb-4 rounded-2xl bg-amber-100 p-3 text-sm font-semibold text-amber-800">
            {t('Alerts are blocked. Enable notifications for this site in your browser settings.')}
          </p>
        )}

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <span className="neu-inset flex h-24 w-24 items-center justify-center rounded-full text-green-800">
              <i className="ph-fill ph-bell text-5xl" aria-hidden="true" />
            </span>
            <h3 className="text-2xl font-bold text-green-900">{t('No Notifications')}</h3>
            <p className="text-gray-500">
              {t('Sit back and relax! We will notify you once we have something for you.')}
            </p>
          </div>
        ) : (
          <ul className="space-y-3 pb-4">
            {items.map((n) => {
              const style = KIND_STYLE[n.kind]
              const content = (
                <>
                  {n.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={n.avatar} alt="" className="h-11 w-11 flex-shrink-0 rounded-full object-cover" />
                  ) : (
                    <span
                      className={cn(
                        'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full',
                        style.tone,
                      )}
                    >
                      <i className={`ph-fill ${style.icon} text-2xl`} aria-hidden="true" />
                    </span>
                  )}
                  <span className="min-w-0 flex-grow">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-extrabold text-stone-800">{n.title}</span>
                      <span className="flex-shrink-0 text-xs font-semibold text-stone-500">{timeAgo(n.createdAt, t)}</span>
                    </span>
                    <span className="line-clamp-2 text-sm text-stone-600">{n.body}</span>
                  </span>
                </>
              )
              return (
                <li key={n.id}>
                  {n.chat ? (
                    <button
                      type="button"
                      onClick={() => onOpenChat(n.chat!)}
                      className="neu-btn flex w-full items-center gap-3 rounded-2xl p-3 text-left"
                    >
                      {content}
                    </button>
                  ) : (
                    <div className="neu-btn flex w-full items-center gap-3 rounded-2xl p-3">{content}</div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
