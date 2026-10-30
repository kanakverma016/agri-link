'use client'

import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'

type ProfileInfo = { name?: string; profilePicture?: string }

async function fetchProfiles([, ids]: readonly [string, string]): Promise<Record<string, ProfileInfo>> {
  const list = ids ? ids.split(',') : []
  if (list.length === 0) return {}
  const { data, error } = await createClient().from('profiles').select('id, name, profilePicture').in('id', list)
  if (error) {
    console.error('Failed to load profile pictures:', error)
    return {}
  }
  return Object.fromEntries((data ?? []).map((p) => [p.id as string, { name: p.name, profilePicture: p.profilePicture }]))
}

/** Returns the latest name/profile picture for the given user ids, keyed by user id. */
export function useProfilePictures(userIds: (string | null | undefined)[]) {
  const ids = Array.from(new Set(userIds.filter((id): id is string => Boolean(id)))).sort().join(',')
  const { data } = useSWR(ids ? (['profile-pictures', ids] as const) : null, fetchProfiles, {
    revalidateOnFocus: true,
    dedupingInterval: 5000,
    keepPreviousData: true,
  })
  return data ?? {}
}
