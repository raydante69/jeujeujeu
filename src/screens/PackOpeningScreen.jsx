import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { speciesById } from '../data/pokemon.js'
import { speciesRarity, rarityTier } from '../data/cardModel.js'
import TypeBadge from '../components/TypeBadge.jsx'
import StatBars from '../components/StatBars.jsx'

// 6-tier power-based rarity styling.
const RARITY_STYLES = {
  common:    { color: '#9ca3af', bg: 'from-gray-700 to-gray-900',           label: 'Commune',      tier: 0, particle: '·' },
  uncommon:  { color: '#4ade80', bg: 'from-green-800 to-gray-900',           label: 'Peu Commune',  tier: 1, particle: '✦' },
  rare:      { color: '#60a5fa', bg: 'from-blue-800 to-gray-900',            label: 'Rare',         tier: 2, particle: '★' },
  veryrare:  { color: '#818cf8', bg: 'from-indigo-800 to-gray-900',          label: 'Très Rare',    tier: 3, particle: '◆' },
  epic:      { color: '#c084fc', bg: 'from-purple-800 to-gray-900',          label: 'Épique',       tier: 4, particle: '◈' },
  legendary: { color: '#fbbf24', bg: 'from-yellow-600 to-amber-900',         label: 'Légendaire',   tier: 5, particle: '🌟' },
}
const styleFor = (c) => RARITY_STYLES[speciesRarity(speciesById(c.id))] || RARITY_STYLES.common
const cardTier = (c) => rarityTier(speciesRarity(speciesById(c.id)))

// Pick the foil treatment for a card's variant.
function foilFor(card) {
  if (card.holo) return speciesRarity(speciesById(card.id)) === 'legendary' ? 'rainbow' : 'holo'
  if (card.shiny) return 'gold'
  return null
}
const sprite = (id, shiny) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${shiny ? 'shiny/' : ''}${id}.png`

function HoloOverlay({ foil, mx, my }) {
  if (!foil) return null
  const angle = `${((mx * 360 + my * 120) % 360).toFixed(1)}deg`
  const sx = `${(mx * 100).toFixed(1)}%`
  const sy = `${(my * 100).toFixed(1)}%`
  const configs = {
    holo: {
      background: `radial-gradient(circle at ${sx} ${sy}, rgba(255,255,255,0.28) 0%, transparent 55%),
        linear-gradient(${angle}, hsla(0,80%,72%,0.38) 0%, hsla(60,80%,72%,0.38) 16.66%, hsla(120,80%,72%,0.38) 33.33%, hsla(180,80%,72%,0.38) 50%, hsla(240,80%,72%,0.38) 66.66%, hsla(300,80%,72%,0.38) 83.33%, hsla(360,80%,72%,0.38) 100%)`,
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

function BigCard({ pokemon, revealed, onReveal, isNew }) {
  const [mx, setMx] = useState(0.5)
  const [my, setMy] = useState(0.5)
  const cardRef = useRef(null)
  const style = styleFor(pokemon)
  const foil = foilFor(pokemon)
  const sp = speciesById(pokemon.id)

  const onMove = useCallback((cx, cy) => {
    if (!cardRef.current || !foil || !revealed) return
    const r = cardRef.current.getBoundingClientRect()
    setMx(Math.max(0, Math.min(1, (cx - r.left) / r.width)))
    setMy(Math.max(0, Math.min(1, (cy - r.top) / r.height)))
  }, [foil, revealed])

  return (
    <div ref={cardRef}
      onClick={() => !revealed && onReveal?.()}
      onMouseMove={e => onMove(e.clientX, e.clientY)}
      onTouchMove={e => e.touches[0] && onMove(e.touches[0].clientX, e.touches[0].clientY)}
      className={`relative rounded-2xl select-none mx-auto ${!revealed ? 'cursor-pointer active:scale-95' : ''}`}
      style={{ width: 'min(74vw, 270px)', aspectRatio: '5 / 7', perspective: '900px' }}>
      <div className="w-full h-full transition-transform duration-500 ease-out" style={{ transformStyle: 'preserve-3d', transform: revealed ? 'rotateY(0deg)' : 'rotateY(180deg)' }}>
        {/* Front */}
        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-b ${style.bg} border-2 flex flex-col items-center gap-1.5 p-3 overflow-hidden`}
          style={{ backfaceVisibility: 'hidden', borderColor: style.color + 'aa', boxShadow: revealed ? `0 0 40px ${style.color}66, inset 0 0 24px ${style.color}22, 0 12px 40px rgba(0,0,0,0.7)` : 'none' }}>
          {isNew && <div className="absolute top-2 left-2 z-30"><span className="text-xl drop-shadow">⭐</span></div>}
          <div className="absolute top-2 right-2 flex gap-1 z-30">
            {pokemon.shiny && <span className="text-sm">✨</span>}
            {pokemon.holo && <span className="text-sm animate-pulse">🌈</span>}
          </div>

          <div className="text-[10px] font-black uppercase tracking-widest z-10" style={{ color: style.color }}>{style.particle} {style.label}</div>
          <img src={sprite(pokemon.id, pokemon.shiny)} alt={pokemon.name} className="w-24 h-24 object-contain drop-shadow-lg z-10"
            onError={e => { e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png` }} />
          <p className="text-white font-bold text-sm text-center z-10 leading-tight">{pokemon.name}</p>
          <div className="flex gap-1 flex-wrap justify-center z-10">{pokemon.types?.map(t => <TypeBadge key={t} type={t} size="xs" />)}</div>
          <div className="w-full mt-auto z-10 px-1">{sp && <StatBars stats={sp.stats} accent={style.color} />}</div>
          {revealed && <HoloOverlay foil={foil} mx={mx} my={my} />}
        </div>
        {/* Back */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-red-900 to-gray-900 border-2 border-red-800/50 flex flex-col items-center justify-center"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
          <div className="text-6xl mb-2">⚡</div>
          <p className="font-game text-sm text-red-400">Poké</p>
          <p className="font-game text-base text-white">Booster</p>
          <p className="text-[10px] text-gray-500 mt-4 animate-pulse">Appuie pour révéler</p>
          <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 12px, rgba(255,255,255,0.025) 12px, rgba(255,255,255,0.025) 24px)' }} />
        </div>
      </div>
    </div>
  )
}

export default function PackOpeningScreen() {
  const { pendingBoosters, clearPendingBoosters, addToCollection, navigate, collection, setScrollToNew } = useGameStore()
  const [phase, setPhase] = useState('pack')
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [flash, setFlash] = useState(null)
  const [ownedAtOpen] = useState(() => new Set(collection.map(c => c.id)))

  const cards = pendingBoosters
  const bestCard = cards.reduce((best, c) => (cardTier(c) > (best ? cardTier(best) : -1) ? c : best), null)
  const newCount = cards.filter(c => !ownedAtOpen.has(c.id)).length

  useEffect(() => { if (!cards.length) navigate('shop') }, []) // eslint-disable-line

  const handlePackTap = () => {
    if (phase !== 'pack') return
    setPhase('shaking')
    setTimeout(() => { setPhase('ripping'); setTimeout(() => setPhase('reveal'), 580) }, 720)
  }
  const revealCurrent = () => {
    if (revealed) return
    const c = cards[index]
    if (cardTier(c) >= 3 || c.holo || c.shiny) { setFlash(styleFor(c).color); setTimeout(() => setFlash(null), 900) }
    setRevealed(true)
  }
  const nextCard = () => {
    if (index + 1 >= cards.length) { setPhase('summary'); return }
    setIndex(i => i + 1); setRevealed(false)
  }
  const revealAll = () => setPhase('summary')
  const handleViewPokedex = () => { addToCollection(cards); clearPendingBoosters(); setScrollToNew(true); navigate('collection') }
  const handleGoHome = () => { addToCollection(cards); clearPendingBoosters(); navigate('home') }

  const bestStyle = bestCard ? styleFor(bestCard) : null

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'radial-gradient(ellipse at top, #1a0a2e 0%, #0a0a14 70%)' }}>
      {flash && <div className="fixed inset-0 z-50 pointer-events-none animate-screen-flash" style={{ background: `radial-gradient(ellipse at center, ${flash}cc 0%, ${flash}44 40%, transparent 70%)` }} />}

      <div className="border-b border-game-border px-4 pt-10 pb-4 sticky top-0 z-10" style={{ background: 'rgba(15,15,25,0.9)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <h2 className="font-game text-sm text-white">Booster</h2>
          {(phase === 'reveal' || phase === 'summary') && (
            <span className="text-xs text-gray-400">{phase === 'summary' ? cards.length : Math.min(index + (revealed ? 1 : 0), cards.length)}/{cards.length}</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-lg mx-auto w-full">
        {(phase === 'pack' || phase === 'shaking' || phase === 'ripping') && (
          <div className="flex flex-col items-center gap-8 pt-6">
            <p className="text-sm text-gray-400 text-center h-5">{phase === 'pack' ? 'Appuie sur le booster pour l\'ouvrir !' : phase === 'shaking' ? 'Ouverture…' : ''}</p>
            <button onClick={handlePackTap}
              className={`relative w-44 h-64 rounded-2xl cursor-pointer select-none overflow-hidden ${phase === 'shaking' ? 'animate-pack-shake' : ''} ${phase === 'ripping' ? 'animate-pack-rip' : ''} ${phase === 'pack' ? 'hover:scale-105 active:scale-95 transition-transform' : ''}`}
              style={{ background: 'linear-gradient(160deg, #7f1d1d 0%, #1f0a14 50%, #111827 100%)', border: '1px solid rgba(185,28,28,0.6)', boxShadow: '0 0 40px rgba(239,68,68,0.2), inset 0 0 30px rgba(0,0,0,0.4)' }}>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <div className="text-5xl drop-shadow-lg">⚡</div>
                <p className="font-game text-sm text-red-400 tracking-widest">POKÉ</p>
                <p className="font-game text-base text-white tracking-widest">BOOSTER</p>
              </div>
              <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 12px, rgba(255,255,255,0.025) 12px, rgba(255,255,255,0.025) 24px)' }} />
              {phase === 'pack' && <div className="absolute inset-0 rounded-2xl animate-pulse" style={{ border: '2px solid rgba(251,191,36,0.3)' }} />}
            </button>
          </div>
        )}

        {phase === 'reveal' && cards[index] && (
          <div className="flex flex-col items-center gap-5 pt-2">
            <div className="flex gap-1.5 flex-wrap justify-center max-w-[280px]">
              {cards.map((c, i) => (
                <div key={c.uid} className="w-2 h-2 rounded-full transition-all" style={{ background: i < index ? styleFor(c).color : i === index ? '#fff' : '#374151', transform: i === index ? 'scale(1.4)' : 'scale(1)' }} />
              ))}
            </div>
            <div key={cards[index].uid} className="animate-card-pop-in">
              <BigCard pokemon={cards[index]} revealed={revealed} onReveal={revealCurrent} isNew={!ownedAtOpen.has(cards[index].id)} />
            </div>
            <div className="w-full max-w-[280px] space-y-2.5">
              {revealed ? (
                <button onClick={nextCard} className="w-full py-3.5 bg-green-600 hover:bg-green-500 active:scale-95 text-white font-black rounded-xl transition-all">
                  {index + 1 >= cards.length ? 'Voir le récap →' : 'Carte suivante →'}
                </button>
              ) : (
                <p className="text-center text-xs text-gray-500 animate-pulse">👆 Appuie sur la carte pour la révéler</p>
              )}
              <button onClick={revealAll} className="w-full py-2 text-gray-600 hover:text-gray-400 text-xs font-bold transition-all">Tout révéler</button>
            </div>
          </div>
        )}

        {phase === 'summary' && (
          <>
            <div className="flex flex-wrap justify-center gap-2.5">
              {cards.map(card => {
                const st = styleFor(card)
                const isNew = !ownedAtOpen.has(card.id)
                return (
                  <div key={card.uid} className={`relative rounded-xl bg-gradient-to-b ${st.bg} border flex flex-col items-center justify-center p-1.5`}
                    style={{ width: 90, height: 124, borderColor: st.color + '88', boxShadow: st.tier >= 3 ? `0 0 14px ${st.color}55` : 'none' }}>
                    {isNew && <div className="absolute top-1 left-1 z-10"><span className="text-sm">⭐</span></div>}
                    <div className="absolute top-1 right-1 flex gap-0.5 z-10">
                      {card.shiny && <span className="text-[9px]">✨</span>}
                      {card.holo && <span className="text-[9px]">🌈</span>}
                    </div>
                    <img src={sprite(card.id, card.shiny)} alt={card.name} className="w-12 h-12 object-contain pixelated"
                      onError={e => { e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${card.id}.png` }} />
                    <p className="text-white text-[8px] font-bold text-center leading-tight truncate w-full">{card.name}</p>
                    <p className="text-[7px] font-black uppercase" style={{ color: st.color }}>{st.label}</p>
                  </div>
                )
              })}
            </div>

            {bestCard && bestStyle && (
              <div className="mt-6 rounded-2xl p-4 text-center border animate-burst-in"
                style={{ background: bestStyle.color + '14', borderColor: bestStyle.color + '55', boxShadow: bestStyle.tier >= 3 ? `0 0 32px ${bestStyle.color}33` : 'none' }}>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Meilleure carte</p>
                <p className="font-bold text-base mt-0.5 text-shadow-glow" style={{ color: bestStyle.color }}>{bestStyle.particle} {bestCard.name} · {bestStyle.label}</p>
                {(bestStyle.tier >= 3 || bestCard.holo) && (
                  <p className="text-[10px] mt-1 font-bold animate-pulse" style={{ color: bestStyle.color }}>
                    {bestStyle.tier >= 4 ? '🌟 TIRAGE LÉGENDAIRE !' : bestCard.holo ? '🌈 HOLOGRAPHIQUE !' : '✨ Super tirage !'}
                  </p>
                )}
                {newCount > 0 && <p className="text-xs text-yellow-400 font-bold mt-1">✨ {newCount} nouvelle{newCount > 1 ? 's' : ''} espèce{newCount > 1 ? 's' : ''} !</p>}
              </div>
            )}

            <div className="mt-6 pb-8 space-y-2.5">
              <button onClick={handleViewPokedex} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold rounded-xl transition-all text-base">📕 Voir dans le pokédex</button>
              <button onClick={handleGoHome} className="w-full py-3 bg-white/10 hover:bg-white/15 active:scale-95 text-gray-300 font-bold rounded-xl transition-all text-sm">Retour</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
