import type { Metadata } from 'next'
import { InsuranceScreen } from '@/components/info/insurance-screen'

export const metadata: Metadata = { title: 'Insurance' }

export default function InsurancePage() {
  return <InsuranceScreen />
}
