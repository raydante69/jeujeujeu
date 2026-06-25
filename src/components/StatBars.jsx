import React from 'react'
import { STAT_KEYS, STAT_LABEL, STAT_MAX } from '../data/cardModel.js'

function barColor(v) {
  if (v >= 120) return '#4ade80'
  if (v >= 80) return '#facc15'
  if (v >= 50) return '#fb923c'
  return '#ef4444'
}

export default function StatBars({ stats, accent = '#60a5fa', bonusStats = {} }) {
  if (!stats) return null
  const bst = STAT_KEYS.reduce((s, k) => s + (stats[k] || 0), 0)
  const bonusBst = STAT_KEYS.reduce((s, k) => s + (bonusStats[k] || 0), 0)
  return (
    <div className="space-y-1 w-full">
      {STAT_KEYS.map(k => {
        const v = stats[k] || 0
        const bonus = bonusStats[k] || 0
        const pct = Math.min(100, (v / STAT_MAX) * 100)
        const bonusPct = Math.min(100 - pct, (bonus / STAT_MAX) * 100)
        return (
          <div key={k} className="flex items-center gap-1.5">
            <span className="text-[8px] text-gray-400 font-bold w-7 text-right uppercase">{STAT_LABEL[k]}</span>
            <div className="flex-1 h-1.5 rounded-full bg-black/50 overflow-hidden flex">
              <div className="h-full rounded-l-full transition-all" style={{ width: `${pct}%`, background: barColor(v) }} />
              {bonusPct > 0 && <div className="h-full transition-all" style={{ width: `${bonusPct}%`, background: '#9ca3af' }} />}
            </div>
            <span className="text-[8px] text-gray-300 font-bold tabular-nums">
              {v}{bonus > 0 && <span className="text-green-400"> +{bonus}</span>}
            </span>
          </div>
        )
      })}
      <div className="flex items-center justify-between pt-0.5 border-t border-white/5 mt-1">
        <span className="text-[8px] text-gray-500 font-bold uppercase">Total</span>
        <span className="text-[10px] font-black" style={{ color: accent }}>
          {bst}{bonusBst > 0 && <span className="text-green-400"> +{bonusBst}</span>}
        </span>
      </div>
    </div>
  )
}
