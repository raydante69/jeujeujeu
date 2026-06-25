import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuthStore } from '../store/authStore.js'
import { useSettingsStore } from '../store/settingsStore.js'
import { FIREBASE_ENABLED } from '../firebase.js'

const SYNC_LABEL = {
  idle: 'En attente',
  saving: 'Sauvegarde...',
  saved: 'Synchronisé',
  error: 'Erreur de sync',
}

export default function SettingsMenu() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const { user, logout, saveToCloud, syncStatus } = useAuthStore()
  const { sfxEnabled, reducedMotion, compactMode, setSetting, resetSettings } = useSettingsStore()

  async function handleSave() {
    setBusy(true)
    try {
      await saveToCloud()
    } finally {
      setBusy(false)
    }
  }

  async function handleLogout() {
    setBusy(true)
    try {
      await logout()
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  const modal = open ? (
    <div className="fixed inset-0 z-[9999] isolate flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border-4 border-red-500 bg-[#171427] shadow-2xl shadow-red-950/40 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <p className="font-game text-sm text-white">Réglages</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-[0.22em] mt-1">Compte & confort</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fermer"
            className="w-9 h-9 rounded-full bg-black/35 border border-white/10 text-gray-300 font-black active:scale-90"
          >
            X
          </button>
        </div>

        <div className="p-5 space-y-5">
          <section>
            <p className="text-[11px] text-red-200 font-black uppercase tracking-widest mb-3">Compte</p>
            {FIREBASE_ENABLED ? (
              user ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/25 p-3">
                    <div className="w-11 h-11 rounded-full overflow-hidden bg-red-500/20 border border-white/10 flex items-center justify-center flex-shrink-0">
                      {user.photoURL
                        ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                        : <span className="text-xl">👤</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm font-black truncate">{user.displayName || 'Dresseur'}</p>
                      <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                      <p className="text-[10px] text-gray-500 mt-1">{SYNC_LABEL[syncStatus] || SYNC_LABEL.idle}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={busy}
                      className="w-full py-3 rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-100 text-sm font-black active:scale-95 disabled:opacity-50"
                    >
                      Sauvegarder maintenant
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={busy}
                      className="w-full py-3 rounded-xl bg-red-500 text-white text-sm font-black active:scale-95 disabled:opacity-50"
                    >
                      Changer de compte
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={busy}
                      className="w-full py-2.5 rounded-xl bg-black/30 border border-white/10 text-gray-300 text-xs font-bold active:scale-95 disabled:opacity-50"
                    >
                      Se déconnecter
                    </button>
                  </div>
                </div>
              ) : (
                <p className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-[11px] text-yellow-100 leading-relaxed">
                  Aucun compte connecté. L'encart de connexion s'ouvrira automatiquement.
                </p>
              )
            ) : (
              <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-[11px] text-yellow-100 leading-relaxed">
                <p className="font-black text-yellow-50">Firebase n'est pas configuré dans cet environnement.</p>
                <p className="mt-1 text-yellow-100/80">Ajoute les variables VITE_FIREBASE_* dans `.env.local`, puis redémarre le serveur.</p>
              </div>
            )}
          </section>

          <section>
            <p className="text-[11px] text-red-200 font-black uppercase tracking-widest mb-3">Jeu</p>
            <div className="space-y-2">
              <ToggleRow
                label="Sons du jeu"
                detail="Active les bruitages chiptune pendant les combats et récompenses."
                checked={sfxEnabled}
                onChange={v => setSetting('sfxEnabled', v)}
              />
              <ToggleRow
                label="Animations réduites"
                detail="Diminue fortement les animations et transitions de l'interface."
                checked={reducedMotion}
                onChange={v => setSetting('reducedMotion', v)}
              />
              <ToggleRow
                label="Interface compacte"
                detail="Resserre certains panneaux du hub pour voir plus d'informations."
                checked={compactMode}
                onChange={v => setSetting('compactMode', v)}
              />
            </div>
          </section>

          <button
            type="button"
            onClick={resetSettings}
            className="w-full py-2.5 rounded-xl border border-white/10 bg-white/5 text-gray-300 text-xs font-bold active:scale-95"
          >
            Réinitialiser les réglages
          </button>
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Réglages"
        aria-label="Ouvrir les réglages"
        className="w-9 h-9 rounded-full bg-black/45 border border-white/10 flex items-center justify-center text-lg active:scale-90 transition-all hover:bg-black/65"
      >
        ⚙
      </button>

      {modal && createPortal(modal, document.body)}
    </>
  )
}

function ToggleRow({ label, detail, checked, onChange }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/25 p-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-white">{label}</p>
        <p className="text-[10px] text-gray-500 leading-relaxed mt-1">{detail}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-12 h-7 rounded-full border transition-all p-0.5 ${checked ? 'bg-red-500 border-red-300' : 'bg-gray-900 border-white/10'}`}
      >
        <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  )
}
