import type { Metadata } from 'next'
import { PlotsScreen } from '@/components/plots/plots-screen'

export const metadata: Metadata = { title: 'My Plots' }

export default function MyPlotsPage() {
  return <PlotsScreen />
}
