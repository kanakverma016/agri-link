import { AuthGuard } from '@/components/auth-guard'
import { NotificationProvider } from '@/components/providers/notification-provider'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <NotificationProvider>{children}</NotificationProvider>
    </AuthGuard>
  )
}
