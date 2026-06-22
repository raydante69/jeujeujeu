import React, { useState, useEffect } from 'react'
import { useGameStore } from '../store/gameStore.js'
import TypeBadge from '../components/TypeBadge.jsx'

const RARITY_STYLES = {
  common:   { color: '#9ca3af', bg: 'from-gray-700 to-gray-900', label: 'Commune',       particle: '·' },
  uncommon: { color: '#4ade80', bg: 'from-green-800 to-gray-900', label: 'Peu commune',  particle: '✦' },
  rare:     { color: '#60a5fa', bg: 'from-blue-800 to-gray-900',  label: 'Rare',         particle: '★' },
  holo:     { color: '#c084fc', bg: 'from-purple-800 to-gray-900', label: 'Holo',        particle: '✨' },
  ultra:    { color: '#fb923c', bg: 'from-orange-800 to-gray-900', label: 'Ultra',       particle: '💥' },
  secret:   { color: '#fde047', bg: 'from-yellow-700 to-gray-900', label: 'Secret',      particle: '🌟' },
}

function CardReveal({ pokemon, delay, onReveal }) {
  const [flipped, setFlipped] = useState(false)
  const rarity = pokemon.rarity || 'common'
  const style = RARITY_STYLES[rarity] || RARITY_STYLES.common
  const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`

  const handleClick = () => {
    if (flipped) return
    setFlipped(true)
    onReveal?.()
  }

  return (
    <div
      onClick={handleClick}
      className={`
        relative w-36 h-52 sm:w-44 sm:h-64 rounded-2xl cursor-pointer
        transition-transform duration-300 ${flipped ? 'scale-100' : 'hover:scale-105 active:scale-95'}
      `}
      style={{ perspective: '600px' }}
    >
      <div
        className="w-full h-full transition-transform duration-500 ease-out"
        style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(0deg)' : 'rotateY(180deg)' }}
      >
        {/* Front (revealed) */}
        <div
          className={`absolute inset-0 rounded-2xl bg-gradient-to-b ${style.bg} border flex flex-col items-center justify-center gap-2 p-3`}
          style={{ backfaceVisibility: 'hidden', borderColor: style.color + '80' }}
        >
          <div className="text-xs font-bold uppercase tracking-widest" style={{ color: style.color }}>
            {style.particle} {style.label} {style.particle}
          </div>
          <img
            src={spriteUrl}
            alt={pokemon.name}
            className="w-24 h-24 sm:w-28 sm:h-28 object-contain drop-shadow-lg"
            loading="lazy"
            onError={e => { e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png` }}
          />
          <p className="text-white font-bold text-sm text-center">{pokemon.name}</p>
          <p className="text-gray-400 text-xs">Niv. {pokemon.level}</p>
          <div className="flex gap-1 flex-wrap justify-center">
            {pokemon.types?.map(t => <TypeBadge key={t} type={t} size="xs" />)}
          </div>
          {/* Holo shimmer */}
          {['holo', 'ultra', 'secret'].includes(rarity) && (
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden"
              style={{ background: 'linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%)', backgroundSize: '200% 200%', animation: 'shimmer 2s linear infinite' }}
            />
          )}
        </div>

        {/* Back (card back) */}
        <div
          className="absolute inset-0 rounded-2xl bg-gradient-to-br from-red-900 to-gray-900 border border-red-800/50 flex items-center justify-center"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className="text-center">
            <div className="text-4xl mb-2">⚡</div>
            <p className="font-game text-xs text-red-400">Poké</p>
            <p className="font-game text-xs text-white">Booster</p>
          </div>
          <div className="absolute inset-0 rounded-2xl" style={{
            background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.02) 10px, rgba(255,255,255,0.02) 20px)'
          }} />
        </div>
      </div>
    </div>
  )
}

export default function PackOpeningScreen() {
  const { pendingBoosters, clearPendingBoosters, addToCollection, navigate } = useGameStore()
  const [revealedCount, setRevealedCount] = useState(0)
  const [canContinue, setCanContinue] = useState(false)

  useEffect(() => {
    if (!pendingBoosters.length) {
      navigate('shop')
    }
  }, [])

  const handleReveal = () => {
    const newCount = revealedCount + 1
    setRevealedCount(newCount)
    if (newCount >= pendingBoosters.length) {
      setTimeout(() => setCanContinue(true), 600)
    }
  }

  const handleRevealAll = () => {
    setRevealedCount(pendingBoosters.length)
    setCanContinue(true)
  }

  const handleContinue = () => {
    addToCollection(pendingBoosters)
    clearPendingBoosters()
    navigate('collection')
  }

  const isMulti = pendingBoosters.length > 5

  return (
    <div className="min-h-screen bg-game-bg flex flex-col">
      {/* Header */}
      <div className="bg-game-surface border-b border-game-border px-4 pt-10 pb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <h2 className="font-game text-sm text-white">
            {isMulti ? '×10 Boosters' : 'Booster'}
          </h2>
          <span className="text-xs text-gray-400">
            {Math.min(revealedCount, pendingBoosters.length)}/{pendingBoosters.length} révélées
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-lg mx-auto w-full">

        {/* Cards grid */}
        <div className={`
          grid gap-4 justify-items-center
          ${pendingBoosters.length <= 5 ? 'grid-cols-3 sm:grid-cols-5' : 'grid-cols-3 sm:grid-cols-5'}
        `}>
          {pendingBoosters.map((card, i) => (
            <CardReveal
              key={card.uid}
              pokemon={card}
              delay={i * 100}
              onReveal={i === revealedCount ? handleReveal : undefined}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="mt-8 space-y-3 pb-6">
          {!canContinue && revealedCount < pendingBoosters.length && (
            <button
              onClick={handleRevealAll}
              className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl transition-all text-sm"
            >
              Tout révéler
            </button>
          )}
          {canContinue && (
            <button
              onClick={handleContinue}
              className="w-full py-4 bg-green-600 hover:bg-green-500 active:scale-95 text-white font-bold rounded-xl transition-all"
            >
              Ajouter à ma collection ✓
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
