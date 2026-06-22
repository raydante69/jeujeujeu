import React from 'react'

function hpColor(pct) {
  if (pct > 0.5) return '#4ade80'
  if (pct > 0.25) return '#facc15'
  return '#ef4444'
}

export default function HPBar({ hp, maxHp, showNumbers = false, size = 'md' }) {
  const pct = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0
  const color = hpColor(pct)
  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-3' }

  return (
    <div className="w-full">
      <div className={`w-full bg-gray-800 rounded-full overflow-hidden ${heights[size]}`}>
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct * 100}%`, backgroundColor: color }}
        />
      </div>
      {showNumbers && (
        <div className="text-right text-xs text-gray-400 mt-0.5">
          {hp}/{maxHp}
        </div>
      )}
    </div>
  )
}
