import React, { useState } from 'react'
import { ITEM_SPRITE } from '../data/items.js'

// Renders an authentic PokeAPI item sprite, degrading gracefully to an
// emoji if the sprite fails to load.
export default function ItemSprite({ slug, emoji = '❔', size = 32, className = '', style = {} }) {
  const [failed, setFailed] = useState(false)

  if (!slug || failed) {
    return (
      <span className={className} style={{ fontSize: size * 0.8, lineHeight: 1, ...style }}>
        {emoji}
      </span>
    )
  }

  return (
    <img
      src={ITEM_SPRITE(slug)}
      alt={slug}
      width={size}
      height={size}
      className={`pixelated object-contain ${className}`}
      style={{ width: size, height: size, imageRendering: 'pixelated', ...style }}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}
