import type { Metadata } from 'next'
import { NewsScreen } from '@/components/news/news-screen'

export const metadata: Metadata = { title: "Today's Agri News" }

export default function NewsPage() {
  return <NewsScreen />
}
