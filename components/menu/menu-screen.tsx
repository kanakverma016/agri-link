'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DEFAULT_PROFILE_LOGO } from '@/lib/constants'
import { useAuth } from '@/components/providers/auth-provider'
import { MobileFrame } from '@/components/mobile-frame'
import { BottomNav } from '@/components/bottom-nav'
import { ConfirmModal } from '@/components/ui/confirm-modal'

type Dialog = 'logout' | 'logout-error' | 'coming-soon' | null

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
              {profile?.name || user?.displayName || 'Kisan User'}
            </h2>
            <p className="truncate text-sm text-gray-500">{profile?.email || user?.email}</p>
          </div>
          <Link
            href="/my-profile"
            aria-label="Edit profile"
            className="flex-shrink-0 text-gray-500 hover:text-green-600"
          >
            <i className="ph ph-pencil-simple text-2xl" aria-hidden="true" />
          </Link>
        </div>

        <div className="mb-4 overflow-hidden rounded-xl bg-white shadow-sm">
          <MenuLink href="/my-profile" icon="ph-user-circle" color="text-green-600" label="My Profile" />
          <MenuLink
            href="/my-transactions"
            icon="ph-receipt"
            color="text-blue-600"
            label="My Transactions"
            last
          />
        </div>

        <div className="mb-4 overflow-hidden rounded-xl bg-white shadow-sm">
          <MenuLink href="/my-bookings" icon="ph-truck" color="text-purple-600" label="My Bookings" />
          <MenuLink
            href="/my-listings"
            icon="ph-storefront"
            color="text-yellow-600"
            label="My B2B Listings"
          />
          <MenuLink
            icon="ph-bookmark-simple"
            color="text-indigo-600"
            label="Saved Posts"
            last
            onClick={comingSoon}
          />
        </div>

        <div className="mb-4 overflow-hidden rounded-xl bg-white shadow-sm">
          <MenuLink
            icon="ph-headset"
            color="text-gray-600"
            label="Customer Support"
            onClick={comingSoon}
          />
          <button
            type="button"
            onClick={() => setDialog('logout')}
            className="flex w-full items-center p-4 text-left text-red-600 transition hover:bg-red-50"
          >
            <i className="ph ph-sign-out mr-4 text-2xl" aria-hidden="true" />
            <span className="flex-grow font-medium">Logout</span>
          </button>
        </div>
      </main>

      <BottomNav active="menu" />

      <ConfirmModal
        open={dialog === 'logout'}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmLabel="Logout"
        destructive
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          setDialog(null)
          handleLogout()
        }}
      />
      <ConfirmModal
        open={dialog === 'logout-error'}
        title="Error"
        message="Could not log out. Please try again."
        destructive
        onCancel={() => setDialog(null)}
        onConfirm={() => setDialog(null)}
      />
      <ConfirmModal
        open={dialog === 'coming-soon'}
        title="Coming Soon"
        message="This feature is under development."
        onCancel={() => setDialog(null)}
        onConfirm={() => setDialog(null)}
      />
    </MobileFrame>
  )
}
