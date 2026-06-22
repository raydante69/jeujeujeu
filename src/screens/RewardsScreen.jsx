import React, { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { getGym } from '../data/gyms.js'
import { openBooster } from '../engine/boosterAcquisition.js'
import PokemonCard from '../components/PokemonCard.jsx'

export default function RewardsScreen() {
  const { lastBattleResult, currentGymId, addToCollection, navigate } = useGameStore()
  const [rewardCard, setRewardCard] = useState(null)
  const [shown, setShown] = useState(false)

  const won      = lastBattleResult?.winner === 'player'
  const nodeType = lastBattleResult?.nodeType || 'wild'
  const isGymWin = won && nodeType === 'gym'
  // currentGymId was already incremented by earnBadge inside CombatScreen
  const prevGymId = currentGymId - 1
  const gym = getGym(prevGymId) || getGym(1)

  useEffect(() => {
    if (!lastBattleResult) { navigate('map'); return }

    if (isGymWin) {
      const cardRarity = lastBattleResult.cardRarity || gym?.reward?.card
      const [card] = openBooster(1)
      if (card) {
        if (cardRarity) card.rarity = cardRarity
        addToCollection([card])
        setRewardCard(card)
      }
    }

    setTimeout(() => setShown(true), 250)
  }, []) // eslint-disable-line

  if (!lastBattleResult) return null

  return (
    <div className="min-h-screen bg-game-bg flex flex-col items-center justify-center px-6 py-10">
      <div className={`w-full max-w-sm transition-all duration-500 ${shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

        {won ? (
          <>
            <div className="text-center mb-6">
              <div className="text-6xl mb-3">{isGymWin ? '🏆' : '✅'}</div>
              <h2 className="font-game text-base text-white">Victoire !</h2>
              {isGymWin && (
                <p className="text-gray-400 text-sm mt-1">
                  Badge <span className="text-yellow-400 font-bold">{lastBattleResult.badgeName || gym?.reward?.badge}</span> obtenu !
                </p>
              )}
            </div>

            <div className="bg-game-card rounded-2xl p-4 border border-green-800/40 space-y-3 mb-5">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Récompenses</p>
              {!!lastBattleResult.rewardMoney && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">💰 Argent</span>
                  <span className="text-yellow-400 font-bold">+{lastBattleResult.rewardMoney} ₽</span>
                </div>
              )}
              {!!lastBattleResult.rewardCrystals && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">💎 Cristaux</span>
                  <span className="text-blue-400 font-bold">+{lastBattleResult.rewardCrystals}</span>
                </div>
              )}
              {isGymWin && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">🃏 Carte bonus</span>
                  <span className="text-purple-400 font-bold capitalize">
                    {lastBattleResult.cardRarity || gym?.reward?.card}
                  </span>
                </div>
              )}
            </div>

            {rewardCard && (
              <div className="flex justify-center mb-6">
                <div className="w-40">
                  <PokemonCard pokemon={rewardCard} />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => navigate('map')}
                className="w-full py-4 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold rounded-xl text-sm transition-all"
              >
                🗺️ Continuer la route
              </button>
              <button
                onClick={() => navigate('collection')}
                className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl text-sm transition-all"
              >
                📦 Voir ma collection
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="text-6xl mb-3">😞</div>
              <h2 className="font-game text-base text-white">Défaite</h2>
              <p className="text-gray-400 text-sm mt-2">
                Ton équipe n'était pas assez forte.<br />Ouvre des boosters et reviens !
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate('map')}
                className="w-full py-4 bg-gray-800 hover:bg-gray-700 active:scale-95 text-gray-300 font-bold rounded-xl text-sm transition-all"
              >
                🗺️ Retour à la carte
              </button>
              <button
                onClick={() => navigate('shop')}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm transition-all"
              >
                🛍️ Ouvrir des boosters
              </button>
              <button
                onClick={() => navigate('team')}
                className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl text-sm transition-all"
              >
                ⚔️ Changer d'équipe
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
