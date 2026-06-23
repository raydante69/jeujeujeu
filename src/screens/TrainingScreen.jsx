import React, { useMemo, useState } from 'react'
import { useGameStore, trainCost } from '../store/gameStore.js'
import { speciesById } from '../data/pokemon.js'
import { TYPE_COLORS } from '../data/types.js'
import { getTrait } from '../data/signatureTraits.js'

export default function TrainingScreen() {
  const { navigate, collection, trainerLevels, crystals, trainSpecies } = useGameStore()
  const [msg, setMsg] = useState(null)

  const owned = useMemo(() => {
    const ids = [...new Set(collection.map(c => c.id))].map(id => speciesById(id)).filter(Boolean)
    return ids.sort((a, b) => (trainerLevels[b.id] || 0) - (trainerLevels[a.id] || 0) || a.id - b.id)
  }, [collection, trainerLevels])

  function flash(m) { setMsg(m); setTimeout(() => setMsg(null), 1300) }

  function train(id, name) {
    const spent = trainSpecies(id)
    if (spent === false) { flash('Pas assez de 💎 cristaux !'); return }
    flash(`${name} : niveau de départ +1 !`)
  }

  return (
    <div className="min-h-screen bg-game-bg flex flex-col">
      {msg && <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-black/85 text-white text-xs font-bold px-4 py-2 rounded-full">{msg}</div>}

      <div className="px-4 pt-10 pb-3 bg-game-surface border-b border-game-border sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <button onClick={() => navigate('home')} className="text-gray-500 text-xs mb-1">← Accueil</button>
            <h2 className="font-game text-sm text-white">🏋️ Salle de dressage</h2>
            <p className="text-[11px] text-gray-500">Augmente définitivement le niveau de départ de tes Pokémon.</p>
          </div>
          <span className="bg-black/40 rounded-full px-3 py-1.5 text-sm font-bold text-cyan-300 flex-shrink-0">💎 {crystals}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full">
        {owned.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-gray-400 text-sm font-bold">Aucun Pokémon à dresser</p>
            <p className="text-gray-600 text-xs mt-1">Ouvre des boosters pour remplir ton Pokédex.</p>
            <button onClick={() => navigate('shop')} className="mt-4 px-5 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl">🛍️ Boosters</button>
          </div>
        ) : (
          <div className="space-y-2 pb-8">
            {owned.map(sp => {
              const cur = trainerLevels[sp.id] || 0
              const cost = trainCost(cur)
              const color = TYPE_COLORS[sp.types[0]] || '#1e293b'
              const trait = getTrait(sp.id, sp.types)
              const afford = crystals >= cost
              return (
                <div key={sp.id} className="flex items-center gap-3 rounded-xl p-2.5 border" style={{ background: `linear-gradient(110deg, ${color}1f, #0f172a)`, borderColor: color + '33' }}>
                  <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${sp.id}.png`} alt={sp.name} className="w-12 h-12 object-contain pixelated flex-shrink-0" loading="lazy" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-bold text-sm truncate">{sp.name}</p>
                      {cur > 0 && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300">+{cur} niv</span>}
                    </div>
                    <p className="text-[10px] truncate" style={{ color }}>{trait.emoji} {trait.name}</p>
                  </div>
                  <button onClick={() => train(sp.id, sp.name)} disabled={!afford}
                    className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-black transition-all ${afford ? 'bg-cyan-500 text-black hover:brightness-110 active:scale-95' : 'bg-gray-900 text-gray-600'}`}>
                    +1 · {cost} 💎
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
