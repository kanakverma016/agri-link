import type { Metadata } from 'next'
import { MarketplaceScreen } from '@/components/mandi/marketplace-screen'

export const metadata: Metadata = { title: 'B2B Marketplace' }

export default function B2BMarketplacePage() {
  return <MarketplaceScreen />
}
