'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { useLanguage } from '@/components/providers/language-provider'
import { MobileFrame } from '@/components/mobile-frame'
import { BottomNav } from '@/components/bottom-nav'
import { Spinner } from '@/components/ui/spinner'
import { AlertModal, useAlert } from '@/components/ui/alert-modal'

type PlotOption = { id: string; plotName: string }

const todayISO = () => new Date().toISOString().slice(0, 10)

export function LogisticsScreen() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { alert, showAlert, closeAlert } = useAlert()
  const [loading, setLoading] = useState(true)
  const [plots, setPlots] = useState<PlotOption[]>([])
  const [phone, setPhone] = useState('')
  const [serviceType, setServiceType] = useState('Truck')
  const [plotId, setPlotId] = useState('')
  const [destination, setDestination] = useState(searchParams.get('destination') ?? '')
  const [bookingDate, setBookingDate] = useState(todayISO)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function load(uid: string) {
      try {
        const supabase = createClient()
        const [profileRes, plotsRes] = await Promise.all([
          supabase.from('profiles').select('phone').eq('id', uid).maybeSingle(),
          supabase.from('plots').select('id, plotName').eq('userId', uid),
        ])
        if (profileRes.error) throw profileRes.error
        if (plotsRes.error) throw plotsRes.error
        if (cancelled) return
        setPhone(profileRes.data?.phone || '')
        const list = (plotsRes.data ?? []) as PlotOption[]
        setPlots(list)
        if (list.length) setPlotId(list[0].id)
      } catch (err) {
        console.error('Error loading initial data: ', err)
        if (!cancelled) showAlert(t('Error'), t('Could not load your plots or profile. Please refresh.'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load(user.uid)
    return () => {
      cancelled = true
    }
  }, [user, showAlert, t])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || submitting) return
    const plot = plots.find((p) => p.id === plotId)
    if (!plot) return
    setSubmitting(true)
    try {
      const { error } = await createClient().from('bookings').insert({
        userId: user.uid,
        serviceType,
        plotId: plot.id,
        plotName: plot.plotName,
        destination: destination.trim(),
        bookingDate: new Date(bookingDate).toISOString(),
        contactPhone: phone,
        status: 'Pending',
      })
      if (error) throw error
      showAlert(t('Success'), t('Your booking request has been submitted!'))
      setTimeout(() => router.push('/my-bookings'), 1500)
    } catch (err) {
      console.error('Error submitting booking: ', err)
      showAlert(t('Error'), t('Could not submit booking. Please try again.'))
      setSubmitting(false)
    }
  }

  const noPlots = plots.length === 0
  const field = 'w-full rounded-md border border-gray-300 p-3'

  return (
    <MobileFrame className="bg-gray-100">
      <nav className="z-10 w-full flex-shrink-0 bg-white shadow-sm">
        <div className="flex items-center px-4 py-3">
          <Link
            href="/mandi"
            aria-label={t('Back to mandi')}
            className="mr-4 rounded-full p-1 text-gray-600 hover:bg-gray-100"
          >
            <i className="ph ph-arrow-left text-2xl" aria-hidden="true" />
          </Link>
          <h1 className="text-xl font-bold text-green-700">{t('Book Logistics')}</h1>
        </div>
      </nav>

      <main className="flex-grow overflow-y-auto p-4 pb-20">
        {loading ? (
          <div className="p-10 text-center">
            <div className="flex justify-center">
              <Spinner />
            </div>
            <p className="mt-2 text-gray-500">{t('Loading your info...')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4 neu rounded-2xl p-4">
              <div>
                <label htmlFor="serviceType" className="mb-1 block text-sm font-medium text-gray-700">
                  {t('Service Type')}
                </label>
                <select
                  id="serviceType"
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className={`${field} bg-white`}
                  required
                >
                  <option value="Truck">{t('Truck (for Mandi)')}</option>
                  <option value="Tractor">{t('Tractor (Local)')}</option>
                </select>
              </div>
              <div>
                <label htmlFor="plotId" className="mb-1 block text-sm font-medium text-gray-700">
                  {t('From (My Plot)')}
                </label>
                <select
                  id="plotId"
                  value={plotId}
                  onChange={(e) => setPlotId(e.target.value)}
                  disabled={noPlots}
                  className={`${field} bg-white`}
                  required
                >
                  {noPlots ? (
                    <option value="">{t('No plots found')}</option>
                  ) : (
                    plots.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.plotName}
                      </option>
                    ))
                  )}
                </select>
                {noPlots && (
                  <p className="mt-1 text-sm text-red-500">
                    {t('Please add a plot in "My Plots" first.')}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="destination" className="mb-1 block text-sm font-medium text-gray-700">
                  {t('To (Destination)')}
                </label>
                <input
                  id="destination"
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className={field}
                  placeholder={t('e.g., Meerut Mandi')}
                  required
                />
              </div>
              <div>
                <label htmlFor="bookingDate" className="mb-1 block text-sm font-medium text-gray-700">
                  {t('Booking Date')}
                </label>
                <input
                  id="bookingDate"
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className={field}
                  required
                />
              </div>
              <div>
                <label htmlFor="contactPhone" className="mb-1 block text-sm font-medium text-gray-700">
                  {t('Contact Phone')}
                </label>
                <input
                  id="contactPhone"
                  type="tel"
                  value={phone}
                  readOnly
                  className={`${field} bg-gray-100`}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={noPlots || submitting}
              className="flex w-full items-center justify-center rounded-lg bg-green-600 p-3 font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? t('Submitting...') : t('Submit Booking Request')}
            </button>
          </form>
        )}
      </main>

      <BottomNav active="mandi" />
      <AlertModal alert={alert} onClose={closeAlert} />
    </MobileFrame>
  )
}
