import type { Metadata } from 'next'
import { TransactionsScreen } from '@/components/account/transactions-screen'

export const metadata: Metadata = { title: 'My Transactions' }

export default function MyTransactionsPage() {
  return <TransactionsScreen />
}
