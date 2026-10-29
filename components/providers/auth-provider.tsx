'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

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

type AuthContextValue = {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  refreshProfile: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (firebaseUser: User | null) => {
    if (!firebaseUser) {
      setProfile(null)
      return
    }
    try {
      const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
      setProfile(snap.exists() ? (snap.data() as UserProfile) : null)
    } catch (error) {
      console.error('Failed to load user profile:', error)
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      await loadProfile(firebaseUser)
      setLoading(false)
    })
  }, [loadProfile])

  const refreshProfile = useCallback(() => loadProfile(auth.currentUser), [loadProfile])
  const logout = useCallback(() => signOut(auth), [])

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
