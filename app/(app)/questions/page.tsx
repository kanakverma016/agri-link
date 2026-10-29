import type { Metadata } from 'next'
import { QuestionsScreen } from '@/components/questions/questions-screen'

export const metadata: Metadata = { title: 'Ask an Expert' }

export default function QuestionsPage() {
  return <QuestionsScreen />
}
