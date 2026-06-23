import React, { useState } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { pickMilestoneRewards } from '../data/items.js'

const RARITY_COLORS = {
  commune:       '#9ca3af',
  'peu-commune': '#4ade80',
  rare:          '#60a5fa',
  'tres-rare':   '#a78bfa',
  epique:        '#f472b6',
  legendaire:    '#fbbf24',
}

const RARITY_LABELS = {
  commune:       'Commune',
  'peu-commune': 'Peu commune',
  rare:          'Rare',
  'tres-rare':   'Très rare',
  epique:        'Épique',
  legendaire:    'Légendaire',
}

export default function MilestoneRewardScreen() {
  const { navigate, addMoney, addDiamonds, addRubies, addToInventory, combatWins } = useGameStore()
  const [rewards, setRewards] = useState(() => pickMilestoneRewards(3))
  const [rerollsLeft, setRerollsLeft] = useState(1)
  const [claimed, setClaimed] = useState(false)
  const [claimedItem, setClaimedItem] = useState(null)

  function handleReroll() {
    if (rerollsLeft <= 0) return
    setRerollsLeft(r => r - 1)
    setRewards(pickMilestoneRewards(3))
  }

  function handleClaim(item) {
    if (claimed) return
    if (item.type === 'money')   addMoney(item.value)
    if (item.type === 'diamond') addDiamonds(item.value)
    if (item.type === 'ruby')    addRubies(item.value)
    if (item.type === 'potion' || item.type === 'pokeball') addToInventory(item)
    setClaimed(true)
    setClaimedItem(item)
  }

  function handleContinue() {
    navigate('rewards')
  }

  return (
    <div className="min-h-screen bg-game-bg flex flex-col">
      {/* Header */}
      <div className="bg-game-surface border-b border-game-border px-4 pt-10 pb-4">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-yellow-400 text-2xl mb-1">🎉</p>
          <h2 className="font-game text-sm text-white">Récompense Milestone !</h2>
          <p className="text-xs text-gray-400 mt-1">{combatWins} victoires atteintes</p>
        </div>
      </div>

      <div className="flex-1 px-4 py-6 max-w-lg mx-auto w-full flex flex-col gap-5">
        <div className="text-center">
          <p className="text-sm text-gray-300">
            {claimed ? 'Objet réclamé !' : 'Choisis une récompense parmi ces 3 objets'}
          </p>
        </div>

        {/* Reward cards */}
        <div className="grid grid-cols-3 gap-3">
          {rewards.map((item, i) => {
            const color = RARITY_COLORS[item.rarity] || '#9ca3af'
            const isSelected = claimedItem?.id === item.id
            return (
              <button
                key={`${item.id}-${i}`}
                onClick={() => handleClaim(item)}
                disabled={claimed}
                className={`rounded-2xl p-4 flex flex-col items-center gap-2 transition-all active:scale-95 border-2 ${
                  isSelected
                    ? 'scale-105 brightness-125'
                    : claimed
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:brightness-110'
                }`}
                style={{
                  backgroundColor: color + '15',
                  borderColor: isSelected ? color : color + '60',
                }}
              >
                <span className="text-3xl">{item.emoji}</span>
                <span className="text-[10px] font-bold text-white text-center leading-tight">{item.name}</span>
                <span className="text-[9px]" style={{ color }}>{RARITY_LABELS[item.rarity]}</span>
                <span className="text-[9px] text-gray-400 text-center leading-tight">{item.desc}</span>
              </button>
            )
          })}
        </div>

        {/* Reroll */}
        {!claimed && (
          <div className="text-center">
            <button
              onClick={handleReroll}
              disabled={rerollsLeft <= 0}
              className={`px-5 py-2 rounded-xl font-bold text-sm transition-all ${
                rerollsLeft > 0
                  ? 'bg-yellow-900/40 text-yellow-400 border border-yellow-700/50 hover:bg-yellow-900/60'
                  : 'bg-game-card text-gray-600 cursor-not-allowed'
              }`}
            >
              🔀 Relancer les offres ({rerollsLeft} restant)
            </button>
          </div>
        )}

        {/* Claimed message */}
        {claimed && claimedItem && (
          <div className="bg-green-900/30 border border-green-700 rounded-2xl p-4 text-center">
            <p className="text-2xl mb-1">{claimedItem.emoji}</p>
            <p className="text-sm font-bold text-green-400">{claimedItem.name} obtenu !</p>
            <p className="text-xs text-gray-400 mt-1">{claimedItem.desc}</p>
          </div>
        )}

        {/* Continue */}
        {claimed && (
          <button
            onClick={handleContinue}
            className="w-full py-4 bg-green-600 hover:bg-green-500 active:scale-95 text-white font-bold rounded-xl transition-all"
          >
            Voir les récompenses de combat →
          </button>
        )}
      </div>
    </div>
  )
}
