import React, { useMemo } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { useRunStore } from '../store/runStore.js'
import { ACHIEVEMENTS, achievementProgress } from '../data/achievements.js'

export default function AchievementsScreen() {
  const {
    navigate, collection, stats, badgesEarned, isChampion,
    dailyStreak, achievementsClaimed, claimAchievement,
  } = useGameStore()
  const { bestWave, bestFlawlessWave } = useRunStore()

  // Context shared by every achievement's progress computation.
  const ctx = useMemo(() => ({
    stats,
    pokedexCount: new Set((collection || []).map(c => c.id)).size,
    shinyCount: new Set((collection || []).filter(c => c.shiny).map(c => c.id)).size,
    bestWave,
    bestFlawlessWave,
    badges: (badgesEarned || []).length,
    champion: isChampion,
    dailyStreak,
  }), [stats, collection, bestWave, bestFlawlessWave, badgesEarned, isChampion, dailyStreak])

  const rows = ACHIEVEMENTS.map(a => {
    const progress = achievementProgress(a, ctx)
    const done = progress >= a.target
    const claimed = achievementsClaimed.includes(a.id)
    return { a, progress, done, claimed }
  })
  // Order: claimable first, then in-progress, then claimed.
  rows.sort((x, y) => {
    const rank = (r) => (r.done && !r.claimed ? 0 : r.claimed ? 2 : 1)
    return rank(x) - rank(y)
  })

  const unlockedCount = rows.filter(r => r.claimed).length
  const claimableCount = rows.filter(r => r.done && !r.claimed).length

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'radial-gradient(ellipse at top, #1a1030 0%, #0a0a14 70%)' }}>
      {/* Header */}
      <div className="px-4 pt-10 pb-3 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('home')} className="text-gray-400 hover:text-white text-sm font-bold flex items-center gap-1">
            ← Retour
          </button>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
            {unlockedCount}/{ACHIEVEMENTS.length} débloqués
          </p>
        </div>
        <h1 className="font-game text-xl text-white mt-3 flex items-center gap-2">🏆 Trophées</h1>
        {claimableCount > 0 && (
          <p className="text-[11px] text-green-300 mt-1 animate-pulse font-bold">{claimableCount} récompense{claimableCount > 1 ? 's' : ''} à réclamer !</p>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 max-w-lg mx-auto w-full">
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
  )
}
