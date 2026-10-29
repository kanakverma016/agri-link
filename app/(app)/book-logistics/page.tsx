import { Suspense } from 'react'
import type { Metadata } from 'next'
import { LogisticsScreen } from '@/components/mandi/logistics-screen'

export const metadata: Metadata = { title: 'Book Logistics' }

export default function BookLogisticsPage() {
  return (
    <Suspense fallback={null}>
      <LogisticsScreen />
    </Suspense>
  )
}
