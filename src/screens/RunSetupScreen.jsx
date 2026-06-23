import React, { useMemo, useState } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { useRunStore } from '../store/runStore.js'
import { speciesById } from '../data/pokemon.js'
import { TYPE_COLORS } from '../data/types.js'
import { levelBreakdown } from '../engine/collectionPower.js'
import { getTrait } from '../data/signatureTraits.js'

const FREE_STARTERS = [1, 4, 7, 25, 133, 66]

export default function RunSetupScreen() {
  const { navigate, collection, trainerLevels } = useGameStore()
  const { startRun } = useRunStore()
  const [picked, setPicked] = useState([])
  const [info, setInfo] = useState(null)

  // Every owned species + free starters becomes a run-eligible entry, each with
  // a starting level driven by duplicates, rarity and permanent training.
  const entries = useMemo(() => {
    const byId = {}
    collection.forEach(c => { (byId[c.id] ||= []).push(c) })
    const ids = new Set([...Object.keys(byId).map(Number), ...FREE_STARTERS])
    return [...ids].map(id => {
      const sp = speciesById(id)
      if (!sp) return null
      const cards = byId[id] || []
      const bd = levelBreakdown(cards, sp.types, trainerLevels[id] || 0)
      return { id, sp, cards, level: bd.total, bd, trait: getTrait(id, sp.types) }
    }).filter(Boolean).sort((a, b) => (b.level - a.level) || (a.id - b.id))
  }, [collection, trainerLevels])

  const byIdEntry = useMemo(() => Object.fromEntries(entries.map(e => [e.id, e])), [entries])

  function toggle(id) {
    setPicked(prev =>
      prev.includes(id) ? prev.filter(x => x !== id)
      : prev.length >= 3 ? prev : [...prev, id]
    )
  }

  function begin() {
    if (!picked.length) return
    startRun(picked.map(id => ({ id, level: byIdEntry[id]?.level || 5 })))
    navigate('run')
  }

  return (
    <div className="min-h-screen bg-game-bg flex flex-col">
      {info && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6" onClick={() => setInfo(null)}>
          <div className="bg-game-surface border border-game-border rounded-2xl p-5 max-w-xs w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${info.id}.png`} alt={info.sp.name} className="w-16 h-16 object-contain"
                onError={e => { e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${info.id}.png` }} />
              <div>
                <p className="text-white font-bold">{info.sp.name}</p>
                <p className="text-xs" style={{ color: TYPE_COLORS[info.sp.types[0]] }}>{info.trait.emoji} {info.trait.name}</p>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mb-3">{info.trait.desc}</p>
            <div className="space-y-1 text-[11px]">
              <Row label="Base" v={`Niv.${info.bd.base}`} />
              {info.bd.dup > 0 && <Row label={`Doublons (×${info.bd.count})`} v={`+${info.bd.dup}`} accent="#4ade80" />}
              {info.bd.rarity > 0 && <Row label={`Rareté (${info.bd.bestRarity})`} v={`+${info.bd.rarity}`} accent="#c084fc" />}
              {info.bd.trainer > 0 && <Row label="Dressage" v={`+${info.bd.trainer}`} accent="#facc15" />}
              {info.bd.trait > 0 && <Row label="Trait" v={`+${info.bd.trait}`} accent="#f97316" />}
              <div className="h-px bg-white/10 my-1.5" />
              <Row label="Niveau de départ" v={`Niv.${info.bd.total}`} bold />
            </div>
            <button onClick={() => setInfo(null)} className="w-full mt-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-xs font-bold">Fermer</button>
          </div>
        </div>
      )}

      <div className="px-4 pt-10 pb-3 bg-game-surface border-b border-game-border sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <button onClick={() => navigate('home')} className="text-gray-500 text-xs mb-1">← Accueil</button>
          <h2 className="font-game text-sm text-white">Compose ton équipe (max 3)</h2>
          <p className="text-xs text-gray-500 mt-0.5">Doublons, rareté et dressage augmentent le niveau de départ. Appuie longuement pour le détail.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full">
        {/* Selected slots */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[0, 1, 2].map(i => {
            const id = picked[i]
            const e = id ? byIdEntry[id] : null
            const color = e ? (TYPE_COLORS[e.sp.types[0]] || '#1e293b') : '#1e293b'
            return (
              <div key={i} className="rounded-xl aspect-square flex flex-col items-center justify-center border-2 border-dashed relative"
                style={{ borderColor: e ? color : '#1e293b', background: e ? `linear-gradient(160deg, ${color}33, #0f172a)` : '#0f172a' }}>
                {e ? (
                  <>
                    <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${e.id}.png`} alt={e.sp.name} className="w-12 h-12 object-contain pixelated" />
                    <p className="text-white text-[9px] font-bold">{e.sp.name}</p>
                    <span className="absolute top-1 left-1 text-[8px] font-black px-1 rounded" style={{ background: color + '44', color: '#fff' }}>Niv.{e.level}</span>
                  </>
                ) : (
                  <span className="text-gray-700 text-2xl">＋</span>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mb-2">Ton vivier ({entries.length})</p>
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 pb-28">
          {entries.map(e => {
            const sel = picked.includes(e.id)
            const color = TYPE_COLORS[e.sp.types[0]] || '#1e293b'
            const dim = picked.length >= 3 && !sel
            return (
              <button key={e.id} onClick={() => toggle(e.id)}
                onContextMenu={ev => { ev.preventDefault(); setInfo(e) }}
                disabled={dim}
                className={`relative rounded-xl p-1.5 flex flex-col items-center transition-all ${sel ? 'scale-105' : dim ? 'opacity-30' : 'hover:-translate-y-0.5'}`}
                style={{ background: sel ? `linear-gradient(160deg, ${color}55, #0f172a)` : '#0f172a', border: `1.5px solid ${sel ? color : '#1e293b'}` }}>
                <span className="absolute top-0.5 left-0.5 text-[7px] font-black px-1 rounded bg-black/60 text-white z-10">Niv.{e.level}</span>
                <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${e.id}.png`} alt={e.sp.name} className="w-10 h-10 object-contain pixelated mt-1" loading="lazy" />
                <p className="text-white text-[8px] font-bold truncate w-full text-center">{e.sp.name}</p>
                <div className="flex gap-0.5 items-center">
                  {e.sp.types.map(t => <span key={t} className="w-2 h-2 rounded-full" style={{ background: TYPE_COLORS[t] }} />)}
                  {e.cards.length > 1 && <span className="text-[7px] text-gray-400 font-bold ml-0.5">×{e.cards.length}</span>}
                </div>
                {sel && <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-[8px] font-black z-10">{picked.indexOf(e.id) + 1}</div>}
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

function Row({ label, v, accent, bold }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-400">{label}</span>
      <span className={bold ? 'text-white font-black' : 'font-bold'} style={{ color: accent || '#e2e8f0' }}>{v}</span>
    </div>
  )
}
