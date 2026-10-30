'use client'

import Link from 'next/link'
import { useAuth } from '@/components/providers/auth-provider'
import { useLanguage } from '@/components/providers/language-provider'
import { useLiveQuery } from '@/lib/use-live-query'
import { MobileFrame } from '@/components/mobile-frame'
import { BottomNav } from '@/components/bottom-nav'
import { Spinner } from '@/components/ui/spinner'

type Transaction = {
  type: 'income' | 'expense'
  amount: number
  description: string
  plotName: string
  date: string
}

const inr = (n: number, locale: string) => `₹${n.toLocaleString(locale)}`

export function TransactionsScreen() {
  const { user } = useAuth()
  const { t, locale } = useLanguage()
  const { items, loading, error } = useLiveQuery<Transaction>({
    table: 'transactions',
    enabled: Boolean(user),
    eq: { userId: user?.uid },
    orderBy: 'date',
  })

  const income = items.filter((x) => x.type === 'income').reduce((s, x) => s + Number(x.amount), 0)
  const expense = items.filter((x) => x.type === 'expense').reduce((s, x) => s + Number(x.amount), 0)
  const net = income - expense

  return (
    <MobileFrame className="bg-gray-100">
      <nav className="z-10 w-full flex-shrink-0 bg-white shadow-sm">
        <div className="flex items-center px-4 py-3">
          <Link
            href="/menu"
            aria-label={t('Back to menu')}
            className="mr-4 rounded-full p-1 text-gray-600 hover:bg-gray-100"
          >
            <i className="ph ph-arrow-left text-2xl" aria-hidden="true" />
          </Link>
          <h1 className="text-xl font-bold text-green-700">{t('My Transactions')}</h1>
        </div>
      </nav>

      <main className="flex-grow overflow-y-auto p-4 pb-20">
        {loading ? (
          <div className="p-10 text-center">
            <div className="flex justify-center">
              <Spinner />
            </div>
            <p className="mt-2 text-gray-500">{t('Loading transactions...')}</p>
          </div>
        ) : error ? (
          <p className="p-10 text-center text-gray-500">{t('Error loading data.')}</p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-gray-800">{t('Financial Summary')}</h2>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-xs text-gray-500">{t('Total Income')}</span>
                  <p className="text-lg font-semibold text-green-700">{inr(income, locale)}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">{t('Total Expense')}</span>
                  <p className="text-lg font-semibold text-red-700">{inr(expense, locale)}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">{t('Net Profit')}</span>
                  <p className={`text-lg font-semibold ${net < 0 ? 'text-red-700' : 'text-blue-700'}`}>
                    {inr(net, locale)}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="mb-2 px-1 text-lg font-semibold text-gray-800">{t('Recent History')}</h2>
              {items.length === 0 ? (
                <div className="p-10 text-center">
                  <i className="ph ph-receipt text-6xl text-gray-400" aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-semibold text-gray-700">{t('No Transactions Yet')}</h3>
                  <p className="text-gray-500">
                    {t('Your income from harvests and activity costs will appear here.')}
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {items.map((tx) => {
                    const isIncome = tx.type === 'income'
                    return (
                      <li
                        key={tx.id}
                        className="flex items-center space-x-3 rounded-lg bg-white p-3 shadow-sm"
                      >
                        <div
                          className={`rounded-full p-2 ${
                            isIncome ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                          }`}
                        >
                          <i
                            className={`ph ${isIncome ? 'ph-arrow-up-right' : 'ph-arrow-down-left'} text-xl`}
                            aria-hidden="true"
                          />
                        </div>
                        <div className="flex-grow">
                          <p className="font-medium text-gray-800">{tx.description}</p>
                          <p className="text-sm text-gray-500">
                            {tx.plotName} • {tx.date ? new Date(tx.date).toLocaleDateString(locale) : ''}
                          </p>
                        </div>
                        <span className={`text-lg font-bold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                          {isIncome ? '+ ' : '- '}
                          {inr(Number(tx.amount), locale)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </main>

      <BottomNav active="menu" />
    </MobileFrame>
  )
}
