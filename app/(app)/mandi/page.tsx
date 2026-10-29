import type { Metadata } from 'next'
import { MandiScreen } from '@/components/mandi/mandi-screen'

export const metadata: Metadata = { title: 'Mandi Services' }

export default function MandiPage() {
  return <MandiScreen />
}
