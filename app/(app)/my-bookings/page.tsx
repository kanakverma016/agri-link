import type { Metadata } from 'next'
import { BookingsScreen } from '@/components/account/bookings-screen'

export const metadata: Metadata = { title: 'My Bookings' }

export default function MyBookingsPage() {
  return <BookingsScreen />
}
