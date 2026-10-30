'use client'

import Link from 'next/link'
import { MobileFrame } from '@/components/mobile-frame'
import { BottomNav } from '@/components/bottom-nav'
import { useLanguage } from '@/components/providers/language-provider'

const SCHEMES = [
  {
    icon: 'ph-currency-inr',
    category: 'Financial Support',
    name: 'PM-KISAN Samman Nidhi',
    description: 'Direct income support of ₹6,000 per year to all eligible farmer families.',
    href: 'https://pmkisan.gov.in/',
    cta: 'Check Your Status',
    border: 'border-green-600',
    text: 'text-green-600',
    button: 'bg-green-600 hover:bg-green-700',
  },
  {
    icon: 'ph-plant',
    category: 'Crop Protection',
    name: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
    description: 'Comprehensive insurance cover and financial support for farmers in case of crop failure.',
    href: 'https://pmfby.gov.in/',
    cta: 'Apply on the Portal',
    border: 'border-blue-600',
    text: 'text-blue-600',
    button: 'bg-blue-600 hover:bg-blue-700',
  },
  {
    icon: 'ph-tractor',
    category: 'Equipment & Subsidy',
    name: 'Agricultural Mechanization (SMAM)',
    description: 'Subsidy and financial aid for buying tractors, drones and other farm machinery.',
    href: 'https://agrimachinery.nic.in/',
    cta: 'Visit the Official Portal',
    border: 'border-yellow-600',
    text: 'text-yellow-600',
    button: 'bg-yellow-600 hover:bg-yellow-700',
  },
  {
    icon: 'ph-user-check',
    category: 'Farmer Welfare & Pension',
    name: 'Kisan Maandhan Yojana',
    description: 'A minimum monthly pension of ₹3,000 for small and marginal farmers after reaching age 60.',
    href: 'https://maandhan.in/',
    cta: 'Register Now',
    border: 'border-purple-600',
    text: 'text-purple-600',
    button: 'bg-purple-600 hover:bg-purple-700',
  },
]

export function GovSchemeScreen() {
  const { t } = useLanguage()
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
            {t('Government Schemes')}
          </h1>
          <div className="w-8" />
        </div>
      </nav>

      <div className="flex-grow space-y-5 overflow-y-auto p-4 pb-20">
        <header className="mb-2 text-center">
          <h2 className="text-xl font-semibold text-gray-800">{t('Farmer Welfare Dashboard')}</h2>
          <p className="text-sm text-gray-600">
            {t('Information on the most important government schemes for farmers.')}
          </p>
        </header>

        {SCHEMES.map((s) => (
          <section
            key={s.name}
            className={`overflow-hidden rounded-lg border-l-4 bg-white p-4 shadow-sm ${s.border}`}
          >
            <div className="mb-3 flex items-center">
              <i className={`ph ${s.icon} mr-3 text-3xl ${s.text}`} aria-hidden="true" />
              <h3 className="text-lg font-semibold text-gray-800">{t(s.category)}</h3>
            </div>
            <h4 className="mb-1 font-semibold text-gray-700">{t(s.name)}</h4>
            <p className="mb-4 text-sm text-gray-600">{t(s.description)}</p>
            <a
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex w-full items-center justify-center rounded-lg p-2 font-semibold text-white transition-colors ${s.button}`}
            >
              {t(s.cta)}
              <i className="ph ph-arrow-square-out ml-2 text-lg" aria-hidden="true" />
            </a>
          </section>
        ))}
      </div>

      <BottomNav active="home" />
    </MobileFrame>
  )
}
