import type { Metadata } from 'next'
import { OfflineContent } from '@/components/offline-content'

export const metadata: Metadata = { title: 'Offline' }

export default function OfflinePage() {
  return <OfflineContent />
}
