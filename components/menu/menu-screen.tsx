'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DEFAULT_PROFILE_LOGO } from '@/lib/constants'
import { useAuth } from '@/components/providers/auth-provider'
import { MobileFrame } from '@/components/mobile-frame'
import { BottomNav } from '@/components/bottom-nav'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { useLanguage } from '@/components/providers/language-provider'
import { LanguageToggle } from '@/components/language-toggle'

import { ExpertRequestModal } from '@/components/info/expert-request-modal'

type Dialog = 'logout' | 'logout-error' | 'coming-soon' | 'support' | 'expert' | null

function MenuLink({
  href,
  icon,
  color,
  label,
  last,
  onClick,
}: {
  href?: string
  icon: string
  color: string
  label: string
  last?: boolean
  onClick?: () => void
}) {
  const cls = `flex w-full items-center p-4 text-left transition hover:bg-gray-50 ${last ? '' : 'border-b'}`
  const content = (
    <>
      <i className={`ph ${icon} mr-4 text-2xl ${color}`} aria-hidden="true" />
      <span className="flex-grow font-medium text-gray-700">{label}</span>
      <i className="ph ph-caret-right text-gray-400" aria-hidden="true" />
    </>
  )
  return href ? (
    <Link href={href} className={cls}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {content}
    </button>
  )
}

export function MenuScreen() {
  const { user, profile, logout } = useAuth()
  const router = useRouter()
  const { t } = useLanguage()
  const [dialog, setDialog] = useState<Dialog>(null)

  async function handleLogout() {
    try {
      await logout()
      router.replace('/login')
    } catch (error) {
      console.error('Error signing out: ', error)
      setDialog('logout-error')
    }
  }

  const comingSoon = () => setDialog('coming-soon')

  return (
    <MobileFrame className="bg-gray-100">
      <main className="flex-grow overflow-y-auto p-4 pb-20">
        <div className="mb-6 flex items-center space-x-4 rounded-xl bg-white p-4 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={profile?.profilePicture || user?.photoURL || DEFAULT_PROFILE_LOGO}
            alt=""
            className="h-16 w-16 rounded-full border-2 border-green-200 object-cover"
          />
          <div className="flex-grow overflow-hidden">
            <h2 className="truncate text-xl font-bold text-gray-800">
              {profile?.name || user?.displayName || t('Kisan User')}
            </h2>
            <p className="truncate text-sm text-gray-500">{profile?.email || user?.email}</p>
          </div>
          <Link
            href="/my-profile"
            aria-label={t('Edit profile')}
            className="flex-shrink-0 text-gray-500 hover:text-green-600"
          >
            <i className="ph ph-pencil-simple text-2xl" aria-hidden="true" />
          </Link>
        </div>

        <div className="mb-4 flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
          <span className="flex items-center font-medium text-gray-700">
            <i className="ph ph-translate mr-4 text-2xl text-green-600" aria-hidden="true" />
            {t('Language')}
          </span>
          <LanguageToggle />
        </div>

        <div className="mb-4 overflow-hidden rounded-xl bg-white shadow-sm">
          <MenuLink href="/my-profile" icon="ph-user-circle" color="text-green-600" label={t('My Profile')} />
          <MenuLink
            href="/my-transactions"
            icon="ph-receipt"
            color="text-blue-600"
            label={t('My Transactions')}
            last
          />
        </div>

        <div className="mb-4 overflow-hidden rounded-xl bg-white shadow-sm">
          <MenuLink href="/my-bookings" icon="ph-truck" color="text-purple-600" label={t('My Bookings')} />
          <MenuLink
            href="/my-listings"
            icon="ph-storefront"
            color="text-yellow-600"
            label={t('My B2B Listings')}
          />
          <MenuLink
            icon="ph-bookmark-simple"
            color="text-indigo-600"
            label={t('Saved Posts')}
            last
            onClick={comingSoon}
          />
        </div>

        <div className="mb-4 overflow-hidden rounded-xl bg-white shadow-sm">
          <MenuLink
            icon="ph-headset"
            color="text-gray-600"
            label={t('Customer Support')}
            onClick={() => setDialog('support')}
          />
          <button
            type="button"
            onClick={() => setDialog('logout')}
            className="flex w-full items-center p-4 text-left text-red-600 transition hover:bg-red-50"
          >
            <i className="ph ph-sign-out mr-4 text-2xl" aria-hidden="true" />
            <span className="flex-grow font-medium">{t('Logout')}</span>
          </button>
        </div>
      </main>

      <BottomNav active="menu" />

      <ConfirmModal
        open={dialog === 'logout'}
        title={t('Logout')}
        message={t('Are you sure you want to logout?')}
        confirmLabel={t('Logout')}
        destructive
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          setDialog(null)
          handleLogout()
        }}
      />
      <ConfirmModal
        open={dialog === 'logout-error'}
        title={t('Error')}
        message={t('Could not log out. Please try again.')}
        destructive
        onCancel={() => setDialog(null)}
        onConfirm={() => setDialog(null)}
      />
      {dialog === 'support' && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          onClick={() => setDialog(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="support-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md animate-fade-up rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100 text-green-700">
                  <i className="ph ph-headset text-2xl" aria-hidden="true" />
                </span>
                <div>
                  <h2 id="support-title" className="text-lg font-bold text-gray-800">
                    {t('Customer Support')}
                  </h2>
                  <p className="text-sm text-gray-600">{t('How can we help you today?')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDialog(null)}
                aria-label={t('Close')}
                className="rounded-full p-1 text-gray-500 hover:bg-gray-100"
              >
                <i className="ph ph-x text-xl" aria-hidden="true" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setDialog('expert')}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 p-3 font-semibold text-white transition-colors hover:bg-green-700"
            >
              <i className="ph ph-user-focus text-xl" aria-hidden="true" />
              {t('Connect to Expert')}
            </button>
          </div>
        </div>
      )}
      {dialog === 'expert' && (
        <ExpertRequestModal policyTitle="Customer Support" onClose={() => setDialog(null)} />
      )}
      <ConfirmModal
        open={dialog === 'coming-soon'}
        title={t('Coming Soon')}
        message={t('This feature is under development.')}
        onCancel={() => setDialog(null)}
        onConfirm={() => setDialog(null)}
      />
    </MobileFrame>
  )
}
