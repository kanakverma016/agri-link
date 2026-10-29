'use client'

import Link from 'next/link'
import { useAuth } from '@/components/providers/auth-provider'
import { useLiveQuery } from '@/lib/use-live-query'
import { MobileFrame } from '@/components/mobile-frame'
import { BottomNav } from '@/components/bottom-nav'
import { Spinner } from '@/components/ui/spinner'

type Booking = {
  serviceType: string
  status: string
  plotName: string
  destination: string
  bookingDate: string
}

const STATUS_CLASS: Record<string, string> = {
  Pending: 'text-yellow-700 bg-yellow-100',
  Confirmed: 'text-blue-700 bg-blue-100',
  Completed: 'text-green-700 bg-green-100',
  Cancelled: 'text-red-700 bg-red-100',
}

export function BookingsScreen() {
  const { user } = useAuth()
  const { items, loading, error } = useLiveQuery<Booking>({
    table: 'bookings',
    enabled: Boolean(user),
    eq: { userId: user?.uid },
    orderBy: 'bookingDate',
  })

  return (
    <MobileFrame className="bg-gray-100">
      <nav className="z-10 w-full flex-shrink-0 bg-white shadow-sm">
        <div className="flex items-center px-4 py-3">
          <Link
            href="/menu"
            aria-label="Back to menu"
            className="mr-4 rounded-full p-1 text-gray-600 hover:bg-gray-100"
          >
            <i className="ph ph-arrow-left text-2xl" aria-hidden="true" />
          </Link>
          <h1 className="text-xl font-bold text-green-700">My Bookings</h1>
        </div>
      </nav>

      <main className="flex-grow overflow-y-auto p-4 pb-20">
        {loading ? (
          <div className="p-10 text-center">
            <div className="flex justify-center">
              <Spinner />
            </div>
            <p className="mt-2 text-gray-500">Loading your bookings...</p>
          </div>
        ) : error ? (
          <p className="p-10 text-center text-gray-500">Error loading data.</p>
        ) : items.length === 0 ? (
          <div className="p-10 text-center">
            <i className="ph ph-truck text-6xl text-gray-400" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-semibold text-gray-700">No Bookings Found</h3>
            <p className="text-gray-500">
              Your requested bookings for trucks and tractors will appear here.
            </p>
            <Link
              href="/book-logistics"
              className="mt-4 inline-block rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition hover:bg-green-700"
            >
              Book a Service
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((b) => (
              <li key={b.id} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {b.serviceType === 'Truck' ? (
                      <i className="ph ph-truck text-2xl text-purple-600" aria-hidden="true" />
                    ) : (
                      <i className="ph ph-tractor text-2xl text-green-600" aria-hidden="true" />
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-800">{b.serviceType} Booking</h3>
                      <p className="text-sm text-gray-500">
                        For: {b.bookingDate ? new Date(b.bookingDate).toLocaleDateString() : ''}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      STATUS_CLASS[b.status] ?? 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {b.status}
                  </span>
                </div>
                <div className="mt-3 space-y-1 border-t pt-3 text-sm">
                  <p className="text-gray-600">
                    <strong>From:</strong> {b.plotName}
                  </p>
                  <p className="text-gray-600">
                    <strong>To:</strong> {b.destination}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      <BottomNav active="menu" />
    </MobileFrame>
  )
}
