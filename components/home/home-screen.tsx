'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useLiveQuery } from '@/lib/use-live-query'
import { DEFAULT_PROFILE_LOGO } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { ChatDetails, Post } from '@/lib/types'
import { useAuth } from '@/components/providers/auth-provider'
import { MobileFrame } from '@/components/mobile-frame'
import { BottomNav } from '@/components/bottom-nav'
import { AlertModal, useAlert } from '@/components/ui/alert-modal'
import { PostCard } from '@/components/home/post-card'
import { KisanTorchAd, PmKisanAd } from '@/components/home/ad-cards'
import { CreatePostPage } from '@/components/home/create-post-page'
import { NotificationsPage } from '@/components/home/notifications-page'
import { WeatherPanel } from '@/components/home/weather-panel'
import { ChatListPage } from '@/components/home/chat-list-page'
import { NewChatPage } from '@/components/home/new-chat-page'
import { ChatRoomPage } from '@/components/home/chat-room-page'

const QUICK_LINKS = [
  { href: '/news', icon: 'ph-newspaper', label: 'Daily News' },
  { href: '/insurance', icon: 'ph-shield', label: 'Insurance' },
  { href: '/gov-scheme', icon: 'ph-bank', label: 'Gov. Schemes' },
]

export function HomeScreen() {
  const { user, profile } = useAuth()
  const { alert, showAlert, closeAlert } = useAlert()
  const { items: posts } = useLiveQuery<Post>({
    table: 'posts',
    enabled: Boolean(user),
    orderBy: 'createdAt',
    ascending: false,
  })
  const [search, setSearch] = useState('')
  const [headerHidden, setHeaderHidden] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showWeather, setShowWeather] = useState(false)
  const [showMessenger, setShowMessenger] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [activeChat, setActiveChat] = useState<ChatDetails | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastScrollY = useRef(0)

  // Open a chat directly when redirected here with ?openChat=true&chatId=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('openChat') !== 'true') return
    const chatId = params.get('chatId')
    const uid = params.get('otherUserId')
    const name = params.get('otherUserName')
    const pic = params.get('otherUserPic')
    if (chatId && uid && name && pic) {
      setActiveChat({ chatId, otherUser: { uid, name, profilePicture: pic } })
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  const filteredPosts = useMemo(() => {
    const term = search.toLowerCase()
    if (!term) return posts
    return posts.filter(
      (p) =>
        p.caption?.toLowerCase().includes(term) ||
        p.tags?.some((tag) => tag.toLowerCase().includes(term)),
    )
  }, [posts, search])

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const y = e.currentTarget.scrollTop
    setHeaderHidden(y > lastScrollY.current && y > 50)
    lastScrollY.current = y
  }

  function handleWeather() {
    if (!profile) {
      showAlert(
        'Error',
        'Could not find user location data. Please ensure your profile is complete.',
      )
      return
    }
    setShowWeather(true)
  }

  function handleHome(e: React.MouseEvent) {
    e.preventDefault()
    setSearch('')
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openChat(chat: ChatDetails) {
    setShowNewChat(false)
    setActiveChat(chat)
  }

  const profilePic = profile?.profilePicture || user?.photoURL || DEFAULT_PROFILE_LOGO

  return (
    <MobileFrame>
      <nav className="z-20 w-full flex-shrink-0 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-green-700">Agri-Link</h1>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleWeather}
              aria-label="Weather and advisory"
              className="rounded-full p-2 transition-colors hover:bg-gray-100"
            >
              <i className="ph ph-cloud-sun text-2xl text-gray-600" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setShowNotifications(true)}
              aria-label="Notifications"
              className="rounded-full p-2 transition-colors hover:bg-gray-100"
            >
              <i className="ph ph-bell text-2xl text-gray-600" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setShowMessenger(true)}
              aria-label="Messenger"
              className="rounded-full p-2 transition-colors hover:bg-gray-100"
            >
              <i className="ph ph-messenger-logo text-2xl text-gray-600" aria-hidden="true" />
            </button>
          </div>
        </div>
      </nav>

      <div ref={scrollRef} onScroll={handleScroll} className="flex-grow overflow-y-auto pb-20">
        <div
          className={cn(
            'sticky top-0 z-10 bg-white transition-transform duration-300',
            headerHidden && '-translate-y-full',
          )}
        >
          <div className="border-t border-gray-200 p-4">
            <div className="relative">
              <label htmlFor="search-bar" className="sr-only">
                Search posts
              </label>
              <input
                type="search"
                id="search-bar"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search posts by tags or caption..."
                className="w-full rounded-full border border-gray-300 bg-gray-100 p-2 pl-10 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <i
                className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              />
            </div>
          </div>
          <div className="p-4 pt-0">
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex w-full items-center rounded-lg bg-white p-3 text-left shadow-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={profilePic} alt="" className="mr-3 h-8 w-8 rounded-full object-cover" />
              <span className="flex-grow text-gray-500">Click to create post</span>
              <i className="ph ph-pencil-simple text-xl text-gray-500" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="border-b border-gray-200 px-4 pb-4">
          <div className="flex items-center justify-around text-center">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex w-1/3 flex-col items-center justify-center rounded-lg p-2 transition-colors hover:bg-gray-100"
              >
                <i className={`ph ${link.icon} text-3xl text-gray-600`} aria-hidden="true" />
                <span className="mt-1 text-xs font-medium text-gray-700">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <main className="px-4">
          {filteredPosts.map((post, index) => (
            <div key={post.id}>
              <PostCard post={post} currentUid={user!.uid} />
              {!search && index === 0 && <PmKisanAd />}
              {!search && index === 1 && <KisanTorchAd />}
            </div>
          ))}
        </main>
      </div>

      <BottomNav active="home" onHomeClick={handleHome} />

      {showCreate && <CreatePostPage onClose={() => setShowCreate(false)} showAlert={showAlert} />}
      {showNotifications && <NotificationsPage onBack={() => setShowNotifications(false)} />}
      {showWeather && profile && (
        <WeatherPanel
          district={profile.district ?? ''}
          state={profile.state ?? ''}
          onClose={() => setShowWeather(false)}
        />
      )}
      {showMessenger && (
        <ChatListPage
          onBack={() => setShowMessenger(false)}
          onNewChat={() => setShowNewChat(true)}
          onOpenChat={openChat}
        />
      )}
      {showNewChat && (
        <NewChatPage
          onBack={() => setShowNewChat(false)}
          onOpenChat={openChat}
          showAlert={showAlert}
        />
      )}
      {activeChat && (
        <ChatRoomPage
          key={activeChat.chatId}
          chat={activeChat}
          onBack={() => setActiveChat(null)}
          showAlert={showAlert}
        />
      )}
      <AlertModal alert={alert} onClose={closeAlert} />
    </MobileFrame>
  )
}
