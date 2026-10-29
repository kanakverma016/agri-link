'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api-client'
import { useSpeechSearch } from '@/lib/use-speech-search'
import { COMMON_CROPS, isFruit, parseMandiPrices, toEnglishCrop, type PriceRow } from '@/lib/mandi'
import { Spinner } from '@/components/ui/spinner'
import { PriceChart, type HistoryPoint } from '@/components/mandi/price-chart'
import type { Location } from '@/components/mandi/mandi-location-modal'

type Source = { uri: string; title: string }
const SPANS = [7, 30, 90] as const

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await apiFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`)
  return data as T
}

export function LivePrices({
  location,
  onChangeLocation,
}: {
  location: Location
  onChangeLocation: () => void
}) {
  const [query, setQuery] = useState('')
  const [crop, setCrop] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rawText, setRawText] = useState('')
  const [rows, setRows] = useState<PriceRow[]>([])
  const [sources, setSources] = useState<Source[]>([])
  const [fruit, setFruit] = useState(false)
  const [approximate, setApproximate] = useState(false)

  const [chartMandi, setChartMandi] = useState<string | null>(null)
  const [days, setDays] = useState<(typeof SPANS)[number]>(30)
  const [history, setHistory] = useState<HistoryPoint[] | null>(null)
  const [chartLoading, setChartLoading] = useState(false)
  const [chartError, setChartError] = useState<string | null>(null)

  const fetchPrices = useCallback(
    async (input: string) => {
      setCrop(input)
      setChartMandi(null)
      setHistory(null)
      setRows([])
      setRawText('')
      setSources([])
      setError(null)
      if (!location.district || !location.state) {
        setError('Please select a location first.')
        return
      }
      const english = toEnglishCrop(input)
      setFruit(isFruit(english))
      setLoading(true)
      try {
        const res = await postJson<{ text: string; sources: Source[]; approximate?: boolean }>('/api/mandi/prices', {
          crop: english,
          district: location.district,
          state: location.state,
        })
        setApproximate(Boolean(res.approximate))
        setRawText(res.text)
        setRows(parseMandiPrices(res.text))
        setSources(res.sources)
      } catch (e) {
        setError(`Error: ${e instanceof Error ? e.message : 'Failed to load prices'}`)
      } finally {
        setLoading(false)
      }
    },
    [location.district, location.state],
  )

  const lastLocationKey = `${location.state}|${location.district}`
  const [seenKey, setSeenKey] = useState(lastLocationKey)
  useEffect(() => {
    if (seenKey === lastLocationKey) return
    setSeenKey(lastLocationKey)
    if (crop) fetchPrices(crop)
  }, [lastLocationKey, seenKey, crop, fetchPrices])

  useEffect(() => {
    if (!chartMandi || !crop || !location.district || !location.state) return
    let cancelled = false
    setChartLoading(true)
    setChartError(null)
    setHistory(null)
    postJson<{ data: HistoryPoint[] }>('/api/mandi/history', {
      crop: toEnglishCrop(crop),
      mandi: chartMandi,
      district: location.district,
      state: location.state,
      days,
    })
      .then((r) => !cancelled && setHistory(r.data))
      .catch((e) => !cancelled && setChartError(`Error: ${e instanceof Error ? e.message : 'Failed to load chart'}`))
      .finally(() => !cancelled && setChartLoading(false))
    return () => {
      cancelled = true
    }
  }, [chartMandi, days, crop, location.district, location.state])

  const speech = useSpeechSearch((text) => {
    setQuery(text)
    if (text) fetchPrices(text)
  }, 'hi-IN')

  const units = fruit ? 'kg' : 'Quintal'
  const divisor = fruit ? 100 : 1

  return (
    <section className="space-y-4" aria-label="Live mandi prices">
      <div className="neu rounded-2xl p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100">
              <i className="ph-fill ph-chart-line-up text-xl text-green-700" aria-hidden="true" />
            </span>
            Live Mandi Prices
          </h2>
          <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">
            <i className="ph-fill ph-broadcast" aria-hidden="true" />
            Live
          </span>
        </div>
        <div className="mb-4 rounded-xl bg-gray-50 p-3">
          <div className="flex items-center justify-between">
            <p className="flex items-center text-sm text-gray-600">
              <i className="ph ph-map-pin mr-1 text-green-600" aria-hidden="true" />
              Location:{' '}
              <span className="ml-1 font-medium">
                {location.district && location.state ? `${location.district}, ${location.state}` : 'Location not set'}
              </span>
            </p>
            <button type="button" onClick={onChangeLocation} className="text-sm font-medium text-green-700 hover:underline">
              Change
            </button>
          </div>
        </div>
        <form
          className="relative"
          onSubmit={(e) => {
            e.preventDefault()
            if (query.trim()) fetchPrices(query.trim())
          }}
        >
          <label htmlFor="crop-search-input" className="sr-only">
            Search crop
          </label>
          <input
            id="crop-search-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter crop name (e.g., Wheat) or use mic"
            className="w-full rounded-xl border border-gray-300 p-4 pl-12 pr-12"
          />
          <i className="ph ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          {speech.supported && (
            <button
              type="button"
              onClick={speech.start}
              aria-label="Search by voice"
              className={`absolute right-4 top-1/2 -translate-y-1/2 ${speech.listening ? 'animate-pulse text-red-500' : 'text-gray-500 hover:text-blue-600'}`}
            >
              <i className="ph ph-microphone text-2xl" aria-hidden="true" />
            </button>
          )}
        </form>
      </div>

      <div className="neu rounded-2xl p-4">
        <h3 className="text-md mb-3 font-semibold text-gray-700">Popular Crops</h3>
        <div className="grid grid-cols-3 gap-3">
          {COMMON_CROPS.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => {
                setQuery('')
                fetchPrices(c.name)
              }}
              className="flex flex-col items-center rounded-xl border border-gray-200 bg-gray-50 p-3 transition-colors hover:bg-green-50 active:scale-95"
            >
              <span className={`mb-2 flex h-12 w-12 items-center justify-center rounded-full ${c.bg}`} aria-hidden="true">
                <i className={`ph-fill ${c.icon} text-2xl ${c.fg}`} />
              </span>
              <span className="text-center text-xs font-semibold text-gray-700">{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {crop && (
        <>
          <div className="neu rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-md font-semibold text-gray-800">
                Today&apos;s Prices for <span className="text-green-700">{crop}</span>:
              </h3>
              <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">Live</span>
            </div>
            <div className="min-h-[100px]" aria-live="polite">
              {loading && (
                <div className="py-6 text-center">
                  <div className="mb-3 flex justify-center">
                    <Spinner />
                  </div>
                  <p className="text-gray-500">Fetching latest data...</p>
                </div>
              )}
              {error && (
                <div className="py-6 text-center text-red-500">
                  <i className="ph ph-warning mb-2 text-3xl" aria-hidden="true" />
                  <p>{error}</p>
                </div>
              )}
              {!loading && !error && rows.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full whitespace-nowrap text-left text-sm text-gray-700">
                    <thead>
                      <tr className="border-b text-xs uppercase text-gray-500">
                        <th className="px-4 py-3">
                          <i className="ph ph-storefront mr-1 align-middle text-base" aria-hidden="true" />
                          Market
                        </th>
                        <th className="px-2 py-3">
                          <i className="ph ph-plant mr-1 align-middle text-base" aria-hidden="true" />
                          Variety
                        </th>
                        <th className="px-2 py-3 text-right">
                          <i className="ph ph-trend-down mr-1 align-middle text-base text-blue-600" aria-hidden="true" />
                          Min (₹/{units})
                        </th>
                        <th className="px-2 py-3 text-right">
                          <i className="ph ph-trend-up mr-1 align-middle text-base text-red-600" aria-hidden="true" />
                          Max (₹/{units})
                        </th>
                        <th className="px-2 py-3 text-right">
                          <i className="ph ph-currency-inr mr-1 align-middle text-base text-green-700" aria-hidden="true" />
                          Modal (₹/{units})
                        </th>
                        <th className="px-2 py-3">
                          <i className="ph ph-calendar-blank mr-1 align-middle text-base" aria-hidden="true" />
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr
                          key={`${r.market}-${r.variety}-${i}`}
                          tabIndex={0}
                          onClick={() => {
                            setChartMandi(r.market)
                            setDays(30)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setChartMandi(r.market)
                              setDays(30)
                            }
                          }}
                          className={`cursor-pointer transition-colors hover:bg-green-50 ${i > 0 && rows[i - 1].market !== r.market ? 'border-t-2 border-gray-200' : ''}`}
                        >
                          <td className="px-4 py-3 font-medium text-gray-900">
                            <i className="ph-fill ph-map-pin mr-1 align-middle text-base text-green-600" aria-hidden="true" />
                            {r.market}
                          </td>
                          <td className="px-2 py-3">{r.variety}</td>
                          <td className="px-2 py-3 text-right">{(r.minPrice / divisor).toFixed(2)}</td>
                          <td className="px-2 py-3 text-right">{(r.maxPrice / divisor).toFixed(2)}</td>
                          <td className="px-2 py-3 text-right font-semibold">{(r.modalPrice / divisor).toFixed(2)}</td>
                          <td className="px-2 py-3">{r.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-2 text-xs text-gray-400">Tap a row to see the price trend for that mandi.</p>
                </div>
              )}
              {!loading && !error && rows.length === 0 && rawText && (
                <div className="py-4 text-center text-gray-500">
                  <i className="ph ph-warning text-3xl" aria-hidden="true" />
                  <p className="mt-1 whitespace-pre-wrap text-sm">{rawText}</p>
                </div>
              )}
              {!loading && !error && rawText && (
                <div className="mt-4 border-t pt-3 text-xs text-gray-500">
                  {approximate ? (
                    <p className="flex items-start gap-1 text-amber-700">
                      <i className="ph-fill ph-info mt-0.5 text-sm" aria-hidden="true" />
                      Live market search is busy right now, so these are AI estimates. Confirm the rate at your mandi before selling.
                    </p>
                  ) : sources.length > 0 ? (
                    <>
                      Sources:
                      <br />
                      {sources.map((s, i) => (
                        <span key={s.uri}>
                          {i + 1}.{' '}
                          <a href={s.uri} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {s.title}
                          </a>
                          <br />
                        </span>
                      ))}
                    </>
                  ) : (
                    'Data from public web info.'
                  )}
                </div>
              )}
            </div>
          </div>

          {chartMandi && (
            <div className="neu rounded-2xl p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-md font-semibold text-gray-800">Price Trend ({chartMandi}):</h3>
                <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">History</span>
              </div>
              <div className="mb-4 flex justify-center space-x-2">
                {SPANS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d)}
                    aria-pressed={days === d}
                    className={`rounded-md px-3 py-1 text-sm font-medium ${days === d ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-green-100'}`}
                  >
                    {d} Days
                  </button>
                ))}
              </div>
              {chartLoading && (
                <div className="py-6 text-center">
                  <div className="mb-3 flex justify-center">
                    <Spinner />
                  </div>
                  <p className="text-gray-500">Loading trend data...</p>
                </div>
              )}
              {chartError && (
                <div className="py-6 text-center text-red-500">
                  <i className="ph ph-warning mb-2 text-3xl" aria-hidden="true" />
                  <p>{chartError}</p>
                </div>
              )}
              {history && <PriceChart data={history} fruit={fruit} />}
            </div>
          )}
        </>
      )}
    </section>
  )
}
