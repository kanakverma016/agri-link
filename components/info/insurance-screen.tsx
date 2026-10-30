'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ExpertRequestModal } from '@/components/info/expert-request-modal'
import { MobileFrame } from '@/components/mobile-frame'
import { BottomNav } from '@/components/bottom-nav'
import { useLanguage } from '@/components/providers/language-provider'

type Policy = {
  icon: string
  title: string
  description: string
  features?: string[]
  href?: string
  cta: string
  border: string
  text: string
  button: string
}

const POLICIES: Policy[] = [
  {
    icon: 'ph-plant',
    title: 'Crop Insurance',
    description:
      'This is the government\'s primary scheme to protect against crop loss from natural disasters, pests or diseases.',
    features: [
      'Covers yield loss from non-preventable risks.',
      'Includes protection against post-harvest losses.',
      'Weather-based and yield-based options.',
    ],
    href: 'https://pmfby.gov.in/',
    cta: 'Apply on the PMFBY Portal',
    border: 'border-green-600',
    text: 'text-green-600',
    button: 'bg-green-600 hover:bg-green-700',
  },
  {
    icon: 'ph-cow',
    title: 'Livestock Insurance',
    description:
      'Provides protection against the death of livestock (cows, buffaloes, goats, etc.) due to disease or accidents.',
    href: 'https://nilm.gov.in/',
    cta: 'Learn More on the NILM Portal',
    border: 'border-blue-600',
    text: 'text-blue-600',
    button: 'bg-blue-600 hover:bg-blue-700',
  },
  {
    icon: 'ph-cardholder',
    title: 'Kisan Credit Card (KCC)',
    description:
      'Provides easy credit and includes personal accident and asset insurance cover for KCC holders.',
    href: 'https://www.jansamarth.in/agri-loan',
    cta: 'Apply on the Jan Samarth Portal',
    border: 'border-yellow-600',
    text: 'text-yellow-600',
    button: 'bg-yellow-600 hover:bg-yellow-700',
  },
  {
    icon: 'ph-tractor',
    title: 'Tractor & Equipment',
    description:
      'Protects your valuable machinery from theft, fire and damage. It is usually offered by private and public insurers.',
    cta: 'Contact Local Insurers',
    border: 'border-gray-600',
    text: 'text-gray-600',
    button: 'bg-gray-400',
  },
]

export function InsuranceScreen() {
  const { t } = useLanguage()
  const [expertFor, setExpertFor] = useState<string | null>(null)
  return (
    <MobileFrame>
      <nav className="z-20 w-full flex-shrink-0 bg-white shadow-sm">
        <div className="flex items-center px-4 py-3">
          <Link
            href="/"
            aria-label={t('Back to home')}
            className="rounded-full p-1 text-gray-600 hover:bg-gray-100"
          >
            <i className="ph ph-arrow-left text-2xl" aria-hidden="true" />
          </Link>
          <h1 className="flex-grow text-center text-xl font-bold text-green-700">
            {t('Insurance')}
          </h1>
          <div className="w-8" />
        </div>
      </nav>

      <div className="flex-grow space-y-5 overflow-y-auto p-4 pb-20">
        <header className="mb-2 text-center">
          <h2 className="text-xl font-semibold text-gray-800">{t('Secure Your Livelihood')}</h2>
          <p className="text-sm text-gray-600">
            {t('Learn about official schemes to protect your farm, family and future.')}
          </p>
        </header>

        {POLICIES.map((p) => (
          <section
            key={p.title}
            className={`overflow-hidden rounded-lg border-l-4 bg-white p-4 shadow-sm ${p.border}`}
          >
            <div className="mb-3 flex items-center">
              <i className={`ph ${p.icon} mr-3 text-3xl ${p.text}`} aria-hidden="true" />
              <h3 className="text-lg font-semibold text-gray-800">{t(p.title)}</h3>
            </div>
            <p className="mb-4 text-sm text-gray-600">{t(p.description)}</p>
            {p.features && (
              <div className="mb-4">
                <h4 className="mb-1 font-semibold text-gray-700">{t('Key Features:')}</h4>
                <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">
                  {p.features.map((f) => (
                    <li key={f}>{t(f)}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex items-stretch gap-2">
              {p.href ? (
                <a
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex min-w-0 flex-1 items-center justify-center rounded-lg p-2 text-center text-sm font-semibold text-white transition-colors ${p.button}`}
                >
                  <span>{t(p.cta)}</span>
                  <i className="ph ph-arrow-square-out ml-1.5 flex-shrink-0 text-lg" aria-hidden="true" />
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className={`flex min-w-0 flex-1 cursor-not-allowed items-center justify-center rounded-lg p-2 text-center text-sm font-semibold text-white ${p.button}`}
                >
                  {t(p.cta)}
                </button>
              )}
              <button
                type="button"
                onClick={() => setExpertFor(p.title)}
                className={`flex min-w-0 flex-1 items-center justify-center rounded-lg border-2 bg-white p-2 text-center text-sm font-semibold transition-colors hover:bg-gray-50 ${p.border} ${p.text}`}
              >
                <i className="ph ph-headset mr-1.5 flex-shrink-0 text-lg" aria-hidden="true" />
                <span>{t('Connect to Expert')}</span>
              </button>
            </div>
          </section>
        ))}
      </div>

      {expertFor && <ExpertRequestModal policyTitle={expertFor} onClose={() => setExpertFor(null)} />}

      <BottomNav active="home" />
    </MobileFrame>
  )
}
