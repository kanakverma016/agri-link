'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { useLiveQuery } from '@/lib/use-live-query'
import { useAuth } from '@/components/providers/auth-provider'
import { MobileFrame } from '@/components/mobile-frame'
import { Spinner } from '@/components/ui/spinner'
import { AlertModal, useAlert } from '@/components/ui/alert-modal'
import { AddActivityModal, HarvestModal, StartCycleModal } from '@/components/plots/plot-modals'

type PlotInfo = { plotName: string; area: number; areaUnit: string; soilType: string }
type Cycle = {
  id: string
  cropName: string
  variety?: string
  sowingDate: string
  status: string
  harvestDate?: string | null
  totalYield?: number | null
  sellingPrice?: number | null
  totalCost?: number | null
}
type Activity = { id: string; type: string; cost: number; description?: string; date: string }

const inr = (n: number) => Number(n).toLocaleString('en-IN')
const day = (iso: string) => new Date(iso).toLocaleDateString()

export function PlotDetailScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const plotId = useSearchParams().get('plotId')
  const { alert, showAlert, closeAlert } = useAlert()
  const [modal, setModal] = useState<'cycle' | 'activity' | 'harvest' | null>(null)

  const { data: plot, isLoading: loading } = useSWR(
    user && plotId ? ['plot', user.uid, plotId] : null,
    async ([, uid, id]) => {
      const { data, error } = await createClient()
        .from('plots')
        .select('plotName, area, areaUnit, soilType')
        .eq('id', id)
        .eq('userId', uid)
        .maybeSingle()
      if (error) throw error
      if (!data) showAlert('Error', 'Plot not found.')
      return (data as PlotInfo | null) ?? null
    },
    { revalidateOnFocus: false },
  )

  const { items: cycles } = useLiveQuery<Cycle>({
    table: 'cycles',
    enabled: Boolean(user && plotId),
    eq: { plotId: plotId ?? undefined },
    orderBy: 'createdAt',
  })

  const activeCycle = useMemo(() => cycles.find((c) => c.status === 'Active') ?? null, [cycles])
  const history = useMemo(() => cycles.filter((c) => c.status !== 'Active'), [cycles])
  const activeCycleId = activeCycle?.id ?? null

  useEffect(() => {
    if (!plotId) router.replace('/my-plots')
  }, [plotId, router])

  const { items: activities } = useLiveQuery<Activity>({
    table: 'activities',
    enabled: Boolean(activeCycleId),
    eq: { cycleId: activeCycleId ?? undefined },
    orderBy: 'date',
  })

  const onError = (message: string) => showAlert('Error', message)
  const closeModal = () => setModal(null)

  return (
    <MobileFrame className="bg-gray-50">
      <nav className="z-10 w-full flex-shrink-0 bg-white shadow-sm">
        <div className="flex items-center px-4 py-3">
          <Link
            href="/my-plots"
            aria-label="Back to my plots"
            className="mr-4 rounded-full p-1 text-gray-600 hover:bg-gray-100"
          >
            <i className="ph ph-arrow-left text-2xl" aria-hidden="true" />
          </Link>
          <h1 className="truncate text-xl font-bold text-green-700">{plot?.plotName ?? 'Loading...'}</h1>
        </div>
      </nav>

      <main className="flex-grow space-y-4 overflow-y-auto p-4 pb-20">
        {loading || !plot ? (
          loading && (
            <div className="p-10 text-center">
              <div className="flex justify-center">
                <Spinner />
              </div>
              <p className="mt-2 text-gray-500">Loading plot details...</p>
            </div>
          )
        ) : (
          <>
            <section className="rounded-xl bg-white p-4 shadow-sm">
              <h2 className="mb-2 text-lg font-semibold text-gray-800">Plot Information</h2>
              <div className="space-y-1 text-gray-600">
                <p>
                  <strong>Area:</strong> {plot.area} {plot.areaUnit}
                </p>
                <p>
                  <strong>Soil:</strong> {plot.soilType}
                </p>
              </div>
            </section>

            <section className="rounded-xl bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-gray-800">Current Crop</h2>
              {activeCycle ? (
                <div>
                  <h3 className="text-2xl font-bold text-green-700">{activeCycle.cropName}</h3>
                  <p className="mb-1 text-gray-600">{activeCycle.variety || 'N/A'}</p>
                  <p className="text-sm text-gray-500">
                    Sown on: {day(activeCycle.sowingDate)}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setModal('activity')}
                      className="flex items-center justify-center space-x-2 rounded-lg bg-blue-100 px-4 py-3 font-medium text-blue-700 hover:bg-blue-200"
                    >
                      <i className="ph ph-plus-circle text-lg" aria-hidden="true" />
                      <span>Add Activity</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModal('harvest')}
                      className="flex items-center justify-center space-x-2 rounded-lg bg-yellow-100 px-4 py-3 font-medium text-yellow-700 hover:bg-yellow-200"
                    >
                      <i className="ph ph-tractor text-lg" aria-hidden="true" />
                      <span>Harvest</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border-2 border-dashed border-gray-300 p-4 text-center">
                  <i className="ph ph-plant text-4xl text-gray-400" aria-hidden="true" />
                  <p className="mb-3 mt-2 text-gray-500">No active crop on this plot.</p>
                  <button
                    type="button"
                    onClick={() => setModal('cycle')}
                    className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition hover:bg-green-700"
                  >
                    Start New Crop Cycle
                  </button>
                </div>
              )}
            </section>

            {activeCycle && (
              <section className="rounded-xl bg-white p-4 shadow-sm">
                <h2 className="mb-3 text-lg font-semibold text-gray-800">Recent Activities</h2>
                {activities.length === 0 ? (
                  <p className="text-sm text-gray-500">No activities logged yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {activities.map((a) => (
                      <li key={a.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-gray-700">{a.type}</h4>
                          <span className="text-lg font-bold text-red-600">- ₹{inr(a.cost)}</span>
                        </div>
                        <p className="text-sm text-gray-600">{a.description || 'No description'}</p>
                        <p className="mt-1 text-xs text-gray-400">{day(a.date)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            <section className="rounded-xl bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-gray-800">Crop History</h2>
              {history.length === 0 ? (
                <p className="text-sm text-gray-500">No harvested crops yet.</p>
              ) : (
                <ul className="space-y-3">
                  {history.map((c) => {
                    const cost = c.totalCost || 0
                    const revenue = (c.totalYield || 0) * (c.sellingPrice || 0)
                    const profit = revenue - cost
                    return (
                      <li key={c.id} className="rounded-lg bg-gray-100 p-4">
                        <h4 className="text-lg font-semibold text-gray-800">{c.cropName}</h4>
                        <p className="mb-3 text-sm text-gray-500">
                          Sown: {day(c.sowingDate)} | Harvested:{' '}
                          {c.harvestDate ? day(c.harvestDate) : '-'}
                        </p>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <span className="text-xs text-gray-500">Revenue</span>
                            <p className="text-lg font-semibold text-green-700">₹{inr(revenue)}</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">Cost</span>
                            <p className="text-lg font-semibold text-red-700">₹{inr(cost)}</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">Profit</span>
                            <p className={`text-lg font-semibold ${profit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                              ₹{inr(profit)}
                            </p>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </main>

      {user && plotId && (
        <>
          <StartCycleModal
            open={modal === 'cycle'}
            onClose={closeModal}
            onError={onError}
            userId={user.uid}
            plotId={plotId}
          />
          <AddActivityModal
            open={modal === 'activity'}
            onClose={closeModal}
            onError={onError}
            userId={user.uid}
            plotId={plotId}
            cycleId={activeCycleId}
          />
          <HarvestModal
            open={modal === 'harvest'}
            onClose={closeModal}
            onError={onError}
            userId={user.uid}
            plotId={plotId}
            cycleId={activeCycleId}
          />
        </>
      )}
      <AlertModal alert={alert} onClose={closeAlert} />
    </MobileFrame>
  )
}
