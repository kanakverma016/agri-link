'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useLiveQuery } from '@/lib/use-live-query'
import { useAuth } from '@/components/providers/auth-provider'
import { MobileFrame } from '@/components/mobile-frame'
import { BottomNav } from '@/components/bottom-nav'
import { Spinner } from '@/components/ui/spinner'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { AlertModal, useAlert } from '@/components/ui/alert-modal'

type Listing = {
  id: string
  cropName: string
  quantity: number | string
  quantityUnit: string
  price: number | string
  priceUnit: string
  status: string
  imageUrl?: string
  createdAt?: string | null
}

type Pending = { kind: 'sold' | 'delete'; id: string } | null

const STATUS_CLASS: Record<string, string> = {
  Active: 'text-green-700 bg-green-100',
  Sold: 'text-blue-700 bg-blue-100',
}

const NO_IMAGE = 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image'

export function ListingsScreen() {
  const { user } = useAuth()
  const { alert, showAlert, closeAlert } = useAlert()
  const [pending, setPending] = useState<Pending>(null)
  const {
    items: listings,
    loading,
    error: loadFailed,
    refetch,
  } = useLiveQuery<Listing>({
    table: 'b2b_listings',
    enabled: Boolean(user),
    eq: { sellerId: user?.uid },
    orderBy: 'createdAt',
  })
  const error = loadFailed ? 'Could not load listings.' : null

  async function runPending() {
    if (!pending) return
    const { kind, id } = pending
    setPending(null)
    try {
      const supabase = createClient()
      if (kind === 'sold') {
        const { error: updateError } = await supabase.from('b2b_listings').update({ status: 'Sold' }).eq('id', id)
        if (updateError) throw updateError
        showAlert('Success', 'Listing marked as Sold.')
      } else {
        const { error: deleteError } = await supabase.from('b2b_listings').delete().eq('id', id)
        if (deleteError) throw deleteError
        showAlert('Success', 'Listing has been deleted.')
      }
      void refetch()
    } catch (err) {
      console.error('Error updating listing: ', err)
      showAlert(
        'Error',
        kind === 'sold'
          ? 'Could not update listing. Please try again.'
          : 'Could not delete listing. Please try again.',
      )
    }
  }

  return (
    <MobileFrame className="bg-gray-100">
      <nav className="z-10 w-full flex-shrink-0 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center">
            <Link
              href="/menu"
              aria-label="Back to menu"
              className="mr-4 rounded-full p-1 text-gray-600 hover:bg-gray-100"
            >
              <i className="ph ph-arrow-left text-2xl" aria-hidden="true" />
            </Link>
            <h1 className="text-xl font-bold text-green-700">My B2B Listings</h1>
          </div>
          <Link
            href="/create-listing"
            className="rounded-lg p-2 font-medium text-green-600 hover:bg-green-50"
          >
            Create New
          </Link>
        </div>
      </nav>

      <main className="flex-grow overflow-y-auto p-4 pb-20">
        {loading ? (
          <div className="p-10 text-center">
            <div className="flex justify-center">
              <Spinner />
            </div>
            <p className="mt-2 text-gray-500">Loading your listings...</p>
          </div>
        ) : error ? (
          <div className="p-10 text-center">
            <p className="text-red-500">{error}</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="p-10 text-center">
            <i className="ph ph-storefront text-6xl text-gray-400" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-semibold text-gray-700">No Listings Yet</h3>
            <p className="text-gray-500">
              List your produce on the B2B Marketplace to sell directly to buyers.
            </p>
            <Link
              href="/create-listing"
              className="mt-4 inline-block rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition hover:bg-green-700"
            >
              Create Your First Listing
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {listings.map((l) => (
              <li key={l.id} className="overflow-hidden rounded-xl bg-white shadow-sm">
                <div className="flex space-x-3 p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={l.imageUrl || NO_IMAGE}
                    alt={l.cropName}
                    className="h-20 w-20 flex-shrink-0 rounded-lg object-cover"
                  />
                  <div className="flex-grow">
                    <div className="flex items-start justify-between">
                      <h3 className="text-base font-bold text-gray-900">{l.cropName}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATUS_CLASS[l.status] ?? 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {l.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {l.quantity} {l.quantityUnit}
                    </p>
                    <p className="text-base font-semibold text-green-700">
                      ₹{l.price}{' '}
                      <span className="text-sm font-normal text-gray-600">/{l.priceUnit}</span>
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Posted: {l.createdAt ? new Date(l.createdAt).toLocaleDateString() : 'Just now'}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end space-x-2 bg-gray-50 p-3">
                  {l.status === 'Active' && (
                    <button
                      type="button"
                      onClick={() => setPending({ kind: 'sold', id: l.id })}
                      className="rounded-lg bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-200"
                    >
                      Mark as Sold
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPending({ kind: 'delete', id: l.id })}
                    className="rounded-lg bg-red-100 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      <BottomNav active="menu" />

      <ConfirmModal
        open={pending !== null}
        title={pending?.kind === 'delete' ? 'Delete Listing?' : 'Mark as Sold?'}
        message={
          pending?.kind === 'delete'
            ? 'This action cannot be undone.'
            : 'This will remove the listing from the public marketplace.'
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        destructive={pending?.kind === 'delete'}
        onCancel={() => setPending(null)}
        onConfirm={runPending}
      />
      <AlertModal alert={alert} onClose={closeAlert} />
    </MobileFrame>
  )
}
