import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { allSpecies, speciesById } from '../data/pokemon.js'
import { speciesRarity, rarityColor, rarityLabel, rarityTier, starterCost, isHoloEligible } from '../data/cardModel.js'
import { getTrait } from '../data/signatureTraits.js'
import { TYPE_COLORS } from '../data/types.js'
import { frName } from '../data/frenchNames.js'
import { CT_BY_ID } from '../data/ct.js'
import StatBars from '../components/StatBars.jsx'
import TypeBadge from '../components/TypeBadge.jsx'

const GEN_RANGES = {
  1: [1, 151], 2: [152, 251], 3: [252, 386], 4: [387, 493],
  5: [494, 649], 6: [650, 721], 7: [722, 809], 8: [810, 905], 9: [906, 1010],
}

const TYPE_ICONS = {
  fire: '🔥', water: '💧', grass: '🌿', electric: '⚡', psychic: '🔮',
  fighting: '👊', ghost: '👻', ice: '❄️', dragon: '🐉', dark: '🌑',
  rock: '🪨', ground: '🏜️', flying: '🌪️', bug: '🐛', poison: '☠️',
  fairy: '🌸', steel: '⚙️', normal: '⚪',
}

const STAT_BONUS_PER_LEVEL = 3

const sprite = (id, shiny) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${shiny ? 'shiny/' : ''}${id}.png`

function DexSlot({ species, ownedCards, isNew, onClick, cardRef }) {
  const owned = ownedCards.length > 0
  const rarity = speciesRarity(species)
  const rc = rarityColor(rarity)
  const hasShiny = ownedCards.some(c => c.shiny)
  const hasHolo = ownedCards.some(c => c.holo)
  const typeColor = owned ? (TYPE_COLORS[species.types?.[0]] || '#1e293b') : '#111827'
  return (
    <button
      ref={cardRef}
      onClick={() => owned && onClick(species, ownedCards)}
      className={`relative overflow-hidden rounded-xl transition-all duration-150 ${owned ? 'cursor-pointer hover:-translate-y-0.5 hover:scale-[1.06] active:scale-95' : 'cursor-default'}`}
      style={{
        aspectRatio: '2/3',
        background: owned
          ? `linear-gradient(165deg, ${rc}44 0%, ${typeColor}33 55%, #0f172a 100%)`
          : 'linear-gradient(165deg, #1e293b 0%, #0f172a 100%)',
        border: owned ? `1.5px solid ${rc}55` : '1.5px solid #1e293b',
        boxShadow: owned && rarityTier(rarity) >= 3 ? `0 0 8px ${rc}66` : '',
      }}
    >
      {owned && <div className="absolute top-0 inset-x-0 h-0.5" style={{ background: rc }} />}
      <div className="flex flex-col items-center justify-between h-full p-1.5">
        {owned
          ? <span className="text-[7px] text-white font-bold self-end">#{String(species.id).padStart(3, '0')}</span>
          : <span className="text-[6px] text-gray-700 font-mono self-end">#{String(species.id).padStart(3, '0')}</span>
        }
        <img
          src={sprite(species.id, hasShiny)}
          alt={owned ? species.name : '???'}
          className="w-12 h-12 object-contain pixelated"
          style={owned ? {} : { filter: 'brightness(0)', opacity: 0.1 }}
          loading="lazy"
          onError={e => { e.target.src = sprite(species.id, false) }}
        />
        <div className="w-full text-center leading-none">
          {owned
            ? <p className="text-white font-bold text-[8px] truncate">{frName(species.id, species.name)}</p>
            : <p className="text-gray-700 text-[8px] font-bold">???</p>
          }
        </div>
      </div>
      {ownedCards.length > 1 && <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[6px] font-bold px-1 rounded leading-none">×{ownedCards.length}</div>}
      {hasShiny && <div className="absolute bottom-1 left-1 text-[8px] leading-none">✨</div>}
      {isNew && owned && <span className="absolute top-1 left-1 text-sm leading-none" style={{ zIndex: 1 }}>⭐</span>}
      {owned && hasHolo && (
        <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ background: 'linear-gradient(135deg,transparent 25%,rgba(255,255,255,0.14) 50%,transparent 75%)', backgroundSize: '300% 300%', animation: 'shimmer 3s linear infinite' }} />
      )}
    </button>
  )
}

function DetailModal({ species, cards, cardLevel, attachedCT, ctInventory, onClose, onFuse, onLevelUp, onAttachCT, onDetachCT }) {
  const rarity = speciesRarity(species)
  const rc = rarityColor(rarity)
  const typeColor = TYPE_COLORS[species.types?.[0]] || '#1e293b'
  const trait = getTrait(species.id, species.types)
  const cost = starterCost(species)
  const hasShiny = cards.some(c => c.shiny)
  const hasHolo = cards.some(c => c.holo)
  const plainCount = cards.filter(c => !c.shiny).length
  const canFuse = plainCount >= 3
  const level = cardLevel || 1
  const canLevelUp = level < 5 && plainCount >= 2
  const bonus = (level - 1) * STAT_BONUS_PER_LEVEL
  const bonusStats = bonus > 0
    ? Object.fromEntries(Object.keys(species.stats).map(k => [k, bonus]))
    : {}

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-5" onClick={onClose}>
      <div className="w-full max-w-xs" onClick={e => e.stopPropagation()}>
        <div className="relative rounded-2xl overflow-hidden p-4" style={{ background: `linear-gradient(160deg,${typeColor}cc 0%,#0f172a 100%)`, border: `2px solid ${rc}88`, boxShadow: `0 0 40px ${rc}44` }}>
          <div className="absolute top-0 inset-x-0 h-1" style={{ background: `linear-gradient(90deg,transparent,${rc},transparent)` }} />
          {hasHolo && <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: 'linear-gradient(135deg,transparent 20%,rgba(255,255,255,0.16) 50%,transparent 80%)', backgroundSize: '300% 300%', animation: 'shimmer 2.4s linear infinite', mixBlendMode: 'overlay' }} />}

          <div className="flex items-center gap-3 relative z-10">
            <img
              src={hasShiny ? sprite(species.id, true) : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${species.id}.png`}
              alt={species.name}
              className="w-20 h-20 object-contain drop-shadow-xl flex-shrink-0"
              onError={e => { e.target.src = sprite(species.id, hasShiny) }}
            />
            <div className="min-w-0">
              <p className="text-gray-400 text-[10px]">#{String(species.id).padStart(3, '0')}</p>
              <div className="flex items-center gap-2">
                <p className="text-white font-bold text-base leading-tight">{frName(species.id, species.name)}</p>
                <span className="text-xs font-black text-gray-300">Nv.{level}</span>
                {canLevelUp && (
                  <button onClick={onLevelUp} className="text-[9px] font-black px-1.5 py-0.5 rounded-lg bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 hover:bg-yellow-500/30 active:scale-95 transition-all">
                    ▲ Lvl
                  </button>
                )}
              </div>
              <div className="flex gap-1 mt-1 flex-wrap">
                {species.types.map(t => (
                  <span key={t} title={t} className="w-5 h-5 rounded-full flex items-center justify-center text-xs" style={{ background: (TYPE_COLORS[t] || '#666') + '44', border: `1px solid ${TYPE_COLORS[t] || '#666'}88` }}>
                    {TYPE_ICONS[t] || '?'}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap mt-3 relative z-10">
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full text-black" style={{ background: rc }}>{rarityLabel(rarity)}</span>
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">💠 {cost} pt{cost > 1 ? 's' : ''}</span>
            {hasShiny && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300">✨ Shiny</span>}
            {hasHolo && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-fuchsia-400/20 text-fuchsia-300">🌈 Holo</span>}
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-black/40 text-gray-300">×{cards.length}</span>
          </div>

          <div className="mt-3 relative z-10">
            <StatBars stats={species.stats} accent={rc} bonusStats={bonusStats} />
          </div>

          <div className="mt-2.5 rounded-lg bg-black/30 p-2 relative z-10">
            <p className="text-[10px] font-bold" style={{ color: typeColor }}>{trait.emoji} {trait.name}</p>
            <p className="text-[9px] text-gray-400 leading-snug">{trait.desc}</p>
          </div>

          {/* CT slot */}
          <div className="mt-2.5 relative z-10">
            <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mb-1.5">Capacité Technique</p>
            {attachedCT ? (
              <div className="flex items-center gap-2 rounded-lg bg-purple-900/30 border border-purple-700/40 p-2">
                <span className="text-lg">{attachedCT.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-purple-300">CT{attachedCT.num} {attachedCT.name}</p>
                  <p className="text-[8px] text-gray-500">{attachedCT.desc}</p>
                </div>
                <button onClick={onDetachCT} className="text-[9px] text-gray-500 hover:text-red-400 font-bold px-1.5 py-1 rounded active:scale-95">✕</button>
              </div>
            ) : (
              <div>
                <button
                  onClick={() => {}}
                  className="w-full py-2.5 rounded-lg border border-dashed border-gray-700 text-gray-600 text-[10px] font-bold transition-all hover:border-purple-600/50 hover:text-purple-400 active:scale-95"
                  disabled={!ctInventory?.length}
                  style={{ cursor: ctInventory?.length ? 'pointer' : 'not-allowed' }}
                >
                  {ctInventory?.length ? '+ Attacher une CT' : 'Aucune CT dans l\'inventaire'}
                </button>
                {ctInventory?.length > 0 && (
                  <div className="mt-1.5 space-y-1 max-h-28 overflow-y-auto">
                    {ctInventory.map((ctId, i) => {
                      const ct = CT_BY_ID[ctId]
                      if (!ct) return null
                      return (
                        <button key={i} onClick={() => onAttachCT(ctId)}
                          className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 bg-black/40 border border-gray-800 hover:border-purple-600/50 text-left active:scale-95 transition-all">
                          <span>{ct.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-black text-white">CT{ct.num} {ct.name}</p>
                            <p className="text-[7px] text-gray-500">{ct.desc}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <button onClick={onClose} className="w-full mt-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-xs font-bold transition-all relative z-10">Fermer</button>
        </div>

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
  const { collection, navigate, newCardUids, clearNewCards, fuseSpecies, cardLevels, levelUpCard, scrollToNew, setScrollToNew, ctInventory, attachedCTs, attachCT, detachCT } = useGameStore()
  const [genFilter, setGenFilter] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [detailId, setDetailId] = useState(null)
  const [toast, setToast] = useState(null)
  const scrollRef = useRef(null)
  const cardRefs = useRef({})
  const species = allSpecies()

  const ownedBySpecies = useMemo(() => {
    const map = {}
    collection.forEach(c => { (map[c.id] ||= []).push(c) })
    return map
  }, [collection])

  const newSpeciesIds = useMemo(() => {
    const uids = new Set(newCardUids || [])
    const ids = new Set()
    collection.forEach(c => { if (uids.has(c.uid)) ids.add(c.id) })
    return ids
  }, [collection, newCardUids])

  const ownedCount = useMemo(() => Object.keys(ownedBySpecies).length, [ownedBySpecies])

  const filtered = useMemo(() => {
    const [min, max] = GEN_RANGES[genFilter] || [1, 151]
    let list = species.filter(s => s.id >= min && s.id <= max)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter(s => s.name.toLowerCase().includes(q) || frName(s.id, '').toLowerCase().includes(q) || String(s.id).includes(q))
    }
    return list
  }, [species, genFilter, searchQuery])

  // Auto-scroll to new cards when scrollToNew flag is set
  useEffect(() => {
    if (!scrollToNew) return
    const newIds = [...newSpeciesIds]
    if (!newIds.length) { setScrollToNew(false); return }

    // Find which gen the first new card is in
    const firstNewId = newIds[0]
    for (const [g, [min, max]] of Object.entries(GEN_RANGES)) {
      if (firstNewId >= min && firstNewId <= max) { setGenFilter(Number(g)); break }
    }

    const timeoutId = setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })
      let delay = 400
      newIds.forEach(id => {
        setTimeout(() => {
          const el = cardRefs.current[id]
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, delay)
        delay += 700
      })
      setScrollToNew(false)
    }, 150)
    return () => clearTimeout(timeoutId)
  }, [scrollToNew]) // eslint-disable-line

  function handleSlotClick(sp, cards) {
    setDetailId(sp.id)
    if (clearNewCards) clearNewCards(cards.map(c => c.uid))
  }

  function handleFuse(speciesId) {
    const res = fuseSpecies(speciesId)
    if (res) {
      setToast(`✨ Fusion réussie → ${res === 'shiny+holo' ? 'Shiny Holo' : 'Shiny'} !`)
      setTimeout(() => setToast(null), 1800)
    }
  }

  function handleLevelUp() {
    if (!detailId) return
    const newLevel = levelUpCard(detailId)
    if (newLevel) {
      setToast(`⬆️ ${speciesById(detailId)?.name} passe au niveau ${newLevel} !`)
      setTimeout(() => setToast(null), 1800)
    }
  }

  const detailSp = detailId ? speciesById(detailId) : null
  const detailCards = detailId ? (ownedBySpecies[detailId] || []) : []

  const setCardRef = useCallback((id, el) => { cardRefs.current[id] = el }, [])

  return (
    <div className="min-h-screen bg-game-bg flex flex-col">
      {toast && <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-black/85 text-white text-xs font-bold px-4 py-2 rounded-full">{toast}</div>}
      {detailSp && detailCards.length > 0 && (
        <DetailModal
          species={detailSp}
          cards={detailCards}
          cardLevel={cardLevels?.[detailId] || 1}
          attachedCT={attachedCTs?.[detailId] ? CT_BY_ID[attachedCTs[detailId]] : null}
          ctInventory={ctInventory || []}
          onClose={() => setDetailId(null)}
          onFuse={handleFuse}
          onLevelUp={handleLevelUp}
          onAttachCT={(ctId) => attachCT(detailId, ctId)}
          onDetachCT={() => detachCT(detailId)}
        />
      )}

      <div className="bg-game-surface border-b border-game-border px-4 pt-10 pb-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-game text-sm text-white">Pokédex</h2>
              <p className="text-xs text-gray-500">{ownedCount} / {species.length} capturés</p>
            </div>
          </div>

          <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(ownedCount / Math.max(species.length, 1)) * 100}%`, background: 'linear-gradient(90deg,#dc2626,#f97316)' }} />
          </div>

          {/* Search bar */}
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher un Pokémon…"
            className="w-full bg-black/40 border border-gray-700 rounded-xl px-3 py-2 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-gray-500"
          />

          {/* Gen filter buttons */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
            {[1,2,3,4,5,6,7,8,9].map(g => {
              const unlocked = g === 1
              const active = genFilter === g
              return (
                <button
                  key={g}
                  onClick={() => unlocked && setGenFilter(g)}
                  disabled={!unlocked}
                  className="flex-shrink-0 text-[10px] font-black px-2.5 py-1 rounded-lg transition-all"
                  style={{
                    background: active ? '#dc2626' : '#0f172a',
                    color: active ? '#fff' : unlocked ? '#94a3b8' : '#374151',
                    border: `1.5px solid ${active ? '#dc2626' : '#1e293b'}`,
                    opacity: unlocked ? 1 : 0.5,
                  }}
                >
                  {unlocked ? `Gen ${g}` : `🔒 ${g}`}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 max-w-lg mx-auto w-full">
        <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5 pb-20">
          {filtered.map(sp => (
            <DexSlot
              key={sp.id}
              species={sp}
              ownedCards={ownedBySpecies[sp.id] || []}
              isNew={newSpeciesIds.has(sp.id)}
              onClick={handleSlotClick}
              cardRef={el => setCardRef(sp.id, el)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
