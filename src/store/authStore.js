import { create } from 'zustand'
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db, provider, FIREBASE_ENABLED } from '../firebase.js'
import { useGameStore } from './gameStore.js'
import { useRunStore } from './runStore.js'

// Map Firebase auth error codes to readable French messages.
function frAuthError(e) {
  const code = e?.code || ''
  const map = {
    'auth/invalid-credential': 'Identifiant ou mot de passe incorrect.',
    'auth/invalid-email': 'Adresse email invalide.',
    'auth/user-not-found': 'Aucun compte trouvé avec cet identifiant.',
    'auth/wrong-password': 'Mot de passe incorrect.',
    'auth/email-already-in-use': 'Cette adresse email est déjà utilisée.',
    'auth/weak-password': 'Mot de passe trop faible (6 caractères minimum).',
    'auth/too-many-requests': 'Trop de tentatives. Réessaie plus tard.',
    'auth/network-request-failed': 'Problème de connexion réseau.',
    'pseudo-taken': 'Ce pseudo est déjà pris.',
    'pseudo-invalid': 'Pseudo invalide (3-16 caractères, lettres/chiffres).',
  }
  return map[code] || e?.message || 'Une erreur est survenue.'
}

// ──────────────────────────────────────────────────────────────────────────
//  Cloud save helpers
// ──────────────────────────────────────────────────────────────────────────

async function pushToCloud(uid) {
  if (!db || !uid) return
  const gameState = useGameStore.getState()
  const runState  = useRunStore.getState()

  // Use the same partialize logic as the zustand persist middleware.
  const gs = useGameStore.persist.getOptions().partialize(gameState)
  const rs = useRunStore.persist.getOptions().partialize(runState)

  await Promise.all([
    setDoc(doc(db, 'users', uid, 'saves', 'game'), { ...gs, _savedAt: Date.now() }),
    setDoc(doc(db, 'users', uid, 'saves', 'run'),  { ...rs, _savedAt: Date.now() }),
  ])
}

async function pullFromCloud(uid) {
  if (!db || !uid) return
  const [gameSnap, runSnap] = await Promise.all([
    getDoc(doc(db, 'users', uid, 'saves', 'game')),
    getDoc(doc(db, 'users', uid, 'saves', 'run')),
  ])

  if (gameSnap.exists()) {
    const cloud = gameSnap.data()
    const local = useGameStore.getState()

    // Merge: keep the larger collection (union by uid) and max money/crystals.
    const localIds = new Set((local.collection || []).map(c => c.uid))
    const merged = [
      ...(local.collection || []),
      ...(cloud.collection || []).filter(c => !localIds.has(c.uid)),
    ]
    useGameStore.setState({
      ...cloud,
      collection: merged,
      money:    Math.max(local.money    || 0, cloud.money    || 0),
      crystals: Math.max(local.crystals || 0, cloud.crystals || 0),
    })
  }

  if (runSnap.exists()) {
    const cloud = runSnap.data()
    // Only restore active run from cloud if local has none.
    if (!useRunStore.getState().active && cloud.active) {
      useRunStore.setState(cloud)
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────
//  Auth store
// ──────────────────────────────────────────────────────────────────────────

let _autoSaveTimer = null

export const useAuthStore = create((set, get) => ({
  user:        null,   // Firebase User object or null
  loading:     true,   // true while onAuthStateChanged hasn't fired yet
  syncStatus:  'idle', // 'idle' | 'saving' | 'saved' | 'error'

  // Called once from App.jsx on mount.
  init() {
    if (!FIREBASE_ENABLED) {
      // Dev fallback only (no Firebase env): let the game run unauthenticated.
      set({ loading: false })
      return
    }
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        set({ user: firebaseUser, loading: false })
        try {
          await pullFromCloud(firebaseUser.uid)
          set({ syncStatus: 'saved' })
        } catch {
          set({ syncStatus: 'error' })
        }
        _startAutoSave(firebaseUser.uid)
      } else {
        set({ user: null, loading: false })
        _stopAutoSave()
      }
    })
  },

  async loginWithGoogle() {
    if (!FIREBASE_ENABLED) return
    try {
      const result = await signInWithPopup(auth, provider)
      // onAuthStateChanged will handle the rest
      return result.user
    } catch (e) {
      console.error('Google login failed', e)
      throw new Error(frAuthError(e))
    }
  },

  // Register with email + password. The pseudo is mapped to the email via a
  // Firestore `usernames/{pseudoLower}` doc so the user can later log in by pseudo.
  async registerWithEmail(pseudo, email, password) {
    if (!FIREBASE_ENABLED) return
    const clean = (pseudo || '').trim()
    if (!/^[a-zA-Z0-9_]{3,16}$/.test(clean)) throw new Error(frAuthError({ code: 'pseudo-invalid' }))
    const key = clean.toLowerCase()
    try {
      // Reserve the pseudo (best-effort uniqueness check).
      const existing = await getDoc(doc(db, 'usernames', key))
      if (existing.exists()) throw new Error(frAuthError({ code: 'pseudo-taken' }))

      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
      await updateProfile(cred.user, { displayName: clean })
      await setDoc(doc(db, 'usernames', key), { uid: cred.user.uid, email: email.trim() })
      // onAuthStateChanged handles the cloud pull + autosave.
      return cred.user
    } catch (e) {
      if (e?.message && !e?.code) throw e // already-translated message
      throw new Error(frAuthError(e))
    }
  },

  // Log in with either an email (contains '@') or a pseudo (resolved via Firestore).
  async loginWithEmail(identifier, password) {
    if (!FIREBASE_ENABLED) return
    const id = (identifier || '').trim()
    try {
      let email = id
      if (!id.includes('@')) {
        const snap = await getDoc(doc(db, 'usernames', id.toLowerCase()))
        if (!snap.exists()) throw new Error(frAuthError({ code: 'auth/user-not-found' }))
        email = snap.data().email
      }
      const cred = await signInWithEmailAndPassword(auth, email, password)
      return cred.user
    } catch (e) {
      if (e?.message && !e?.code) throw e
      throw new Error(frAuthError(e))
    }
  },

  async logout() {
    if (!FIREBASE_ENABLED) return
    const uid = get().user?.uid
    if (uid) {
      try { await pushToCloud(uid) } catch { /* best effort */ }
    }
    _stopAutoSave()
    await signOut(auth)
    set({ user: null, syncStatus: 'idle' })
  },

  async saveToCloud() {
    const uid = get().user?.uid
    if (!uid) return
    set({ syncStatus: 'saving' })
    try {
      await pushToCloud(uid)
      set({ syncStatus: 'saved' })
    } catch {
      set({ syncStatus: 'error' })
    }
  },
}))

function _startAutoSave(uid) {
  _stopAutoSave()
  _autoSaveTimer = setInterval(async () => {
    try {
      await pushToCloud(uid)
      useAuthStore.setState({ syncStatus: 'saved' })
    } catch {
      useAuthStore.setState({ syncStatus: 'error' })
    }
  }, 3 * 60 * 1000) // every 3 minutes
}

function _stopAutoSave() {
  if (_autoSaveTimer) { clearInterval(_autoSaveTimer); _autoSaveTimer = null }
}
