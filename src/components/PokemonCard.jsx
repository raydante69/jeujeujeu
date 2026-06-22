import React from 'react'
import TypeBadge from './TypeBadge.jsx'
import HPBar from './HPBar.jsx'

const RARITY_STYLES = {
  common:   { border: '#9ca3af', glow: '', bg: 'from-gray-800 to-gray-900', label: 'Commune' },
  uncommon: { border: '#4ade80', glow: 'shadow-[0_0_8px_#4ade8044]', bg: 'from-green-900/40 to-gray-900', label: 'Peu commune' },
  rare:     { border: '#60a5fa', glow: 'shadow-[0_0_10px_#60a5fa55]', bg: 'from-blue-900/40 to-gray-900', label: 'Rare' },
  holo:     { border: '#c084fc', glow: 'shadow-[0_0_14px_#c084fc66]', bg: 'from-purple-900/50 to-gray-900', label: 'Holo' },
  ultra:    { border: '#fb923c', glow: 'shadow-[0_0_16px_#fb923c77]', bg: 'from-orange-900/50 to-gray-900', label: 'Ultra' },
  secret:   { border: '#fde047', glow: 'shadow-[0_0_20px_#fde04788]', bg: 'from-yellow-900/50 to-gray-900', label: 'Secret' },
}

export default function PokemonCard({
  pokemon,
  onClick,
  selected = false,
  compact = false,
  showHP = false,
  disabled = false,
}) {
  const rarity = pokemon.rarity || 'common'
  const style = RARITY_STYLES[rarity] || RARITY_STYLES.common
  const spriteUrl = pokemon.shiny
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemon.id}.png`
    : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`

  if (compact) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`
          relative rounded-lg p-2 text-center transition-all duration-150
          bg-gradient-to-b ${style.bg} ${style.glow}
          border ${selected ? 'border-white scale-105' : `border-[${style.border}]/50`}
          ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105 active:scale-95 cursor-pointer'}
        `}
        style={{ borderColor: selected ? '#fff' : style.border + '80' }}
      >
        <img
          src={spriteUrl}
          alt={pokemon.name}
          className="w-12 h-12 mx-auto object-contain pixelated"
          loading="lazy"
        />
        <p className="text-[10px] text-white font-bold truncate mt-1">{pokemon.name}</p>
        <p className="text-[9px] text-gray-400">Niv.{pokemon.level}</p>
        {selected && (
          <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
            <span className="text-[8px]">✓</span>
          </div>
        )}
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative rounded-xl p-3 text-center transition-all duration-150 w-full
        bg-gradient-to-b ${style.bg} ${style.glow}
        border ${selected ? 'border-white' : ''}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95 cursor-pointer'}
      `}
      style={{ borderColor: selected ? '#fff' : style.border + '80', borderWidth: 1 }}
    >
      <div className="flex flex-col items-center gap-1">
        <div
          className="text-[9px] font-bold uppercase tracking-widest mb-1"
          style={{ color: style.border }}
        >
          {style.label}
        </div>
        <img
          src={spriteUrl}
          alt={pokemon.name}
          className="w-16 h-16 object-contain pixelated"
          loading="lazy"
        />
        <p className="text-sm font-bold text-white">{pokemon.name}</p>
        <p className="text-xs text-gray-400">Niv. {pokemon.level}</p>
        <div className="flex gap-1 flex-wrap justify-center">
          {pokemon.types?.map(t => <TypeBadge key={t} type={t} size="xs" />)}
        </div>
        {showHP && (
          <div className="w-full mt-1">
            <HPBar hp={pokemon.hp} maxHp={pokemon.maxHp} showNumbers size="sm" />
          </div>
        )}
      </div>
      {selected && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
          <span className="text-xs">✓</span>
        </div>
      )}
    </button>
  )
}
