'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

export type UserProfile = {
  name?: string
  email?: string
  phone?: string
  landHolding?: number
  state?: string
  district?: string
  block?: string
  village?: string
  userType?: string
  profilePicture?: string | null
  [key: string]: unknown
}

export type AppUser = {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}

type AuthContextValue = {
  user: AppUser | null
  profile: UserProfile | null
  loading: boolean
  refreshProfile: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function toAppUser(user: User | null | undefined): AppUser | null {
  if (!user) return null
  const meta = user.user_metadata ?? {}
  return {
    uid: user.id,
    email: user.email ?? null,
    displayName: (meta.full_name as string) ?? (meta.name as string) ?? null,
    photoURL: (meta.avatar_url as string) ?? (meta.picture as string) ?? null,
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string | null) => {
    if (!userId) {
      setProfile(null)
      return
    }
    const { data, error } = await createClient().from('profiles').select('*').eq('id', userId).maybeSingle()
    if (error) console.error('Failed to load user profile:', error)
    setProfile((data as UserProfile | null) ?? null)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    let active = true

    const apply = async (sessionUser: User | null | undefined) => {
      const next = toAppUser(sessionUser)
      setUser((prev) => (prev?.uid === next?.uid ? prev : next))
      await loadProfile(next?.uid ?? null)
      if (active) setLoading(false)
    }

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') return
      // Defer to avoid deadlocks with supabase-js auth callbacks.
      setTimeout(() => void apply(session?.user), 0)
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [loadProfile])

  const refreshProfile = useCallback(() => loadProfile(user?.uid ?? null), [loadProfile, user?.uid])
  const logout = useCallback(async () => {
    await createClient().auth.signOut()
  }, [])

  const value = useMemo(
    () => ({ user, profile, loading, refreshProfile, logout }),
    [user, profile, loading, refreshProfile, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function isProfileComplete(profile: UserProfile | null) {
  return Boolean(profile?.state && profile?.district && profile?.village)
}
