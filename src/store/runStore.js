import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { makeRunMon, gainXp, xpToNext } from '../engine/runEngine.js'
import { makeInstance } from '../data/pokemon.js'
import { aggregateRelics } from '../data/relics.js'
import { DEFAULT_BALLS, BALL_BY_ID, CONSUMABLE_BY_ID } from '../data/items.js'
import { useGameStore } from './gameStore.js'

const MAX_TEAM = 6

export const useRunStore = create(
  persist(
    (set, get) => ({
      // --- Meta (persisted across runs) ---
      bestWave: 0,
      totalRuns: 0,
      relicCodex: [],

      // --- Active run ---
      active: false,
      wave: 1,
      gold: 0,
      balls: { ...DEFAULT_BALLS },   // { 'poke-ball': n, 'great-ball': n, ... }
      items: {},                     // consumables bag: { 'rare-candy': n, ... }
      team: [],
      relics: [],                    // equipped held items (ids)
      pendingEnemy: null,
      lastOutcome: null,
      lastSummary: null,

      // --- Derived ---
      relicAgg: () => aggregateRelics(get().relics),
      totalBalls: () => Object.values(get().balls || {}).reduce((s, n) => s + n, 0),

      // --- Run lifecycle ---
      startRun: (starterIds) => {
        const team = starterIds.slice(0, 3).map(id => makeRunMon(id, 5))
        set({
          active: true, wave: 1, gold: 0,
          balls: { ...DEFAULT_BALLS },
          items: { 'potion': 1, 'rare-candy': 1 },
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

      // --- Poké Balls (typed) ---
      addBall: (id = 'poke-ball', n = 1) => set(s => ({
        balls: { ...s.balls, [id]: (s.balls[id] || 0) + n },
      })),
      useBall: (id = 'poke-ball') => {
        const s = get()
        if ((s.balls[id] || 0) <= 0) return false
        set({ balls: { ...s.balls, [id]: s.balls[id] - 1 } })
        return true
      },

      // --- Consumable items bag ---
      addItem: (id, n = 1) => set(s => ({
        items: { ...s.items, [id]: (s.items[id] || 0) + n },
      })),
      // Use a consumable from the bag. Returns a result message or null.
      useItem: (id) => {
        const s = get()
        if ((s.items[id] || 0) <= 0) return null
        const def = CONSUMABLE_BY_ID[id]
        if (!def) return null
        const eff = def.effect
        let msg = ''
        if (eff.kind === 'heal') {
          set({ team: s.team.map(m => (m.hp > 0 ? { ...m, hp: Math.min(m.maxHp, Math.round(m.hp + m.maxHp * eff.value / 100)) } : m)) })
          msg = `${def.name} : +${eff.value}% PV`
        } else if (eff.kind === 'revive') {
          set({ team: s.team.map(m => (m.hp <= 0 ? { ...m, hp: Math.round(m.maxHp * eff.value / 100) } : m)) })
          msg = `${def.name} : K.O. ranimés`
        } else if (eff.kind === 'candy') {
          const alive = [...s.team].sort((a, b) => a.level - b.level)
          const target = alive[0]
          if (target) {
            const updated = s.team.map(m => {
              if (m.uid !== target.uid) return { ...m }
              const copy = { ...m }
              gainXp(copy, xpToNext(copy.level))
              return copy
            })
            set({ team: updated })
            msg = `${target.name} gagne un niveau !`
          }
        }
        // decrement
        set(st => ({ items: { ...st.items, [id]: st.items[id] - 1 } }))
        return msg || def.name
      },

      // --- Held items (equipment) ---
      addRelic: (id) => set(s => ({
        relics: s.relics.includes(id) ? s.relics : [...s.relics, id],
        relicCodex: s.relicCodex.includes(id) ? s.relicCodex : [...s.relicCodex, id],
      })),

      // --- Team mutations ---
      healTeam: (pct) => set(s => ({
        team: s.team.map(m => {
          if (m.hp <= 0 && pct < 0) return m
          const v = Math.round(m.hp + m.maxHp * (pct / 100))
          const floor = m.hp <= 0 ? 0 : 1
          return { ...m, hp: Math.max(floor, Math.min(m.maxHp, v)) }
        }),
      })),
      fullHeal: () => set(s => ({ team: s.team.map(m => ({ ...m, hp: m.maxHp })) })),
      reviveAll: () => set(s => ({
        team: s.team.map(m => (m.hp <= 0 ? { ...m, hp: Math.round(m.maxHp * 0.5) } : m)),
      })),

      // Catch the current enemy with a chosen ball. Joins run team + Pokédex.
      catchEnemy: (enemy, ballId = 'poke-ball') => {
        const s = get()
        const lvl = Math.max(5, Math.round((enemy.level || 5) * 0.85))
        const caught = makeRunMon(enemy.id, lvl)
        const card = makeInstance(enemy.id, lvl, { rarity: 'rare' })
        useGameStore.getState().addToCollection([card])
        if (s.team.length < MAX_TEAM) {
          set({ team: [...s.team, caught] })
          return { added: true, name: caught.name }
        }
        return { added: false, name: caught.name, benched: true }
      },
    }),
    {
      name: 'pokebooster-run-v1',
      version: 2,
      // v2: reset any active run + caught team (fresh ball/item economy).
      migrate: (state, version) => {
        if (!state) return state
        if (version < 2) {
          return {
            ...state,
            active: false,
            team: [],
            relics: [],
            balls: { ...DEFAULT_BALLS },
            items: {},
            pendingEnemy: null,
          }
        }
        return state
      },
      partialize: (s) => ({
        bestWave: s.bestWave,
        totalRuns: s.totalRuns,
        relicCodex: s.relicCodex,
        active: s.active,
        wave: s.wave,
        gold: s.gold,
        balls: s.balls,
        items: s.items,
        team: s.team,
        relics: s.relics,
        pendingEnemy: s.pendingEnemy,
      }),
    }
  )
)
