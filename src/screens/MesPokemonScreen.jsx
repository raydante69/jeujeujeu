import React, { useState, useMemo } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { speciesById } from '../data/pokemon.js'
import { starterCost } from '../data/cardModel.js'

const DIAMOND_COSTS = [0, 15, 30, 50, 80] // index = current level

// Power color: 1→green, 8→red
function powerColor(cost) {
  const t = (cost - 1) / 7
  const r = Math.round(78 + t * (239 - 78))
  const g = Math.round(222 - t * (222 - 68))
  const b = Math.round(128 - t * (128 - 68))
  return `rgb(${r},${g},${b})`
}

const SORT_OPTIONS = [
  { id: 'level', label: 'Niveau' },
  { id: 'power', label: 'Puissance' },
  { id: 'fav',   label: 'Favoris' },
]

export default function MesPokemonScreen() {
  const {
    collection, cardLevels, favorites, levelUpCard, levelUpCardWithDiamonds,
    crystals, money, addMoney, spendCrystals, navigate,
  } = useGameStore()

  const [sort, setSort] = useState('level')
  const [showAll, setShowAll] = useState(false)
  const [diamondMsg, setDiamondMsg] = useState(null)

  // Build per-species data from collection
  const speciesData = useMemo(() => {
    const map = {}
    for (const card of collection) {
      const id = card.id
      if (!map[id]) {
        const sp = speciesById(id)
        if (!sp) continue
        const level = cardLevels?.[id] ?? 1
        map[id] = {
          id,
          sp,
          level,
          power: starterCost(sp),
          plainCount: 0,
          cards: [],
        }
      }
      map[id].cards.push(card)
      if (!card.shiny) map[id].plainCount++
    }
    return Object.values(map)
  }, [collection, cardLevels])

  const sorted = useMemo(() => {
    const arr = [...speciesData]
    if (sort === 'level') arr.sort((a, b) => b.level - a.level || b.power - a.power)
    else if (sort === 'power') arr.sort((a, b) => b.power - a.power || b.level - a.level)
    else if (sort === 'fav') arr.sort((a, b) => {
      const fa = favorites?.includes(a.id) ? 1 : 0
      const fb = favorites?.includes(b.id) ? 1 : 0
      return fb - fa || b.level - a.level
    })
    return arr
  }, [speciesData, sort, favorites])

  const canLevelUp = (d) => d.level < 5 && d.plainCount >= 2
  const readyToLevel = sorted.filter(canLevelUp)
  const displayed = showAll ? sorted : sorted.slice(0, 12)

  function handleDiamondExchange(cost, gold) {
    if (!spendCrystals(cost)) return
    addMoney(gold)
    setDiamondMsg(`+${gold} 💰`)
    setTimeout(() => setDiamondMsg(null), 1800)
  }

  function handleLevelUp(id) {
    const result = levelUpCard(id)
    if (!result) {
      // fallback — shouldn't happen since button only shows when canLevelUp
    }
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: 'radial-gradient(ellipse at top, #0f1a2e 0%, #0a0a14 70%)' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0a14]/90 backdrop-blur border-b border-gray-800/50 px-4 pt-safe-top pb-3">
        <h1 className="font-game text-sm text-white pt-3">Mes Pokémon</h1>
        <p className="text-[10px] text-gray-500 mt-0.5">{sorted.length} espèces · {crystals} 💎 · {money} 💰</p>
        {/* Sort pills */}
        <div className="flex gap-2 mt-2">
          {SORT_OPTIONS.map(o => (
            <button
              key={o.id}
              onClick={() => setSort(o.id)}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                sort === o.id
                  ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                  : 'border-gray-700 text-gray-500 hover:text-gray-300'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 pt-3 space-y-4">

        {/* Diamond exchange */}
        <div className="rounded-2xl border border-purple-800/40 p-3" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(0,0,0,0.2))' }}>
          <p className="text-[10px] font-bold text-purple-300 uppercase tracking-wider mb-2">💎 Échange Diamants</p>
          <div className="flex gap-2">
            {[
              { cost: 40,  gold: 100 },
              { cost: 80,  gold: 220 },
              { cost: 155, gold: 450 },
            ].map(tier => (
              <button
                key={tier.cost}
                onClick={() => handleDiamondExchange(tier.cost, tier.gold)}
                disabled={crystals < tier.cost}
                className="flex-1 rounded-xl py-2 px-1 border border-purple-700/50 bg-purple-900/20 text-center hover:bg-purple-800/30 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <p className="text-[10px] font-black text-purple-300">{tier.cost} 💎</p>
                <p className="text-[9px] text-gray-400 mt-0.5">→ {tier.gold} 💰</p>
              </button>
            ))}
          </div>
          {diamondMsg && (
            <p className="text-center text-yellow-300 font-black text-sm mt-2 animate-pulse">{diamondMsg}</p>
          )}
        </div>

        {/* Ready to level up */}
        {readyToLevel.length > 0 && (
          <div className="rounded-2xl border border-green-800/40 p-3" style={{ background: 'linear-gradient(135deg, rgba(74,222,128,0.07), rgba(0,0,0,0.2))' }}>
            <p className="text-[10px] font-bold text-green-400 uppercase tracking-wider mb-2">▲ Prêts à monter</p>
            <div className="flex flex-wrap gap-2">
              {readyToLevel.map(d => (
                <button
                  key={d.id}
                  onClick={() => handleLevelUp(d.id)}
                  className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 border border-green-700/50 bg-green-900/20 hover:bg-green-800/30 active:scale-95 transition-all"
                >
                  <img
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${d.id}.png`}
                    alt={d.sp.name}
                    className="w-8 h-8 object-contain pixelated"
                  />
                  <div className="text-left">
                    <p className="text-[9px] text-white font-bold">{d.sp.frName || d.sp.name}</p>
                    <p className="text-[8px] text-green-300">Niv.{d.level} → {d.level + 1}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pokémon grid */}
        <div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">Collection ({sorted.length})</p>
          <div className="grid grid-cols-3 gap-2">
            {displayed.map(d => {
              const cost = DIAMOND_COSTS[d.level] || 0
              const canDiamond = d.level < 5 && crystals >= cost
              const isFav = favorites?.includes(d.id)
              return (
                <div
                  key={d.id}
                  className="rounded-xl border border-gray-800/60 bg-[#1a1a2e]/80 p-2 flex flex-col items-center gap-1 relative"
                >
                  {isFav && <span className="absolute top-1 right-1 text-[8px]">⭐</span>}
                  <img
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${d.id}.png`}
                    alt={d.sp.name}
                    className="w-14 h-14 object-contain pixelated"
                  />
                  <p className="text-[9px] text-white font-bold text-center leading-tight">
                    {d.sp.frName || d.sp.name}
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-white/10 text-gray-300">
                      Niv.{d.level}
                    </span>
                    <span className="text-[8px] font-black" style={{ color: powerColor(d.power) }}>
                      P{d.power}
                    </span>
                  </div>
                  {canLevelUp(d) ? (
                    <button
                      onClick={() => handleLevelUp(d.id)}
                      className="text-[8px] font-black px-1.5 py-0.5 rounded-lg bg-green-500/20 text-green-300 border border-green-500/40 hover:bg-green-500/30 active:scale-95"
                    >
                      ▲ Lvl
                    </button>
                  ) : d.level < 5 ? (
                    <button
                      onClick={() => { levelUpCardWithDiamonds(d.id) }}
                      disabled={!canDiamond}
                      className="text-[8px] font-black px-1.5 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 active:scale-95 disabled:opacity-40"
                    >
                      ▲ {cost}💎
                    </button>
                  ) : (
                    <span className="text-[8px] text-yellow-400 font-bold">MAX</span>
                  )}
                </div>
              )
            })}
          </div>
          {sorted.length > 12 && (
            <button
              onClick={() => setShowAll(v => !v)}
              className="w-full mt-3 py-2 rounded-xl border border-gray-700 text-gray-400 text-xs font-bold hover:text-white transition-all"
            >
              {showAll ? '▲ Réduire' : `▼ Voir tous (${sorted.length})`}
            </button>
          )}
          {sorted.length === 0 && (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">📦</p>
              <p className="text-gray-500 text-sm">Aucun Pokémon dans ta collection.</p>
              <button
                onClick={() => navigate('shop')}
                className="mt-4 px-4 py-2 bg-purple-600 text-white font-bold rounded-xl text-sm"
              >
                Ouvrir des boosters
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
