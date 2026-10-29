'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLiveQuery } from '@/lib/use-live-query'
import { useAuth } from '@/components/providers/auth-provider'
import { MobileFrame } from '@/components/mobile-frame'
import { BottomNav } from '@/components/bottom-nav'
import { Spinner } from '@/components/ui/spinner'
import { AlertModal, useAlert } from '@/components/ui/alert-modal'
import { AddPlotModal } from '@/components/plots/add-plot-modal'

type Plot = { id: string; plotName: string; area: number; areaUnit: string; soilType: string }

export function PlotsScreen() {
  const { user } = useAuth()
  const { alert, showAlert, closeAlert } = useAlert()
  const [modalOpen, setModalOpen] = useState(false)
  const {
    items: plots,
    loading,
    error: loadError,
  } = useLiveQuery<Plot>({
    table: 'plots',
    enabled: Boolean(user),
    eq: { userId: user?.uid },
    orderBy: 'createdAt',
  })

  return (
    <MobileFrame className="bg-gray-50">
      <nav className="z-10 w-full flex-shrink-0 bg-white shadow-sm">
        <div className="flex items-center px-4 py-3">
          <h1 className="text-xl font-bold text-green-700">My Plots</h1>
        </div>
      </nav>

      <main className="flex-grow space-y-4 overflow-y-auto p-4 pb-20">
        {loading ? (
          <div className="p-10 text-center">
            <div className="flex justify-center">
              <Spinner />
            </div>
            <p className="mt-2 text-gray-500">Loading your plots...</p>
          </div>
        ) : loadError ? (
          <p className="text-center text-red-500">Error loading plots.</p>
        ) : plots.length === 0 ? (
          <div className="p-10 text-center">
            <i className="ph ph-map-trifold text-6xl text-gray-400" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-semibold text-gray-700">No Plots Found</h3>
            <p className="text-gray-500">Get started by adding your first plot of land.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {plots.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/plot-detail?plotId=${p.id}`}
                  className="block rounded-xl bg-white p-4 shadow-sm transition-all hover:shadow-md active:scale-95"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800">{p.plotName}</h2>
                      <p className="text-sm text-gray-500">
                        {p.area} {p.areaUnit} • {p.soilType}
                      </p>
                    </div>
                    <i className="ph ph-caret-right text-xl text-gray-400" aria-hidden="true" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>

      <button
        type="button"
        onClick={() => setModalOpen(true)}
        aria-label="Add new plot"
        className="absolute bottom-20 right-4 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white shadow-lg transition-all hover:bg-green-700 active:scale-95"
      >
        <i className="ph ph-plus text-3xl" aria-hidden="true" />
      </button>

      <BottomNav active="plots" />
      {user && (
        <AddPlotModal
          open={modalOpen}
          userId={user.uid}
          onClose={() => setModalOpen(false)}
          onError={(m) => showAlert('Error', m)}
        />
      )}
      <AlertModal alert={alert} onClose={closeAlert} />
    </MobileFrame>
  )
}
