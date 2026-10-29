'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isProfileComplete, useAuth } from '@/components/providers/auth-provider'
import { PageSkeleton } from '@/components/ui/page-skeleton'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const needsProfile = Boolean(user) && !isProfileComplete(profile)

  useEffect(() => {
    if (!loading && (!user || needsProfile)) router.replace('/login')
  }, [loading, user, needsProfile, router])

  if (loading || !user || needsProfile) {
    return <PageSkeleton />
  }

  return <>{children}</>
}
