import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID

// Detect if we're running with placeholder values (env vars not set)
const isPlaceholder = !apiKey || apiKey === 'placeholder' || !authDomain || authDomain === 'placeholder.firebaseapp.com'

if (isPlaceholder && typeof window !== 'undefined') {
  console.error(
    '[Firebase] ⚠️ Running with placeholder values! ' +
    'NEXT_PUBLIC_FIREBASE_* env vars are missing. ' +
    'Sign-in will NOT work. Make sure they are set in your environment.'
  )
}

const firebaseConfig = {
  apiKey: apiKey || 'placeholder',
  authDomain: authDomain || 'placeholder.firebaseapp.com',
  projectId: projectId || 'placeholder',
  storageBucket: storageBucket || 'placeholder.appspot.com',
  messagingSenderId: messagingSenderId || '000000000000',
  appId: appId || '1:000000000000:web:0000000000000000000000',
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const isFirebaseConfigured = !isPlaceholder
