'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_PROFILE_LOGO } from '@/lib/constants'
import { useAuth } from '@/components/providers/auth-provider'
import { useLanguage } from '@/components/providers/language-provider'
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
  const { t } = useLanguage()
  const [opening, setOpening] = useState(false)

  const { data: users, error } = useSWR(
    user ? ['all-users', user.uid] : null,
    async ([, uid]): Promise<ListedUser[]> => {
      const { data, error } = await createClient()
        .from('profiles')
        .select('id, name, profilePicture, userType, district, state')
        .neq('id', uid)
      if (error) throw error
      return (data ?? []).map((p) => ({
        uid: p.id as string,
        name: p.name || 'Unknown User',
        profilePicture: p.profilePicture || DEFAULT_PROFILE_LOGO,
        userType: p.userType ?? undefined,
        district: p.district ?? undefined,
        state: p.state ?? undefined,
      }))
    },
    { revalidateOnFocus: false },
  )

  async function findOrCreateChat(target: ChatUser) {
    if (!user || opening) return
    setOpening(true)
    try {
      const supabase = createClient()
      const { data: existing, error: findError } = await supabase
        .from('chats')
        .select('id, participants')
        .contains('participants', [user.uid, target.uid])
      if (findError) throw findError
      let chatId: string | undefined = existing?.find((c) => c.participants.length === 2)?.id
      if (!chatId) {
        const { data: created, error: createError } = await supabase
          .from('chats')
          .insert({ participants: [user.uid, target.uid], lastMessage: 'Chat created' })
          .select('id')
          .single()
        if (createError) throw createError
        chatId = created.id as string
      }
      onOpenChat({ chatId, otherUser: target })
    } catch (err) {
      console.error('Error creating chat: ', err)
      showAlert(t('Error'), t('Could not create chat.'))
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
            aria-label={t('Back')}
            className="mr-4 rounded-full p-1 text-gray-600 hover:bg-gray-100"
          >
            <i className="ph ph-arrow-left text-2xl" aria-hidden="true" />
          </button>
          <h2 className="text-xl font-bold text-gray-800">{t('New Message')}</h2>
        </div>
      </nav>
      <main className="flex-grow overflow-y-auto">
        {error ? (
          <p className="p-10 text-center text-red-500">{t('Error loading users.')}</p>
        ) : !users ? (
          <p className="p-10 text-center text-gray-500">{t('Loading users...')}</p>
        ) : users.length === 0 ? (
          <p className="p-10 text-center text-gray-500">{t('No other users found.')}</p>
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
                  <span className="capitalize">{u.userType ? t(u.userType) : t('User')}</span>
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
