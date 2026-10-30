'use client'

import { useState } from 'react'
import { LOCATION_DATA } from '@/lib/mandi'
import { useLanguage } from '@/components/providers/language-provider'

export type Location = { state: string | null; district: string | null }

export function LocationModal({
  location,
  onApply,
  onClose,
}: {
  location: Location
  onApply: (l: { state: string; district: string }) => void
  onClose: () => void
}) {
  const { t } = useLanguage()
  const [state, setState] = useState(location.state && LOCATION_DATA[location.state] ? location.state : '')
  const [district, setDistrict] = useState(location.district ?? '')
  const valid = Boolean(state && district && LOCATION_DATA[state]?.includes(district))
  const select = 'w-full rounded-lg border border-gray-300 bg-white p-2 focus:border-green-500 focus:ring-green-500'

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="loc-title" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-xs space-y-4 rounded-xl bg-white p-6 shadow-xl">
        <h3 id="loc-title" className="mb-2 text-lg font-semibold text-gray-800">
          {t('Change Location')}
        </h3>
        <div>
          <label htmlFor="state-select" className="mb-1 block text-sm font-medium text-gray-700">
            {t('State')}
          </label>
          <select
            id="state-select"
            value={state}
            onChange={(e) => {
              setState(e.target.value)
              setDistrict('')
            }}
            className={select}
          >
            <option value="">{t('Select State')}</option>
            {Object.keys(LOCATION_DATA).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="district-select" className="mb-1 block text-sm font-medium text-gray-700">
            {t('District')}
          </label>
          <select
            id="district-select"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            disabled={!state}
            className={select}
          >
            <option value="">{state ? t('Select District') : t('Select State First')}</option>
            {(LOCATION_DATA[state] ?? []).map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end space-x-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg bg-gray-200 px-4 py-2 font-medium text-gray-700 hover:bg-gray-300">
            {t('Cancel')}
          </button>
          <button
            type="button"
            disabled={!valid}
            onClick={() => onApply({ state, district })}
            className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {t('Apply')}
          </button>
        </div>
      </div>
    </div>
  )
}
