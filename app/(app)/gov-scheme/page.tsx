import type { Metadata } from 'next'
import { GovSchemeScreen } from '@/components/info/gov-scheme-screen'

export const metadata: Metadata = { title: 'Government Schemes' }

export default function GovSchemePage() {
  return <GovSchemeScreen />
}
