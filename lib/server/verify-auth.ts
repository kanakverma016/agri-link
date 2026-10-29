import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-server'

/**
 * Verifies the Supabase access token sent as a Bearer header so that paid
 * third-party APIs can only be reached by signed-in users.
 * Returns the user id or null when the token is missing/invalid.
 */
export async function verifyUser(request: Request): Promise<string | null> {
  const header = request.headers.get('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return null

  try {
    const { data, error } = await getSupabaseAdmin().auth.getUser(token)
    if (error) return null
    return data.user?.id ?? null
  } catch {
    return null
  }
}

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status })
}
