'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { useLanguage } from '@/components/providers/language-provider'
import { useNotifications } from '@/components/providers/notification-provider'

type Props = {
  policyTitle: string
  onClose: () => void
}

type Step = 'form' | 'submitted'

export function ExpertRequestModal({ policyTitle, onClose }: Props) {
  const { t } = useLanguage()
  const { profile, user } = useAuth()
  const { notify } = useNotifications()
  const titleId = useId()
  const nameRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('form')
  const [name, setName] = useState(profile?.name ?? user?.displayName ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (step === 'form') nameRef.current?.focus()
  }, [step])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const digits = phone.replace(/\D/g, '')
    if (!name.trim()) return setError(t('Please enter your name.'))
    if (digits.length < 10) return setError(t('Please enter a valid 10-digit phone number.'))
    setError('')
    setSubmitting(true)
    window.setTimeout(() => {
      setSubmitting(false)
      setStep('submitted')
      notify({
        kind: 'success',
        title: t('Application submitted successfully'),
        body: `${t('Expert request for')} ${t(policyTitle)} ${t('has been received.')}`,
      })
    }, 700)
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md animate-fade-up rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
      >
        {step === 'form' ? (
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id={titleId} className="text-lg font-bold text-gray-800">
                  {t('Connect to an Expert')}
                </h2>
                <p className="text-sm text-gray-600">
                  {t('Hire an expert to help you with')} {t(policyTitle)}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('Close')}
                className="rounded-full p-1 text-gray-500 hover:bg-gray-100"
              >
                <i className="ph ph-x text-xl" aria-hidden="true" />
              </button>
            </div>

            <label className="mb-3 block text-sm font-medium text-gray-700">
              {t('Full name')}
              <input
                ref={nameRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-gray-800 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/30"
              />
            </label>
            <label className="mb-3 block text-sm font-medium text-gray-700">
              {t('Phone number')}
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-gray-800 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/30"
              />
            </label>
            <label className="mb-3 block text-sm font-medium text-gray-700">
              {t('What do you need help with? (optional)')}
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-gray-800 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/30"
              />
            </label>

            {error && (
              <p role="alert" className="mb-3 text-sm font-medium text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center rounded-lg bg-green-600 p-2.5 font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-60"
            >
              {submitting ? t('Submitting...') : t('Submit Request')}
            </button>
          </form>
        ) : (
          <div className="text-center" role="status">
            <span className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
              <i className="ph-fill ph-check-circle text-4xl" aria-hidden="true" />
            </span>
            <h2 id={titleId} className="mb-1 text-lg font-bold text-gray-800">
              {t('Request Submitted!')}
            </h2>
            <p className="mb-5 text-sm text-gray-600">
              {t('Your request has been submitted. Our field representative will reach out to you soon.')}
            </p>
            <button
              type="button"
              onClick={onClose}
              autoFocus
              className="w-full rounded-lg bg-green-600 p-2.5 font-semibold text-white transition-colors hover:bg-green-700"
            >
              {t('Done')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
