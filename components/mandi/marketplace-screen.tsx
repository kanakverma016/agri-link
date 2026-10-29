'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLiveQuery } from '@/lib/use-live-query'
import { DEFAULT_PROFILE_LOGO } from '@/lib/constants'
import { useSpeechSearch } from '@/lib/use-speech-search'
import { useAuth } from '@/components/providers/auth-provider'
import { MobileFrame } from '@/components/mobile-frame'
import { BottomNav } from '@/components/bottom-nav'
import { Spinner } from '@/components/ui/spinner'
import { AlertModal, useAlert } from '@/components/ui/alert-modal'

type Listing = {
  id: string
  sellerId: string
  sellerName: string
  sellerProfilePic?: string | null
  location: string
  cropName?: string
  quantity: number
  quantityUnit: string
  price: number
  priceUnit: string
  imageUrl?: string
  createdAt?: string | null
}

const NO_IMAGE = 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image'

export function MarketplaceScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const { alert, showAlert, closeAlert } = useAlert()
  const [search, setSearch] = useState('')
  const speech = useSpeechSearch(setSearch)
  const {
    items: listings,
    loading,
    error: loadFailed,
  } = useLiveQuery<Listing>({
    table: 'b2b_listings',
    enabled: Boolean(user),
    eq: { status: 'Active' },
    orderBy: 'createdAt',
  })
  const error = loadFailed ? 'Could not load listings.' : null

  const filtered = useMemo(() => {
    const term = search.toLowerCase()
    return listings.filter((l) => l.cropName && l.cropName.toLowerCase().includes(term))
  }, [listings, search])

  async function contactSeller(listing: Listing) {
    if (!user) return
    try {
      const supabase = createClient()
      const { data: existing, error: findError } = await supabase
        .from('chats')
        .select('id, participants')
        .contains('participants', [user.uid])
      if (findError) throw findError
      let chatId =
        (existing ?? []).find(
          (c) => (c.participants as string[]).includes(listing.sellerId) && (c.participants as string[]).length === 2,
        )?.id ?? null
      if (!chatId) {
        const { data: created, error: createError } = await supabase
          .from('chats')
          .insert({ participants: [user.uid, listing.sellerId], lastMessage: 'Chat created' })
          .select('id')
          .single()
        if (createError) throw createError
        chatId = created.id as string
      }
      const params = new URLSearchParams({
        openChat: 'true',
        chatId,
        otherUserId: listing.sellerId,
        otherUserName: listing.sellerName,
        otherUserPic: listing.sellerProfilePic || DEFAULT_PROFILE_LOGO,
      })
      router.push(`/?${params.toString()}`)
    } catch (err) {
      console.error('Error creating chat: ', err)
      showAlert('Error', 'Error starting chat.')
    }
  }

  return (
    <MobileFrame className="bg-gray-100">
      <nav className="z-10 w-full flex-shrink-0 bg-white shadow-sm">
        <div className="flex items-center px-4 py-3">
          <Link
            href="/mandi"
            aria-label="Back to mandi"
            className="mr-4 rounded-full p-1 text-gray-600 hover:bg-gray-100"
          >
            <i className="ph ph-arrow-left text-2xl" aria-hidden="true" />
          </Link>
          <h1 className="text-xl font-bold text-green-700">B2B Marketplace</h1>
        </div>
      </nav>

      <main className="flex-grow overflow-y-auto pb-20">
        <div className="sticky top-0 z-[5] bg-gray-100 p-4">
          <div className="relative flex items-center rounded-lg bg-white shadow-sm">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
              <i className="ph ph-magnifying-glass text-xl" aria-hidden="true" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for crops..."
              aria-label="Search for crops"
              className="w-full rounded-lg border-none p-3 pl-10 pr-16 focus:ring-2 focus:ring-green-500"
            />
            {speech.supported && (
              <button
                type="button"
                onClick={speech.start}
                aria-label="Search by voice"
                className={`absolute inset-y-0 right-0 flex w-14 items-center justify-center hover:text-green-600 ${
                  speech.listening ? 'text-red-500' : 'text-gray-500'
                }`}
              >
                <i className="ph ph-microphone text-2xl" aria-hidden="true" />
              </button>
            )}
          </div>
          <p className="mt-1 h-4 text-center text-xs text-gray-500" aria-live="polite">
            {speech.status}
          </p>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="p-10 text-center">
              <div className="flex justify-center">
                <Spinner />
              </div>
              <p className="mt-2 text-gray-500">Loading listings...</p>
            </div>
          ) : error ? (
            <div className="p-10 text-center">
              <p className="text-red-500">Error: {error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center">
              <i className="ph ph-storefront text-6xl text-gray-400" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-semibold text-gray-700">
                {search ? 'No Matches Found' : 'No Listings Found'}
              </h3>
              <p className="text-gray-500">
                {search ? 'Try searching for a different crop.' : 'Be the first to create a listing!'}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {filtered.map((l) => (
                <li key={l.id} className="overflow-hidden rounded-xl bg-white shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={l.imageUrl || NO_IMAGE}
                    alt={l.cropName || 'Produce'}
                    className="h-40 w-full object-cover"
                  />
                  <div className="p-4">
                    <div className="mb-1 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900">{l.cropName || 'Untitled Crop'}</h3>
                      <span className="text-xl font-bold text-green-700">
                        ₹{l.price}
                        <span className="text-sm font-normal text-gray-600">/{l.priceUnit}</span>
                      </span>
                    </div>
                    <p className="mb-3 text-sm text-gray-600">
                      {l.quantity} {l.quantityUnit} available
                    </p>
                    <div className="mb-4 flex items-center space-x-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={l.sellerProfilePic || DEFAULT_PROFILE_LOGO}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{l.sellerName}</p>
                        <p className="text-xs text-gray-500">{l.location}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        Posted: {l.createdAt ? new Date(l.createdAt).toLocaleDateString() : 'Just now'}
                      </span>
                      {user?.uid === l.sellerId ? (
                        <Link
                          href="/my-listings"
                          className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                        >
                          Manage
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => contactSeller(l)}
                          className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                        >
                          Contact Seller
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <Link
        href="/create-listing"
        aria-label="Create new listing"
        className="absolute bottom-20 right-4 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white shadow-lg transition-all hover:bg-green-700 active:scale-95"
      >
        <i className="ph ph-plus text-3xl" aria-hidden="true" />
      </Link>

      <BottomNav active="mandi" />
      <AlertModal alert={alert} onClose={closeAlert} />
    </MobileFrame>
  )
}
