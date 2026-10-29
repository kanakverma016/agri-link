import { createClient } from '@/lib/supabase/client'

/** fetch() wrapper that attaches the current user's Supabase access token. */
export async function apiFetch(input: string, init: RequestInit = {}) {
  const { data } = await createClient().auth.getSession()
  const token = data.session?.access_token
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return fetch(input, { ...init, headers })
}
