import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

// The Firebase web config is public by design (access is enforced by
// Firebase Security Rules). These defaults match the Agri Link web app;
// environment variables can still override them per deployment.
const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? process.env.GCP_API_KEY_2 ?? 'AIzaSyCry6qVAxY48abhA0NtesZBiVOM4GIUAY',
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
