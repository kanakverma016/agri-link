import 'server-only'

const FIREBASE_API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'AIzaSyDg7g1N_Xjz6H-EdvW4CvAnwLiOsHlL5LE'

/**
 * Verifies a Firebase ID token through the Identity Toolkit REST API so that
 * paid third-party APIs can only be reached by signed-in users.
 * Returns the Firebase uid or null when the token is missing/invalid.
 */
export async function verifyFirebaseUser(request: Request): Promise<string | null> {
  const header = request.headers.get('authorization')
  const idToken = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!idToken) return null

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
        cache: 'no-store',
      },
    )
    if (!res.ok) return null
    const data = (await res.json()) as { users?: { localId: string }[] }
    return data.users?.[0]?.localId ?? null
  } catch {
    return null
  }
}

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status })
}
