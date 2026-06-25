import React, { useMemo, useState } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { useRunStore } from '../store/runStore.js'
import { speciesById } from '../data/pokemon.js'
import { speciesRarity, rarityColor, rarityLabel, starterCost } from '../data/cardModel.js'
import { levelBreakdown } from '../engine/collectionPower.js'
import { getTrait } from '../data/signatureTraits.js'
import { TYPE_COLORS } from '../data/types.js'
import TypeBadge from '../components/TypeBadge.jsx'
import StatBars from '../components/StatBars.jsx'

const FREE_STARTERS = [1, 4, 7, 25, 133, 66]
const MAX_TEAM = 6
const sprite = (id, shiny) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${shiny ? 'shiny/' : ''}${id}.png`

export default function RunSetupScreen() {
  const { navigate, collection, trainerLevels, starterPoints } = useGameStore()
  const { startRun } = useRunStore()
  const [picked, setPicked] = useState([])
  const [preview, setPreview] = useState(null)

  const entries = useMemo(() => {
    const byId = {}
    collection.forEach(c => { (byId[c.id] ||= []).push(c) })
    const ids = new Set([...Object.keys(byId).map(Number), ...FREE_STARTERS])
    return [...ids].map(id => {
      const sp = speciesById(id)
      if (!sp) return null
      const cards = byId[id] || []
      const bd = levelBreakdown(cards, sp.types, trainerLevels[id] || 0)
      return {
        id, sp, cards, cost: starterCost(sp), rarity: speciesRarity(sp),
        level: bd.total, bd, trait: getTrait(id, sp.types),
        hasShiny: cards.some(c => c.shiny),
        hasHolo: cards.some(c => c.holo),
      }
    }).filter(Boolean).sort((a, b) => a.id - b.id)
  }, [collection, trainerLevels])

  const byIdEntry = useMemo(() => Object.fromEntries(entries.map(e => [e.id, e])), [entries])
  const used = picked.reduce((s, id) => s + (byIdEntry[id]?.cost || 0), 0)
  const previewEntry = preview ? byIdEntry[preview] : (picked.length ? byIdEntry[picked[0]] : entries[0])

  function tap(e) {
    setPreview(e.id)
    setPicked(prev => {
      if (prev.includes(e.id)) return prev.filter(x => x !== e.id)
      if (prev.length >= MAX_TEAM) return prev
      if (used + e.cost > starterPoints) return prev
      return [...prev, e.id]
    })
  }

  function begin() {
    if (!picked.length) return
    startRun(picked.map(id => ({
      id,
      level: byIdEntry[id]?.level || 5,
      shiny: byIdEntry[id]?.hasShiny || false,
      holo: byIdEntry[id]?.hasHolo || false,
    })))
    navigate('run')
  }

  return (
    <div className="min-h-screen bg-game-bg flex flex-col">
      <div className="px-4 pt-10 pb-2 bg-game-surface border-b border-game-border sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate('home')} className="text-gray-500 text-xs">← Accueil</button>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400 font-bold">Points</span>
            <span className="px-3 py-1 rounded-full text-sm font-black tabular-nums" style={{ background: used >= starterPoints ? '#16a34a33' : '#1e293b', color: used >= starterPoints ? '#4ade80' : '#fff', border: `1px solid ${used >= starterPoints ? '#4ade80' : '#334155'}` }}>
              {used}/{starterPoints} 💠
            </span>
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {previewEntry && (
        <div className="max-w-lg mx-auto w-full px-3 pt-3">
          <div className="rounded-2xl p-3 border flex gap-3" style={{ background: `linear-gradient(160deg, ${TYPE_COLORS[previewEntry.sp.types[0]]}22, #0f172a)`, borderColor: rarityColor(previewEntry.rarity) + '66' }}>
            <div className="flex flex-col items-center flex-shrink-0 w-24">
              <img src={sprite(previewEntry.id, previewEntry.hasShiny)} alt={previewEntry.sp.name} className="w-20 h-20 object-contain pixelated"
                onError={ev => { ev.target.src = sprite(previewEntry.id, false) }} />
              <p className="text-white font-bold text-xs text-center leading-tight">{previewEntry.sp.name}</p>
              <div className="flex gap-1 mt-1 flex-wrap justify-center">{previewEntry.sp.types.map(t => <TypeBadge key={t} type={t} size="xs" />)}</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ color: rarityColor(previewEntry.rarity), background: rarityColor(previewEntry.rarity) + '22' }}>{rarityLabel(previewEntry.rarity)}</span>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">💠 {previewEntry.cost}</span>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300">Départ Niv.{previewEntry.level}</span>
                {previewEntry.hasShiny && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300">✨</span>}
              </div>
              <StatBars stats={previewEntry.sp.stats} accent={rarityColor(previewEntry.rarity)} />
              <p className="text-[9px] mt-1.5 leading-snug"><span className="font-bold" style={{ color: TYPE_COLORS[previewEntry.sp.types[0]] }}>{previewEntry.trait.emoji} {previewEntry.trait.name}</span> <span className="text-gray-400">— {previewEntry.trait.desc}</span></p>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-3 py-3 max-w-lg mx-auto w-full">
        <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mb-2">Choisis ton équipe ({picked.length}/{MAX_TEAM})</p>
        <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5 pb-28">
          {entries.map(e => {
            const sel = picked.includes(e.id)
            const order = picked.indexOf(e.id)
            const unaffordable = !sel && used + e.cost > starterPoints
            const color = TYPE_COLORS[e.sp.types[0]] || '#1e293b'
            const rc = rarityColor(e.rarity)
            return (
              <button key={e.id} onClick={() => tap(e)}
                className={`relative rounded-lg p-1 flex flex-col items-center transition-all ${sel ? 'scale-105' : unaffordable ? 'opacity-40' : 'active:scale-95'}`}
                style={{ aspectRatio: '3/4', background: sel ? `linear-gradient(160deg, ${color}66, #0f172a)` : '#0f172a', border: `1.5px solid ${sel ? '#4ade80' : rc + '44'}` }}>
                <span className="absolute top-0.5 left-0.5 text-[8px] font-black px-1 rounded bg-black/70 z-10" style={{ color: rc }}>{e.cost}</span>
                <img src={sprite(e.id, e.hasShiny)} alt={e.sp.name} className="w-9 h-9 object-contain pixelated mt-1.5" loading="lazy"
                  onError={ev => { ev.target.src = sprite(e.id, false) }} />
                <p className="text-white text-[7px] font-bold truncate w-full text-center leading-none mt-0.5">{e.sp.name}</p>
                {e.hasShiny && <span className="absolute bottom-0.5 left-0.5 text-[7px] leading-none">✨</span>}
                {e.cards.length > 1 && <span className="absolute bottom-0.5 right-0.5 text-[6px] text-gray-400 font-bold leading-none">×{e.cards.length}</span>}
                {sel && <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full flex items-center justify-center text-[7px] font-black z-10">{order + 1}</div>}
              </button>
            )
          })}
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 p-3 bg-game-bg border-t border-game-border z-20">
        <button onClick={begin} disabled={picked.length === 0}
          className={`w-full max-w-lg mx-auto block py-4 rounded-xl font-black text-base transition-all ${picked.length ? 'bg-gradient-to-r from-purple-600 to-red-600 text-white active:scale-95' : 'bg-gray-900 text-gray-700'}`}>
          {picked.length ? `⚔️ Lancer (${used}/${starterPoints} pts · ${picked.length} Pokémon)` : 'Sélectionne au moins 1 Pokémon'}
        </button>
      </div>
    </div>
  )
}
