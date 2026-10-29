'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useVoiceFill } from '@/lib/use-voice-fill'

const OTHER_SOIL = 'Other (अन्य)'
const SOIL_TYPES = ['Domat (दोमट)', 'Baluai (बलुई)', 'Chikni (चिकनी)', 'Gadiya (गादिया)', OTHER_SOIL]
const field = 'w-full rounded-md border border-gray-300 p-3'

export function AddPlotModal({
  open,
  userId,
  onClose,
  onError,
}: {
  open: boolean
  userId: string
  onClose: () => void
  onError: (message: string) => void
}) {
  const [plotName, setPlotName] = useState('')
  const [area, setArea] = useState('')
  const [areaUnit, setAreaUnit] = useState('Acres')
  const [soilType, setSoilType] = useState(SOIL_TYPES[0])
  const [otherSoil, setOtherSoil] = useState('')
  const [saving, setSaving] = useState(false)

  const voice = useVoiceFill<'plotName' | 'otherSoil'>((key, text) => {
    const append = (prev: string) => prev + (prev ? ' ' : '') + text
    if (key === 'plotName') setPlotName(append)
    else setOtherSoil(append)
  })

  function reset() {
    setPlotName('')
    setArea('')
    setAreaUnit('Acres')
    setSoilType(SOIL_TYPES[0])
    setOtherSoil('')
  }

  function cancel() {
    reset()
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    const finalSoil = soilType === OTHER_SOIL ? otherSoil.trim() : soilType
    if (!finalSoil) {
      onError('Please specify the "Other" soil type.')
      return
    }
    setSaving(true)
    try {
      const { error } = await createClient().from('plots').insert({
        userId,
        plotName: plotName.trim(),
        area: parseFloat(area),
        areaUnit,
        soilType: finalSoil,
      })
      if (error) throw error
      reset()
      onClose()
    } catch (err) {
      console.error('Error adding document: ', err)
      onError('Error saving plot. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-plot-title"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50 p-4"
    >
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h3 id="add-plot-title" className="mb-4 text-lg font-semibold text-gray-800">
          Add New Plot
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="relative mb-4">
            <label htmlFor="plotName" className="mb-2 block text-gray-700">
              Plot Name
            </label>
            <input
              id="plotName"
              type="text"
              value={plotName}
              onChange={(e) => setPlotName(e.target.value)}
              className={`${field} pr-10`}
              placeholder="e.g., Field by the river"
              required
            />
            {voice.supported && (
              <MicButton
                label="Dictate plot name"
                active={voice.activeKey === 'plotName'}
                onClick={() => voice.listen('plotName')}
              />
            )}
          </div>

          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="plotArea" className="mb-2 block text-gray-700">
                Area
              </label>
              <input
                id="plotArea"
                type="number"
                min="0"
                step="any"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className={field}
                placeholder="5"
                required
              />
            </div>
            <div>
              <label htmlFor="plotAreaUnit" className="mb-2 block text-gray-700">
                Unit
              </label>
              <select
                id="plotAreaUnit"
                value={areaUnit}
                onChange={(e) => setAreaUnit(e.target.value)}
                className={`${field} bg-white`}
              >
                <option>Acres</option>
                <option>Bigha</option>
                <option>Hectares</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="plotSoilType" className="mb-2 block text-gray-700">
              Soil Type
            </label>
            <select
              id="plotSoilType"
              value={soilType}
              onChange={(e) => setSoilType(e.target.value)}
              className={`${field} bg-white`}
            >
              {SOIL_TYPES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          {soilType === OTHER_SOIL && (
            <div className="relative mb-6">
              <label htmlFor="otherSoilType" className="mb-2 block text-gray-700">
                Specify Other Soil Type
              </label>
              <input
                id="otherSoilType"
                type="text"
                value={otherSoil}
                onChange={(e) => setOtherSoil(e.target.value)}
                className={`${field} pr-10`}
                placeholder="Type soil type..."
              />
              {voice.supported && (
                <MicButton
                  label="Dictate soil type"
                  active={voice.activeKey === 'otherSoil'}
                  onClick={() => voice.listen('otherSoil')}
                />
              )}
            </div>
          )}

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={cancel}
              className="rounded-lg bg-gray-200 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition hover:bg-green-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Plot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MicButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`absolute right-3 top-10 ${active ? 'animate-pulse text-red-500' : 'text-gray-500 hover:text-blue-600'}`}
    >
      <i className="ph ph-microphone text-2xl" aria-hidden="true" />
    </button>
  )
}
