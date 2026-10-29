import type { Metadata } from 'next'
import { ListingsScreen } from '@/components/account/listings-screen'

export const metadata: Metadata = { title: 'My B2B Listings' }

export default function MyListingsPage() {
  return <ListingsScreen />
}
