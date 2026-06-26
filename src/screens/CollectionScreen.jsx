import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { allSpecies, speciesById } from '../data/pokemon.js'
import { speciesRarity, rarityColor, rarityLabel, rarityTier, starterCost, isHoloEligible } from '../data/cardModel.js'
import { getTrait } from '../data/signatureTraits.js'
import { TYPE_COLORS, TYPE_LABELS_FR, effectiveness } from '../data/types.js'
import { frName } from '../data/frenchNames.js'
import { CT_BY_ID, canLearnCT } from '../data/ct.js'
import { buildMoveset, movesetSize, moveDamage, guardValue, healValue } from '../engine/combatEngine.js'
import StatBars from '../components/StatBars.jsx'
import TypeBadge from '../components/TypeBadge.jsx'

const MOVE_KIND_ICON = { attack: '⚔️', guard: '🛡️', heal: '➕', drain: '🌿', status: '✨', buff: '💪' }
const MOVE_KIND_LABEL = { attack: 'Attaque', guard: 'Bouclier', heal: 'Soin', drain: 'Drain', status: 'Statut', buff: 'Boost' }

const ALL_TYPES = Object.keys(TYPE_LABELS_FR)
const GENERIC_CASTER = { id: 1, types: ['normal'], rarity: 'common' }
const FAKE_ENEMY = { types: ['normal'], stats: { def: 50, spDef: 50 } }

// Computed display value of a move for a given caster (vs a neutral enemy).
function moveValueLabel(move, caster) {
  const c = caster || GENERIC_CASTER
  try {
    if (move.kind === 'attack' || move.kind === 'drain') {
      const { dmg } = moveDamage(move, c, FAKE_ENEMY, {})
      const rows = [{ label: `-${Math.round(dmg)}`, color: '#f87171' }]
      if (move.kind === 'drain') rows.push({ label: `+${Math.round(healValue(move, c, {}))}`, color: '#4ade80' })
      return rows
    }
    if (move.kind === 'heal') return [{ label: `+${Math.round(healValue(move, c, {}))}`, color: '#4ade80' }]
    if (move.kind === 'guard') return [{ label: `🛡️${guardValue(move, c, {})}`, color: '#38bdf8' }]
    if (move.kind === 'buff') return [{ label: `+${Math.round((move.bonus || 0.7) * 100)}%`, color: '#f97316' }]
  } catch {}
  return []
}

// Offensive type coverage: which defending types this attack is strong / weak / null against.
function offensiveMatchups(type) {
  const strong = [], weak = [], immune = []
  for (const t of ALL_TYPES) {
    const e = effectiveness(type, [t])
    if (e === 0) immune.push(t)
    else if (e > 1) strong.push(t)
    else if (e < 1) weak.push(t)
  }
  return { strong, weak, immune }
}

// Reusable detailed attack/CT card. When `ct` is set, shows a learn/detach flow.
function AttackDetailCard({ move, caster, ct, compatibleOwned, holder, onLearn, onDetach, onClose }) {
  const [picking, setPicking] = useState(false)
  const tc = TYPE_COLORS[move.type] || '#64748b'
  const values = moveValueLabel(move, caster)
  const isOffensive = move.kind === 'attack' || move.kind === 'drain'
  const mu = isOffensive ? offensiveMatchups(move.type) : null

  const typeRow = (label, types, color) => (
    <div className="flex items-start gap-2 mb-1.5">
      <span className="text-[9px] font-black uppercase tracking-wide w-20 flex-shrink-0 pt-1" style={{ color }}>{label}</span>
      <div className="flex flex-wrap gap-1">
        {types.length === 0 ? <span className="text-[9px] text-gray-600 pt-1">—</span>
          : types.map(t => <TypeBadge key={t} type={t} size="img" />)}
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-2xl overflow-y-auto p-4"
        style={{ background: `linear-gradient(160deg, ${tc}26, #0a0a14 70%)`, border: `2px solid ${tc}88`, maxHeight: '86vh', boxShadow: `0 0 40px ${tc}44` }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            {ct && <span className="text-base flex-shrink-0">💿</span>}
            <span className="text-xl flex-shrink-0">{move.emoji || MOVE_KIND_ICON[move.kind]}</span>
            <div className="min-w-0">
              <p className="font-black text-white text-base leading-tight truncate">{move.name}</p>
              <p className="text-[10px] font-bold" style={{ color: tc }}>{TYPE_LABELS_FR[move.type] || move.type} · {MOVE_KIND_LABEL[move.kind] || move.kind}</p>
            </div>
          </div>
          <TypeBadge type={move.type} size="img" />
        </div>

        {/* Value */}
        {values.length > 0 && (
          <div className="flex items-center gap-3 mb-3">
            {values.map((v, i) => (
              <span key={i} className="text-2xl font-black tabular-nums" style={{ color: v.color }}>{v.label}</span>
            ))}
            {!caster && <span className="text-[9px] text-gray-500 self-center">valeur de base</span>}
          </div>
        )}

        {/* Description */}
        {move.desc && <p className="text-[11px] text-gray-300 leading-relaxed mb-3">{move.desc}</p>}

        {/* Type effectiveness */}
        <div className="rounded-xl bg-black/30 p-2.5 mb-3 border border-white/5">
          <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mb-2">Efficacité de type</p>
          {isOffensive ? (
            <>
              {typeRow('Fort contre', mu.strong, '#4ade80')}
              {typeRow('Faible contre', mu.weak, '#f87171')}
              {mu.immune.length > 0 && typeRow('Sans effet', mu.immune, '#94a3b8')}
            </>
          ) : (
            <p className="text-[10px] text-gray-400 leading-snug">Capacité de soutien — non affectée par les types.</p>
          )}
        </div>

        {/* CT learn / detach flow */}
        {ct && (
          <div className="mb-2">
            {holder ? (
              <div className="flex items-center gap-2 rounded-xl bg-purple-900/30 border border-purple-700/40 p-2.5">
                <img src={sprite(holder.id, false)} alt={holder.name} className="w-10 h-10 object-contain pixelated" />
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-purple-300 uppercase font-bold">Apprise par</p>
                  <p className="text-[12px] font-black text-white truncate">{frName(holder.id, holder.name)}</p>
                </div>
                <button onClick={onDetach} className="px-3 py-2 rounded-lg text-[11px] font-black bg-red-900/40 text-red-300 border border-red-700/40 active:scale-95">Retirer</button>
              </div>
            ) : !picking ? (
              <button onClick={() => setPicking(true)} disabled={compatibleOwned.length === 0}
                className="w-full py-3 rounded-xl font-black text-sm text-white transition-all active:scale-95 disabled:opacity-40"
                style={{ background: compatibleOwned.length ? `linear-gradient(90deg, ${tc}, #7c3aed)` : '#1e293b' }}>
                {compatibleOwned.length ? '💿 Apprendre' : 'Aucun Pokémon compatible possédé'}
              </button>
            ) : (
              <div>
                <p className="text-[10px] text-cyan-300 font-bold mb-2">Choisis un Pokémon compatible :</p>
                <div className="grid grid-cols-3 gap-2 max-h-44 overflow-y-auto">
                  {compatibleOwned.map(sp => (
                    <button key={sp.id} onClick={() => onLearn(sp.id)}
                      className="flex flex-col items-center rounded-lg p-1.5 border active:scale-95 transition-all"
                      style={{ background: '#0f172a', borderColor: '#22d3ee66' }}>
                      <img src={sprite(sp.id, false)} alt={sp.name} className="w-10 h-10 object-contain pixelated" />
                      <p className="text-[7px] text-gray-300 font-bold text-center truncate w-full mt-0.5">{frName(sp.id, sp.name)}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <button onClick={onClose} className="w-full mt-2 py-2 rounded-xl font-black text-sm text-white bg-white/10 hover:bg-white/20 transition-all">Fermer</button>
      </div>
    </div>
  )
}

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
          alt={owned ? frName(species.id, species.name) : '???'}
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

const DIAMOND_COSTS = [0, 15, 30, 50, 80]

function DetailModal({ species, cards, cardLevel, attachedCT, onClose, onFuse, onLevelUp, onLevelUpDiamonds, crystals }) {
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
  const [viewShiny, setViewShiny] = useState(hasShiny)
  const [moveCard, setMoveCard] = useState(null)   // clicked attack → detail card

  // Full signature moveset this Pokémon can use in combat, including its attached CT.
  const synthMon = {
    uid: `dex-${species.id}`, id: species.id, name: frName(species.id, species.name),
    types: species.types, rarity, shiny: viewShiny, holo: hasHolo,
    learnedCTs: attachedCT ? [attachedCT.id] : [],
  }
  const moveCount = movesetSize(synthMon)
  const moves = buildMoveset(synthMon).slice(0, moveCount)

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-5" onClick={onClose}>
      <div className="w-full max-w-xs" onClick={e => e.stopPropagation()}>
        <div className="relative rounded-2xl overflow-hidden p-4" style={{ background: `linear-gradient(160deg,${typeColor}cc 0%,#0f172a 100%)`, border: `2px solid ${rc}88`, boxShadow: `0 0 40px ${rc}44` }}>
          <div className="absolute top-0 inset-x-0 h-1" style={{ background: `linear-gradient(90deg,transparent,${rc},transparent)` }} />
          {hasHolo && <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: 'linear-gradient(135deg,transparent 20%,rgba(255,255,255,0.16) 50%,transparent 80%)', backgroundSize: '300% 300%', animation: 'shimmer 2.4s linear infinite', mixBlendMode: 'overlay' }} />}

          <div className="flex items-center gap-3 relative z-10">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <img
                src={viewShiny ? sprite(species.id, true) : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${species.id}.png`}
                alt={frName(species.id, species.name)}
                className="w-20 h-20 object-contain drop-shadow-xl"
                onError={e => { e.target.src = sprite(species.id, viewShiny) }}
              />
              {hasShiny && (
                <button onClick={() => setViewShiny(v => !v)}
                  className="px-2 py-0.5 rounded-full text-[9px] font-black transition-all"
                  style={{ background: viewShiny ? '#ffd70033' : '#33415533', color: viewShiny ? '#fbbf24' : '#94a3b8', border: `1px solid ${viewShiny ? '#fbbf2466' : '#475569'}` }}>
                  {viewShiny ? '✨ Shiny' : '◇ Normal'}
                </button>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-gray-400 text-[10px]">#{String(species.id).padStart(3, '0')}</p>
              <div className="flex items-center gap-2">
                <p className="text-white font-bold text-base leading-tight">{frName(species.id, species.name)}</p>
                <span className="text-xs font-black text-gray-300">Nv.{level}</span>
                {canLevelUp ? (
                  <button onClick={onLevelUp} className="text-[9px] font-black px-1.5 py-0.5 rounded-lg bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 hover:bg-yellow-500/30 active:scale-95 transition-all">
                    ▲ Lvl
                  </button>
                ) : level < 5 ? (
                  <button onClick={onLevelUpDiamonds} disabled={(crystals ?? 0) < DIAMOND_COSTS[level]} className="text-[9px] font-black px-1.5 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 active:scale-95 transition-all disabled:opacity-40">
                    ▲ {DIAMOND_COSTS[level]} 💎
                  </button>
                ) : null}
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

          {/* All combat moves this Pokémon knows — tap for the detailed card */}
          <div className="mt-2.5 relative z-10">
            <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mb-1.5">Attaques ({moves.length}) · appuie pour les détails</p>
            <div className="space-y-1">
              {moves.map((mv, i) => {
                const mc = TYPE_COLORS[mv.type] || '#64748b'
                const vals = moveValueLabel(mv, synthMon)
                return (
                  <button key={i} onClick={() => setMoveCard(mv)}
                    className="w-full flex items-center gap-2 rounded-lg p-1.5 border text-left active:scale-[0.99] transition-all"
                    style={{ background: mc + '14', borderColor: mc + '44' }}>
                    {mv.fromCT && <span className="text-[10px] flex-shrink-0">💿</span>}
                    <span className="text-sm flex-shrink-0">{mv.emoji || MOVE_KIND_ICON[mv.kind]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[10px] font-black text-white truncate">{mv.name}</p>
                        <span className="text-[7px] font-bold rounded px-1 flex-shrink-0" style={{ background: mc + '33', color: mc }}>{mv.type?.toUpperCase().slice(0, 3)}</span>
                      </div>
                      <p className="text-[8px] text-gray-400 leading-snug truncate">{mv.desc}</p>
                    </div>
                    {vals.length > 0 ? (
                      <span className="flex items-center gap-1 flex-shrink-0">
                        {vals.map((v, k) => <span key={k} className="text-[10px] font-black tabular-nums" style={{ color: v.color }}>{v.label}</span>)}
                      </span>
                    ) : (
                      <span className="text-[7px] font-bold text-gray-500 flex-shrink-0">{MOVE_KIND_LABEL[mv.kind]}</span>
                    )}
                    <span className="text-gray-500 text-[10px] flex-shrink-0">›</span>
                  </button>
                )
              })}
            </div>
            <p className="text-[8px] text-gray-600 mt-1.5">Pour apprendre une CT, ouvre <span className="text-purple-400 font-bold">💿 Mes CT</span> depuis le Pokédex.</p>
          </div>

          {/* Move detail card */}
          {moveCard && (
            <AttackDetailCard move={moveCard} caster={synthMon} onClose={() => setMoveCard(null)} />
          )}

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
  const { collection, navigate, newCardUids, clearNewCards, fuseSpecies, cardLevels, levelUpCard, levelUpCardWithDiamonds, crystals, scrollToNew, setScrollToNew, ctInventory, attachedCTs, attachCT, detachCT } = useGameStore()
  const [genFilter, setGenFilter] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [detailId, setDetailId] = useState(null)
  const [toast, setToast] = useState(null)
  const [showCTView, setShowCTView] = useState(false)
  const [ctCardId, setCtCardId] = useState(null)   // CT id opened as a detail card
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

  function handleLevelUpDiamonds() {
    if (!detailId) return
    const newLevel = levelUpCardWithDiamonds(detailId)
    if (newLevel) {
      setToast(`💎 ${speciesById(detailId)?.name} passe au niveau ${newLevel} !`)
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
          onClose={() => setDetailId(null)}
          onFuse={handleFuse}
          onLevelUp={handleLevelUp}
          onLevelUpDiamonds={handleLevelUpDiamonds}
          crystals={crystals}
        />
      )}

      <div className="bg-game-surface border-b border-game-border px-4 pt-10 pb-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-game text-sm text-white">Pokédex</h2>
              <p className="text-xs text-gray-500">{ownedCount} / {species.length} capturés</p>
            </div>
            <button onClick={() => setShowCTView(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black bg-purple-900/40 border border-purple-700/50 text-purple-300 hover:bg-purple-800/50 active:scale-95 transition-all">
              💿 Mes CT ({ctInventory?.length || 0})
            </button>
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

      {/* ── "Mes CT" overlay ─────────────────────────────────────── */}
      {showCTView && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(8,8,16,0.96)' }}>
          <div className="flex items-center justify-between px-4 pt-10 pb-3 border-b border-white/10">
            <p className="font-game text-white text-sm">💿 Mes Capsules Techniques</p>
            <button onClick={() => setShowCTView(false)}
              className="text-gray-400 hover:text-white text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full bg-white/10">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {(!ctInventory || ctInventory.length === 0) ? (
              <p className="text-center text-xs text-gray-500 mt-10">Aucune CT dans ton inventaire. Les CT méta s'obtiennent dans les boosters.</p>
            ) : (() => {
              // Reverse-map attachedCTs: ctId → speciesId
              const ctToSpecies = {}
              Object.entries(attachedCTs || {}).forEach(([spId, ctId]) => { ctToSpecies[ctId] = Number(spId) })
              // Group by ctId → count
              const ctCounts = ctInventory.reduce((acc, id) => { acc[id] = (acc[id] || 0) + 1; return acc }, {})
              return (
                <div className="space-y-2">
                  {Object.entries(ctCounts).map(([id, n]) => {
                    const ct = CT_BY_ID[id]
                    if (!ct) return null
                    const tc = TYPE_COLORS[ct.type] || '#64748b'
                    const holderSpId = ctToSpecies[id]
                    const holderSp = holderSpId ? speciesById(holderSpId) : null
                    return (
                      <button key={id} onClick={() => setCtCardId(id)}
                        className="w-full flex items-center gap-3 rounded-xl p-2.5 border text-left active:scale-[0.99] transition-all"
                        style={{ background: tc + '14', borderColor: tc + '33' }}>
                        <span className="text-xl flex-shrink-0">💿</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="text-[11px] font-black text-white">{ct.name}</p>
                            <span className="text-[7px] font-bold rounded px-1" style={{ background: tc + '33', color: tc }}>{ct.type?.toUpperCase().slice(0, 3)}</span>
                            {n > 1 && <span className="text-[9px] text-gray-400">×{n}</span>}
                          </div>
                          <p className="text-[8px] text-gray-400 truncate">{ct.desc}</p>
                        </div>
                        {holderSp ? (
                          <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                            <img src={sprite(holderSp.id, false)} alt={holderSp.name} className="w-9 h-9 object-contain pixelated" />
                            <p className="text-[7px] text-purple-300 text-center">{frName(holderSp.id, holderSp.name)}</p>
                          </div>
                        ) : (
                          <span className="text-[8px] text-gray-600 flex-shrink-0 italic">libre</span>
                        )}
                        <span className="text-gray-500 text-[11px] flex-shrink-0">›</span>
                      </button>
                    )
                  })}
                </div>
              )
            })()}
          </div>

          {/* CT detail card with learn / detach flow */}
          {ctCardId && (() => {
            const ct = CT_BY_ID[ctCardId]
            if (!ct) return null
            const holderSpId = Object.entries(attachedCTs || {}).find(([, cid]) => cid === ctCardId)?.[0]
            const holder = holderSpId ? speciesById(Number(holderSpId)) : null
            const compatibleOwned = Object.keys(ownedBySpecies)
              .map(id => speciesById(Number(id)))
              .filter(sp => sp && canLearnCT(sp, ct))
            const move = { ...ct, key: 'ctcard', ownerId: 1, ownerRarity: 'common' }
            return (
              <AttackDetailCard
                move={move}
                ct={ct}
                holder={holder}
                compatibleOwned={compatibleOwned}
                onLearn={(spId) => { attachCT(spId, ctCardId); setCtCardId(null) }}
                onDetach={() => { if (holder) detachCT(holder.id); setCtCardId(null) }}
                onClose={() => setCtCardId(null)}
              />
            )
          })()}
        </div>
      )}
    </div>
  )
}
