import { auth } from '@/lib/firebase'

/** fetch() wrapper that attaches the current user's Firebase ID token. */
export async function apiFetch(input: string, init: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken()
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return fetch(input, { ...init, headers })
}
