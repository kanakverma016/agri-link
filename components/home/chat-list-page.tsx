'use client'

import { useEffect, useState } from 'react'
import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { DEFAULT_PROFILE_LOGO } from '@/lib/constants'
import { useAuth } from '@/components/providers/auth-provider'
import type { ChatDetails } from '@/lib/types'

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
  const [chats, setChats] = useState<ChatItem[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessageTimestamp', 'desc'),
    )
    return onSnapshot(
      q,
      async (snapshot) => {
        const items = await Promise.all(
          snapshot.docs.map(async (chatDoc): Promise<ChatItem | null> => {
            const data = chatDoc.data()
            const otherUid = (data.participants as string[]).find((uid) => uid !== user.uid)
            if (!otherUid) return null
            const userSnap = await getDoc(doc(db, 'users', otherUid))
            const other = userSnap.exists()
              ? userSnap.data()
              : { name: 'Deleted User', profilePicture: DEFAULT_PROFILE_LOGO }
            return {
              chatId: chatDoc.id,
              lastMessage: data.lastMessage || '...',
              time:
                data.lastMessageTimestamp
                  ?.toDate()
                  .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '',
              otherUser: {
                uid: otherUid,
                name: other.name || 'Unknown User',
                profilePicture: other.profilePicture || DEFAULT_PROFILE_LOGO,
              },
            }
          }),
        )
        setChats(items.filter((c): c is ChatItem => c !== null))
        setError(false)
      },
      (err) => {
        console.error('Error loading chats: ', err)
        setError(true)
      },
    )
  }, [user])

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-gray-50">
      <nav className="w-full flex-shrink-0 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="mr-4 rounded-full p-1 text-gray-600 hover:bg-gray-100"
          >
            <i className="ph ph-arrow-left text-2xl" aria-hidden="true" />
          </button>
          <h2 className="text-xl font-bold text-gray-800">Messenger</h2>
          <button
            type="button"
            onClick={onNewChat}
            aria-label="New message"
            className="rounded-full p-1 text-green-600 hover:bg-green-50"
          >
            <i className="ph ph-pencil-simple-line text-2xl" aria-hidden="true" />
          </button>
        </div>
      </nav>
      <main className="flex-grow overflow-y-auto">
        {error ? (
          <p className="p-10 text-center text-red-500">Error loading conversations.</p>
        ) : chats === null ? (
          <p className="p-10 text-center text-gray-500">Loading conversations...</p>
        ) : chats.length === 0 ? (
          <p className="p-10 text-center text-gray-500">No conversations yet.</p>
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
