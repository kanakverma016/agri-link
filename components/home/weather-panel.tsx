'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { apiFetch } from '@/lib/api-client'

type ForecastItem = {
  dt: number
  pop: number
  main: { temp: number }
  weather: { main: string; description: string }[]
}

async function fetchForecast(url: string): Promise<ForecastItem[]> {
  const res = await apiFetch(url)
  const data = await res.json()
  if (!res.ok || (data.cod && String(data.cod) !== '200')) {
    throw new Error(data.message || data.error || 'Failed to fetch weather')
  }
  return data.list as ForecastItem[]
}

function WeatherIcon({ main }: { main: string }) {
  const w = main.toLowerCase()
  if (w.includes('rain') || w.includes('drizzle'))
    return <i className="ph-fill ph-cloud-rain text-2xl text-blue-500" aria-hidden="true" />
  if (w.includes('clouds'))
    return <i className="ph-fill ph-cloud text-2xl text-gray-500" aria-hidden="true" />
  return <i className="ph-fill ph-sun text-2xl text-yellow-500" aria-hidden="true" />
}

function groupByDay(list: ForecastItem[]) {
  const days = new Map<string, ForecastItem[]>()
  for (const item of list) {
    const key = new Date(item.dt * 1000).toLocaleDateString()
    days.set(key, [...(days.get(key) ?? []), item])
  }
  return Array.from(days.values()).slice(0, 5)
}

export function WeatherPanel({
  district,
  state,
  onClose,
}: {
  district: string
  state: string
  onClose: () => void
}) {
  const [visible, setVisible] = useState(false)
  const { data, error, isLoading } = useSWR(
    `/api/weather?district=${encodeURIComponent(district)}`,
    fetchForecast,
    { revalidateOnFocus: false },
  )

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  function close() {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  return (
    <div className="absolute inset-0 z-30 bg-black bg-opacity-50">
      <div
        role="dialog"
        aria-label="Weather and advisory"
        className={`absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 transition-transform duration-300 ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">Weather and advisory</h2>
          <button type="button" onClick={close} aria-label="Close weather">
            <i className="ph ph-x text-2xl text-gray-500" aria-hidden="true" />
          </button>
        </div>
        <p className="mb-4 font-semibold text-gray-600">{`${district}, ${state}`}</p>
        {isLoading && <div className="p-8 text-center">Loading weather...</div>}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-700">
              <tr>
                <th scope="col" className="px-4 py-2">Date</th>
                <th scope="col" className="px-4 py-2">Temperature</th>
                <th scope="col" className="px-4 py-2">Rain</th>
                <th scope="col" className="px-4 py-2">Weather</th>
              </tr>
            </thead>
            <tbody>
              {error && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-red-500">
                    Error: {error.message}
                  </td>
                </tr>
              )}
              {data &&
                groupByDay(data).map((items) => {
                  const first = items[0]
                  const date = new Date(first.dt * 1000)
                  const temps = items.map((i) => i.main.temp)
                  return (
                    <tr key={first.dt} className="border-b bg-white">
                      <td className="px-4 py-3">
                        {date.getDate()} {date.toLocaleString('default', { month: 'short' })}
                      </td>
                      <td className="px-4 py-3">
                        {Math.round(Math.min(...temps))}° - {Math.round(Math.max(...temps))}°C
                      </td>
                      <td className="px-4 py-3">{Math.round(first.pop * 100)}%</td>
                      <td className="flex items-center space-x-2 px-4 py-3">
                        <WeatherIcon main={first.weather[0].main} />
                        <span className="capitalize">{first.weather[0].description}</span>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
