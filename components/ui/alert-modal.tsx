'use client'

import { useCallback, useState } from 'react'

export type AlertState = { title: string; message: string } | null

export function useAlert() {
  const [alert, setAlert] = useState<AlertState>(null)
  const showAlert = useCallback((title: string, message: string) => setAlert({ title, message }), [])
  const closeAlert = useCallback(() => setAlert(null), [])
  return { alert, showAlert, closeAlert }
}

export function AlertModal({ alert, onClose }: { alert: AlertState; onClose: () => void }) {
  if (!alert) return null
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="alert-title"
      aria-describedby="alert-message"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4"
    >
      <div className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-xl">
        <h3 id="alert-title" className="mb-4 text-lg font-semibold text-gray-800">
          {alert.title}
        </h3>
        <p id="alert-message" className="mb-6 text-gray-600">
          {alert.message}
        </p>
        <button
          type="button"
          autoFocus
          onClick={onClose}
          className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition hover:bg-green-700"
        >
          OK
        </button>
      </div>
    </div>
  )
}
