import { create } from 'zustand'
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db, provider, FIREBASE_ENABLED } from '../firebase.js'
import { useGameStore } from './gameStore.js'
import { useRunStore } from './runStore.js'

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
  guestMode:   false,  // user explicitly chose "play without account"

  // Called once from App.jsx on mount.
  init() {
    if (!FIREBASE_ENABLED) {
      set({ loading: false, guestMode: true })
      return
    }
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        set({ user: firebaseUser, loading: false, guestMode: false })
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
      throw e
    }
  },

  async logout() {
    if (!FIREBASE_ENABLED) {
      set({ guestMode: false })
      return
    }
    const uid = get().user?.uid
    if (uid) {
      try { await pushToCloud(uid) } catch { /* best effort */ }
    }
    _stopAutoSave()
    await signOut(auth)
    set({ user: null, syncStatus: 'idle', guestMode: false })
  },

  playAsGuest() {
    set({ guestMode: true, loading: false })
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
