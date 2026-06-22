import React from 'react'
import { TYPE_COLORS, TYPE_LABELS_FR } from '../data/types.js'

export default function TypeBadge({ type, size = 'sm' }) {
  const color = TYPE_COLORS[type] || '#888'
  const label = TYPE_LABELS_FR[type] || type

  const sizes = {
    xs: 'text-[9px] px-1.5 py-0.5',
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  }

  return (
    <span
      className={`inline-block rounded font-bold uppercase tracking-wide ${sizes[size]}`}
      style={{ backgroundColor: color + '33', color, border: `1px solid ${color}66` }}
    >
      {label}
    </span>
  )
}
