import React, { useState, useMemo } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { allSpecies, speciesById } from '../data/pokemon.js'
import { speciesRarity, rarityColor, rarityLabel, rarityTier, starterCost, isHoloEligible } from '../data/cardModel.js'
import { getTrait } from '../data/signatureTraits.js'
import { TYPE_COLORS } from '../data/types.js'
import TypeBadge from '../components/TypeBadge.jsx'
import StatBars from '../components/StatBars.jsx'

const SHORT = { common: 'C', uncommon: 'UC', rare: 'R', veryrare: 'TR', epic: 'EP', legendary: 'LÉG' }
const TYPE_FILTER_LIST = ['fire','water','grass','electric','psychic','fighting','ghost','ice','dragon','dark','rock','ground','flying','bug','poison','fairy','steel','normal']

const sprite = (id, shiny) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${shiny ? 'shiny/' : ''}${id}.png`

function DexSlot({ species, ownedCards, isNew, onClick }) {
  const owned = ownedCards.length > 0
  const rarity = speciesRarity(species)
  const rc = rarityColor(rarity)
  const hasShiny = ownedCards.some(c => c.shiny)
  const hasHolo = ownedCards.some(c => c.holo)
  const typeColor = owned ? (TYPE_COLORS[species.types?.[0]] || '#1e293b') : '#111827'
  return (
    <button onClick={() => owned && onClick(species, ownedCards)}
      className={`relative overflow-hidden rounded-xl transition-all duration-150 ${owned ? 'cursor-pointer hover:-translate-y-0.5 hover:scale-[1.06] active:scale-95' : 'cursor-default'}`}
      style={{ aspectRatio: '2/3', background: owned ? `linear-gradient(165deg, ${typeColor}aa 0%, ${typeColor}33 55%, #0f172a 100%)` : 'linear-gradient(165deg, #1e293b 0%, #0f172a 100%)', border: owned ? `1.5px solid ${rc}55` : '1.5px solid #1e293b', boxShadow: owned && rarityTier(rarity) >= 3 ? `0 0 8px ${rc}66` : '' }}>
      {owned && <div className="absolute top-0 inset-x-0 h-0.5" style={{ background: rc }} />}
      <div className="flex flex-col items-center justify-between h-full p-1.5">
        <span className="text-[6px] text-gray-600 font-mono self-end">#{String(species.id).padStart(3, '0')}</span>
        <img src={sprite(species.id, hasShiny)} alt={owned ? species.name : '???'}
          className="w-10 h-10 object-contain pixelated" style={owned ? {} : { filter: 'brightness(0)', opacity: 0.1 }} loading="lazy"
          onError={e => { e.target.src = sprite(species.id, false) }} />
        <div className="w-full text-center leading-none">
          {owned ? <p className="text-white font-bold text-[8px] truncate">{species.name}</p> : <p className="text-gray-700 text-[8px] font-bold">???</p>}
        </div>
      </div>
      {owned && <div className="absolute top-1 right-1 text-[6px] font-black px-1 py-0.5 rounded leading-none" style={{ background: rc + '28', color: rc, border: `1px solid ${rc}55` }}>{SHORT[rarity]}</div>}
      {ownedCards.length > 1 && <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[6px] font-bold px-1 rounded leading-none">×{ownedCards.length}</div>}
      {hasShiny && <div className="absolute bottom-1 left-1 text-[8px] leading-none">✨</div>}
      {isNew && owned && <div className="absolute top-1 left-1 bg-yellow-400 text-black text-[6px] font-black px-1 py-0.5 rounded leading-none">NEW</div>}
      {owned && hasHolo && (
        <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ background: 'linear-gradient(135deg,transparent 25%,rgba(255,255,255,0.14) 50%,transparent 75%)', backgroundSize: '300% 300%', animation: 'shimmer 3s linear infinite' }} />
      )}
    </button>
  )
}

function DetailModal({ species, cards, onClose, onFuse }) {
  const rarity = speciesRarity(species)
  const rc = rarityColor(rarity)
  const typeColor = TYPE_COLORS[species.types?.[0]] || '#1e293b'
  const trait = getTrait(species.id, species.types)
  const cost = starterCost(species)
  const hasShiny = cards.some(c => c.shiny)
  const hasHolo = cards.some(c => c.holo)
  const plainCount = cards.filter(c => !c.shiny).length
  const canFuse = plainCount >= 3

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-5" onClick={onClose}>
      <div className="w-full max-w-xs" onClick={e => e.stopPropagation()}>
        <div className="relative rounded-2xl overflow-hidden p-4" style={{ background: `linear-gradient(160deg,${typeColor}cc 0%,#0f172a 100%)`, border: `2px solid ${rc}88`, boxShadow: `0 0 40px ${rc}44` }}>
          <div className="absolute top-0 inset-x-0 h-1" style={{ background: `linear-gradient(90deg,transparent,${rc},transparent)` }} />
          {hasHolo && <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: 'linear-gradient(135deg,transparent 20%,rgba(255,255,255,0.16) 50%,transparent 80%)', backgroundSize: '300% 300%', animation: 'shimmer 2.4s linear infinite', mixBlendMode: 'overlay' }} />}

          <div className="flex items-center gap-3 relative z-10">
            <img src={hasShiny ? sprite(species.id, true) : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${species.id}.png`}
              alt={species.name} className="w-20 h-20 object-contain drop-shadow-xl flex-shrink-0"
              onError={e => { e.target.src = sprite(species.id, hasShiny) }} />
            <div className="min-w-0">
              <p className="text-gray-400 text-[10px]">#{String(species.id).padStart(3, '0')}</p>
              <p className="text-white font-bold text-base leading-tight">{species.name}</p>
              <div className="flex gap-1 mt-1 flex-wrap">{species.types.map(t => <TypeBadge key={t} type={t} size="xs" />)}</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap mt-3 relative z-10">
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ color: rc, background: rc + '22', border: `1px solid ${rc}55` }}>{rarityLabel(rarity)}</span>
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">💠 {cost} pt{cost > 1 ? 's' : ''}</span>
            {hasShiny && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300">✨ Shiny</span>}
            {hasHolo && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-fuchsia-400/20 text-fuchsia-300">🌈 Holo</span>}
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-black/40 text-gray-300">×{cards.length}</span>
          </div>

          <div className="mt-3 relative z-10">
            <StatBars stats={species.stats} accent={rc} />
          </div>

          <div className="mt-2.5 rounded-lg bg-black/30 p-2 relative z-10">
            <p className="text-[10px] font-bold" style={{ color: typeColor }}>{trait.emoji} {trait.name}</p>
            <p className="text-[9px] text-gray-400 leading-snug">{trait.desc}</p>
          </div>

          <button onClick={onClose} className="w-full mt-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-xs font-bold transition-all relative z-10">Fermer</button>
        </div>

        {/* Fusion: 3 plain copies → 1 shiny (holo if eligible) */}
        {canFuse && (
          <button onClick={() => onFuse(species.id)}
            className="w-full mt-3 flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 border transition-all active:scale-95"
            style={{ background: 'linear-gradient(110deg, #1e293b, #3b1d4d)', borderColor: '#eab30888' }}>
            <span className="text-[11px] font-bold text-white">Fusionner ×3 normales</span>
            <span className="text-[11px] font-black text-yellow-300">→ ✨ {isHoloEligible(species) ? 'Shiny Holo' : 'Shiny'}</span>
          </button>
        )}
      </div>
    </div>
  )
}

export default function CollectionScreen() {
  const { collection, navigate, newCardUids, clearNewCards, fuseSpecies } = useGameStore()
  const [typeFilter, setTypeFilter] = useState(null)
  const [showOwned, setShowOwned] = useState(false)
  const [detailId, setDetailId] = useState(null)
  const [toast, setToast] = useState(null)
  const species = allSpecies()

  const ownedBySpecies = useMemo(() => { const map = {}; collection.forEach(c => { (map[c.id] ||= []).push(c) }); return map }, [collection])
  const newSpeciesIds = useMemo(() => { const uids = new Set(newCardUids || []); const ids = new Set(); collection.forEach(c => { if (uids.has(c.uid)) ids.add(c.id) }); return ids }, [collection, newCardUids])
  const ownedCount = useMemo(() => Object.keys(ownedBySpecies).length, [ownedBySpecies])
  const filtered = useMemo(() => { let list = species; if (typeFilter) list = list.filter(s => s.types.includes(typeFilter)); if (showOwned) list = list.filter(s => ownedBySpecies[s.id]?.length > 0); return list }, [species, typeFilter, showOwned, ownedBySpecies])

  function handleSlotClick(sp, cards) { setDetailId(sp.id); if (clearNewCards) clearNewCards(cards.map(c => c.uid)) }
  function handleFuse(speciesId) {
    const res = fuseSpecies(speciesId)
    if (res) { setToast(`✨ Fusion réussie → ${res === 'shiny+holo' ? 'Shiny Holo' : 'Shiny'} !`); setTimeout(() => setToast(null), 1800) }
  }

  const detailSp = detailId ? speciesById(detailId) : null
  const detailCards = detailId ? (ownedBySpecies[detailId] || []) : []

  return (
    <div className="min-h-screen bg-game-bg flex flex-col">
      {toast && <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-black/85 text-white text-xs font-bold px-4 py-2 rounded-full">{toast}</div>}
      {detailSp && detailCards.length > 0 && <DetailModal species={detailSp} cards={detailCards} onClose={() => setDetailId(null)} onFuse={handleFuse} />}

      <div className="bg-game-surface border-b border-game-border px-4 pt-10 pb-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div><h2 className="font-game text-sm text-white">Pokédex</h2><p className="text-xs text-gray-500">{ownedCount} / {species.length} capturés</p></div>
            <button onClick={() => navigate('runsetup')} className="px-3 py-1.5 bg-red-600/80 hover:bg-red-500 text-white text-xs font-bold rounded-lg">⚔️ Expédition</button>
          </div>
          <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden mb-3">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(ownedCount / Math.max(species.length, 1)) * 100}%`, background: 'linear-gradient(90deg,#dc2626,#f97316)' }} />
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={() => setShowOwned(!showOwned)} className={`flex-shrink-0 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${showOwned ? 'bg-red-600 border-red-500 text-white' : 'border-gray-700 text-gray-500 hover:border-gray-500'}`}>{showOwned ? '✓ Obtenus' : 'Tous'}</button>
            <div className="flex-1 overflow-x-auto scrollbar-hide">
              <div className="flex gap-1.5 min-w-max py-0.5">
                {TYPE_FILTER_LIST.map(type => (
                  <button key={type} onClick={() => setTypeFilter(typeFilter === type ? null : type)} title={type} className="flex-shrink-0 w-5 h-5 rounded-full transition-all"
                    style={{ background: TYPE_COLORS[type] + (typeFilter === type ? 'ff' : '55'), border: `2px solid ${typeFilter === type ? TYPE_COLORS[type] : 'transparent'}`, transform: typeFilter === type ? 'scale(1.25)' : 'scale(1)' }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 max-w-lg mx-auto w-full">
        <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5 pb-20">
          {filtered.map(sp => <DexSlot key={sp.id} species={sp} ownedCards={ownedBySpecies[sp.id] || []} isNew={newSpeciesIds.has(sp.id)} onClick={handleSlotClick} />)}
        </div>
      </div>
    </div>
  )
}
