import { Suspense } from 'react'
import type { Metadata } from 'next'
import { PlotDetailScreen } from '@/components/plots/plot-detail-screen'

export const metadata: Metadata = { title: 'Plot Details' }

export default function PlotDetailPage() {
  return (
    <Suspense fallback={null}>
      <PlotDetailScreen />
    </Suspense>
  )
}
