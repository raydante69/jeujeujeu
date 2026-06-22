import React, { useState } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { openBooster, openMultiBooster, BOOSTER_PRICES } from '../engine/boosterAcquisition.js'
import { GEN_UNLOCKS } from '../data/genUnlocks.js'
import FreeBoosterTimer from '../components/FreeBoosterTimer.jsx'

export default function ShopScreen() {
  const { money, spendMoney, unlockedGens, setPendingBoosters, navigate, freeBoosterQueue, claimFreeBooster, activeGenForFreeBooster } = useGameStore()
  const [selectedGen, setSelectedGen] = useState(1)
  const [buyMsg, setBuyMsg] = useState(null)

  const price1 = BOOSTER_PRICES[selectedGen] || 100
  const price10 = Math.floor(price1 * 10 * 0.80)

  function showMsg(msg, type = 'ok') {
    setBuyMsg({ msg, type })
    setTimeout(() => setBuyMsg(null), 2000)
  }

  function handleBuy(count) {
    const total = count === 1 ? price1 : price10
    if (!spendMoney(total)) {
      showMsg('Pas assez de ₽ !', 'error')
      return
    }
    const cards = count === 1
      ? openBooster(selectedGen)
      : openMultiBooster(selectedGen, 10)
    setPendingBoosters(cards)
    navigate('opening')
  }

  function handleFree() {
    if (!claimFreeBooster()) return
    const cards = openBooster(activeGenForFreeBooster)
    setPendingBoosters(cards)
    navigate('opening')
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

        {/* Free booster */}
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
                  className={`
                    flex-shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition-all
                    ${active ? 'bg-red-600 text-white' : unlocked ? 'bg-game-card text-gray-300 hover:bg-game-border' : 'bg-game-card text-gray-600 cursor-not-allowed'}
                  `}
                >
                  {!unlocked ? '🔒' : ''} Gen {id}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-gray-500 mt-1">{GEN_UNLOCKS[selectedGen]?.name}</p>
        </div>

        {/* Booster visuel */}
        <div className="bg-game-card rounded-2xl p-5 border border-game-border text-center">
          <div className="text-5xl mb-3 animate-float">📦</div>
          <p className="font-bold text-white text-base">Booster Gen {selectedGen}</p>
          <p className="text-gray-400 text-xs mt-1">5 cartes — au moins 1 peu commune</p>
          <div className="flex justify-center gap-2 mt-4">
            {['C', 'C', 'UC', 'R?', '★?'].map((label, i) => (
              <div key={i} className="w-8 h-12 rounded-md bg-gray-800 border border-gray-700 flex items-end justify-center pb-1">
                <span className="text-[8px] text-gray-500 font-bold">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Message feedback */}
        {buyMsg && (
          <div className={`rounded-xl px-4 py-3 text-sm font-bold text-center ${buyMsg.type === 'error' ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'}`}>
            {buyMsg.msg}
          </div>
        )}

        {/* Buy buttons */}
        <div className="space-y-3">
          <button
            onClick={() => handleBuy(1)}
            className="w-full py-4 bg-blue-700 hover:bg-blue-600 active:scale-95 text-white font-bold rounded-xl transition-all flex items-center justify-between px-5"
          >
            <span>1 Booster</span>
            <span className="bg-blue-900/50 rounded-lg px-3 py-1 text-sm">{price1} ₽</span>
          </button>

          <button
            onClick={() => handleBuy(10)}
            className="w-full py-4 bg-purple-700 hover:bg-purple-600 active:scale-95 text-white font-bold rounded-xl transition-all flex items-center justify-between px-5 relative overflow-hidden"
          >
            <div className="text-left">
              <p>×10 Boosters</p>
              <p className="text-xs font-normal text-purple-300 mt-0.5">−20% · 1 Rare garantie</p>
            </div>
            <span className="bg-purple-900/50 rounded-lg px-3 py-1 text-sm">{price10} ₽</span>
            <div className="absolute top-1.5 right-16 bg-yellow-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded">
              −20%
            </div>
          </button>
        </div>

        {/* Rarities legend */}
        <div className="bg-game-card rounded-xl p-4 border border-game-border">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Raretés</p>
          <div className="space-y-1.5">
            {[
              ['Commune',      '#9ca3af', '40%'],
              ['Peu commune',  '#4ade80', '30%'],
              ['Rare',         '#60a5fa', '20%'],
              ['Holographique','#c084fc',  '8%'],
              ['Ultra Rare',   '#fb923c',  '2%'],
            ].map(([label, color, pct]) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs text-gray-300">{label}</span>
                </div>
                <span className="text-xs text-gray-500">{pct}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
