'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_PROFILE_LOGO } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useAuth } from '@/components/providers/auth-provider'
import type { ChatDetails } from '@/lib/types'

export type NotificationKind = 'message' | 'alert' | 'success' | 'info'

export type AppNotification = {
  id: string
  kind: NotificationKind
  title: string
  body: string
  createdAt: number
  read: boolean
  chat?: ChatDetails
  avatar?: string
}

type NotifyInput = Pick<AppNotification, 'kind' | 'title' | 'body' | 'chat' | 'avatar'>
type PermissionState = NotificationPermission | 'unsupported'

type NotificationContextValue = {
  items: AppNotification[]
  unread: number
  unreadMessages: number
  permission: PermissionState
  notify: (input: NotifyInput) => void
  markAllRead: () => void
  clearAll: () => void
  requestPermission: () => Promise<void>
  openChat: (chat: ChatDetails) => void
  registerChatOpener: (opener: (chat: ChatDetails) => void) => () => void
  setActiveChatId: (chatId: string | null) => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

const MAX_ITEMS = 50
const TOAST_MS = 5000

export const KIND_STYLE: Record<NotificationKind, { icon: string; tone: string }> = {
  message: { icon: 'ph-chat-circle-dots', tone: 'bg-sky-100 text-sky-800' },
  alert: { icon: 'ph-warning', tone: 'bg-amber-100 text-amber-800' },
  success: { icon: 'ph-check-circle', tone: 'bg-green-100 text-green-800' },
  info: { icon: 'ph-info', tone: 'bg-green-100 text-green-800' },
}

function chatUrl(chat: ChatDetails) {
  const params = new URLSearchParams({
    openChat: 'true',
    chatId: chat.chatId,
    otherUserId: chat.otherUser.uid,
    otherUserName: chat.otherUser.name,
    otherUserPic: chat.otherUser.profilePicture,
  })
  return `/?${params.toString()}`
}

async function showSystemNotification(title: string, body: string, tag: string, url: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  if (!document.hidden) return
  const options = { body, tag, icon: '/icons/icon-192.png', badge: '/icons/icon-96.png', data: { url } }
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) {
      await reg.showNotification(title, options)
      return
    }
    new Notification(title, options)
  } catch {
    // Some browsers only allow notifications from a service worker; nothing else to try.
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<AppNotification[]>([])
  const [toasts, setToasts] = useState<AppNotification[]>([])
  const [permission, setPermission] = useState<PermissionState>('default')
  const openerRef = useRef<((chat: ChatDetails) => void) | null>(null)
  const activeChatRef = useRef<string | null>(null)
  const counter = useRef(0)

  const notify = useCallback((input: NotifyInput) => {
    counter.current += 1
    const item: AppNotification = {
      ...input,
      id: `${Date.now()}-${counter.current}`,
      createdAt: Date.now(),
      read: false,
    }
    setItems((prev) => [item, ...prev].slice(0, MAX_ITEMS))
    setToasts((prev) => [item, ...prev].slice(0, 3))
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== item.id)), TOAST_MS)
    void showSystemNotification(
      item.title,
      item.body,
      item.chat ? `chat-${item.chat.chatId}` : item.id,
      item.chat ? chatUrl(item.chat) : '/',
    )
  }, [])

  const markAllRead = useCallback(() => {
    setItems((prev) => (prev.some((n) => !n.read) ? prev.map((n) => ({ ...n, read: true })) : prev))
  }, [])
  const clearAll = useCallback(() => setItems([]), [])

  const openChat = useCallback(
    (chat: ChatDetails) => {
      if (openerRef.current) openerRef.current(chat)
      else router.push(chatUrl(chat))
    },
    [router],
  )

  const registerChatOpener = useCallback((opener: (chat: ChatDetails) => void) => {
    openerRef.current = opener
    return () => {
      if (openerRef.current === opener) openerRef.current = null
    }
  }, [])

  const setActiveChatId = useCallback((chatId: string | null) => {
    activeChatRef.current = chatId
  }, [])

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted') {
      notify({ kind: 'success', title: 'Alerts are on', body: 'You will get notified about new messages.' })
    }
  }, [notify])

  useEffect(() => {
    setPermission(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)
  }, [])

  useEffect(() => {
    const onOffline = () =>
      notify({ kind: 'alert', title: 'You are offline', body: 'Check your internet. Some features may not work.' })
    const onOnline = () => notify({ kind: 'success', title: 'Back online', body: 'Your connection is restored.' })
    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    return () => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
    }
  }, [notify])

  useEffect(() => {
    if (!user) return
    const uid = user.uid
    const supabase = createClient()
    const channel = supabase
      .channel(`notify-messages-${uid}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const m = payload.new as { chatId: string; senderId: string; text?: string | null; imageUrl?: string | null }
        if (m.senderId === uid || activeChatRef.current === m.chatId) return
        const { data: chat } = await supabase.from('chats').select('participants').eq('id', m.chatId).maybeSingle()
        if (!chat || !(chat.participants as string[]).includes(uid)) return
        const { data: sender } = await supabase
          .from('profiles')
          .select('name, profilePicture')
          .eq('id', m.senderId)
          .maybeSingle()
        const name = sender?.name || 'New message'
        const avatar = sender?.profilePicture || DEFAULT_PROFILE_LOGO
        notify({
          kind: 'message',
          title: name,
          body: m.text?.trim() || (m.imageUrl ? 'Sent you a photo' : 'Sent you a message'),
          avatar,
          chat: { chatId: m.chatId, otherUser: { uid: m.senderId, name, profilePicture: avatar } },
        })
      })
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [user, notify])

  const value = useMemo<NotificationContextValue>(
    () => ({
      items,
      unread: items.filter((n) => !n.read).length,
      unreadMessages: items.filter((n) => !n.read && n.kind === 'message').length,
      permission,
      notify,
      markAllRead,
      clearAll,
      requestPermission,
      openChat,
      registerChatOpener,
      setActiveChatId,
    }),
    [items, permission, notify, markAllRead, clearAll, requestPermission, openChat, registerChatOpener, setActiveChatId],
  )

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-0 z-[120] flex flex-col items-center gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === 'alert' ? 'alert' : 'status'}
            className="neu pointer-events-auto flex w-full max-w-sm animate-fade-up items-center gap-3 rounded-2xl p-3 ring-1 ring-green-700/10"
          >
            <button
              type="button"
              onClick={() => {
                dismiss(t.id)
                if (t.chat) openChat(t.chat)
              }}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              {t.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.avatar} alt="" className="h-11 w-11 flex-shrink-0 rounded-full object-cover" />
              ) : (
                <span
                  className={cn(
                    'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full',
                    KIND_STYLE[t.kind].tone,
                  )}
                >
                  <i className={`ph-fill ${KIND_STYLE[t.kind].icon} text-2xl`} aria-hidden="true" />
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-sm font-extrabold text-stone-800">{t.title}</span>
                <span className="block truncate text-sm text-stone-600">{t.body}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-stone-500 hover:bg-black/5"
            >
              <i className="ph ph-x text-lg" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}
