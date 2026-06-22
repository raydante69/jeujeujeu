import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useGameStore } from '../store/gameStore.js'
import TypeBadge from '../components/TypeBadge.jsx'
import { RARITIES } from '../engine/boosterAcquisition.js'

// Unified rarity display map (new + legacy keys)
const RARITY_STYLES = {
  common:       { color: '#9ca3af', bg: 'from-gray-700 to-gray-900',         label: 'Commune',      tier: 0,  foil: null,       particle: '·'   },
  uncommon:     { color: '#4ade80', bg: 'from-green-800 to-gray-900',         label: 'Peu Commune',  tier: 1,  foil: null,       particle: '✦'   },
  rare:         { color: '#60a5fa', bg: 'from-blue-800 to-gray-900',          label: 'Rare',         tier: 2,  foil: null,       particle: '★'   },
  reverse_holo: { color: '#93c5fd', bg: 'from-blue-700 to-indigo-900',        label: 'Reverse Holo', tier: 3,  foil: 'reverse',  particle: '✦★'  },
  holo_rare:    { color: '#c084fc', bg: 'from-purple-800 to-gray-900',        label: 'Rare Holo',    tier: 4,  foil: 'holo',     particle: '★'   },
  ex:           { color: '#fb923c', bg: 'from-orange-800 to-gray-900',        label: 'EX',           tier: 5,  foil: 'ex',       particle: '⬡'   },
  full_art:     { color: '#e879f9', bg: 'from-pink-800 to-purple-900',        label: 'Full Art',     tier: 6,  foil: 'full_art', particle: '◈'   },
  vmax:         { color: '#f43f5e', bg: 'from-rose-800 to-gray-900',          label: 'VMAX',         tier: 7,  foil: 'vmax',     particle: '▲'   },
  alt_art:      { color: '#a78bfa', bg: 'from-violet-700 to-purple-900',      label: 'Alt Art',      tier: 8,  foil: 'alt_art',  particle: '◆'   },
  rainbow:      { color: '#f0abfc', bg: 'from-purple-600 via-pink-600 to-blue-700', label: 'Rainbow Rare', tier: 9, foil: 'rainbow', particle: '🌈' },
  gold:         { color: '#fbbf24', bg: 'from-yellow-600 to-amber-900',       label: 'Gold Rare',    tier: 10, foil: 'gold',     particle: '✦'   },
  // Legacy
  holo:         { color: '#c084fc', bg: 'from-purple-800 to-gray-900',        label: 'Holographique',tier: 4,  foil: 'holo',     particle: '★'   },
  ultra:        { color: '#fb923c', bg: 'from-orange-800 to-gray-900',        label: 'Ultra Rare',   tier: 5,  foil: 'ex',       particle: '⬡'   },
  secret:       { color: '#f0abfc', bg: 'from-purple-600 via-pink-600 to-blue-700', label: 'Secret Rare', tier: 9, foil: 'rainbow', particle: '🌈' },
}

// Reactive holo overlay that follows mouse/touch position
function HoloOverlay({ foil, mx, my }) {
  if (!foil) return null
  const angle = `${((mx * 360 + my * 120) % 360).toFixed(1)}deg`
  const sx = `${(mx * 100).toFixed(1)}%`
  const sy = `${(my * 100).toFixed(1)}%`

  const configs = {
    reverse: {
      style: {
        background: `linear-gradient(${angle}, transparent 25%, rgba(255,255,255,0.14) 50%, transparent 75%)`,
        mixBlendMode: 'screen',
      },
    },
    holo: {
      style: {
        background: `
          radial-gradient(circle at ${sx} ${sy}, rgba(255,255,255,0.28) 0%, transparent 55%),
          linear-gradient(${angle},
            hsla(0,80%,72%,0.38) 0%, hsla(60,80%,72%,0.38) 16.66%,
            hsla(120,80%,72%,0.38) 33.33%, hsla(180,80%,72%,0.38) 50%,
            hsla(240,80%,72%,0.38) 66.66%, hsla(300,80%,72%,0.38) 83.33%,
            hsla(360,80%,72%,0.38) 100%)`,
        mixBlendMode: 'color-dodge',
      },
    },
    ex: {
      style: {
        background: `
          radial-gradient(circle at ${sx} ${sy}, rgba(255,255,255,0.38) 0%, transparent 50%),
          linear-gradient(${angle}, hsla(30,100%,65%,0.5) 0%, hsla(55,100%,65%,0.5) 33%,
            hsla(40,100%,65%,0.5) 66%, hsla(30,100%,65%,0.5) 100%)`,
        mixBlendMode: 'color-dodge',
      },
    },
    full_art: {
      style: {
        background: `
          radial-gradient(circle at ${sx} ${sy}, rgba(255,255,255,0.42) 0%, transparent 45%),
          linear-gradient(${angle}, hsla(280,90%,72%,0.52) 0%, hsla(320,90%,72%,0.52) 25%,
            hsla(200,90%,72%,0.52) 50%, hsla(260,90%,72%,0.52) 75%, hsla(300,90%,72%,0.52) 100%)`,
        mixBlendMode: 'color-dodge',
      },
    },
    vmax: {
      style: {
        background: `
          radial-gradient(circle at ${sx} ${sy}, rgba(255,255,255,0.42) 0%, transparent 45%),
          linear-gradient(${angle}, hsla(350,100%,65%,0.58) 0%, hsla(10,100%,65%,0.58) 33%,
            hsla(0,100%,65%,0.58) 66%, hsla(350,100%,65%,0.58) 100%)`,
        mixBlendMode: 'color-dodge',
      },
    },
    alt_art: {
      style: {
        background: `
          radial-gradient(circle at ${sx} ${sy}, rgba(255,255,255,0.48) 0%, transparent 42%),
          linear-gradient(${angle}, hsla(260,85%,72%,0.58) 0%, hsla(220,85%,72%,0.58) 25%,
            hsla(280,85%,72%,0.58) 50%, hsla(200,85%,72%,0.58) 75%, hsla(260,85%,72%,0.58) 100%)`,
        mixBlendMode: 'color-dodge',
      },
    },
    rainbow: {
      style: {
        background: `
          radial-gradient(circle at ${sx} ${sy}, rgba(255,255,255,0.65) 0%, transparent 38%),
          linear-gradient(${angle},
            hsla(0,100%,72%,0.68) 0%, hsla(45,100%,72%,0.68) 12.5%,
            hsla(90,100%,72%,0.68) 25%, hsla(135,100%,72%,0.68) 37.5%,
            hsla(180,100%,72%,0.68) 50%, hsla(225,100%,72%,0.68) 62.5%,
            hsla(270,100%,72%,0.68) 75%, hsla(315,100%,72%,0.68) 87.5%,
            hsla(360,100%,72%,0.68) 100%)`,
        mixBlendMode: 'color-dodge',
      },
    },
    gold: {
      style: {
        background: `linear-gradient(${angle},
          transparent 0%, rgba(251,191,36,0.42) 35%,
          rgba(255,255,200,0.92) 50%, rgba(251,191,36,0.42) 65%, transparent 100%)`,
        mixBlendMode: 'screen',
      },
    },
  }

  const cfg = configs[foil]
  if (!cfg) return null

  return (
    <div
      className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden z-20"
      style={cfg.style}
    />
  )
}

function CardReveal({ pokemon, onReveal, locked, isNew }) {
  const [flipped, setFlipped] = useState(false)
  const [mx, setMx] = useState(0.5)
  const [my, setMy] = useState(0.5)
  const [showFlash, setShowFlash] = useState(false)
  const cardRef = useRef(null)

  const rarity = pokemon.rarity || 'common'
  const style = RARITY_STYLES[rarity] || RARITY_STYLES.common
  const isUltra = style.tier >= 5

  const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`

  const updateMousePos = useCallback((clientX, clientY) => {
    if (!cardRef.current || !style.foil || !flipped) return
    const rect = cardRef.current.getBoundingClientRect()
    setMx(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)))
    setMy(Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)))
  }, [style.foil, flipped])

  const handleClick = () => {
    if (flipped || locked) return
    if (isUltra) {
      setShowFlash(true)
      setTimeout(() => setShowFlash(false), 750)
    }
    setFlipped(true)
    onReveal?.()
  }

  return (
    <>
      {showFlash && (
        <div
          className="fixed inset-0 z-50 pointer-events-none animate-screen-flash"
          style={{ background: `radial-gradient(ellipse at center, ${style.color}cc 0%, ${style.color}44 40%, transparent 70%)` }}
        />
      )}
      <div
        ref={cardRef}
        onClick={handleClick}
        onMouseMove={e => updateMousePos(e.clientX, e.clientY)}
        onTouchMove={e => e.touches[0] && updateMousePos(e.touches[0].clientX, e.touches[0].clientY)}
        className={`relative w-32 h-48 sm:w-40 sm:h-60 rounded-2xl select-none transition-transform duration-200
          ${!flipped && !locked ? 'cursor-pointer hover:scale-105 active:scale-95' : ''}
          ${locked && !flipped ? 'opacity-50' : ''}
        `}
        style={{ perspective: '600px' }}
      >
        <div
          className="w-full h-full transition-transform duration-500 ease-out"
          style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(0deg)' : 'rotateY(180deg)' }}
        >
          {/* Front (revealed) */}
          <div
            className={`absolute inset-0 rounded-2xl bg-gradient-to-b ${style.bg} border flex flex-col items-center justify-center gap-1.5 p-2.5 overflow-hidden`}
            style={{
              backfaceVisibility: 'hidden',
              borderColor: style.color + '80',
              boxShadow: flipped && style.foil
                ? `0 0 28px ${style.color}88, inset 0 0 18px ${style.color}22, 0 8px 32px rgba(0,0,0,0.6)`
                : flipped ? `0 8px 32px rgba(0,0,0,0.6)` : 'none',
            }}
          >
            {isNew && (
              <div className="absolute top-1.5 left-1.5 bg-yellow-400 text-black text-[7px] font-black px-1.5 py-0.5 rounded leading-none z-30">NEW</div>
            )}
            {style.tier >= 8 && (
              <div className="absolute top-1.5 right-1.5 text-[9px] z-30 animate-pulse" style={{ color: style.color }}>
                {style.particle}
              </div>
            )}

            <div className="text-[8px] font-black uppercase tracking-widest z-10" style={{ color: style.color }}>
              {style.particle} {style.label}
            </div>

            <div className="relative z-10">
              <img
                src={spriteUrl}
                alt={pokemon.name}
                className={`object-contain drop-shadow-lg ${style.tier >= 6 ? 'w-24 h-24 sm:w-28 sm:h-28' : 'w-20 h-20 sm:w-24 sm:h-24'}`}
                loading="lazy"
                onError={e => { e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png` }}
              />
            </div>

            <p className="text-white font-bold text-[11px] text-center z-10 leading-tight">{pokemon.name}</p>
            <p className="text-gray-400 text-[9px] z-10">Niv. {pokemon.level}</p>
            <div className="flex gap-1 flex-wrap justify-center z-10">
              {pokemon.types?.map(t => <TypeBadge key={t} type={t} size="xs" />)}
            </div>

            {/* Reactive holo overlay */}
            {flipped && <HoloOverlay foil={style.foil} mx={mx} my={my} />}
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-red-900 to-gray-900 border border-red-800/50 flex items-center justify-center"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="text-center">
              <div className="text-4xl mb-1.5">⚡</div>
              <p className="font-game text-[10px] text-red-400">Poké</p>
              <p className="font-game text-xs text-white">Booster</p>
            </div>
            <div className="absolute inset-0 rounded-2xl" style={{
              background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.02) 10px, rgba(255,255,255,0.02) 20px)',
            }} />
            {!locked && (
              <div className="absolute inset-0 rounded-2xl border-2 animate-pulse" style={{ borderColor: 'rgba(251,191,36,0.4)' }} />
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default function PackOpeningScreen() {
  const { pendingBoosters, clearPendingBoosters, addToCollection, navigate, collection } = useGameStore()
  const [phase, setPhase] = useState('pack') // 'pack'|'shaking'|'ripping'|'reveal'|'done'
  const [revealedCount, setRevealedCount] = useState(0)
  const [ownedAtOpen] = useState(() => new Set(collection.map(c => c.id)))

  const bestCard = pendingBoosters.reduce((best, c) => {
    const tierA = RARITY_STYLES[c.rarity]?.tier ?? 0
    const tierB = RARITY_STYLES[best?.rarity]?.tier ?? -1
    return tierA > tierB ? c : best
  }, null)
  const newCount = pendingBoosters.filter(c => !ownedAtOpen.has(c.id)).length

  useEffect(() => {
    if (!pendingBoosters.length) navigate('shop')
  }, []) // eslint-disable-line

  const handlePackTap = () => {
    if (phase !== 'pack') return
    setPhase('shaking')
    setTimeout(() => {
      setPhase('ripping')
      setTimeout(() => setPhase('reveal'), 580)
    }, 720)
  }

  const handleReveal = () => {
    const next = revealedCount + 1
    setRevealedCount(next)
    if (next >= pendingBoosters.length) {
      setTimeout(() => setPhase('done'), 600)
    }
  }

  const handleRevealAll = () => {
    setRevealedCount(pendingBoosters.length)
    setPhase('done')
  }

  const handleContinue = () => {
    addToCollection(pendingBoosters)
    clearPendingBoosters()
    navigate('collection')
  }

  const isMulti = pendingBoosters.length > 5
  const bestStyle = bestCard ? (RARITY_STYLES[bestCard.rarity] || RARITY_STYLES.common) : null

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'radial-gradient(ellipse at top, #1a0a2e 0%, #0a0a14 70%)' }}>
      {/* Header */}
      <div className="border-b border-game-border px-4 pt-10 pb-4 sticky top-0 z-10" style={{ background: 'rgba(15,15,25,0.9)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <h2 className="font-game text-sm text-white">{isMulti ? '×10 Boosters' : 'Booster'}</h2>
          {(phase === 'reveal' || phase === 'done') && (
            <span className="text-xs text-gray-400">
              {Math.min(revealedCount, pendingBoosters.length)}/{pendingBoosters.length} révélées
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-6 max-w-lg mx-auto w-full">

        {/* ── Pack view ── */}
        {(phase === 'pack' || phase === 'shaking' || phase === 'ripping') && (
          <div className="flex flex-col items-center gap-8 pt-8">
            <p className="text-sm text-gray-400 text-center">
              {phase === 'pack' ? 'Appuie sur le booster pour l\'ouvrir !' : ''}
            </p>

            <button
              onClick={handlePackTap}
              className={`relative w-44 h-64 rounded-2xl cursor-pointer select-none overflow-hidden
                ${phase === 'shaking' ? 'animate-pack-shake' : ''}
                ${phase === 'ripping' ? 'animate-pack-rip' : ''}
                ${phase === 'pack' ? 'hover:scale-105 active:scale-95 transition-transform' : ''}
              `}
              style={{
                background: 'linear-gradient(160deg, #7f1d1d 0%, #1f0a14 50%, #111827 100%)',
                border: '1px solid rgba(185,28,28,0.6)',
                boxShadow: '0 0 40px rgba(239,68,68,0.2), inset 0 0 30px rgba(0,0,0,0.4)',
              }}
            >
              {/* Pack artwork */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <div className="text-5xl drop-shadow-lg">⚡</div>
                <p className="font-game text-sm text-red-400 tracking-widest">POKÉ</p>
                <p className="font-game text-base text-white tracking-widest">BOOSTER</p>
                {isMulti && (
                  <div className="mt-2 bg-yellow-400 text-black text-[10px] font-black px-2 py-0.5 rounded">×10</div>
                )}
              </div>
              {/* Texture overlay */}
              <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{
                background: 'repeating-linear-gradient(45deg, transparent, transparent 12px, rgba(255,255,255,0.025) 12px, rgba(255,255,255,0.025) 24px)',
              }} />
              {/* Glow border */}
              {phase === 'pack' && (
                <div className="absolute inset-0 rounded-2xl animate-pulse" style={{ border: '2px solid rgba(251,191,36,0.3)' }} />
              )}
            </button>

            {phase === 'shaking' && (
              <p className="text-gray-500 text-sm animate-pulse">Ouverture…</p>
            )}
          </div>
        )}

        {/* ── Cards reveal ── */}
        {(phase === 'reveal' || phase === 'done') && (
          <>
            <div className={`grid gap-3 justify-items-center ${isMulti ? 'grid-cols-3 sm:grid-cols-5' : 'grid-cols-3 sm:grid-cols-5'}`}>
              {pendingBoosters.map((card, i) => (
                <CardReveal
                  key={card.uid}
                  pokemon={card}
                  isNew={!ownedAtOpen.has(card.id)}
                  locked={i > revealedCount}
                  onReveal={i === revealedCount ? handleReveal : undefined}
                />
              ))}
            </div>

            {/* Best pull banner */}
            {phase === 'done' && bestCard && bestStyle && (
              <div
                className="mt-6 rounded-2xl p-4 text-center border animate-burst-in"
                style={{
                  background: bestStyle.color + '14',
                  borderColor: bestStyle.color + '55',
                  boxShadow: bestStyle.tier >= 5 ? `0 0 32px ${bestStyle.color}33` : 'none',
                }}
              >
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Meilleure carte</p>
                <p className="font-bold text-base mt-0.5 text-shadow-glow" style={{ color: bestStyle.color }}>
                  {bestStyle.particle} {bestCard.name} · {bestStyle.label}
                </p>
                {bestStyle.tier >= 5 && (
                  <p className="text-[10px] mt-1 font-bold animate-pulse" style={{ color: bestStyle.color }}>
                    {bestStyle.tier >= 8 ? '🌟 TIRAGE LÉGENDAIRE !' : bestStyle.tier >= 6 ? '✨ TIRAGE EXCEPTIONNEL !' : '⚡ Super tirage !'}
                  </p>
                )}
                {newCount > 0 && (
                  <p className="text-xs text-yellow-400 font-bold mt-1">
                    ✨ {newCount} nouvelle{newCount > 1 ? 's' : ''} espèce{newCount > 1 ? 's' : ''} !
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 space-y-3 pb-8">
              {phase === 'reveal' && revealedCount < pendingBoosters.length && (
                <button
                  onClick={handleRevealAll}
                  className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl transition-all text-sm"
                >
                  Tout révéler
                </button>
              )}
              {phase === 'done' && (
                <button
                  onClick={handleContinue}
                  className="w-full py-4 bg-green-600 hover:bg-green-500 active:scale-95 text-white font-bold rounded-xl transition-all text-base"
                >
                  Ajouter à ma collection ✓
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
