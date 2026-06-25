import React, { useMemo, useState } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { useRunStore } from '../store/runStore.js'
import { speciesById } from '../data/pokemon.js'
import { speciesRarity, rarityColor, rarityLabel, starterCost } from '../data/cardModel.js'
import { levelBreakdown } from '../engine/collectionPower.js'
import { getTrait } from '../data/signatureTraits.js'
import { TYPE_COLORS } from '../data/types.js'
import { frName } from '../data/frenchNames.js'
import TypeBadge from '../components/TypeBadge.jsx'
import StatBars from '../components/StatBars.jsx'

const MAX_TEAM = 6
const sprite = (id, shiny) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${shiny ? 'shiny/' : ''}${id}.png`

const FILTERS = [
  { id: 'all',         label: 'Tous' },
  { id: 'most_played', label: 'Plus joués' },
  { id: 'favorites',   label: '❤️ Favoris' },
]

export default function RunSetupScreen() {
  const { navigate, collection, trainerLevels, starterPoints, favorites, toggleFavorite, pokemonUsageCount, recordUsage } = useGameStore()
  const { startRun } = useRunStore()
  const [picked, setPicked] = useState([])
  const [preview, setPreview] = useState(null)
  const [filter, setFilter] = useState('all')

  const entries = useMemo(() => {
    const byId = {}
    collection.forEach(c => { (byId[c.id] ||= []).push(c) })
    // You can only play with Pokémon you actually own (pulled from boosters).
    const ids = new Set(Object.keys(byId).map(Number))
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
        usageCount: pokemonUsageCount?.[id] || 0,
        isFav: favorites?.includes(id) || false,
      }
    }).filter(Boolean).sort((a, b) => a.id - b.id)
  }, [collection, trainerLevels, favorites, pokemonUsageCount])

  const filtered = useMemo(() => {
    if (filter === 'most_played') return [...entries].sort((a, b) => b.usageCount - a.usageCount)
    if (filter === 'favorites')  return entries.filter(e => e.isFav)
    return entries
  }, [entries, filter])

  const byIdEntry = useMemo(() => Object.fromEntries(entries.map(e => [e.id, e])), [entries])
  const used = picked.reduce((s, id) => s + (byIdEntry[id]?.cost || 0), 0)
  const previewEntry = preview ? byIdEntry[preview] : null

  function selectPreview(e) {
    setPreview(e.id)
  }

  function addToPicked(entry) {
    if (!entry) return
    setPicked(prev => {
      if (prev.includes(entry.id)) return prev
      if (prev.length >= MAX_TEAM) return prev
      if (used + entry.cost > starterPoints) return prev
      return [...prev, entry.id]
    })
  }

  function removeFromPicked(id) {
    setPicked(prev => prev.filter(x => x !== id))
  }

  function begin() {
    if (!picked.length) return
    picked.forEach(id => recordUsage(id))
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

      {/* Preview panel */}
      {previewEntry && (
        <div className="max-w-lg mx-auto w-full px-3 pt-3">
          <div className="rounded-2xl p-3 border flex gap-3" style={{ background: `linear-gradient(160deg, ${TYPE_COLORS[previewEntry.sp.types[0]]}22, #0f172a)`, borderColor: rarityColor(previewEntry.rarity) + '66' }}>
            <div className="flex flex-col items-center flex-shrink-0 w-24 relative">
              <img src={sprite(previewEntry.id, previewEntry.hasShiny)} alt={frName(previewEntry.id, previewEntry.sp.name)} className="w-20 h-20 object-contain pixelated"
                onError={ev => { ev.target.src = sprite(previewEntry.id, false) }} />
              <p className="text-white font-bold text-xs text-center leading-tight">{frName(previewEntry.id, previewEntry.sp.name)}</p>
              <div className="flex gap-1 mt-1 flex-wrap justify-center">{previewEntry.sp.types.map(t => <TypeBadge key={t} type={t} size="xs" />)}</div>
              {previewEntry.usageCount > 0 && <p className="text-[8px] text-gray-500 mt-1">{previewEntry.usageCount}× joué</p>}
              <button onClick={() => toggleFavorite(previewEntry.id)} className="text-lg mt-1 leading-none">
                {previewEntry.isFav ? '❤️' : '🤍'}
              </button>
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

              {picked.includes(previewEntry.id) ? (
                <button onClick={() => removeFromPicked(previewEntry.id)} className="mt-2 w-full py-2 text-xs font-black rounded-xl bg-red-600/20 text-red-300 border border-red-600/40 active:scale-95 transition-all">
                  ✗ Retirer de l'équipe
                </button>
              ) : (
                <button onClick={() => addToPicked(previewEntry)} disabled={picked.length >= MAX_TEAM || used + previewEntry.cost > starterPoints}
                  className={`mt-2 w-full py-2 text-xs font-black rounded-xl transition-all active:scale-95 ${picked.length >= MAX_TEAM || used + previewEntry.cost > starterPoints ? 'bg-gray-900 text-gray-600 border border-gray-800' : 'bg-green-600/30 text-green-300 border border-green-600/50 hover:bg-green-600/40'}`}>
                  {picked.length >= MAX_TEAM ? 'Équipe complète' : used + previewEntry.cost > starterPoints ? 'Pas assez de points' : '+ Mettre dans mon équipe'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="max-w-lg mx-auto w-full px-3 pt-2">
        <div className="flex gap-1.5">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className="text-[10px] font-black px-2.5 py-1 rounded-lg transition-all"
              style={{ background: filter === f.id ? '#dc2626' : '#0f172a', color: filter === f.id ? '#fff' : '#94a3b8', border: `1.5px solid ${filter === f.id ? '#dc2626' : '#1e293b'}` }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-3 py-2 max-w-lg mx-auto w-full">
        <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mb-2">Choisis ton équipe ({picked.length}/{MAX_TEAM})</p>
        {entries.length === 0 ? (
          <div className="rounded-2xl p-6 border border-yellow-700/40 bg-yellow-900/10 text-center mt-6">
            <p className="text-3xl mb-2">🎴</p>
            <p className="text-yellow-300 font-bold text-sm">Aucun Pokémon disponible</p>
            <p className="text-gray-400 text-xs mt-1">Tu dois d'abord <span className="text-white font-bold">obtenir des Pokémon en ouvrant des boosters</span> avant de pouvoir lancer une expédition.</p>
            <button onClick={() => navigate('shop')} className="mt-4 px-5 py-2.5 bg-yellow-500 text-black text-sm font-black rounded-xl active:scale-95 transition-all">🛍️ Aller à la boutique</button>
          </div>
        ) : (
        <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5 pb-28">
          {filtered.map(e => {
            const sel = picked.includes(e.id)
            const order = picked.indexOf(e.id)
            const unaffordable = !sel && used + e.cost > starterPoints
            const color = TYPE_COLORS[e.sp.types[0]] || '#1e293b'
            const rc = rarityColor(e.rarity)
            const isPreviewed = preview === e.id
            return (
              <button key={e.id} onClick={() => selectPreview(e)}
                className={`relative rounded-lg p-1 flex flex-col items-center transition-all ${isPreviewed ? 'scale-105 ring-2 ring-white/30' : unaffordable ? 'opacity-40' : 'active:scale-95'}`}
                style={{ aspectRatio: '3/4', background: sel ? `linear-gradient(160deg, ${color}66, #0f172a)` : '#0f172a', border: `1.5px solid ${sel ? '#4ade80' : isPreviewed ? '#ffffff66' : rc + '44'}` }}>
                <span className="absolute top-0.5 left-0.5 text-[8px] font-black px-1 rounded bg-black/70 z-10" style={{ color: rc }}>{e.cost}</span>
                <img src={sprite(e.id, e.hasShiny)} alt={frName(e.id, e.sp.name)} className="w-9 h-9 object-contain pixelated mt-1.5" loading="lazy"
                  onError={ev => { ev.target.src = sprite(e.id, false) }} />
                <p className="text-white text-[7px] font-bold truncate w-full text-center leading-none mt-0.5">{frName(e.id, e.sp.name)}</p>
                {e.hasShiny && <span className="absolute bottom-0.5 left-0.5 text-[7px] leading-none">✨</span>}
                {e.isFav && <span className="absolute top-0.5 right-0.5 text-[7px] leading-none z-10">❤️</span>}
                {e.cards.length > 1 && !e.isFav && <span className="absolute bottom-0.5 right-0.5 text-[6px] text-gray-400 font-bold leading-none">×{e.cards.length}</span>}
                {sel && <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full flex items-center justify-center text-[7px] font-black z-10">{order + 1}</div>}
              </button>
            )
          })}
        </div>
        )}
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
