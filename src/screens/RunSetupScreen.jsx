import React, { useMemo, useState } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { useRunStore } from '../store/runStore.js'
import { allSpecies, speciesById } from '../data/pokemon.js'
import { TYPE_COLORS } from '../data/types.js'
import TypeBadge from '../components/TypeBadge.jsx'

const FREE_STARTERS = [1, 4, 7, 25, 133, 66]

export default function RunSetupScreen() {
  const { navigate, collection } = useGameStore()
  const { startRun } = useRunStore()
  const [picked, setPicked] = useState([])

  // Pool of unique species the player can run with (owned + free starters fallback).
  const pool = useMemo(() => {
    const ids = new Set(collection.map(c => c.id))
    FREE_STARTERS.forEach(id => ids.add(id))
    return [...ids].map(id => speciesById(id)).filter(Boolean).sort((a, b) => a.id - b.id)
  }, [collection])

  function toggle(id) {
    setPicked(prev =>
      prev.includes(id) ? prev.filter(x => x !== id)
      : prev.length >= 3 ? prev : [...prev, id]
    )
  }

  function begin() {
    if (picked.length === 0) return
    startRun(picked)
    navigate('run')
  }

  return (
    <div className="min-h-screen bg-game-bg flex flex-col">
      <div className="px-4 pt-10 pb-3 bg-game-surface border-b border-game-border sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <button onClick={() => navigate('home')} className="text-gray-500 text-xs mb-1">← Accueil</button>
          <h2 className="font-game text-sm text-white">Compose ton trio</h2>
          <p className="text-xs text-gray-500 mt-0.5">Tes Pokémon démarrent <span className="text-white font-bold">niveau 5</span> et évoluent au fil des vagues.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full">
        {/* Selected slots */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[0, 1, 2].map(i => {
            const id = picked[i]
            const sp = id ? speciesById(id) : null
            const color = sp ? (TYPE_COLORS[sp.types[0]] || '#1e293b') : '#1e293b'
            return (
              <div key={i} className="rounded-xl aspect-square flex flex-col items-center justify-center border-2 border-dashed"
                style={{ borderColor: sp ? color : '#1e293b', background: sp ? `linear-gradient(160deg, ${color}33, #0f172a)` : '#0f172a' }}>
                {sp ? (
                  <>
                    <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${sp.id}.png`} alt={sp.name} className="w-12 h-12 object-contain pixelated" />
                    <p className="text-white text-[9px] font-bold">{sp.name}</p>
                  </>
                ) : (
                  <span className="text-gray-700 text-2xl">＋</span>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mb-2">Ton vivier ({pool.length})</p>
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 pb-28">
          {pool.map(sp => {
            const sel = picked.includes(sp.id)
            const color = TYPE_COLORS[sp.types[0]] || '#1e293b'
            const dim = picked.length >= 3 && !sel
            return (
              <button key={sp.id} onClick={() => toggle(sp.id)} disabled={dim}
                className={`relative rounded-xl p-1.5 flex flex-col items-center transition-all ${sel ? 'scale-105' : dim ? 'opacity-30' : 'hover:-translate-y-0.5'}`}
                style={{ background: sel ? `linear-gradient(160deg, ${color}55, #0f172a)` : '#0f172a', border: `1.5px solid ${sel ? color : '#1e293b'}` }}>
                <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${sp.id}.png`} alt={sp.name} className="w-10 h-10 object-contain pixelated" loading="lazy" />
                <p className="text-white text-[8px] font-bold truncate w-full text-center">{sp.name}</p>
                <div className="flex gap-0.5">{sp.types.map(t => <span key={t} className="w-2 h-2 rounded-full" style={{ background: TYPE_COLORS[t] }} />)}</div>
                {sel && <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-[8px] font-black">{picked.indexOf(sp.id) + 1}</div>}
              </button>
            )
          })}
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 p-3 bg-game-bg border-t border-game-border z-20">
        <button onClick={begin} disabled={picked.length === 0}
          className={`w-full max-w-lg mx-auto block py-4 rounded-xl font-black text-base transition-all ${picked.length ? 'bg-gradient-to-r from-purple-600 to-red-600 text-white active:scale-95' : 'bg-gray-900 text-gray-700'}`}>
          {picked.length ? `⚔️ Entrer dans le Rift (${picked.length})` : 'Choisis au moins 1 Pokémon'}
        </button>
      </div>
    </div>
  )
}
