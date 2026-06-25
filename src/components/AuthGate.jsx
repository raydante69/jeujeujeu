import React, { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore.js'
import { FIREBASE_ENABLED } from '../firebase.js'

function SyncBadge() {
  const { syncStatus, user } = useAuthStore()
  if (!user) return null
  const badge = {
    saving: { icon: '🔄', label: 'Sauvegarde...', color: 'text-yellow-400' },
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

function GoogleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" fill="#FFC107"/>
      <path d="M6.3 14.7l7 5.1C15.2 16.1 19.3 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 16.3 2 9.7 7.4 6.3 14.7z" fill="#FF3D00"/>
      <path d="M24 46c5.5 0 10.5-1.9 14.3-5.1l-6.6-5.6C29.8 37 27 38 24 38c-6 0-11.1-4-12.9-9.5L4.2 34c3.5 7.2 10.7 12 19.8 12z" fill="#4CAF50"/>
      <path d="M44.5 20H24v8.5h11.8c-.5 2.8-2.1 5.2-4.4 6.9l6.6 5.6C42.1 37.4 45 31.1 45 24c0-1.3-.2-2.7-.5-4z" fill="#1976D2"/>
    </svg>
  )
}

function Field({ label, ...props }) {
  return (
    <label className="block text-left">
      <span className="block text-[11px] text-gray-300 mb-1 font-bold">{label}</span>
      <input
        {...props}
        className="w-full bg-[#1c1830] text-white text-sm px-3 py-2.5 rounded-lg outline-none border-2 border-red-500/80 focus:border-red-300 transition-colors"
      />
    </label>
  )
}

export function AuthPanel({ compact = false }) {
  const { loginWithGoogle, loginWithEmail, registerWithEmail } = useAuthStore()
  const [mode, setMode] = useState('login')
  const [ident, setIdent] = useState('')
  const [pseudo, setPseudo] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleGoogle() {
    setError(null)
    setBusy(true)
    try {
      await loginWithGoogle()
    } catch (e) {
      setError(e.message || 'Connexion Google échouée.')
    } finally {
      setBusy(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (mode === 'register') {
      if (!pseudo || !email || !password) {
        setError('Complète tous les champs pour créer ton compte.')
        return
      }
      if (password !== confirm) {
        setError('Les mots de passe ne correspondent pas.')
        return
      }
      if (password.length < 6) {
        setError('Mot de passe : 6 caractères minimum.')
        return
      }
      setBusy(true)
      try {
        await registerWithEmail(pseudo, email, password)
      } catch (err) {
        setError(err.message)
      } finally {
        setBusy(false)
      }
      return
    }

    if (!ident || !password) {
      setError('Renseigne ton identifiant et ton mot de passe.')
      return
    }
    setBusy(true)
    try {
      await loginWithEmail(ident, password)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`w-full ${compact ? '' : 'max-w-sm'}`}>
      {!compact && (
        <div className="text-center mb-5">
          <div className="text-5xl mb-2 animate-float">⚡</div>
          <h1 className="font-game text-xl text-white tracking-wider">Poké<span className="text-red-500">Rift</span></h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-[0.25em] mt-2">Compte dresseur</p>
        </div>
      )}

      <div className="rounded-2xl p-5 border-4 bg-[#2b2536] border-red-500 shadow-2xl shadow-red-950/40">
        <div className="mb-4">
          <p className="font-game text-sm text-white">Connexion & Inscription</p>
          <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
            Connecte-toi pour charger ta sauvegarde cloud et garder ta collection.
          </p>
        </div>

        <div className="flex gap-1 mb-4 p-1 rounded-lg bg-[#1c1830]">
          {['login', 'register'].map(m => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(null) }}
              className="flex-1 py-2 rounded-md text-xs font-game transition-all"
              style={mode === m ? { background: '#e63946', color: '#fff' } : { color: '#94a3b8' }}
            >
              {m === 'login' ? 'Connexion' : 'Inscription'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' ? (
            <>
              <Field label="Pseudo" value={pseudo} onChange={e => setPseudo(e.target.value)}
                placeholder="Pseudo (3-16 car.)" autoComplete="username" />
              <Field label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="ton@email.com" autoComplete="email" />
              <Field label="Mot de passe" type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" autoComplete="new-password" />
              <Field label="Confirmation" type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••" autoComplete="new-password" />
            </>
          ) : (
            <>
              <Field label="Identifiant" value={ident} onChange={e => setIdent(e.target.value)}
                placeholder="Pseudo ou email" autoComplete="username" />
              <Field label="Mot de passe" type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" autoComplete="current-password" />
            </>
          )}

          {error && <p className="text-red-300 text-[11px] font-bold leading-snug">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-xl font-game text-sm text-white bg-gradient-to-r from-red-500 to-red-700 transition-all active:scale-95 disabled:opacity-50"
          >
            {busy ? '...' : mode === 'login' ? 'Connexion' : "S'inscrire"}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-center text-[11px] text-gray-400 font-bold mb-3">Ou continue avec</p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={handleGoogle}
              disabled={busy}
              title="Continuer avec Google"
              className="w-14 h-14 rounded-xl flex items-center justify-center bg-white active:scale-95 transition-all disabled:opacity-50"
            >
              <GoogleIcon />
            </button>
          </div>
        </div>
      </div>

      {!compact && (
        <p className="mt-5 text-center text-gray-600 text-[10px] leading-relaxed">
          Si aucun compte n'est connecté automatiquement,<br />cet encart reste ouvert.
        </p>
      )}
    </div>
  )
}

export default function AuthGate({ children }) {
  const { user, loading, init } = useAuthStore()

  useEffect(() => { init() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!FIREBASE_ENABLED) return children

  if (loading) {
    return (
      <div className="min-h-screen bg-game-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin">⚡</div>
          <p className="text-gray-400 text-sm">Connexion...</p>
        </div>
      </div>
    )
  }

  if (user) {
    return (
      <>
        <SyncBadge />
        {children}
      </>
    )
  }

  return (
    <div
      className="min-h-screen bg-game-bg flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(circle at 50% 0%, #1a2348 0%, #0a0a14 70%)' }}
    >
      <AuthPanel />
    </div>
  )
}
