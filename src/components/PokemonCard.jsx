import React, { useState } from 'react'
import { TYPE_COLORS } from '../data/types.js'
import TypeBadge from './TypeBadge.jsx'
import HPBar from './HPBar.jsx'

const RARITY = {
  common:   { label: 'C',  border: '#6b7280', glow: '',                     shimmer: false },
  uncommon: { label: 'UC', border: '#4ade80', glow: '0 0 8px #4ade8044',   shimmer: false },
  rare:     { label: 'R',  border: '#60a5fa', glow: '0 0 14px #60a5fa55',  shimmer: false },
  holo:     { label: 'H',  border: '#c084fc', glow: '0 0 18px #c084fc77',  shimmer: true  },
  ultra:    { label: 'UR', border: '#fb923c', glow: '0 0 22px #fb923c88',  shimmer: true  },
  secret:   { label: 'SR', border: '#fde047', glow: '0 0 28px #fde04799',  shimmer: true  },
}

// ----- Compact card (4-column grid in Pokedex/TeamBuilder) -----
function CompactCard({ pokemon, onClick, selected, isNew, cooldown, disabled }) {
  const cfg = RARITY[pokemon.rarity || 'common'] || RARITY.common
  const typeColor = TYPE_COLORS[pokemon.types?.[0]] || '#1e293b'
  const onCooldown = (cooldown || 0) > 0
  const isDisabled = disabled || onCooldown

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`relative overflow-hidden rounded-xl transition-all duration-200
        ${selected ? 'ring-2 ring-white scale-105 z-10' : ''}
        ${!isDisabled && !selected ? 'hover:-translate-y-1 hover:scale-[1.06] active:scale-95' : ''}
        ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      style={{
        aspectRatio: '2/3',
        background: `linear-gradient(160deg, ${typeColor}99 0%, ${typeColor}22 55%, #0f172a 100%)`,
        border: `1.5px solid ${selected ? '#fff' : cfg.border + '55'}`,
        boxShadow: selected ? `0 0 0 2px white, ${cfg.glow}` : cfg.glow,
      }}
    >
      {/* Rarity strip */}
      <div className="absolute top-0 inset-x-0 h-0.5" style={{ background: cfg.border }} />

      <div className="flex flex-col items-center justify-between h-full p-1.5 gap-0.5">
        <span className="text-[7px] font-black tracking-widest self-end" style={{ color: cfg.border }}>{cfg.label}</span>

        <img
          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`}
          alt={pokemon.name}
          className={`w-12 h-12 object-contain pixelated ${onCooldown ? 'grayscale' : ''}`}
          loading="lazy"
        />

        <div className="w-full text-center leading-none">
          <p className="text-white font-bold text-[8px] truncate">{pokemon.name}</p>
          <p className="text-gray-500 text-[7px]">Niv.{pokemon.level}</p>
        </div>
      </div>

      {isNew && (
        <div className="absolute top-1 right-1 bg-yellow-400 text-black text-[6px] font-black px-1 py-0.5 rounded-sm leading-none">NEW</div>
      )}
      {selected && (
        <div className="absolute top-1 left-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
          <span className="text-[7px] font-bold">✓</span>
        </div>
      )}
      {onCooldown && (
        <div className="absolute inset-0 bg-black/70 rounded-xl flex items-center justify-center">
          <p className="text-white font-black text-xl leading-none">{cooldown}</p>
        </div>
      )}
      {cfg.shimmer && (
        <div className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, transparent 20%, rgba(255,255,255,0.14) 50%, transparent 80%)',
            backgroundSize: '300% 300%',
            animation: 'shimmer 3s linear infinite',
          }}
        />
      )}
    </button>
  )
}

// ----- Full card (Pack opening, rewards, team detail) -----
function FullCard({ pokemon, onClick, selected, isNew, showHP, disabled }) {
  const [hovered, setHovered] = useState(false)
  const cfg = RARITY[pokemon.rarity || 'common'] || RARITY.common
  const typeColor = TYPE_COLORS[pokemon.types?.[0]] || '#1e293b'
  const artUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative overflow-hidden rounded-2xl w-full text-left
        ${selected ? 'ring-2 ring-white' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      style={{
        aspectRatio: '2/3',
        background: `linear-gradient(160deg, ${typeColor}cc 0%, ${typeColor}44 45%, #0f172a 100%)`,
        border: `2px solid ${selected ? '#fff' : cfg.border + '70'}`,
        boxShadow: hovered && !disabled
          ? `0 16px 36px -6px ${typeColor}99, ${cfg.glow}`
          : cfg.glow,
        transform: hovered && !disabled ? 'translateY(-6px) scale(1.02)' : 'none',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Top rarity strip */}
      <div className="absolute top-0 inset-x-0 h-1" style={{ background: `linear-gradient(90deg, transparent, ${cfg.border}, transparent)` }} />

      {/* Decorative radial */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 70% 50% at 50% 20%, ${cfg.border}22 0%, transparent 70%)` }}
      />

      {/* Border frame */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{ border: `1px solid ${cfg.border}30`, borderRadius: 'inherit' }}
      />

      <div className="relative flex flex-col h-full p-3 gap-1">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black tracking-widest" style={{ color: cfg.border }}>{cfg.label}</span>
          <span className="text-[10px] text-gray-300">HP {pokemon.maxHp || pokemon.stats?.hp || '?'}</span>
        </div>

        {/* Name + types */}
        <p className="font-bold text-sm text-white leading-tight truncate">{pokemon.name}</p>
        <div className="flex gap-1 flex-wrap">
          {pokemon.types?.map(t => <TypeBadge key={t} type={t} size="xs" />)}
        </div>

        {/* Artwork */}
        <div className="flex-1 flex items-center justify-center py-1">
          <img
            src={artUrl}
            alt={pokemon.name}
            className="w-full max-h-28 object-contain drop-shadow-lg"
            loading="lazy"
            onError={e => { e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png` }}
          />
        </div>

        {/* Stats mini-grid */}
        <div className="grid grid-cols-3 gap-1 text-center">
          {[['ATQ', pokemon.stats?.atk], ['DEF', pokemon.stats?.def], ['VIT', pokemon.stats?.spe]].map(([l, v]) => (
            <div key={l} className="rounded-lg py-0.5" style={{ background: 'rgba(0,0,0,0.35)' }}>
              <p className="text-[7px] text-gray-500 font-bold">{l}</p>
              <p className="text-[10px] font-bold text-white">{v || '?'}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-[9px] text-gray-500">Niv. {pokemon.level}</p>

        {showHP && <HPBar hp={pokemon.hp} maxHp={pokemon.maxHp} showNumbers size="sm" />}
      </div>

      {isNew && (
        <div className="absolute top-2 right-2 bg-yellow-400 text-black text-[8px] font-black px-1.5 py-0.5 rounded leading-none">NEW</div>
      )}
      {selected && (
        <div className="absolute top-2 left-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
          <span className="text-[9px] font-bold">✓</span>
        </div>
      )}

      {cfg.shimmer && (
        <div className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, transparent 20%, rgba(255,255,255,0.16) 50%, transparent 80%)',
            backgroundSize: '300% 300%',
            animation: `shimmer ${pokemon.rarity === 'secret' ? '1.8' : '2.5'}s linear infinite`,
            mixBlendMode: 'overlay',
          }}
        />
      )}
      {hovered && cfg.shimmer && (
        <div className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ background: `radial-gradient(ellipse 80% 60% at 50% 30%, ${cfg.border}44 0%, transparent 70%)` }}
        />
      )}
    </button>
  )
}

export default function PokemonCard({
  pokemon,
  onClick,
  selected = false,
  compact = false,
  showHP = false,
  disabled = false,
  isNew = false,
  cooldown = 0,
}) {
  if (!pokemon) return null
  if (compact) return <CompactCard pokemon={pokemon} onClick={onClick} selected={selected} isNew={isNew} cooldown={cooldown} disabled={disabled} />
  return <FullCard pokemon={pokemon} onClick={onClick} selected={selected} showHP={showHP} disabled={disabled} isNew={isNew} />
}
