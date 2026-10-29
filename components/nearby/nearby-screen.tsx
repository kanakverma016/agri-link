'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/components/providers/auth-provider'
import { MobileFrame } from '@/components/mobile-frame'
import { BottomNav } from '@/components/bottom-nav'
import { Spinner } from '@/components/ui/spinner'
import { AlertModal, useAlert } from '@/components/ui/alert-modal'
import { GoogleMap, type RouteRequest } from '@/components/nearby/google-map'
import { DEFAULT_COORDS, PLACES, PRICES, distanceKm, type Category, type Place } from '@/lib/nearby'

type Coords = { lat: number; lng: number }
type Status = { kind: 'loading' | 'ok' | 'warn'; text: string; sub?: string }

const FILTERS: { key: Category; icon: string; color: string; label: string }[] = [
  { key: 'mandi', icon: 'ph-storefront', color: 'text-green-600', label: 'Mandi (मंडी)' },
  { key: 'storage', icon: 'ph-warehouse', color: 'text-blue-600', label: 'Storage (स्टोर)' },
  { key: 'shop', icon: 'ph-shopping-cart', color: 'text-yellow-600', label: 'warehouse (गोदाम)' },
]

type PricedPlace = Place & { distance: number; price?: number; unit?: string }

export function NearbyScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const { alert, showAlert, closeAlert } = useAlert()
  const [status, setStatus] = useState<Status>({ kind: 'loading', text: 'Fetching profile...' })
  const [center, setCenter] = useState<Coords | null>(null)
  const [category, setCategory] = useState<Category>('mandi')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PricedPlace[] | null>(null)
  const [searchMessage, setSearchMessage] = useState<string | null>(null)
  const [route, setRoute] = useState<RouteRequest | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [cachedPrices, setCachedPrices] = useState<{ prices: Record<string, number>; cropName: string }>({
    prices: {},
    cropName: 'Price',
  })

  useEffect(() => {
    try {
      const raw = localStorage.getItem('smartKrishiPriceCache')
      if (raw) {
        const data = JSON.parse(raw) as { prices?: Record<string, number>; cropName?: string }
        setCachedPrices({ prices: data.prices ?? {}, cropName: data.cropName ?? 'Price' })
      }
    } catch {
      // ignore corrupt cache
    }
  }, [])

  useEffect(() => {
    if (!user) return
    let cancelled = false

    const useProfile = async () => {
      let district: string | null = null
      let state: string | null = null
      try {
        const snap = await getDoc(doc(db, 'users', user.uid))
        if (snap.exists()) {
          const d = snap.data() as { district?: string; state?: string }
          district = d.district ?? null
          state = d.state ?? null
        }
      } catch (err) {
        console.error('Error fetching user profile:', err)
      }
      if (cancelled) return
      if (district && state) {
        try {
          const res = await fetch(`/api/geocode?address=${encodeURIComponent(`${district}, ${state}`)}`)
          if (res.ok) {
            const { lat, lng } = (await res.json()) as Coords
            if (!cancelled) {
              setCenter({ lat, lng })
              setStatus({ kind: 'ok', text: `Showing locations near ${district}` })
            }
            return
          }
        } catch {
          // fall through to default
        }
      }
      if (!cancelled) {
        setCenter(DEFAULT_COORDS)
        setStatus({ kind: 'warn', text: 'Could not find your location.', sub: 'Showing default locations for Meerut.' })
      }
    }

    setStatus({ kind: 'loading', text: 'Getting your live location...' })
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return
          setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          setStatus({ kind: 'ok', text: 'Showing locations near your live location' })
        },
        () => void useProfile(),
      )
    } else {
      void useProfile()
    }
    return () => {
      cancelled = true
    }
  }, [user])

  const places = useMemo(() => {
    const ref = center ?? DEFAULT_COORDS
    return PLACES.map((p) => ({ ...p, distance: distanceKm(ref, p) }))
  }, [center])

  const handleSearch = () => {
    setRoute(null)
    const crop = query.trim().toLowerCase()
    if (!crop) return setSearchMessage('Please enter a crop name.'), setResults(null)
    if (!center) return setSearchMessage('Still trying to find your location. Please wait.'), setResults(null)
    const prices = PRICES[crop]
    if (!prices) return setSearchMessage(`Sorry, no price data found for '${crop}'.`), setResults(null)

    const list: PricedPlace[] = []
    for (const p of places) {
      if (p.category === 'mandi' && prices[p.id]) {
        list.push({ ...p, price: prices[p.id], unit: crop === 'wheat' ? 'quintal' : 'kg' })
      } else if (p.category === 'storage') {
        list.push(p)
      }
    }
    list.sort((a, b) => {
      if (a.price && !b.price) return -1
      if (!a.price && b.price) return 1
      return a.distance - b.distance
    })
    setSearchMessage(list.length ? null : 'No mandis or storages found for your search.')
    setResults(list)
  }

  const bookTruck = (name: string) => router.push(`/book-logistics?destination=${encodeURIComponent(name)}`)

  const requestRoute = (p: Place) => {
    setRouteLoading(true)
    setRoute({ id: Date.now(), lat: p.lat, lng: p.lng })
  }

  return (
    <MobileFrame>
      <header className="z-20 w-full flex-shrink-0 bg-green-700 p-4 text-white">
        <div className="flex items-center">
          <Link href="/mandi" aria-label="Back to mandi" className="mr-4 p-2">
            <i className="ph ph-arrow-left text-2xl" aria-hidden="true" />
          </Link>
          <h1 className="text-xl font-bold">Nearby Locator</h1>
        </div>
      </header>

      <main className="flex-grow space-y-4 overflow-y-auto p-4 pb-24">
        <form
          className="space-y-2 rounded-2xl bg-white p-4 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault()
            handleSearch()
          }}
        >
          <label htmlFor="crop-search" className="block font-semibold text-gray-700">
            What crop do you want to sell?
          </label>
          <div className="flex gap-2">
            <input
              id="crop-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try 'Apple' or 'Potato'"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button type="submit" aria-label="Search prices" className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700">
              <i className="ph ph-magnifying-glass" aria-hidden="true" />
            </button>
          </div>
        </form>

        <div className="grid grid-cols-3 gap-3">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={category === f.key}
              onClick={() => {
                setCategory(f.key)
                setRoute(null)
              }}
              className={`flex flex-col items-center justify-center rounded-xl border bg-white p-2 text-xs font-semibold shadow-sm ${category === f.key ? 'border-green-600 text-green-600' : 'border-gray-200 text-gray-600'}`}
            >
              <i className={`ph ${f.icon} mb-1 text-2xl ${f.color}`} aria-hidden="true" />
              {f.label}
            </button>
          ))}
        </div>

        <div className="rounded-2xl bg-white p-4 text-center shadow-sm" aria-live="polite">
          {status.kind === 'loading' && <div className="mb-2 flex justify-center"><Spinner /></div>}
          <p className={`font-medium ${status.kind === 'ok' ? 'text-green-700' : status.kind === 'warn' ? 'text-yellow-700' : 'text-gray-600'}`}>
            {status.text}
          </p>
          {status.sub && <p className="text-sm text-gray-500">{status.sub}</p>}
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {center ? (
            <GoogleMap
              places={places}
              category={category}
              center={center}
              prices={cachedPrices.prices}
              cropName={cachedPrices.cropName}
              route={route}
              onBookTruck={bookTruck}
              onError={(m) => showAlert('Map Error', m)}
              onRouteResult={(ok, message) => {
                setRouteLoading(false)
                if (ok) setResults(null)
                else if (message) showAlert('Directions', message)
              }}
            />
          ) : (
            <div className="flex h-[450px] items-center justify-center bg-gray-100">
              <Spinner />
            </div>
          )}
        </div>

        <div className="space-y-3">
          {routeLoading && (
            <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
              <div className="mb-2 flex justify-center"><Spinner /></div>
              <p>Calculating route...</p>
            </div>
          )}
          {searchMessage && (
            <div className="rounded-2xl bg-white p-4 text-center text-gray-600 shadow-sm">
              <p>{searchMessage}</p>
            </div>
          )}
          {results?.map((item) => (
            <article key={item.id} className={`rounded-2xl border-l-4 bg-white p-4 shadow-sm ${item.category === 'storage' ? 'border-blue-500' : 'border-green-500'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className={`text-lg font-bold ${item.category === 'storage' ? 'text-blue-800' : 'text-green-800'}`}>{item.name}</h3>
                  <p className="text-sm font-semibold text-gray-600">{item.distance.toFixed(1)} km away</p>
                </div>
                {item.price && (
                  <p className="text-xl font-bold text-green-700">
                    ₹{item.price}
                    <span className="text-lg">/{item.unit}</span>
                  </p>
                )}
              </div>
              <div className="mt-2 text-sm text-gray-700">
                <p><strong>Timings:</strong> {item.timings || 'Not available'}</p>
                {item.phone && (
                  <p>
                    <strong>Contact:</strong>{' '}
                    <a href={`tel:${item.phone}`} className="text-blue-600 underline">{item.phone}</a>
                  </p>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => requestRoute(item)} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-green-50 py-2 text-sm font-semibold text-green-700 hover:bg-green-100">
                  <i className="ph ph-map-trifold" aria-hidden="true" /> Directions
                </button>
                <button type="button" onClick={() => bookTruck(item.name)} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-700">
                  <i className="ph ph-truck" aria-hidden="true" /> Book Truck
                </button>
              </div>
            </article>
          ))}
        </div>
      </main>

      <BottomNav active="mandi" />
      <AlertModal alert={alert} onClose={closeAlert} />
    </MobileFrame>
  )
}
