import React, { useEffect } from 'react'
import { useAuthStore } from '../store/authStore.js'
import { FIREBASE_ENABLED } from '../firebase.js'

function SyncBadge() {
  const { syncStatus, user } = useAuthStore()
  if (!user) return null
  const badge = {
    saving: { icon: '🔄', label: 'Sauvegarde…', color: 'text-yellow-400' },
    saved:  { icon: '☁️', label: 'Sauvegardé',   color: 'text-green-400' },
    error:  { icon: '⚠️', label: 'Erreur sync',  color: 'text-red-400' },
    idle:   null,
  }[syncStatus]
  if (!badge) return null
  return (
    <div className={`fixed top-2 right-2 z-50 flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-black/60 backdrop-blur ${badge.color}`}>
      <span>{badge.icon}</span>
      <span>{badge.label}</span>
    </div>
  )
}

export function SyncBadgePortal() {
  return <SyncBadge />
}

export default function AuthGate({ children }) {
  const { user, loading, guestMode, init, loginWithGoogle, playAsGuest } = useAuthStore()
  const [error, setError] = React.useState(null)
  const [loggingIn, setLoggingIn] = React.useState(false)

  useEffect(() => { init() }, []) // eslint-disable-line

  // Firebase not configured → skip gate entirely
  if (!FIREBASE_ENABLED) return children

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin">⚡</div>
          <p className="text-gray-400 text-sm">Connexion…</p>
        </div>
      </div>
    )
  }

  // Logged in or guest mode → show the game
  if (user || guestMode) {
    return (
      <>
        <SyncBadge />
        {children}
      </>
    )
  }

  // Show login screen
  async function handleGoogle() {
    setError(null)
    setLoggingIn(true)
    try {
      await loginWithGoogle()
    } catch (e) {
      setError("Connexion annulée ou bloquée. Réessaie.")
    } finally {
      setLoggingIn(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-xs text-center">
        {/* Logo */}
        <div className="text-6xl mb-4">⚡</div>
        <h1 className="font-game text-2xl text-white mb-1 tracking-wider">PokéRift</h1>
        <p className="text-gray-500 text-xs mb-10">Connecte-toi pour sauvegarder ta progression</p>

        {/* Google login */}
        <button
          onClick={handleGoogle}
          disabled={loggingIn}
          className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-bold py-3 px-6 rounded-xl mb-3 hover:bg-gray-100 active:scale-95 transition-all disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
            <path d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" fill="#FFC107"/>
            <path d="M6.3 14.7l7 5.1C15.2 16.1 19.3 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 16.3 2 9.7 7.4 6.3 14.7z" fill="#FF3D00"/>
            <path d="M24 46c5.5 0 10.5-1.9 14.3-5.1l-6.6-5.6C29.8 37 27 38 24 38c-6 0-11.1-4-12.9-9.5L4.2 34c3.5 7.2 10.7 12 19.8 12z" fill="#4CAF50"/>
            <path d="M44.5 20H24v8.5h11.8c-.5 2.8-2.1 5.2-4.4 6.9l6.6 5.6C42.1 37.4 45 31.1 45 24c0-1.3-.2-2.7-.5-4z" fill="#1976D2"/>
          </svg>
          {loggingIn ? 'Connexion…' : 'Continuer avec Google'}
        </button>

        {/* Guest mode */}
        <button
          onClick={playAsGuest}
          className="w-full text-gray-500 text-xs py-2 hover:text-gray-300 transition-colors"
        >
          Jouer sans compte (progression non sauvegardée)
        </button>

        {error && (
          <p className="mt-3 text-red-400 text-xs">{error}</p>
        )}

        <p className="mt-8 text-gray-700 text-[10px]">
          Ta progression (collection, cristaux, run) est<br />sauvegardée sur ton compte Google.
        </p>
      </div>
    </div>
  )
}
