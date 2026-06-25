import React, { useEffect } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { PATCH_NOTES, changeMeta } from '../data/patchNotes.js'

export default function NewsScreen() {
  const { navigate, markNewsSeen } = useGameStore()

  // Opening the screen clears the "new" badge.
  useEffect(() => { markNewsSeen() }, []) // eslint-disable-line

  return (
    <div className="min-h-screen bg-game-bg flex flex-col">
      {/* Header */}
      <div className="px-4 pt-10 pb-3 bg-game-surface border-b border-game-border sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate('home')} className="text-gray-500 text-xs">← Accueil</button>
          <p className="font-game text-sm text-white">📰 Actualités</p>
          <span className="w-12" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full space-y-4 pb-10">
        {PATCH_NOTES.map(note => (
          <div key={note.version} className="rounded-2xl border overflow-hidden"
            style={{ borderColor: note.highlight ? '#e6394688' : '#2a2a50', background: '#12121f' }}>
            {/* Version header */}
            <div className="px-4 py-3 flex items-center justify-between"
              style={{ background: note.highlight ? 'linear-gradient(90deg,#e6394633,transparent)' : 'transparent' }}>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-game text-xs text-white">v{note.version}</span>
                  {note.highlight && <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-red-500/30 text-red-300">DERNIÈRE</span>}
                </div>
                <p className="text-sm font-bold text-white mt-1">{note.title}</p>
              </div>
              <span className="text-[10px] text-gray-500">{note.date}</span>
            </div>
            {/* Changes */}
            <div className="px-4 pb-3 space-y-2">
              {note.changes.map((c, i) => {
                const m = changeMeta(c.type)
                return (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-sm flex-shrink-0 mt-0.5">{m.icon}</span>
                    <div className="min-w-0">
                      <span className="text-[8px] font-black uppercase tracking-wide mr-1.5" style={{ color: m.color }}>{m.label}</span>
                      <span className="text-[11px] text-gray-300 leading-relaxed">{c.text}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
