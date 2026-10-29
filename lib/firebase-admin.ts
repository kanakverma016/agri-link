import 'server-only'

import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

const adminApp =
  getApps()[0] ??
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })

export const firebaseAdminAuth = getAuth(adminApp)

export async function verifyFirebaseRequest(request: Request) {
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) {
    throw new Error('Missing Firebase authorization token')
  }

  return firebaseAdminAuth.verifyIdToken(authorization.slice('Bearer '.length))
}
