import React, { useMemo } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { useRunStore } from '../store/runStore.js'
import { ACHIEVEMENTS, achievementProgress } from '../data/achievements.js'
import { KANTO_BADGES, badgeUrl, isBadgeEarned, earnedBadgeCount, KANTO_TOTAL } from '../data/badges.js'

export default function ProgressionScreen() {
  const {
    navigate, collection, stats, badgesEarned, isChampion,
    dailyStreak, achievementsClaimed, claimAchievement, defeatedSpecies,
  } = useGameStore()
  const { bestWave, bestFlawlessWave } = useRunStore()

  const ctx = useMemo(() => ({
    stats,
    pokedexCount: new Set((collection || []).map(c => c.id)).size,
    shinyCount: new Set((collection || []).filter(c => c.shiny).map(c => c.id)).size,
    bestWave, bestFlawlessWave,
    badges: (badgesEarned || []).length,
    champion: isChampion, dailyStreak,
  }), [stats, collection, bestWave, bestFlawlessWave, badgesEarned, isChampion, dailyStreak])

  const rows = ACHIEVEMENTS.map(a => {
    const progress = achievementProgress(a, ctx)
    const done = progress >= a.target
    const claimed = achievementsClaimed.includes(a.id)
    return { a, progress, done, claimed }
  })
  rows.sort((x, y) => {
    const rank = (r) => (r.done && !r.claimed ? 0 : r.claimed ? 2 : 1)
    return rank(x) - rank(y)
  })
  const claimableCount = rows.filter(r => r.done && !r.claimed).length

  const beatenCount = (defeatedSpecies || []).filter(id => id >= 1 && id <= KANTO_TOTAL).length
  const dexPct = Math.round((beatenCount / KANTO_TOTAL) * 100)
  const badges = earnedBadgeCount(bestWave)
  const kantoDone = badges >= KANTO_BADGES.length

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'radial-gradient(ellipse at top, #1a1030 0%, #0a0a14 70%)' }}>
      {/* Header */}
      <div className="px-4 pt-10 pb-3 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('home')} className="text-gray-400 hover:text-white text-sm font-bold">← Retour</button>
          {claimableCount > 0 && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 animate-pulse">{claimableCount} à réclamer</span>
          )}
        </div>
        <h1 className="font-game text-xl text-white mt-3">🏅 Progression</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-10 max-w-lg mx-auto w-full space-y-5">

        {/* Kanto adventure */}
        <div className="rounded-2xl p-4 border" style={{ borderColor: kantoDone ? '#f5d60a88' : '#2a2a50', background: '#12121f' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-bold text-white text-sm">Aventure de Kanto</p>
              <p className="text-[10px] text-gray-500">Bats les 8 Champions d'Arène ({badges}/8 badges)</p>
            </div>
            {kantoDone && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300">TERMINÉE 👑</span>}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {KANTO_BADGES.map(b => {
              const earned = isBadgeEarned(b, bestWave)
              return (
                <div key={b.id} className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ background: earned ? '#1e293b' : '#0d1117', border: `1px solid ${earned ? '#475569' : '#1e293b'}` }}>
                    <img src={badgeUrl(b.n)} alt={b.name}
                      className={`w-9 h-9 object-contain ${earned ? '' : 'grayscale opacity-30'}`} loading="lazy" />
                  </div>
                  <p className={`text-[7px] font-bold text-center leading-none ${earned ? 'text-gray-300' : 'text-gray-700'}`}>{b.leader}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Battle Pokédex completion */}
        <button onClick={() => navigate('battledex')}
          className="w-full rounded-2xl p-4 border border-green-700/40 bg-green-900/10 text-left active:scale-[0.99] transition-all hover:bg-green-900/20">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-bold text-white text-sm">📕 Pokédex de combat</p>
              <p className="text-[10px] text-gray-500">Pokémon vaincus en combat — termine-les tous !</p>
            </div>
            <span className="text-sm font-black text-green-300">{beatenCount}/{KANTO_TOTAL}</span>
          </div>
          <div className="h-2.5 rounded-full bg-black/50 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all" style={{ width: `${dexPct}%` }} />
          </div>
          <p className="text-[9px] text-gray-600 mt-1.5">Appuie pour voir le Pokédex →</p>
        </button>

        {/* Achievements */}
        <div>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">🏆 Succès</p>
          <div className="space-y-2.5">
            {rows.map(({ a, progress, done, claimed }) => (
              <div key={a.id}
                className={`rounded-xl p-3 border flex items-center gap-3 transition-all ${
                  claimed ? 'border-game-border bg-black/20 opacity-70'
                    : done ? 'border-green-600/50 bg-green-900/15'
                    : 'border-game-border bg-game-surface/60'
                }`}>
                <div className={`text-2xl flex-shrink-0 ${!done && !claimed ? 'grayscale opacity-50' : ''}`}>{a.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{a.name}</p>
                  <p className="text-[10px] text-gray-500 leading-snug">{a.desc}</p>
                  {!claimed && (
                    <div className="h-1.5 rounded-full bg-black/50 mt-1.5 overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, (progress / a.target) * 100)}%`, background: done ? '#4ade80' : '#a855f7' }} />
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  {claimed ? (
                    <span className="text-[10px] text-gray-600 font-bold">✓ Obtenu</span>
                  ) : done ? (
                    <button onClick={() => claimAchievement(a.id, progress)}
                      className="text-[10px] font-black px-2.5 py-1.5 rounded-lg bg-green-500 text-black active:scale-95 transition-all">
                      +{a.reward.crystals ? `${a.reward.crystals}💎` : ''}{a.reward.money ? ` ${a.reward.money}💰` : ''}
                    </button>
                  ) : (
                    <span className="text-[10px] text-gray-500 tabular-nums">{Math.min(progress, a.target)}/{a.target}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
