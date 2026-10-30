'use client'

import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { useLiveQuery } from '@/lib/use-live-query'
import { DEFAULT_PROFILE_LOGO } from '@/lib/constants'
import { useAuth } from '@/components/providers/auth-provider'
import { useLanguage } from '@/components/providers/language-provider'
import type { ChatDetails } from '@/lib/types'

type ChatRow = {
  id: string
  participants: string[]
  lastMessage: string | null
  lastMessageTimestamp: string | null
}
type ChatItem = ChatDetails & { lastMessage: string; time: string }

export function ChatListPage({
  onBack,
  onNewChat,
  onOpenChat,
}: {
  onBack: () => void
  onNewChat: () => void
  onOpenChat: (chat: ChatDetails) => void
}) {
  const { user } = useAuth()
  const { t, locale } = useLanguage()
  const {
    items: rows,
    loading,
    error: loadError,
  } = useLiveQuery<ChatRow>({
    table: 'chats',
    enabled: Boolean(user),
    contains: { column: 'participants', value: user ? [user.uid] : [] },
    orderBy: 'lastMessageTimestamp',
    ascending: false,
  })

  const otherUids = Array.from(
    new Set(rows.flatMap((r) => r.participants.filter((uid) => uid !== user?.uid))),
  ).sort()

  const { data: people, error: peopleError } = useSWR(
    otherUids.length ? ['chat-people', ...otherUids] : null,
    async ([, ...ids]) => {
      const { data, error } = await createClient()
        .from('profiles')
        .select('id, name, profilePicture')
        .in('id', ids as string[])
      if (error) throw error
      return Object.fromEntries((data ?? []).map((p) => [p.id as string, p]))
    },
    { revalidateOnFocus: false },
  )

  const error = loadError || Boolean(peopleError)
  const chats: ChatItem[] | null =
    loading || (otherUids.length > 0 && !people)
      ? null
      : rows.flatMap((row): ChatItem[] => {
          const otherUid = row.participants.find((uid) => uid !== user?.uid)
          if (!otherUid) return []
          const other = people?.[otherUid]
          return [
            {
              chatId: row.id,
              lastMessage: row.lastMessage || '...',
              time: row.lastMessageTimestamp
                ? new Date(row.lastMessageTimestamp).toLocaleTimeString(locale, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '',
              otherUser: {
                uid: otherUid,
                name: other ? other.name || t('Unknown User') : t('Deleted User'),
                profilePicture: other?.profilePicture || DEFAULT_PROFILE_LOGO,
              },
            },
          ]
        })

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-gray-50">
      <nav className="w-full flex-shrink-0 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={onBack}
            aria-label={t('Back')}
            className="mr-4 rounded-full p-1 text-gray-600 hover:bg-gray-100"
          >
            <i className="ph ph-arrow-left text-2xl" aria-hidden="true" />
          </button>
          <h2 className="text-xl font-bold text-gray-800">{t('Messenger')}</h2>
          <button
            type="button"
            onClick={onNewChat}
            aria-label={t('New message')}
            className="rounded-full p-1 text-green-600 hover:bg-green-50"
          >
            <i className="ph ph-pencil-simple-line text-2xl" aria-hidden="true" />
          </button>
        </div>
      </nav>
      <main className="flex-grow overflow-y-auto">
        {error ? (
          <p className="p-10 text-center text-red-500">{t('Error loading conversations.')}</p>
        ) : chats === null ? (
          <p className="p-10 text-center text-gray-500">{t('Loading conversations...')}</p>
        ) : chats.length === 0 ? (
          <p className="p-10 text-center text-gray-500">{t('No conversations yet.')}</p>
        ) : (
          chats.map((chat) => (
            <button
              key={chat.chatId}
              type="button"
              onClick={() => onOpenChat({ chatId: chat.chatId, otherUser: chat.otherUser })}
              className="flex w-full items-center border-b border-gray-200 p-3 text-left hover:bg-gray-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={chat.otherUser.profilePicture}
                alt=""
                className="mr-4 h-12 w-12 rounded-full object-cover"
              />
              <div className="flex-grow overflow-hidden">
                <p className="truncate font-semibold text-gray-800">{chat.otherUser.name}</p>
                <p className="truncate text-sm text-gray-500">{chat.lastMessage}</p>
              </div>
              <span className="ml-2 flex-shrink-0 text-xs text-gray-400">{chat.time}</span>
            </button>
          ))
        )}
      </main>
    </div>
  )
}
