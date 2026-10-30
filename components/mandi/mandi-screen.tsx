'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { useLanguage } from '@/components/providers/language-provider'
import { MobileFrame } from '@/components/mobile-frame'
import { BottomNav } from '@/components/bottom-nav'
import { LivePrices } from '@/components/mandi/live-prices'
import { LocationModal, type Location } from '@/components/mandi/mandi-location-modal'

type SectionKey = 'live-prices' | 'nearby-locator' | 'b2b-market' | 'logistics'

const TITLES: Record<SectionKey, string> = {
  'live-prices': 'Live Mandi Prices',
  'nearby-locator': 'Nearby Locator',
  'b2b-market': 'B2B Marketplace',
  logistics: 'Mandi on Wheels',
}

type SoonKey = 'drone' | 'fertilizers'

const SOON_TITLES: Record<SoonKey, string> = {
  drone: 'Book Drone Spray',
  fertilizers: 'Buy Fertilizers',
}

const MENU: { key: SectionKey | SoonKey; icon: string; k: [string, string]; title: string; desc: string; soon?: boolean }[] = [
  { key: 'live-prices', icon: 'ph-line-chart-up', k: ['#34d399', '#047857'], title: 'Live Mandi Prices', desc: 'Check prices by crop and location' },
  { key: 'nearby-locator', icon: 'ph-map-pin', k: ['#60a5fa', '#1d4ed8'], title: 'Nearby Locator', desc: 'Find mandis, warehouses & cold storage' },
  { key: 'b2b-market', icon: 'ph-handshake', k: ['#fcd34d', '#d97706'], title: 'B2B Marketplace', desc: 'Sell directly to bulk buyers' },
  { key: 'logistics', icon: 'ph-truck', k: ['#c4b5fd', '#6d28d9'], title: 'Mandi on Wheels', desc: 'Book trucks and tractors for transport' },
  { key: 'fertilizers', icon: 'ph-flask', k: ['#f9a8d4', '#be185d'], title: 'Buy Fertilizers', desc: 'Order seeds, fertilizers & pesticides', soon: true },
  { key: 'drone', icon: 'ph-wind', k: ['#67e8f9', '#0e7490'], title: 'Book Drone Spray', desc: 'Schedule an aerial spray for your crops', soon: true },
]

const NEARBY = [
  { icon: 'ph-storefront', bg: 'bg-blue-100', fg: 'text-blue-600', name: 'District Mandi', dist: '2.5 km away' },
  { icon: 'ph-warehouse', bg: 'bg-purple-100', fg: 'text-purple-600', name: 'Krishi Storage', dist: '4.2 km away' },
  { icon: 'ph-snowflake', bg: 'bg-green-100', fg: 'text-green-600', name: 'Cold Storage Unit', dist: '1.8 km away' },
]

const LOGISTICS = [
  { icon: 'ph-truck', bg: 'bg-purple-100', fg: 'text-purple-600', name: 'Truck Booking', desc: 'For bulk transport' },
  { icon: 'ph-tractor', bg: 'bg-green-100', fg: 'text-green-600', name: 'Tractor Hire', desc: 'For local transport' },
  { icon: 'ph-van', bg: 'bg-blue-100', fg: 'text-blue-600', name: 'Mini Van', desc: 'For small quantities' },
]

const btnPrimary =
  'block w-full rounded-xl bg-green-600 px-4 py-3 text-center font-bold text-white shadow-md shadow-emerald-900/25 transition'
const btnSecondary =
  'neu-btn flex w-full flex-col items-center rounded-xl px-4 py-3 text-green-700'

export function MandiScreen() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [section, setSection] = useState<SectionKey | null>(null)
  const [location, setLocation] = useState<Location>({ state: null, district: null })
  const [locationOpen, setLocationOpen] = useState(false)
  const [soonItem, setSoonItem] = useState<SoonKey | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    createClient()
      .from('profiles')
      .select('state, district')
      .eq('id', user.uid)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) return console.error('Error loading location:', error)
        if (cancelled || !data) return
        const state = data.state?.toLowerCase().includes('pardesh') ? 'Uttar Pradesh' : (data.state ?? null)
        setLocation({ state, district: data.district ?? null })
      })
    return () => {
      cancelled = true
    }
  }, [user])

  return (
    <MobileFrame>
      <header className="z-20 w-full flex-shrink-0 rounded-b-[2rem] bg-green-700 p-4 pb-5 text-white shadow-lg shadow-emerald-900/20">
        <div className="flex items-center">
          {section ? (
            <button type="button" onClick={() => setSection(null)} aria-label={t('Back to mandi menu')} className="mr-4 p-2">
              <i className="ph ph-arrow-left text-2xl" aria-hidden="true" />
            </button>
          ) : (
            <Link href="/" aria-label={t('Back to home')} className="mr-4 p-2">
              <i className="ph ph-arrow-left text-2xl" aria-hidden="true" />
            </Link>
          )}
          <h1 className="text-xl font-bold">{section ? t(TITLES[section]) : t('Mandi Services')}</h1>
          <div className="ml-auto">
            <i className="ph ph-bell text-xl" aria-hidden="true" />
          </div>
        </div>
      </header>

      <main className="mt-2 flex-grow overflow-y-auto p-4 pb-28 md:px-8">
        {!section && (
          <section className="space-y-5">
            <p className="text-center text-sm font-semibold text-gray-600">
              {t('Explore market prices, find buyers, and manage your farm logistics.')}
            </p>
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-5">
              {MENU.map((m, i) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => (m.soon ? setSoonItem(m.key as SoonKey) : setSection(m.key as SectionKey))}
                  style={{ animationDelay: `${i * 70}ms` }}
                  className="neu relative flex w-full animate-fade-up flex-col items-center rounded-3xl p-5 transition-transform hover:-translate-y-1"
                >
                  {m.soon && (
                    <span className="absolute right-3 top-3 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      {t('Under development')}
                    </span>
                  )}
                  <div
                    style={{ '--k1': m.k[0], '--k2': m.k[1] } as React.CSSProperties}
                    className="skeu-knob mb-3 flex h-16 w-16 items-center justify-center rounded-full"
                  >
                    <i className={`ph-fill ${m.icon} text-3xl text-white drop-shadow`} aria-hidden="true" />
                  </div>
                  <h2 className="mb-1 text-center text-base font-extrabold text-gray-800">{t(m.title)}</h2>
                  <p className="text-center text-xs font-semibold text-gray-500">{t(m.desc)}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {section === 'live-prices' && (
          <LivePrices location={location} onChangeLocation={() => setLocationOpen(true)} />
        )}

        {section === 'nearby-locator' && (
          <section>
            <div className="mb-4 neu rounded-3xl p-5 text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <i className="ph ph-map-pin text-3xl text-blue-500" aria-hidden="true" />
              </div>
              <h2 className="mb-2 text-lg font-semibold text-gray-800">{t('Nearby Locator')}</h2>
              <p className="mb-4 text-gray-600">{t('Locate nearby mandis, warehouses, and cold storage facilities')}</p>
              <Link href="/nearby-locator" className={btnPrimary}>
                {t('Enable Location')}
              </Link>
            </div>
            <div className="neu rounded-3xl p-4">
              <h3 className="mb-3 font-semibold text-gray-800">{t('Nearby Services')}</h3>
              <ul className="space-y-3">
                {NEARBY.map((n) => (
                  <li key={n.name} className="flex items-center neu-inset rounded-2xl p-3">
                    <div className={`mr-3 rounded-lg p-2 ${n.bg}`}>
                      <i className={`ph ${n.icon} text-xl ${n.fg}`} aria-hidden="true" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{t(n.name)}</h4>
                      <p className="text-sm text-gray-600">{n.dist.replace(' km away', '')} {t('km away')}</p>
                    </div>
                    <i className="ph ph-caret-right text-gray-400" aria-hidden="true" />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {section === 'b2b-market' && (
          <section>
            <div className="mb-4 neu rounded-3xl p-5 text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
                <i className="ph ph-handshake text-3xl text-yellow-500" aria-hidden="true" />
              </div>
              <h2 className="mb-2 text-lg font-semibold text-gray-800">{t('B2B Marketplace')}</h2>
              <p className="mb-4 text-gray-600">{t('Sell your produce directly to bulk buyers')}</p>
              <Link href="/b2b-marketplace" className={`${btnPrimary} mb-4`}>
                <i className="ph ph-storefront mr-2" aria-hidden="true" /> {t('Enter Market')}
              </Link>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/create-listing" className={btnSecondary}>
                  <i className="ph ph-plus-circle mb-2 text-2xl" aria-hidden="true" />
                  <span className="text-sm font-medium">{t('List Produce')}</span>
                </Link>
                <button type="button" className={btnSecondary}>
                  <i className="ph ph-magnifying-glass mb-2 text-2xl" aria-hidden="true" />
                  <span className="text-sm font-medium">{t('Find Buyers')}</span>
                </button>
              </div>
            </div>
            <div className="neu rounded-3xl p-4">
              <h3 className="mb-3 font-semibold text-gray-800">{t('Recent Transactions')}</h3>
              <div className="py-6 text-center">
                <i className="ph ph-shopping-cart mb-2 text-3xl text-gray-400" aria-hidden="true" />
                <p className="text-gray-500">{t('No transactions yet')}</p>
              </div>
            </div>
          </section>
        )}

        {section === 'logistics' && (
          <section>
            <div className="mb-4 neu rounded-3xl p-6 text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
                <i className="ph ph-truck text-3xl text-purple-500" aria-hidden="true" />
              </div>
              <h2 className="mb-2 text-lg font-semibold text-gray-800">{t('Mandi on Wheels')}</h2>
              <p className="mb-4 text-gray-600">{t('Book vehicles for transporting your produce')}</p>
              <Link href="/book-logistics" className={btnPrimary}>
                <i className="ph ph-calendar-plus mr-2" aria-hidden="true" /> {t('Book Now')}
              </Link>
            </div>
            <div className="neu rounded-3xl p-4">
              <h3 className="mb-3 font-semibold text-gray-800">{t('Available Services')}</h3>
              <ul className="space-y-3">
                {LOGISTICS.map((l) => (
                  <li key={l.name} className="flex items-center justify-between neu-inset rounded-2xl p-3">
                    <div className="flex items-center">
                      <div className={`mr-3 rounded-lg p-2 ${l.bg}`}>
                        <i className={`ph ${l.icon} ${l.fg}`} aria-hidden="true" />
                      </div>
                      <div>
                        <h4 className="font-medium">{t(l.name)}</h4>
                        <p className="text-sm text-gray-600">{t(l.desc)}</p>
                      </div>
                    </div>
                    <i className="ph ph-caret-right text-gray-400" aria-hidden="true" />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>

      <BottomNav active="mandi" />

      {soonItem && (
        <div role="dialog" aria-modal="true" aria-labelledby="soon-title" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setSoonItem(null)} aria-hidden="true" />
          <div className="relative z-10 w-full max-w-xs rounded-xl bg-white p-6 shadow-xl">
            <h3 id="soon-title" className="mb-2 text-lg font-semibold text-gray-800">
              {t(SOON_TITLES[soonItem])}
            </h3>
            <p className="mb-6 text-gray-600">{t('This feature is under development. Coming soon!')}</p>
            <div className="flex justify-end space-x-3">
              <button type="button" onClick={() => setSoonItem(null)} className="rounded-lg bg-gray-200 px-4 py-2 font-medium text-gray-700 hover:bg-gray-300">
                {t('Cancel')}
              </button>
              <button type="button" autoFocus onClick={() => setSoonItem(null)} className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700">
                {t('OK')}
              </button>
            </div>
          </div>
        </div>
      )}

      {locationOpen && (
        <LocationModal
          location={location}
          onClose={() => setLocationOpen(false)}
          onApply={(l) => {
            setLocation(l)
            setLocationOpen(false)
          }}
        />
      )}
    </MobileFrame>
  )
}
