'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isProfileComplete, useAuth } from '@/components/providers/auth-provider'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const needsProfile = Boolean(user) && !isProfileComplete(profile)

  useEffect(() => {
    if (!loading && (!user || needsProfile)) router.replace('/login')
  }, [loading, user, needsProfile, router])

  if (loading || !user || needsProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-200">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-green-200 border-t-green-600"
          role="status"
          aria-label="Loading"
        />
      </div>
    )
  }

  return <>{children}</>
}
