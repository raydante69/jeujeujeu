import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

export const FIREBASE_ENABLED = !!(firebaseConfig.apiKey && firebaseConfig.projectId)

let _app = null
let _auth = null
let _db = null

if (FIREBASE_ENABLED) {
  _app  = initializeApp(firebaseConfig)
  _auth = getAuth(_app)
  _db   = getFirestore(_app)
}

export const auth     = _auth
export const db       = _db
export const provider = new GoogleAuthProvider()
