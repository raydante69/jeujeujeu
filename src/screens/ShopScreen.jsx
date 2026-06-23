import React, { useState } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { openBooster, openMultiBooster, BOOSTER_TIERS } from '../engine/boosterAcquisition.js'
import { GEN_UNLOCKS } from '../data/genUnlocks.js'
import FreeBoosterTimer from '../components/FreeBoosterTimer.jsx'

const HAND_UPGRADE_COST = 500

export default function ShopScreen() {
  const {
    money, spendMoney, unlockedGens, setPendingBoosters, navigate,
    freeBoosterQueue, claimFreeBooster, activeGenForFreeBooster,
    handSize = 5, upgradeHandSize,
  } = useGameStore()

  const [selectedGen, setSelectedGen] = useState(1)
  const [selectedTier, setSelectedTier] = useState('standard')
  const [buyMsg, setBuyMsg] = useState(null)

  function showMsg(msg, type = 'ok') {
    setBuyMsg({ msg, type })
    setTimeout(() => setBuyMsg(null), 2500)
  }

  function handleBuy(tier) {
    const price = BOOSTER_TIERS[tier]?.price || 100
    if (!spendMoney(price)) { showMsg('Pas assez de ₽ !', 'error'); return }
    const cards = openBooster(selectedGen, { tier })
    setPendingBoosters(cards)
    navigate('opening')
  }

  function handleFree() {
    if (!claimFreeBooster()) return
    const cards = openBooster(activeGenForFreeBooster, { tier: 'free' })
    setPendingBoosters(cards)
    navigate('opening')
  }

  function handleHandUpgrade() {
    if (handSize >= 10) { showMsg('Main déjà au maximum (10) !', 'error'); return }
    if (!spendMoney(HAND_UPGRADE_COST)) { showMsg('Pas assez de ₽ !', 'error'); return }
    upgradeHandSize()
    showMsg(`Main agrandie ! Taille : ${handSize + 1} cartes ✓`)
  }

  const TIER_COLORS = {
    standard: 'bg-blue-700 hover:bg-blue-600 border-blue-500',
    premium:  'bg-purple-700 hover:bg-purple-600 border-purple-500',
    deluxe:   'bg-yellow-700 hover:bg-yellow-600 border-yellow-500',
  }

  return (
    <div className="min-h-screen bg-game-bg flex flex-col">
      {/* Header */}
      <div className="bg-game-surface border-b border-game-border px-4 pt-10 pb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <h2 className="font-game text-sm text-white">Shop</h2>
          <div className="flex items-center gap-2 bg-game-card rounded-lg px-3 py-1.5">
            <span className="text-yellow-400 text-base">💰</span>
            <span className="text-white font-bold text-sm">{money.toLocaleString('fr')} ₽</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full space-y-4">

        {/* Free booster timer */}
        <FreeBoosterTimer onClaim={handleFree} />

        {/* Gen selector */}
        <div>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-2">Génération</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {Object.entries(GEN_UNLOCKS).map(([genId, gen]) => {
              const id = Number(genId)
              const unlocked = unlockedGens.includes(id)
              const active = selectedGen === id
              return (
                <button
                  key={id}
                  onClick={() => unlocked && setSelectedGen(id)}
                  disabled={!unlocked}
                  className={`flex-shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                    active ? 'bg-red-600 text-white' :
                    unlocked ? 'bg-game-card text-gray-300 hover:bg-game-border' :
                    'bg-game-card text-gray-600 cursor-not-allowed'
                  }`}
                >
                  {!unlocked ? '🔒 ' : ''}Gen {id}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-gray-500 mt-1">{GEN_UNLOCKS[selectedGen]?.name}</p>
        </div>

        {/* Booster visual */}
        <div className="bg-game-card rounded-2xl p-5 border border-game-border text-center">
          <div className="text-5xl mb-3 animate-float">📦</div>
          <p className="font-bold text-white text-base">Booster Gen {selectedGen}</p>
          <p className="text-gray-400 text-xs mt-1">5 cartes — shiny &amp; holo possibles</p>
        </div>

        {/* Feedback */}
        {buyMsg && (
          <div className={`rounded-xl px-4 py-3 text-sm font-bold text-center ${
            buyMsg.type === 'error' ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'
          }`}>
            {buyMsg.msg}
          </div>
        )}

        {/* Booster tiers */}
        <div className="space-y-2.5">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Acheter un Booster</p>
          {(['standard', 'premium', 'deluxe']).map(tier => {
            const t = BOOSTER_TIERS[tier]
            return (
              <button
                key={tier}
                onClick={() => handleBuy(tier)}
                className={`w-full py-3.5 active:scale-95 text-white font-bold rounded-xl transition-all flex items-center justify-between px-4 border ${TIER_COLORS[tier]}`}
              >
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                  </div>
                  <p className="text-xs font-normal text-white/60 mt-0.5">{t.desc}</p>
                </div>
                <span className="bg-black/20 rounded-lg px-3 py-1 text-sm flex-shrink-0">{t.price} ₽</span>
              </button>
            )
          })}
        </div>

        {/* Hand size upgrade */}
        <div className="bg-game-card rounded-2xl p-4 border border-game-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-300">🃏 Taille de Main</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {handSize >= 10 ? 'Maximum atteint !' : `Actuelle : ${handSize} cartes → ${handSize + 1} cartes`}
              </p>
            </div>
            <button
              onClick={handleHandUpgrade}
              disabled={handSize >= 10}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                handSize >= 10
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-700 hover:bg-indigo-600 text-white active:scale-95'
              }`}
            >
              {handSize >= 10 ? 'Max' : `${HAND_UPGRADE_COST} ₽`}
            </button>
          </div>
        </div>

        {/* Rarities legend */}
        <div className="bg-game-card rounded-xl p-4 border border-game-border">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Raretés</p>
          <div className="space-y-1.5">
            {[
              ['Commune',      '#9ca3af', 'Standard: 48%',    'Gratuit: 58%'],
              ['Peu commune',  '#4ade80', 'Standard: 30%',    'Gratuit: 28%'],
              ['Rare',         '#60a5fa', 'Standard: 14.5%',  'Gratuit: 10%'],
              ['Très rare',    '#a78bfa', 'Standard: 5%',     'Gratuit: 2.8%'],
              ['Épique',       '#f472b6', 'Standard: 2%',     'Gratuit: 0.9%'],
              ['Légendaire',   '#fbbf24', 'Standard: 0.5%',   'Gratuit: 0.3%'],
            ].map(([label, color, rateA, rateB]) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-xs text-gray-300">{label}</span>
                </div>
                <span className="text-[10px] text-gray-500">{rateA}</span>
              </div>
            ))}
            <p className="text-[10px] text-gray-600 mt-2">✨ Shiny : 0.5–3% · 🌈 Holo : 1–6% (Rare+ uniquement)</p>
          </div>
        </div>
      </div>
    </div>
  )
}
