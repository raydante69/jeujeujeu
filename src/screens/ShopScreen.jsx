import React, { useState } from 'react'
import { useGameStore, pointsUpgradeCost, MAX_POINTS, MAX_CARDS_PER_SLOT, CARDS_PER_SLOT_UPGRADE_COST } from '../store/gameStore.js'
import { openBooster, BOOSTER_TYPES, boosterPrice, RARITIES, BOOSTER_ODDS } from '../engine/boosterAcquisition.js'
import { GEN_UNLOCKS } from '../data/genUnlocks.js'
import FreeBoosterTimer from '../components/FreeBoosterTimer.jsx'

const GEN_THEME = {
  1: { emoji: '🔴', tint: '#ef4444', region: 'Kanto' },
  2: { emoji: '🟡', tint: '#eab308', region: 'Johto' },
  3: { emoji: '🟢', tint: '#22c55e', region: 'Hoenn' },
  4: { emoji: '🔵', tint: '#3b82f6', region: 'Sinnoh' },
  5: { emoji: '⚫', tint: '#64748b', region: 'Unova' },
  6: { emoji: '🟣', tint: '#a855f7', region: 'Kalos' },
  7: { emoji: '🟠', tint: '#f97316', region: 'Alola' },
  8: { emoji: '🔶', tint: '#f43f5e', region: 'Galar' },
  9: { emoji: '🟪', tint: '#8b5cf6', region: 'Paldea' },
}

export default function ShopScreen() {
  const {
    money, crystals, rubies, spendMoney, unlockedGens, setPendingBoosters, navigate,
    claimFreeBooster, activeGenForFreeBooster, sessionBuys, recordBoosterBuy,
    recordStat, reportQuest, starterPoints, buyStarterPoints,
    cardsPerSlot, upgradeCardsPerSlot,
  } = useGameStore()
  const [selectedGen, setSelectedGen] = useState(1)
  const [buyMsg, setBuyMsg] = useState(null)
  const [oddsFor, setOddsFor] = useState('single')

  const theme = GEN_THEME[selectedGen] || GEN_THEME[1]

  function showMsg(msg, type = 'ok') {
    setBuyMsg({ msg, type })
    setTimeout(() => setBuyMsg(null), 1800)
  }

  function handleBuy(boosterId) {
    const buys = sessionBuys?.[boosterId] || 0
    const price = boosterPrice(boosterId, selectedGen, buys)
    if (!spendMoney(price)) {
      showMsg('Pas assez de ₽ !', 'error')
      return
    }
    recordBoosterBuy(boosterId)
    recordStat('boostersOpened')
    reportQuest('open', 1)
    setPendingBoosters(openBooster(selectedGen, boosterId))
    navigate('opening')
  }

  function handleFree() {
    if (!claimFreeBooster()) return
    recordStat('boostersOpened')
    reportQuest('open', 1)
    // Free booster uses 'free' rates (lowest drop rates)
    setPendingBoosters(openBooster(activeGenForFreeBooster, 'free'))
    navigate('opening')
  }

  return (
    <div className="min-h-screen bg-game-bg flex flex-col">
      {/* Header */}
      <div className="bg-game-surface border-b border-game-border px-4 pt-10 pb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <h2 className="font-game text-sm text-white">Boutique</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-game-card rounded-lg px-2.5 py-1.5">
              <span className="text-yellow-400 text-sm">💰</span>
              <span className="text-white font-bold text-xs tabular-nums">{money.toLocaleString('fr')}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-game-card rounded-lg px-2.5 py-1.5">
              <span className="text-cyan-300 text-sm">💎</span>
              <span className="text-white font-bold text-xs tabular-nums">{crystals.toLocaleString('fr')}</span>
            </div>
            {rubies > 0 && (
              <div className="flex items-center gap-1.5 bg-game-card rounded-lg px-2.5 py-1.5">
                <span className="text-red-400 text-sm">🔴</span>
                <span className="text-white font-bold text-xs tabular-nums">{rubies}</span>
              </div>
            )}
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
              const t = GEN_THEME[id] || GEN_THEME[1]
              return (
                <button
                  key={id}
                  onClick={() => unlocked && setSelectedGen(id)}
                  disabled={!unlocked}
                  className="flex-shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition-all"
                  style={{
                    background: active ? t.tint : '#0f172a',
                    color: active ? '#fff' : unlocked ? '#cbd5e1' : '#475569',
                    border: `1.5px solid ${active ? t.tint : '#1e293b'}`,
                    opacity: unlocked ? 1 : 0.55,
                  }}
                >
                  {unlocked ? t.emoji : '🔒'} Gen {id}
                </button>
              )
            })}
          </div>
          <p className="text-xs mt-1.5" style={{ color: theme.tint }}>
            {GEN_UNLOCKS[selectedGen]?.name}
          </p>
        </div>

        {/* Message feedback */}
        {buyMsg && (
          <div className={`rounded-xl px-4 py-2.5 text-sm font-bold text-center ${buyMsg.type === 'error' ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'}`}>
            {buyMsg.msg}
          </div>
        )}

        {/* Booster formats */}
        <div className="space-y-3">
          {BOOSTER_TYPES.map(b => {
            const buys = sessionBuys?.[b.id] || 0
            const price = boosterPrice(b.id, selectedGen, buys)
            const afford = money >= price
            const ramped = buys > 0
            return (
              <div
                key={b.id}
                className="rounded-2xl p-4 border relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${b.color}1f, #0f172a)`, borderColor: b.color + '55' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-14 h-16 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
                    style={{ background: b.color + '22', border: `1px solid ${b.color}66` }}
                  >
                    {b.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-white text-base">{b.name}</p>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: b.color + '33', color: b.color }}>
                        {b.cards} carte{b.cards > 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">{b.tagline}</p>
                    <div className="flex gap-1 mt-2">
                      {b.slots.map((slot, i) => (
                        <div
                          key={i}
                          className="w-6 h-8 rounded-[4px] border flex items-end justify-center pb-0.5"
                          style={{
                            background: slot === 'guarantee' ? b.color + '33' : '#1e293b',
                            borderColor: slot === 'guarantee' ? b.color : '#334155',
                          }}
                        >
                          <span className="text-[7px] font-black" style={{ color: slot === 'guarantee' ? b.color : '#64748b' }}>
                            {slot === 'guarantee' ? '★' : slot === 'veryrare' ? 'TR' : '·'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleBuy(b.id)}
                  disabled={!afford}
                  className={`w-full mt-3 py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${afford ? 'active:scale-95 text-white' : 'bg-gray-900 text-gray-600'}`}
                  style={afford ? { background: b.color } : {}}
                >
                  <span>Ouvrir</span>
                  <span className="bg-black/30 rounded-lg px-2.5 py-1 text-xs tabular-nums">{price.toLocaleString('fr')} ₽</span>
                </button>

                {ramped && (
                  <p className="text-[9px] text-amber-400/80 mt-1.5 text-center">
                    ↑ Prix +{Math.round((Math.pow(1.18, buys) - 1) * 100)}% — acheté {buys}× cette session
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {/* Cards per slot upgrade */}
        <div className="rounded-2xl p-4 border" style={{ background: 'linear-gradient(135deg, #7c3aed22, #0f172a)', borderColor: '#7c3aed55' }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: '#7c3aed22', border: '1px solid #7c3aed66' }}>🃏</div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-sm">Double Carte</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Chaque Pokémon propose 2 attaques au lieu d'1 lors des combats.</p>
              <p className="text-[11px] mt-1">
                <span className="text-violet-300 font-black">{cardsPerSlot || 1}</span>
                <span className="text-gray-500"> / {MAX_CARDS_PER_SLOT} carte{MAX_CARDS_PER_SLOT > 1 ? 's' : ''} par Pokémon</span>
              </p>
            </div>
          </div>
          {(cardsPerSlot || 1) >= MAX_CARDS_PER_SLOT ? (
            <div className="w-full mt-3 py-2.5 rounded-xl text-center text-xs font-black bg-violet-900/40 text-violet-400">Double Carte déverrouillé ✓</div>
          ) : (
            <button
              onClick={() => {
                const spent = upgradeCardsPerSlot()
                showMsg(spent === false ? 'Pas assez de 💎 cristaux !' : '2 cartes par Pokémon déverrouillées !', spent === false ? 'error' : 'ok')
              }}
              className="w-full mt-3 py-2.5 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 bg-violet-600 text-white active:scale-95"
            >
              <span>Déverrouiller</span>
              <span className="bg-black/20 rounded-lg px-2.5 py-1 text-xs tabular-nums">{CARDS_PER_SLOT_UPGRADE_COST} 💎</span>
            </button>
          )}
        </div>

        {/* Team point capacity */}
        <div className="rounded-2xl p-4 border" style={{ background: 'linear-gradient(135deg, #10b98122, #0f172a)', borderColor: '#10b98155' }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: '#10b98122', border: '1px solid #10b98166' }}>💠</div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-sm">Capacité d'équipe</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Plus de points = équipe de départ plus grande/forte.</p>
              <p className="text-[11px] mt-1"><span className="text-emerald-300 font-black">{starterPoints}</span><span className="text-gray-500"> / {MAX_POINTS} points</span></p>
            </div>
          </div>
          {starterPoints >= MAX_POINTS ? (
            <div className="w-full mt-3 py-2.5 rounded-xl text-center text-xs font-black bg-emerald-900/40 text-emerald-400">Capacité maximale atteinte ✓</div>
          ) : (
            <button
              onClick={() => {
                const spent = buyStarterPoints()
                showMsg(spent === false ? 'Pas assez de 💎 cristaux !' : '+2 points d\'équipe !', spent === false ? 'error' : 'ok')
              }}
              className="w-full mt-3 py-2.5 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 bg-emerald-500 text-black active:scale-95"
            >
              <span>+2 points</span>
              <span className="bg-black/20 rounded-lg px-2.5 py-1 text-xs tabular-nums">{pointsUpgradeCost(starterPoints)} 💎</span>
            </button>
          )}
        </div>

        {/* Pull rates — per booster type */}
        <div className="bg-game-card rounded-xl p-4 border border-game-border">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Taux de rareté</p>
            <div className="flex gap-1">
              {[{ k: 'single', icon: '🎴' }, { k: 'pack5', icon: '📦' }].map(({ k, icon }) => (
                <button key={k} onClick={() => setOddsFor(k)}
                  className={`text-[8px] font-black px-2 py-0.5 rounded-full transition-all ${oddsFor === k ? 'bg-white/20 text-white' : 'text-gray-600 hover:text-gray-400'}`}>
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            {(BOOSTER_ODDS[oddsFor] || []).map(o => (
              <div key={o.key} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: o.color }} />
                  <span className="text-[10px] text-gray-300">{o.label}</span>
                </div>
                <span className="text-[10px] text-gray-500 tabular-nums font-bold">{o.pct}</span>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-gray-600 mt-3 leading-relaxed">
            Shiny : 0.3% (Solo) → 0.6% (Pack 5). Holo : 2% → 4%. Le Pack 5 garantit Rare+ sur la 5ème carte.
          </p>
        </div>
      </div>
    </div>
  )
}
