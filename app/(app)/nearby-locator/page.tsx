import type { Metadata } from 'next'
import { NearbyScreen } from '@/components/nearby/nearby-screen'

export const metadata: Metadata = { title: 'Nearby Locator' }

export default function NearbyLocatorPage() {
  return <NearbyScreen />
}
