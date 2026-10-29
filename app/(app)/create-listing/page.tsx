import type { Metadata } from 'next'
import { CreateListingScreen } from '@/components/mandi/create-listing-screen'

export const metadata: Metadata = { title: 'Create New Listing' }

export default function CreateListingPage() {
  return <CreateListingScreen />
}
