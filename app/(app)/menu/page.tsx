import type { Metadata } from 'next'
import { MenuScreen } from '@/components/menu/menu-screen'

export const metadata: Metadata = { title: 'Menu' }

export default function MenuPage() {
  return <MenuScreen />
}
