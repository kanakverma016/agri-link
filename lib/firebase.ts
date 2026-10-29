import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

// The Firebase web config is public by design (access is enforced by
// Firebase Security Rules). These defaults match the Agri Link web app;
// environment variables can still override them per deployment.
const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() ?? ''

export const isFirebaseConfigured = firebaseApiKey.length > 0

if (!isFirebaseConfigured) {
  console.warn(
    'NEXT_PUBLIC_FIREBASE_API_KEY is not set. Firebase sign-in and data requests will fail until it is configured.',
  )
}

const firebaseConfig = {
  // Firebase Web API keys are safe to expose in the browser, but the client
  // must use the key for the same Firebase project as the rest of this config.
  // getAuth() throws synchronously on an empty key, which would crash the whole
  // app at import time, so a placeholder keeps the UI rendering until it's set.
  apiKey: isFirebaseConfigured ? firebaseApiKey : 'missing-firebase-api-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'agri-link-157cf.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'agri-link-157cf',
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'agri-link-157cf.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '511726126667',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '1:511726126667:web:4b37e7b12207aa4f8defce',
}

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const auth: Auth = getAuth(app)
export const db: Firestore = getFirestore(app)
export const storage: FirebaseStorage = getStorage(app)
