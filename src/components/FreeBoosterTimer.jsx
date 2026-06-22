import React, { useState, useEffect } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { getFreeBoosterTimer } from '../engine/boosterAcquisition.js'

function formatTime(ms) {
  if (ms <= 0) return 'Prêt !'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`
  return `${s}s`
}

export default function FreeBoosterTimer({ onClaim }) {
  const { freeBoosterQueue, lastFreeBoosterClaimed, activeGenForFreeBooster, tickFreeBoosterQueue } = useGameStore()
  const [timeLeft, setTimeLeft] = useState(0)

  useEffect(() => {
    const update = () => {
      tickFreeBoosterQueue()
      if (freeBoosterQueue < 3 && lastFreeBoosterClaimed) {
        const timer = getFreeBoosterTimer(activeGenForFreeBooster)
        const elapsed = Date.now() - lastFreeBoosterClaimed
        setTimeLeft(Math.max(0, timer - elapsed))
      } else {
        setTimeLeft(0)
      }
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [freeBoosterQueue, lastFreeBoosterClaimed, activeGenForFreeBooster])

  const isReady = freeBoosterQueue > 0
  const isFull = freeBoosterQueue >= 3

  return (
    <div className="flex items-center gap-3 bg-game-card rounded-xl p-3 border border-game-border">
      <div className="text-2xl">⏱️</div>
      <div className="flex-1">
        <p className="text-xs text-gray-400 font-medium">Booster gratuit</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={`w-6 h-2.5 rounded-full transition-all ${i < freeBoosterQueue ? 'bg-green-500' : 'bg-gray-700'}`}
            />
          ))}
          <span className="text-xs text-gray-400 ml-1">{freeBoosterQueue}/3</span>
        </div>
        {!isFull && (
          <p className="text-[11px] text-yellow-400 mt-0.5">{formatTime(timeLeft)}</p>
        )}
      </div>
      <button
        onClick={onClaim}
        disabled={!isReady}
        className={`
          px-3 py-2 rounded-lg text-sm font-bold transition-all
          ${isReady
            ? 'bg-green-600 hover:bg-green-500 text-white active:scale-95'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
        `}
      >
        {isReady ? 'Ouvrir' : 'Attendre'}
      </button>
    </div>
  )
}
