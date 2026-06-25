import React from 'react'
import { TYPE_COLORS, TYPE_LABELS_FR, typeIconUrl } from '../data/types.js'

const TYPE_EMOJI = {
  fire: '🔥', water: '💧', grass: '🌿', electric: '⚡', psychic: '🔮',
  fighting: '👊', ghost: '👻', ice: '❄️', dragon: '🐉', dark: '🌑',
  rock: '🪨', ground: '🏜️', flying: '🌪️', bug: '🐛', poison: '☠️',
  fairy: '🌸', steel: '⚙️', normal: '⚪',
}

export default function TypeBadge({ type, size = 'sm' }) {
  const color = TYPE_COLORS[type] || '#888'
  const label = TYPE_LABELS_FR[type] || type
  const emoji = TYPE_EMOJI[type] || '❓'

  // Real game type banner (Sword/Shield). Falls back to the colored label pill.
  if (size === 'img') {
    return (
      <img
        src={typeIconUrl(type)}
        alt={label}
        title={label}
        className="h-4 w-auto object-contain"
        loading="lazy"
        onError={(e) => {
          e.target.outerHTML =
            `<span style="background:${color}33;color:${color};border:1px solid ${color}66" class="inline-block rounded font-bold uppercase tracking-wide text-[9px] px-1.5 py-0.5">${label}</span>`
        }}
      />
    )
  }

  if (size === 'icon') {
    return (
      <div className="flex flex-col items-center gap-0.5" style={{ minWidth: 40 }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg border-2"
          style={{ background: color + '33', borderColor: color + 'aa' }}>
          {emoji}
        </div>
        <span className="text-[7px] font-black uppercase tracking-wide" style={{ color }}>
          {label.toUpperCase()}
        </span>
      </div>
    )
  }

  const sizes = {
    xs: 'text-[9px] px-1.5 py-0.5',
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  }

  return (
    <span
      className={`inline-block rounded font-bold uppercase tracking-wide ${sizes[size] || sizes.sm}`}
      style={{ backgroundColor: color + '33', color, border: `1px solid ${color}66` }}
    >
      {label}
    </span>
  )
}
