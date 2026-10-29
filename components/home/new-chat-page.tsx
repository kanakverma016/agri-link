'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { DEFAULT_PROFILE_LOGO } from '@/lib/constants'
import { useAuth } from '@/components/providers/auth-provider'
import type { ChatDetails, ChatUser } from '@/lib/types'

type ListedUser = ChatUser & { userType?: string; district?: string; state?: string }

export function NewChatPage({
  onBack,
  onOpenChat,
  showAlert,
}: {
  onBack: () => void
  onOpenChat: (chat: ChatDetails) => void
  showAlert: (title: string, message: string) => void
}) {
  const { user } = useAuth()
  const [opening, setOpening] = useState(false)

  const { data: users, error } = useSWR(
    user ? ['all-users', user.uid] : null,
    async ([, uid]): Promise<ListedUser[]> => {
      const snap = await getDocs(collection(db, 'users'))
      return snap.docs
        .filter((d) => d.id !== uid)
        .map((d) => {
          const data = d.data()
          return {
            uid: d.id,
            name: data.name || 'Unknown User',
            profilePicture: data.profilePicture || DEFAULT_PROFILE_LOGO,
            userType: data.userType,
            district: data.district,
            state: data.state,
          }
        })
    },
    { revalidateOnFocus: false },
  )

  async function findOrCreateChat(target: ChatUser) {
    if (!user || opening) return
    setOpening(true)
    try {
      const existing = await getDocs(
        query(collection(db, 'chats'), where('participants', 'array-contains', user.uid)),
      )
      let chatId: string | null = null
      existing.forEach((d) => {
        const participants = d.data().participants as string[]
        if (participants.includes(target.uid) && participants.length === 2) chatId = d.id
      })
      if (!chatId) {
        const created = await addDoc(collection(db, 'chats'), {
          participants: [user.uid, target.uid],
          lastMessage: 'Chat created',
          lastMessageTimestamp: serverTimestamp(),
        })
        chatId = created.id
      }
      onOpenChat({ chatId, otherUser: target })
    } catch (err) {
      console.error('Error creating chat: ', err)
      showAlert('Error', 'Could not create chat.')
    } finally {
      setOpening(false)
    }
  }

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-white">
      <nav className="w-full flex-shrink-0 bg-white shadow-sm">
        <div className="flex items-center px-4 py-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="mr-4 rounded-full p-1 text-gray-600 hover:bg-gray-100"
          >
            <i className="ph ph-arrow-left text-2xl" aria-hidden="true" />
          </button>
          <h2 className="text-xl font-bold text-gray-800">New Message</h2>
        </div>
      </nav>
      <main className="flex-grow overflow-y-auto">
        {error ? (
          <p className="p-10 text-center text-red-500">Error loading users.</p>
        ) : !users ? (
          <p className="p-10 text-center text-gray-500">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="p-10 text-center text-gray-500">No other users found.</p>
        ) : (
          users.map((u) => (
            <button
              key={u.uid}
              type="button"
              disabled={opening}
              onClick={() => findOrCreateChat({ uid: u.uid, name: u.name, profilePicture: u.profilePicture })}
              className="flex w-full items-center border-b border-gray-200 p-3 text-left hover:bg-gray-100 disabled:opacity-60"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u.profilePicture} alt="" className="mr-4 h-12 w-12 rounded-full object-cover" />
              <div className="flex-grow overflow-hidden">
                <p className="truncate font-semibold text-gray-800">{u.name}</p>
                <p className="truncate text-sm text-gray-500">
                  <span className="capitalize">{u.userType || 'User'}</span>
                  {u.district ? ` • ${u.district}` : ''}
                  {u.state ? `, ${u.state}` : ''}
                </p>
              </div>
            </button>
          ))
        )}
      </main>
    </div>
  )
}
