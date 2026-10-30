'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useLiveQuery } from '@/lib/use-live-query'
import { DEFAULT_PROFILE_LOGO } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { ChatDetails, Post } from '@/lib/types'
import { useAuth } from '@/components/providers/auth-provider'
import { useLanguage } from '@/components/providers/language-provider'
import { LanguageToggle } from '@/components/language-toggle'
import { MobileFrame } from '@/components/mobile-frame'
import { BottomNav } from '@/components/bottom-nav'
import { useNotifications } from '@/components/providers/notification-provider'
import { AlertModal, useAlert } from '@/components/ui/alert-modal'
import { PostCard } from '@/components/home/post-card'
import { KrishiAssistant } from '@/components/assistant/krishi-assistant'
import { KisanTorchAd, PmKisanAd } from '@/components/home/ad-cards'
const CreatePostPage = dynamic(() => import('@/components/home/create-post-page').then((m) => m.CreatePostPage))
const NotificationsPage = dynamic(() => import('@/components/home/notifications-page').then((m) => m.NotificationsPage))
const WeatherPanel = dynamic(() => import('@/components/home/weather-panel').then((m) => m.WeatherPanel))
const ChatListPage = dynamic(() => import('@/components/home/chat-list-page').then((m) => m.ChatListPage))
const NewChatPage = dynamic(() => import('@/components/home/new-chat-page').then((m) => m.NewChatPage))
const ChatRoomPage = dynamic(() => import('@/components/home/chat-room-page').then((m) => m.ChatRoomPage))

const QUICK_LINKS = [
  { href: '/mandi', icon: 'ph-chart-line-up', label: 'Mandi Prices', tone: 'bg-green-100 text-green-800' },
  { href: '/b2b-marketplace', icon: 'ph-handshake', label: 'Marketplace', tone: 'bg-amber-100 text-amber-800' },
  { href: '/news', icon: 'ph-newspaper', label: 'Daily News', tone: 'bg-sky-100 text-sky-800' },
  { href: '/insurance', icon: 'ph-shield-check', label: 'Insurance', tone: 'bg-green-100 text-green-800' },
  { href: '/gov-scheme', icon: 'ph-bank', label: 'Gov. Schemes', tone: 'bg-amber-100 text-amber-800' },
  { href: '/nearby-locator', icon: 'ph-map-pin-area', label: 'Nearby', tone: 'bg-sky-100 text-sky-800' },
]

export function HomeScreen() {
  const { user, profile } = useAuth()
  const { t } = useLanguage()
  const { alert, showAlert, closeAlert } = useAlert()
  const { items: posts } = useLiveQuery<Post>({
    table: 'posts',
    enabled: Boolean(user),
    orderBy: 'createdAt',
    ascending: false,
    limit: 40,
  })
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showWeather, setShowWeather] = useState(false)
  const [showMessenger, setShowMessenger] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [activeChat, setActiveChat] = useState<ChatDetails | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { unread, unreadMessages, registerChatOpener } = useNotifications()

  useEffect(
    () =>
      registerChatOpener((chat) => {
        setShowNotifications(false)
        setShowMessenger(false)
        setShowNewChat(false)
        setActiveChat(chat)
      }),
    [registerChatOpener],
  )

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

  function handleWeather() {
    if (!profile) {
      showAlert(
        t('Error'),
        t('Could not find user location data. Please ensure your profile is complete.'),
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
      <header className="z-20 flex-shrink-0 rounded-b-[2rem] bg-gradient-to-br from-emerald-700 via-teal-700 to-teal-900 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] text-white shadow-lg sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 animate-fade-up">
            <p className="text-sm font-semibold text-green-100">{t('Namaste')}</p>
            <h1 className="truncate text-xl font-extrabold sm:text-2xl">
              {profile?.name?.split(' ')[0] || user?.displayName?.split(' ')[0] || t('Kisan')}
            </h1>
            {profile?.district && (
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs font-semibold text-green-100">
                <i className="ph-fill ph-map-pin" aria-hidden="true" />
                {profile.district}, {profile.state}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {[
              { label: t('Weather and advisory'), icon: 'ph-cloud-sun', onClick: handleWeather, badge: 0 },
              { label: t('Notifications'), icon: 'ph-bell', onClick: () => setShowNotifications(true), badge: unread },
              {
                label: t('Messenger'),
                icon: 'ph-chat-circle-dots',
                onClick: () => setShowMessenger(true),
                badge: unreadMessages,
              },
            ].map((b) => (
              <button
                key={b.label}
                type="button"
                onClick={b.onClick}
                aria-label={b.badge ? t('{label}, {count} unread', { label: b.label, count: b.badge }) : b.label}
                className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
              >
                <i className={`ph ${b.icon} text-2xl`} aria-hidden="true" />
                {b.badge > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 animate-pop items-center justify-center rounded-full bg-amber-400 px-1 text-[11px] font-extrabold leading-none text-stone-900 ring-2 ring-teal-800">
                    {b.badge > 9 ? '9+' : b.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <LanguageToggle tone="onDark" className="mt-3" />
      </header>

      <div ref={scrollRef} className="flex-grow overflow-y-auto pb-28">
        <div className="px-4 pt-4">
          <div className="relative">
            <label htmlFor="search-bar" className="sr-only">
              {t('Search posts')}
            </label>
            <input
              type="search"
              id="search-bar"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('Search posts, crops, tags...')}
              className="w-full rounded-full border border-green-100 bg-white py-3 pl-11 pr-4 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
            <i
              className="ph ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-xl text-green-700"
              aria-hidden="true"
            />
          </div>
        </div>

        <section aria-label={t('Quick actions')} className="grid grid-cols-3 gap-3 px-4 pt-4 md:grid-cols-6 md:px-6">
          {QUICK_LINKS.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch
              style={{ animationDelay: `${i * 50}ms` }}
              className="flex animate-fade-up flex-col items-center gap-2 rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-green-100 hover:shadow-md"
            >
              <span className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', link.tone)}>
                <i className={`ph-fill ${link.icon} text-2xl`} aria-hidden="true" />
              </span>
              <span className="text-xs font-bold leading-tight text-stone-700">{t(link.label)}</span>
            </Link>
          ))}
        </section>

        <div className="px-4 pt-4">
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-green-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={profilePic} alt="" className="h-10 w-10 rounded-full object-cover" />
            <span className="flex-grow font-semibold text-stone-500">{t('Share with farmers...')}</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-700 text-white">
              <i className="ph-fill ph-plus" aria-hidden="true" />
            </span>
          </button>
        </div>

        <main className="px-4 pt-2">
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
      <KrishiAssistant
        hidden={showCreate || showNotifications || showWeather || showMessenger || showNewChat || Boolean(activeChat)}
      />

      {showCreate && <CreatePostPage onClose={() => setShowCreate(false)} showAlert={showAlert} />}
      {showNotifications && <NotificationsPage onBack={() => setShowNotifications(false)} onOpenChat={openChat} />}
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
