import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useGameStore } from '../store/gameStore.js'
import TypeBadge from '../components/TypeBadge.jsx'

// Unified rarity display map (new + legacy keys)
const RARITY_STYLES = {
  common:       { color: '#9ca3af', bg: 'from-gray-700 to-gray-900',          label: 'Commune',      tier: 0,  foil: null,       particle: '·'   },
  uncommon:     { color: '#4ade80', bg: 'from-green-800 to-gray-900',          label: 'Peu Commune',  tier: 1,  foil: null,       particle: '✦'   },
  rare:         { color: '#60a5fa', bg: 'from-blue-800 to-gray-900',           label: 'Rare',         tier: 2,  foil: null,       particle: '★'   },
  reverse_holo: { color: '#93c5fd', bg: 'from-blue-700 to-indigo-900',         label: 'Reverse Holo', tier: 3,  foil: 'reverse',  particle: '✦★'  },
  holo_rare:    { color: '#c084fc', bg: 'from-purple-800 to-gray-900',         label: 'Rare Holo',    tier: 4,  foil: 'holo',     particle: '★'   },
  ex:           { color: '#fb923c', bg: 'from-orange-800 to-gray-900',         label: 'EX',           tier: 5,  foil: 'ex',       particle: '⬡'   },
  full_art:     { color: '#e879f9', bg: 'from-pink-800 to-purple-900',         label: 'Full Art',     tier: 6,  foil: 'full_art', particle: '◈'   },
  vmax:         { color: '#f43f5e', bg: 'from-rose-800 to-gray-900',           label: 'VMAX',         tier: 7,  foil: 'vmax',     particle: '▲'   },
  alt_art:      { color: '#a78bfa', bg: 'from-violet-700 to-purple-900',       label: 'Alt Art',      tier: 8,  foil: 'alt_art',  particle: '◆'   },
  rainbow:      { color: '#f0abfc', bg: 'from-purple-600 via-pink-600 to-blue-700', label: 'Rainbow Rare', tier: 9, foil: 'rainbow', particle: '🌈' },
  gold:         { color: '#fbbf24', bg: 'from-yellow-600 to-amber-900',        label: 'Gold Rare',    tier: 10, foil: 'gold',     particle: '✦'   },
  // Legacy
  holo:         { color: '#c084fc', bg: 'from-purple-800 to-gray-900',         label: 'Holographique',tier: 4,  foil: 'holo',     particle: '★'   },
  ultra:        { color: '#fb923c', bg: 'from-orange-800 to-gray-900',         label: 'Ultra Rare',   tier: 5,  foil: 'ex',       particle: '⬡'   },
  secret:       { color: '#f0abfc', bg: 'from-purple-600 via-pink-600 to-blue-700', label: 'Secret Rare', tier: 9, foil: 'rainbow', particle: '🌈' },
}

const styleFor = (r) => RARITY_STYLES[r] || RARITY_STYLES.common

// Reactive holo overlay that follows mouse/touch position
function HoloOverlay({ foil, mx, my }) {
  if (!foil) return null
  const angle = `${((mx * 360 + my * 120) % 360).toFixed(1)}deg`
  const sx = `${(mx * 100).toFixed(1)}%`
  const sy = `${(my * 100).toFixed(1)}%`

  const configs = {
    reverse:  { background: `linear-gradient(${angle}, transparent 25%, rgba(255,255,255,0.16) 50%, transparent 75%)`, mixBlendMode: 'screen' },
    holo: {
      background: `radial-gradient(circle at ${sx} ${sy}, rgba(255,255,255,0.28) 0%, transparent 55%),
        linear-gradient(${angle}, hsla(0,80%,72%,0.38) 0%, hsla(60,80%,72%,0.38) 16.66%, hsla(120,80%,72%,0.38) 33.33%, hsla(180,80%,72%,0.38) 50%, hsla(240,80%,72%,0.38) 66.66%, hsla(300,80%,72%,0.38) 83.33%, hsla(360,80%,72%,0.38) 100%)`,
      mixBlendMode: 'color-dodge',
    },
    ex: {
      background: `radial-gradient(circle at ${sx} ${sy}, rgba(255,255,255,0.38) 0%, transparent 50%),
        linear-gradient(${angle}, hsla(30,100%,65%,0.5) 0%, hsla(55,100%,65%,0.5) 33%, hsla(40,100%,65%,0.5) 66%, hsla(30,100%,65%,0.5) 100%)`,
      mixBlendMode: 'color-dodge',
    },
    full_art: {
      background: `radial-gradient(circle at ${sx} ${sy}, rgba(255,255,255,0.42) 0%, transparent 45%),
        linear-gradient(${angle}, hsla(280,90%,72%,0.52) 0%, hsla(320,90%,72%,0.52) 25%, hsla(200,90%,72%,0.52) 50%, hsla(260,90%,72%,0.52) 75%, hsla(300,90%,72%,0.52) 100%)`,
      mixBlendMode: 'color-dodge',
    },
    vmax: {
      background: `radial-gradient(circle at ${sx} ${sy}, rgba(255,255,255,0.42) 0%, transparent 45%),
        linear-gradient(${angle}, hsla(350,100%,65%,0.58) 0%, hsla(10,100%,65%,0.58) 33%, hsla(0,100%,65%,0.58) 66%, hsla(350,100%,65%,0.58) 100%)`,
      mixBlendMode: 'color-dodge',
    },
    alt_art: {
      background: `radial-gradient(circle at ${sx} ${sy}, rgba(255,255,255,0.48) 0%, transparent 42%),
        linear-gradient(${angle}, hsla(260,85%,72%,0.58) 0%, hsla(220,85%,72%,0.58) 25%, hsla(280,85%,72%,0.58) 50%, hsla(200,85%,72%,0.58) 75%, hsla(260,85%,72%,0.58) 100%)`,
      mixBlendMode: 'color-dodge',
    },
    rainbow: {
      background: `radial-gradient(circle at ${sx} ${sy}, rgba(255,255,255,0.65) 0%, transparent 38%),
        linear-gradient(${angle}, hsla(0,100%,72%,0.68) 0%, hsla(45,100%,72%,0.68) 12.5%, hsla(90,100%,72%,0.68) 25%, hsla(135,100%,72%,0.68) 37.5%, hsla(180,100%,72%,0.68) 50%, hsla(225,100%,72%,0.68) 62.5%, hsla(270,100%,72%,0.68) 75%, hsla(315,100%,72%,0.68) 87.5%, hsla(360,100%,72%,0.68) 100%)`,
      mixBlendMode: 'color-dodge',
    },
    gold: {
      background: `linear-gradient(${angle}, transparent 0%, rgba(251,191,36,0.42) 35%, rgba(255,255,200,0.92) 50%, rgba(251,191,36,0.42) 65%, transparent 100%)`,
      mixBlendMode: 'screen',
    },
  }
  const style = configs[foil]
  if (!style) return null
  return <div className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden z-20" style={style} />
}

// One large card the player reveals by tapping.
function BigCard({ pokemon, revealed, onReveal, isNew }) {
  const [mx, setMx] = useState(0.5)
  const [my, setMy] = useState(0.5)
  const cardRef = useRef(null)
  const rarity = pokemon.rarity || 'common'
  const style = styleFor(rarity)
  const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`

  const onMove = useCallback((cx, cy) => {
    if (!cardRef.current || !style.foil || !revealed) return
    const r = cardRef.current.getBoundingClientRect()
    setMx(Math.max(0, Math.min(1, (cx - r.left) / r.width)))
    setMy(Math.max(0, Math.min(1, (cy - r.top) / r.height)))
  }, [style.foil, revealed])

  return (
    <div
      ref={cardRef}
      onClick={() => !revealed && onReveal?.()}
      onMouseMove={e => onMove(e.clientX, e.clientY)}
      onTouchMove={e => e.touches[0] && onMove(e.touches[0].clientX, e.touches[0].clientY)}
      className={`relative rounded-2xl select-none mx-auto ${!revealed ? 'cursor-pointer active:scale-95' : ''}`}
      style={{ width: 'min(72vw, 260px)', aspectRatio: '5 / 7', perspective: '900px' }}
    >
      <div
        className="w-full h-full transition-transform duration-500 ease-out"
        style={{ transformStyle: 'preserve-3d', transform: revealed ? 'rotateY(0deg)' : 'rotateY(180deg)' }}
      >
        {/* Front */}
        <div
          className={`absolute inset-0 rounded-2xl bg-gradient-to-b ${style.bg} border-2 flex flex-col items-center justify-center gap-2 p-4 overflow-hidden`}
          style={{
            backfaceVisibility: 'hidden',
            borderColor: style.color + 'aa',
            boxShadow: revealed ? `0 0 40px ${style.color}66, inset 0 0 24px ${style.color}22, 0 12px 40px rgba(0,0,0,0.7)` : 'none',
          }}
        >
          {isNew && <div className="absolute top-2 left-2 bg-yellow-400 text-black text-[9px] font-black px-2 py-0.5 rounded leading-none z-30">NEW</div>}
          {style.tier >= 8 && <div className="absolute top-2 right-2 text-sm z-30 animate-pulse" style={{ color: style.color }}>{style.particle}</div>}

          <div className="text-[10px] font-black uppercase tracking-widest z-10" style={{ color: style.color }}>
            {style.particle} {style.label}
          </div>
          <img
            src={spriteUrl}
            alt={pokemon.name}
            className="w-32 h-32 sm:w-40 sm:h-40 object-contain drop-shadow-lg z-10"
            onError={e => { e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png` }}
          />
          <p className="text-white font-bold text-base text-center z-10 leading-tight">{pokemon.name}</p>
          <p className="text-gray-300 text-xs z-10">Niv. {pokemon.level}</p>
          <div className="flex gap-1 flex-wrap justify-center z-10">
            {pokemon.types?.map(t => <TypeBadge key={t} type={t} size="xs" />)}
          </div>
          {revealed && <HoloOverlay foil={style.foil} mx={mx} my={my} />}
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 rounded-2xl bg-gradient-to-br from-red-900 to-gray-900 border-2 border-red-800/50 flex flex-col items-center justify-center"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className="text-6xl mb-2">⚡</div>
          <p className="font-game text-sm text-red-400">Poké</p>
          <p className="font-game text-base text-white">Booster</p>
          <p className="text-[10px] text-gray-500 mt-4 animate-pulse">Appuie pour révéler</p>
          <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{
            background: 'repeating-linear-gradient(45deg, transparent, transparent 12px, rgba(255,255,255,0.025) 12px, rgba(255,255,255,0.025) 24px)',
          }} />
        </div>
      </div>
    </div>
  )
}

export default function PackOpeningScreen() {
  const { pendingBoosters, clearPendingBoosters, addToCollection, navigate, collection } = useGameStore()
  const [phase, setPhase] = useState('pack')  // pack | shaking | ripping | reveal | summary
  const [index, setIndex] = useState(0)        // current card being revealed
  const [revealed, setRevealed] = useState(false)
  const [flash, setFlash] = useState(null)
  const [ownedAtOpen] = useState(() => new Set(collection.map(c => c.id)))

  const cards = pendingBoosters
  const isMulti = cards.length > 5

  const bestCard = cards.reduce((best, c) =>
    (styleFor(c.rarity).tier) > (best ? styleFor(best.rarity).tier : -1) ? c : best, null)
  const newCount = cards.filter(c => !ownedAtOpen.has(c.id)).length

  useEffect(() => {
    if (!cards.length) navigate('shop')
  }, []) // eslint-disable-line

  const handlePackTap = () => {
    if (phase !== 'pack') return
    setPhase('shaking')
    setTimeout(() => {
      setPhase('ripping')
      setTimeout(() => setPhase('reveal'), 580)
    }, 720)
  }

  const revealCurrent = () => {
    if (revealed) return
    const style = styleFor(cards[index].rarity)
    if (style.tier >= 5) {
      setFlash(style.color)
      setTimeout(() => setFlash(null), 700)
    }
    setRevealed(true)
  }

  const nextCard = () => {
    if (index + 1 >= cards.length) { setPhase('summary'); return }
    setIndex(i => i + 1)
    setRevealed(false)
  }

  const revealAll = () => setPhase('summary')

  const handleContinue = () => {
    addToCollection(cards)
    clearPendingBoosters()
    navigate('collection')
  }

  const bestStyle = bestCard ? styleFor(bestCard.rarity) : null

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'radial-gradient(ellipse at top, #1a0a2e 0%, #0a0a14 70%)' }}>
      {/* Full-screen flash on rare+ reveal */}
      {flash && (
        <div className="fixed inset-0 z-50 pointer-events-none animate-screen-flash"
          style={{ background: `radial-gradient(ellipse at center, ${flash}cc 0%, ${flash}44 40%, transparent 70%)` }} />
      )}

      {/* Header */}
      <div className="border-b border-game-border px-4 pt-10 pb-4 sticky top-0 z-10" style={{ background: 'rgba(15,15,25,0.9)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <h2 className="font-game text-sm text-white">{isMulti ? '×10 Boosters' : 'Booster'}</h2>
          {(phase === 'reveal' || phase === 'summary') && (
            <span className="text-xs text-gray-400">
              {phase === 'summary' ? cards.length : Math.min(index + (revealed ? 1 : 0), cards.length)}/{cards.length}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-lg mx-auto w-full">

        {/* ── Pack ── */}
        {(phase === 'pack' || phase === 'shaking' || phase === 'ripping') && (
          <div className="flex flex-col items-center gap-8 pt-6">
            <p className="text-sm text-gray-400 text-center h-5">
              {phase === 'pack' ? 'Appuie sur le booster pour l\'ouvrir !' : phase === 'shaking' ? 'Ouverture…' : ''}
            </p>
            <button
              onClick={handlePackTap}
              className={`relative w-44 h-64 rounded-2xl cursor-pointer select-none overflow-hidden
                ${phase === 'shaking' ? 'animate-pack-shake' : ''}
                ${phase === 'ripping' ? 'animate-pack-rip' : ''}
                ${phase === 'pack' ? 'hover:scale-105 active:scale-95 transition-transform' : ''}`}
              style={{
                background: 'linear-gradient(160deg, #7f1d1d 0%, #1f0a14 50%, #111827 100%)',
                border: '1px solid rgba(185,28,28,0.6)',
                boxShadow: '0 0 40px rgba(239,68,68,0.2), inset 0 0 30px rgba(0,0,0,0.4)',
              }}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <div className="text-5xl drop-shadow-lg">⚡</div>
                <p className="font-game text-sm text-red-400 tracking-widest">POKÉ</p>
                <p className="font-game text-base text-white tracking-widest">BOOSTER</p>
                {isMulti && <div className="mt-2 bg-yellow-400 text-black text-[10px] font-black px-2 py-0.5 rounded">×10</div>}
              </div>
              <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{
                background: 'repeating-linear-gradient(45deg, transparent, transparent 12px, rgba(255,255,255,0.025) 12px, rgba(255,255,255,0.025) 24px)',
              }} />
              {phase === 'pack' && <div className="absolute inset-0 rounded-2xl animate-pulse" style={{ border: '2px solid rgba(251,191,36,0.3)' }} />}
            </button>
          </div>
        )}

        {/* ── One-by-one reveal ── */}
        {phase === 'reveal' && cards[index] && (
          <div className="flex flex-col items-center gap-5 pt-2">
            {/* Progress dots */}
            <div className="flex gap-1.5 flex-wrap justify-center max-w-[280px]">
              {cards.map((c, i) => (
                <div key={c.uid} className="w-2 h-2 rounded-full transition-all"
                  style={{ background: i < index ? styleFor(c.rarity).color : i === index ? '#fff' : '#374151', transform: i === index ? 'scale(1.4)' : 'scale(1)' }} />
              ))}
            </div>

            <div key={cards[index].uid} className="animate-card-pop-in">
              <BigCard
                pokemon={cards[index]}
                revealed={revealed}
                onReveal={revealCurrent}
                isNew={!ownedAtOpen.has(cards[index].id)}
              />
            </div>

            <div className="w-full max-w-[280px] space-y-2.5">
              {revealed ? (
                <button onClick={nextCard} className="w-full py-3.5 bg-green-600 hover:bg-green-500 active:scale-95 text-white font-black rounded-xl transition-all">
                  {index + 1 >= cards.length ? 'Voir le récap →' : 'Carte suivante →'}
                </button>
              ) : (
                <p className="text-center text-xs text-gray-500 animate-pulse">👆 Appuie sur la carte pour la révéler</p>
              )}
              <button onClick={revealAll} className="w-full py-2 text-gray-600 hover:text-gray-400 text-xs font-bold transition-all">
                Tout révéler
              </button>
            </div>
          </div>
        )}

        {/* ── Summary grid ── */}
        {phase === 'summary' && (
          <>
            <div className="flex flex-wrap justify-center gap-2.5">
              {cards.map(card => {
                const st = styleFor(card.rarity)
                const isNew = !ownedAtOpen.has(card.id)
                return (
                  <div key={card.uid}
                    className={`relative rounded-xl bg-gradient-to-b ${st.bg} border flex flex-col items-center justify-center p-1.5`}
                    style={{ width: 90, height: 124, borderColor: st.color + '88', boxShadow: st.tier >= 5 ? `0 0 14px ${st.color}55` : 'none' }}>
                    {isNew && <div className="absolute top-1 left-1 bg-yellow-400 text-black text-[6px] font-black px-1 rounded leading-none z-10">NEW</div>}
                    <img
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${card.id}.png`}
                      alt={card.name} className="w-12 h-12 object-contain pixelated"
                      onError={e => { e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${card.id}.png` }}
                    />
                    <p className="text-white text-[8px] font-bold text-center leading-tight truncate w-full">{card.name}</p>
                    <p className="text-[7px] font-black uppercase" style={{ color: st.color }}>{st.label}</p>
                  </div>
                )
              })}
            </div>

            {bestCard && bestStyle && (
              <div className="mt-6 rounded-2xl p-4 text-center border animate-burst-in"
                style={{ background: bestStyle.color + '14', borderColor: bestStyle.color + '55', boxShadow: bestStyle.tier >= 5 ? `0 0 32px ${bestStyle.color}33` : 'none' }}>
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

            <div className="mt-6 pb-8">
              <button onClick={handleContinue} className="w-full py-4 bg-green-600 hover:bg-green-500 active:scale-95 text-white font-bold rounded-xl transition-all text-base">
                Ajouter à ma collection ✓
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
