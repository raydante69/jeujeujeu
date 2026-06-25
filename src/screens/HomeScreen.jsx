import React, { useEffect, useMemo } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { useRunStore } from '../store/runStore.js'
import { useAuthStore } from '../store/authStore.js'
import { biomeForWave } from '../data/biomes.js'
import { computeRank } from '../data/ranks.js'
import { ACHIEVEMENTS, achievementProgress } from '../data/achievements.js'
import { LATEST_VERSION } from '../data/patchNotes.js'
import { FIREBASE_ENABLED } from '../firebase.js'

export default function HomeScreen() {
  const {
    navigate, crystals, money, collection, daily, ensureDaily, claimQuest, stats,
    tickDailyStreak, dailyStreak, achievementsClaimed, badgesEarned, isChampion, maxAscension,
    lastSeenVersion,
  } = useGameStore()
  const { bestWave, bestFlawlessWave, totalRuns, active, wave, abandonRun } = useRunStore()
  const { user, logout, saveToCloud, syncStatus } = useAuthStore()
  const ownedSpecies = new Set(collection.map(c => c.id)).size
  const isNew = ownedSpecies === 0 && totalRuns === 0

  useEffect(() => { ensureDaily(); tickDailyStreak() }, []) // eslint-disable-line

  const quests = daily?.quests || []
  const claimable = quests.filter(q => q.progress >= q.target && !q.claimed).length

  const rank = computeRank({ bestWave, isChampion })

  // Count achievements ready to claim (for the 🏆 button badge).
  const claimableAch = useMemo(() => {
    const ctx = {
      stats,
      pokedexCount: ownedSpecies,
      shinyCount: new Set((collection || []).filter(c => c.shiny).map(c => c.id)).size,
      bestWave, bestFlawlessWave,
      badges: (badgesEarned || []).length,
      champion: isChampion, dailyStreak,
    }
    return ACHIEVEMENTS.filter(a => !achievementsClaimed.includes(a.id) && achievementProgress(a, ctx) >= a.target).length
  }, [stats, collection, ownedSpecies, bestWave, bestFlawlessWave, badgesEarned, isChampion, dailyStreak, achievementsClaimed])

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: 'radial-gradient(ellipse at top, #1a1030 0%, #0a0a14 70%)' }}>
      <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full bg-purple-700/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-24 w-96 h-96 rounded-full bg-red-700/10 blur-3xl pointer-events-none" />

      {/* Top resources */}
      <div className="px-4 pt-10 pb-2 flex justify-between items-center max-w-lg mx-auto w-full relative z-10">
        <div className="flex gap-2">
          <Pill icon="💰" value={money.toLocaleString('fr')} />
          <Pill icon="💎" value={crystals} />
        </div>
        <div className="flex items-center gap-2">
          <Pill icon="📕" value={`${ownedSpecies}/151`} />
          {FIREBASE_ENABLED && (
            user ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={saveToCloud}
                  title="Sauvegarder"
                  className="w-7 h-7 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-sm active:scale-90 transition-all"
                >
                  {syncStatus === 'saving' ? '🔄' : syncStatus === 'error' ? '⚠️' : '☁️'}
                </button>
                <button
                  onClick={logout}
                  title={`Déconnexion (${user.displayName || user.email})`}
                  className="w-7 h-7 rounded-full overflow-hidden border border-white/20 flex-shrink-0"
                >
                  {user.photoURL
                    ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                    : <span className="text-xs">👤</span>}
                </button>
              </div>
            ) : null
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 max-w-lg mx-auto w-full relative z-10">
        <div className="flex flex-col items-center gap-5 py-4">
          {/* Logo */}
          <div className="text-center">
            <div className="text-5xl mb-2 animate-float">⚡</div>
            <h1 className="font-game text-2xl text-white tracking-wide leading-tight">Poké<span className="text-red-500">Rift</span></h1>
            <p className="text-gray-500 text-xs mt-2 uppercase tracking-[0.3em]">Expédition Sans Fin</p>
          </div>

          {/* Onboarding for first-time players */}
          {isNew && (
            <div className="w-full rounded-2xl p-4 border border-yellow-700/40 bg-yellow-900/10 text-center">
              <p className="text-yellow-300 font-bold text-sm">👋 Bienvenue dresseur !</p>
              <p className="text-gray-400 text-xs mt-1">Commence par <span className="text-white font-bold">ouvrir un booster gratuit</span> pour obtenir tes premiers Pokémon, puis lance une expédition.</p>
              <button onClick={() => navigate('shop')} className="mt-3 px-5 py-2.5 bg-yellow-500 text-black text-sm font-black rounded-xl active:scale-95 transition-all">🎴 Ouvrir mon premier booster</button>
            </div>
          )}

          {/* Best wave banner */}
          <div className="w-full rounded-2xl p-5 text-center border border-purple-800/40 relative" style={{ background: 'linear-gradient(160deg, rgba(168,85,247,0.12), rgba(0,0,0,0.2))' }}>
            {/* Rank badge */}
            <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full border" style={{ borderColor: rank.color + '66', background: rank.color + '1a' }}>
              <span className="text-sm">{rank.icon}</span>
              <span className="text-[10px] font-black" style={{ color: rank.color }}>{rank.name}</span>
            </div>
            <p className="text-[10px] text-purple-300/70 uppercase tracking-widest font-bold">Record</p>
            <p className="font-game text-3xl text-white mt-1">Vague {bestWave}</p>
            <p className="text-xs text-gray-500 mt-1">
              {totalRuns} expédition{totalRuns > 1 ? 's' : ''} · biome {biomeForWave(bestWave || 1).emoji}
              {maxAscension > 0 && <span className="ml-1 text-red-300/80 font-bold">· 🔥 Asc.{maxAscension} débloquée</span>}
            </p>
            {rank.toNext != null && rank.next && (
              <p className="text-[9px] text-gray-600 mt-1">Plus que {rank.toNext} vague{rank.toNext > 1 ? 's' : ''} avant {rank.next.icon} {rank.next.name}</p>
            )}
          </div>

          {/* News / actualités */}
          <button onClick={() => navigate('news')}
            className="relative w-full rounded-2xl p-3 border border-sky-700/40 bg-sky-900/10 flex items-center gap-2.5 active:scale-95 transition-all hover:bg-sky-900/20">
            <span className="text-2xl">📰</span>
            <div className="min-w-0 text-left flex-1">
              <p className="text-sm font-black text-sky-200 leading-none">Actualités</p>
              <p className="text-[9px] text-gray-500 uppercase tracking-wide mt-0.5">Dernières mises à jour · v{LATEST_VERSION}</p>
            </div>
            {lastSeenVersion !== LATEST_VERSION && (
              <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-sky-500 text-white animate-pulse">NOUVEAU</span>
            )}
          </button>

          {/* Daily streak + Trophies row */}
          <div className="w-full grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-3 border border-orange-700/40 bg-orange-900/10 flex items-center gap-2.5">
              <span className="text-2xl">🔥</span>
              <div className="min-w-0">
                <p className="text-base font-black text-orange-300 leading-none tabular-nums">{dailyStreak} <span className="text-[10px] text-orange-400/70 font-bold">j</span></p>
                <p className="text-[9px] text-gray-500 uppercase tracking-wide mt-0.5">Série</p>
              </div>
            </div>
            <button onClick={() => navigate('achievements')} className="relative rounded-2xl p-3 border border-yellow-700/40 bg-yellow-900/10 flex items-center gap-2.5 active:scale-95 transition-all hover:bg-yellow-900/20">
              <span className="text-2xl">🏆</span>
              <div className="min-w-0 text-left">
                <p className="text-base font-black text-yellow-300 leading-none tabular-nums">{achievementsClaimed.length}<span className="text-[10px] text-yellow-400/70 font-bold">/{ACHIEVEMENTS.length}</span></p>
                <p className="text-[9px] text-gray-500 uppercase tracking-wide mt-0.5">Trophées</p>
              </div>
              {claimableAch > 0 && (
                <span className="absolute -top-1.5 -right-1.5 text-[9px] font-black w-5 h-5 rounded-full bg-green-500 text-black flex items-center justify-center animate-pulse">{claimableAch}</span>
              )}
            </button>
          </div>

          {/* CTA */}
          <div className="w-full space-y-3">
            {active ? (
              <>
                <button onClick={() => navigate('run')} className="w-full py-4 bg-gradient-to-r from-purple-600 to-red-600 hover:brightness-110 active:scale-95 text-white font-black rounded-2xl text-base transition-all shadow-lg shadow-purple-900/40">▶ Reprendre — Vague {wave}</button>
                <button onClick={() => { abandonRun(); navigate('runsetup') }} className="w-full py-3 bg-gray-900/70 hover:bg-gray-800 text-gray-400 font-bold rounded-xl text-sm transition-all border border-gray-800">+ Nouvelle expédition (abandonne la course)</button>
              </>
            ) : (
              <button onClick={() => navigate('runsetup')} className="w-full py-5 bg-gradient-to-r from-purple-600 to-red-600 hover:brightness-110 active:scale-95 text-white font-black rounded-2xl text-lg transition-all shadow-lg shadow-purple-900/40">⚔️ LANCER L'EXPÉDITION</button>
            )}
          </div>

          {/* Daily quests */}
          {quests.length > 0 && (
            <div className="w-full rounded-2xl p-4 border border-game-border bg-game-surface/70">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-white uppercase tracking-widest">📋 Quêtes du jour</p>
                {claimable > 0 && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 animate-pulse">{claimable} à réclamer</span>}
              </div>
              <div className="space-y-2.5">
                {quests.map(q => {
                  const done = q.progress >= q.target
                  return (
                    <div key={q.id} className="flex items-center gap-3">
                      <span className="text-lg flex-shrink-0">{q.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-gray-300 font-bold truncate">{q.label}</p>
                        <div className="h-1.5 rounded-full bg-black/50 mt-1 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (q.progress / q.target) * 100)}%`, background: done ? '#4ade80' : '#a855f7' }} />
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        {q.claimed ? (
                          <span className="text-[10px] text-gray-600 font-bold">✓ Réclamé</span>
                        ) : done ? (
                          <button onClick={() => claimQuest(q.id)} className="text-[10px] font-black px-2.5 py-1.5 rounded-lg bg-green-500 text-black active:scale-95 transition-all">
                            +{q.reward.crystals ? `${q.reward.crystals}💎` : ''}{q.reward.money ? ` ${q.reward.money}💰` : ''}
                          </button>
                        ) : (
                          <span className="text-[10px] text-gray-500 tabular-nums">{q.progress}/{q.target}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="w-full grid grid-cols-4 gap-2">
            <Stat label="Captures" value={stats?.catches || 0} />
            <Stat label="Boosters" value={stats?.boostersOpened || 0} />
            <Stat label="Victoires" value={stats?.battlesWon || 0} />
            <Stat label="Runs" value={totalRuns} />
          </div>

          <p className="text-gray-700 text-[10px] text-center pb-4">Fan-made · sprites PokeAPI · non officiel</p>
        </div>
      </div>
    </div>
  )
}

function Pill({ icon, value }) {
  return (
    <div className="flex items-center gap-1.5 bg-black/40 rounded-full px-3 py-1.5 border border-white/5">
      <span className="text-sm">{icon}</span>
      <span className="text-white font-bold text-xs">{value}</span>
    </div>
  )
}

function QuickLink({ icon, label, onClick }) {
  return (
    <button onClick={onClick} className="rounded-2xl p-3 bg-game-surface/80 hover:bg-game-surface border border-game-border text-center transition-all active:scale-95">
      <div className="text-2xl mb-1">{icon}</div>
      <p className="text-white font-bold text-[11px]">{label}</p>
    </button>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl p-2 bg-black/30 border border-white/5 text-center">
      <p className="text-white font-black text-base tabular-nums">{value}</p>
      <p className="text-[8px] text-gray-500 uppercase tracking-wide">{label}</p>
    </div>
  )
}
