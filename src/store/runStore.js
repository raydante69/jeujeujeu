import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { makeRunMon } from '../engine/runEngine.js'
import { makeInstance } from '../data/pokemon.js'
import { aggregateRelics } from '../data/relics.js'
import { useGameStore } from './gameStore.js'

const MAX_TEAM = 6

export const useRunStore = create(
  persist(
    (set, get) => ({
      // --- Meta (persisted across runs) ---
      bestWave: 0,
      totalRuns: 0,
      relicCodex: [],            // every relic id ever obtained (for a codex)

      // --- Active run ---
      active: false,
      wave: 1,
      gold: 0,
      balls: 3,
      team: [],                  // run mons (mutable copies, carry hp/xp/level)
      relics: [],                // relic ids owned this run
      pendingEnemy: null,        // enemy being fought / about to be fought
      lastOutcome: null,         // 'win' | 'lose'
      lastSummary: null,         // { reached, crystals, record }

      // --- Derived ---
      relicAgg: () => aggregateRelics(get().relics),

      // --- Run lifecycle ---
      startRun: (starterIds) => {
        const team = starterIds.slice(0, 3).map(id => makeRunMon(id, 5))
        // apply glass-cannon style hp penalty if such a relic somehow pre-owned (none at start)
        set({
          active: true, wave: 1, gold: 0, balls: 3,
          team, relics: [], pendingEnemy: null, lastOutcome: null,
        })
      },

      endRun: () => {
        const s = get()
        const reached = s.wave
        const newBest = Math.max(s.bestWave, reached)
        const record = newBest > s.bestWave
        const crystals = 8 + reached * 3 + (record ? 25 : 0)
        const money = 60 + reached * 12 + (record ? 100 : 0)
        useGameStore.getState().addCrystals(crystals)
        useGameStore.getState().addMoney(money)
        const summary = { reached, crystals, money, record }
        set({
          active: false,
          bestWave: newBest,
          totalRuns: s.totalRuns + 1,
          lastSummary: summary,
        })
        return summary
      },

      abandonRun: () => set({ active: false }),

      // --- Wave flow ---
      setPendingEnemy: (enemy) => set({ pendingEnemy: enemy }),
      advanceWave: () => set(s => ({ wave: s.wave + 1, pendingEnemy: null })),

      // Persist hp/xp/level changes from a battle back onto the run team.
      commitTeam: (team) => set({ team: team.map(m => ({ ...m })) }),

      setOutcome: (o) => set({ lastOutcome: o }),

      // --- Economy ---
      addGold: (n) => set(s => ({ gold: s.gold + n })),
      spendGold: (n) => {
        const s = get()
        if (s.gold < n) return false
        set({ gold: s.gold - n })
        return true
      },
      addBall: (n = 1) => set(s => ({ balls: s.balls + n })),
      useBall: () => {
        const s = get()
        if (s.balls <= 0) return false
        set({ balls: s.balls - 1 })
        return true
      },

      // --- Relics ---
      addRelic: (id) => set(s => ({
        relics: s.relics.includes(id) ? s.relics : [...s.relics, id],
        relicCodex: s.relicCodex.includes(id) ? s.relicCodex : [...s.relicCodex, id],
      })),

      // --- Team mutations ---
      healTeam: (pct) => set(s => ({
        team: s.team.map(m => {
          if (m.hp <= 0 && pct < 0) return m // don't damage the fainted
          const v = Math.round(m.hp + m.maxHp * (pct / 100))
          const floor = m.hp <= 0 ? 0 : 1
          return { ...m, hp: Math.max(floor, Math.min(m.maxHp, v)) }
        }),
      })),
      fullHeal: () => set(s => ({ team: s.team.map(m => ({ ...m, hp: m.maxHp })) })),
      reviveAll: () => set(s => ({
        team: s.team.map(m => (m.hp <= 0 ? { ...m, hp: Math.round(m.maxHp * 0.5) } : m)),
      })),
      boostMon: (uid, levels) => set(s => ({
        team: s.team.map(m => m.uid === uid ? { ...m } : m), // level handled by caller via gainXp
      })),

      // Catch the current enemy: joins the run team + permanent Pokédex.
      catchEnemy: (enemy) => {
        const s = get()
        const lvl = Math.max(5, Math.round((enemy.level || 5) * 0.85))
        const caught = makeRunMon(enemy.id, lvl)
        // permanent collection card
        const card = makeInstance(enemy.id, lvl, { rarity: 'rare' })
        useGameStore.getState().addToCollection([card])
        if (s.team.length < MAX_TEAM) {
          set({ team: [...s.team, caught] })
          return { added: true, name: caught.name }
        }
        return { added: false, name: caught.name, benched: true }
      },

      replaceTeamMon: (uid, enemy) => set(s => {
        const lvl = Math.max(5, Math.round((enemy.level || 5) * 0.85))
        const caught = makeRunMon(enemy.id, lvl)
        const card = makeInstance(enemy.id, lvl, { rarity: 'rare' })
        useGameStore.getState().addToCollection([card])
        return { team: s.team.map(m => m.uid === uid ? caught : m) }
      }),
    }),
    {
      name: 'pokebooster-run-v1',
      partialize: (s) => ({
        bestWave: s.bestWave,
        totalRuns: s.totalRuns,
        relicCodex: s.relicCodex,
        active: s.active,
        wave: s.wave,
        gold: s.gold,
        balls: s.balls,
        team: s.team,
        relics: s.relics,
        pendingEnemy: s.pendingEnemy,
      }),
    }
  )
)
