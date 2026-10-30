'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useVoiceFill } from '@/lib/use-voice-fill'
import { useLanguage } from '@/components/providers/language-provider'

const OTHER_ACTIVITY = 'Other (अन्य)'
const ACTIVITY_TYPES = [
  'Irrigation (सिंचाई)',
  'Fertilizer (उर्वरक)',
  'Pest Control (कीट नियंत्रण)',
  'Weeding (निराई)',
  OTHER_ACTIVITY,
]
const field = 'w-full rounded-md border border-gray-300 p-3'
const todayISO = () => new Date().toISOString().slice(0, 10)

type PathProps = { userId: string; plotId: string }
type ModalProps = { open: boolean; onClose: () => void; onError: (message: string) => void }

function ModalShell({
  title,
  titleId,
  children,
}: {
  title: string
  titleId: string
  children: React.ReactNode
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50 p-4"
    >
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h3 id={titleId} className="mb-4 text-lg font-semibold text-gray-800">
          {title}
        </h3>
        {children}
      </div>
    </div>
  )
}

function Mic({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
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

function Actions({
  onCancel,
  saving,
  submitLabel,
  savingLabel,
  color,
}: {
  onCancel: () => void
  saving: boolean
  submitLabel: string
  savingLabel: string
  color: string
}) {
  const { t } = useLanguage()
  return (
    <div className="flex justify-end space-x-3">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg bg-gray-200 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-300"
      >
        {t('Cancel')}
      </button>
      <button
        type="submit"
        disabled={saving}
        className={`rounded-lg px-4 py-2 font-medium text-white transition disabled:opacity-60 ${color}`}
      >
        {saving ? savingLabel : submitLabel}
      </button>
    </div>
  )
}

export function StartCycleModal({ open, onClose, onError, userId, plotId }: ModalProps & PathProps) {
  const { t } = useLanguage()
  const [cropName, setCropName] = useState('')
  const [variety, setVariety] = useState('')
  const [sowingDate, setSowingDate] = useState('')
  const [saving, setSaving] = useState(false)
  const voice = useVoiceFill<'cropName' | 'variety'>((key, text) => {
    const append = (p: string) => p + (p ? ' ' : '') + text
    if (key === 'cropName') setCropName(append)
    else setVariety(append)
  })

  function close() {
    setCropName('')
    setVariety('')
    setSowingDate('')
    onClose()
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      const { error } = await createClient()
        .from('cycles')
        .insert({
          userId,
          plotId,
          cropName: cropName.trim(),
          variety: variety.trim(),
          sowingDate: new Date(sowingDate).toISOString(),
          status: 'Active',
        })
      if (error) throw error
      close()
    } catch (err) {
      console.error('Error starting cycle: ', err)
      onError(t('Error starting cycle. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null
  return (
    <ModalShell title={t('Start New Crop Cycle')} titleId="cycle-title">
      <form onSubmit={submit}>
        <div className="relative mb-4">
          <label htmlFor="cropName" className="mb-2 block text-gray-700">
            {t('Crop Name')}
          </label>
          <input
            id="cropName"
            type="text"
            value={cropName}
            onChange={(e) => setCropName(e.target.value)}
            className={`${field} pr-10`}
            placeholder={t('e.g., Wheat')}
            required
          />
          {voice.supported && (
            <Mic label={t('Dictate crop name')} active={voice.activeKey === 'cropName'} onClick={() => voice.listen('cropName')} />
          )}
        </div>
        <div className="relative mb-4">
          <label htmlFor="cropVariety" className="mb-2 block text-gray-700">
            {t('Variety (Optional)')}
          </label>
          <input
            id="cropVariety"
            type="text"
            value={variety}
            onChange={(e) => setVariety(e.target.value)}
            className={`${field} pr-10`}
            placeholder={t('e.g., HD-2967')}
          />
          {voice.supported && (
            <Mic label={t('Dictate variety')} active={voice.activeKey === 'variety'} onClick={() => voice.listen('variety')} />
          )}
        </div>
        <div className="mb-6">
          <label htmlFor="sowingDate" className="mb-2 block text-gray-700">
            {t('Sowing Date')}
          </label>
          <input
            id="sowingDate"
            type="date"
            value={sowingDate}
            onChange={(e) => setSowingDate(e.target.value)}
            className={field}
            required
          />
        </div>
        <Actions
          onCancel={close}
          saving={saving}
          submitLabel={t('Save Cycle')}
          savingLabel={t('Saving...')}
          color="bg-green-600 hover:bg-green-700"
        />
      </form>
    </ModalShell>
  )
}

export function AddActivityModal({
  open,
  onClose,
  onError,
  userId,
  plotId,
  cycleId,
}: ModalProps & PathProps & { cycleId: string | null }) {
  const { t } = useLanguage()
  const [date, setDate] = useState(todayISO)
  const [type, setType] = useState(ACTIVITY_TYPES[0])
  const [otherType, setOtherType] = useState('')
  const [description, setDescription] = useState('')
  const [cost, setCost] = useState('')
  const [saving, setSaving] = useState(false)
  const voice = useVoiceFill<'other' | 'desc'>((key, text) => {
    const append = (p: string) => p + (p ? ' ' : '') + text
    if (key === 'other') setOtherType(append)
    else setDescription(append)
  })

  function close() {
    setDate(todayISO())
    setType(ACTIVITY_TYPES[0])
    setOtherType('')
    setDescription('')
    setCost('')
    onClose()
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    if (!cycleId) {
      onError(t('No active crop selected.'))
      return
    }
    const finalType = type === OTHER_ACTIVITY ? otherType.trim() : type
    if (!finalType) {
      onError(t('Please specify the "Other" activity type.'))
      return
    }
    setSaving(true)
    try {
      const { error } = await createClient()
        .from('activities')
        .insert({
          userId,
          cycleId,
          date: new Date(date).toISOString(),
          type: finalType,
          description,
          cost: parseFloat(cost) || 0,
        })
      if (error) throw error
      close()
    } catch (err) {
      console.error('Error adding activity: ', err)
      onError(t('Error saving activity.'))
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null
  return (
    <ModalShell title={t('Log an Activity')} titleId="activity-title">
      <form onSubmit={submit}>
        <div className="mb-4">
          <label htmlFor="activityDate" className="mb-2 block text-gray-700">
            {t('Date')}
          </label>
          <input
            id="activityDate"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={field}
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="activityType" className="mb-2 block text-gray-700">
            {t('Activity Type')}
          </label>
          <select
            id="activityType"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={`${field} bg-white`}
          >
            {ACTIVITY_TYPES.map((a) => (
              <option key={a} value={a}>
                {t(a)}
              </option>
            ))}
          </select>
        </div>
        {type === OTHER_ACTIVITY && (
          <div className="relative mb-4">
            <label htmlFor="otherActivityType" className="mb-2 block text-gray-700">
              {t('Specify Other Activity')}
            </label>
            <input
              id="otherActivityType"
              type="text"
              value={otherType}
              onChange={(e) => setOtherType(e.target.value)}
              className={`${field} pr-10`}
              placeholder={t('Type activity...')}
            />
            {voice.supported && (
              <Mic label={t('Dictate activity')} active={voice.activeKey === 'other'} onClick={() => voice.listen('other')} />
            )}
          </div>
        )}
        <div className="relative mb-4">
          <label htmlFor="activityDesc" className="mb-2 block text-gray-700">
            {t('Description (Optional)')}
          </label>
          <input
            id="activityDesc"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${field} pr-10`}
            placeholder={t('e.g., 1 bag DAP')}
          />
          {voice.supported && (
            <Mic label={t('Dictate description')} active={voice.activeKey === 'desc'} onClick={() => voice.listen('desc')} />
          )}
        </div>
        <div className="mb-6">
          <label htmlFor="activityCost" className="mb-2 block text-gray-700">
            {t('Cost (₹)')}
          </label>
          <input
            id="activityCost"
            type="number"
            min="0"
            step="any"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className={field}
            placeholder="1200"
            required
          />
        </div>
        <Actions
          onCancel={close}
          saving={saving}
          submitLabel={t('Save Activity')}
          savingLabel={t('Saving...')}
          color="bg-blue-600 hover:bg-blue-700"
        />
      </form>
    </ModalShell>
  )
}

export function HarvestModal({
  open,
  onClose,
  onError,
  userId,
  plotId,
  cycleId,
}: ModalProps & PathProps & { cycleId: string | null }) {
  const { t } = useLanguage()
  const [date, setDate] = useState(todayISO)
  const [totalYield, setTotalYield] = useState('')
  const [yieldUnit, setYieldUnit] = useState('Quintals')
  const [sellingPrice, setSellingPrice] = useState('')
  const [saving, setSaving] = useState(false)

  function close() {
    setDate(todayISO())
    setTotalYield('')
    setYieldUnit('Quintals')
    setSellingPrice('')
    onClose()
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    if (!cycleId) {
      onError(t('No active crop selected.'))
      return
    }
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select('cost')
        .eq('cycleId', cycleId)
      if (activitiesError) throw activitiesError
      const totalCost = (activities ?? []).reduce((sum, a) => sum + (Number(a.cost) || 0), 0)
      const { error } = await supabase
        .from('cycles')
        .update({
          status: 'Harvested',
          harvestDate: new Date(date).toISOString(),
          totalYield: parseFloat(totalYield) || 0,
          yieldUnit,
          sellingPrice: parseFloat(sellingPrice) || 0,
          totalCost,
        })
        .eq('id', cycleId)
        .eq('plotId', plotId)
      if (error) throw error
      close()
    } catch (err) {
      console.error('Error harvesting crop: ', err)
      onError(t('Error completing harvest.'))
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null
  return (
    <ModalShell title={t('Complete Harvest')} titleId="harvest-title">
      <form onSubmit={submit}>
        <div className="mb-4">
          <label htmlFor="harvestDate" className="mb-2 block text-gray-700">
            {t('Harvest Date')}
          </label>
          <input
            id="harvestDate"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={field}
            required
          />
        </div>
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="totalYield" className="mb-2 block text-gray-700">
              {t('Total Yield')}
            </label>
            <input
              id="totalYield"
              type="number"
              min="0"
              step="any"
              value={totalYield}
              onChange={(e) => setTotalYield(e.target.value)}
              className={field}
              placeholder="20"
              required
            />
          </div>
          <div>
            <label htmlFor="yieldUnit" className="mb-2 block text-gray-700">
              {t('Unit')}
            </label>
            <select
              id="yieldUnit"
              value={yieldUnit}
              onChange={(e) => setYieldUnit(e.target.value)}
              className={`${field} bg-white`}
            >
              <option value="Quintals">{t('Quintals')}</option>
              <option value="Kg">{t('Kg')}</option>
            </select>
          </div>
        </div>
        <div className="mb-6">
          <label htmlFor="sellingPrice" className="mb-2 block text-gray-700">
            {t('Selling Price (per Unit, ₹)')}
          </label>
          <input
            id="sellingPrice"
            type="number"
            min="0"
            step="any"
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
            className={field}
            placeholder="2200"
          />
        </div>
        <Actions
          onCancel={close}
          saving={saving}
          submitLabel={t('Complete')}
          savingLabel={t('Completing...')}
          color="bg-yellow-600 hover:bg-yellow-700"
        />
      </form>
    </ModalShell>
  )
}
