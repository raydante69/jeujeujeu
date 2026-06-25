import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { makeInstance, speciesById } from '../data/pokemon.js'
import { isHoloEligible } from '../data/cardModel.js'
import { generateDailyQuests, todayKey } from '../data/quests.js'

let _uidCounter = 1000
export function nextUid() { return _uidCounter++ }

// Pokérogue-style team budget: you build a starter team within a point cap.
export const START_POINTS = 4        // affords ~2 starter Pokémon at the very start
export const POINTS_PER_UPGRADE = 2
export const MAX_POINTS = 20
// Crystal cost of buying +2 capacity grows with current capacity.
export function pointsUpgradeCost(currentMax) {
  return 80 + Math.max(0, (currentMax - START_POINTS) / POINTS_PER_UPGRADE) * 60
}

// Crystal cost to expand hand by 1 card (starts at 5, max 10).
export const MAX_HAND_SIZE = 10
export function handSizeUpgradeCost(currentSize) {
  return 50 + Math.max(0, currentSize - 5) * 40
}

// Permanent training cost grows with how trained a species already is.
export function trainCost(currentBonus) { return 30 + currentBonus * 25 }

export const useGameStore = create(
  persist(
    (set, get) => ({
      // --- Navigation ---
      currentScreen: 'home',
      navigate: (screen) => set({ currentScreen: screen }),

      // --- Economy ---
      money: 500,
      crystals: 0,
      rubies: 0,

      addMoney: (n) => set(s => ({ money: s.money + n })),
      spendMoney: (n) => {
        const s = get()
        if (s.money < n) return false
        set({ money: s.money - n, moneySpentOnUnlocks: s.moneySpentOnUnlocks + n })
        return true
      },
      addCrystals: (n) => set(s => ({ crystals: s.crystals + n })),
      spendCrystals: (n) => {
        const s = get()
        if (s.crystals < n) return false
        set({ crystals: s.crystals - n, crystalsSpent: s.crystalsSpent + n })
        return true
      },
      addRubies: (n) => set(s => ({ rubies: s.rubies + n })),

      // --- Collection ---
      collection: [],
      newCardUids: [],
      addToCollection: (cards) => set(s => {
        const existing = new Set(s.collection.map(c => c.uid))
        const newCards = cards.filter(c => !existing.has(c.uid))
        const updated = [...s.collection, ...newCards]
        const uids = updated.map(c => c.uid).filter(Boolean)
        if (uids.length) {
          const maxUid = Math.max(...uids)
          if (maxUid >= _uidCounter) _uidCounter = maxUid + 1
        }
        return {
          collection: updated,
          newCardUids: [...(s.newCardUids || []), ...newCards.map(c => c.uid).filter(Boolean)],
        }
      }),
      clearNewCards: (uids) => set(s => ({
        newCardUids: (s.newCardUids || []).filter(u => !uids.includes(u)),
      })),

      // --- Team ---
      team: [],
      setTeam: (team) => set({ team }),
      addToTeam: (card) => set(s => {
        if (s.team.length >= 6) return s
        if (s.team.find(c => c.uid === card.uid)) return s
        return { team: [...s.team, card] }
      }),
      removeFromTeam: (uid) => set(s => ({ team: s.team.filter(c => c.uid !== uid) })),

      // --- Progression ---
      badgesEarned: [],
      currentGymId: 1,
      elite4Defeated: 0,
      isChampion: false,

      earnBadge: (badge) => set(s => ({
        badgesEarned: [...s.badgesEarned, badge],
        currentGymId: s.currentGymId + 1,
        crystals: s.crystals + 20 + s.currentGymId * 10,
        routeNodeIndex: 0,
      })),

      // --- Route / Map ---
      routeNodeIndex: 0,
      combatContext: null,
      setRouteNodeIndex: (idx) => set({ routeNodeIndex: idx }),
      setCombatContext: (ctx) => set({ combatContext: ctx }),

      // --- Free boosters ---
      freeBoosterQueue: 1,
      lastFreeBoosterClaimed: null,
      activeGenForFreeBooster: 1,

      claimFreeBooster: () => {
        const s = get()
        if (s.freeBoosterQueue <= 0) return false
        set({ freeBoosterQueue: s.freeBoosterQueue - 1 })
        return true
      },
      tickFreeBoosterQueue: () => {
        const s = get()
        if (s.freeBoosterQueue >= 3) return
        const gen = s.activeGenForFreeBooster
        const timerMs = gen <= 3 ? 4 * 60 * 60 * 1000 : gen <= 6 ? 6 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000
        const now = Date.now()
        if (!s.lastFreeBoosterClaimed || now - s.lastFreeBoosterClaimed >= timerMs) {
          set({
            freeBoosterQueue: Math.min(3, s.freeBoosterQueue + 1),
            lastFreeBoosterClaimed: now,
          })
        }
      },

      // --- Generations ---
      unlockedGens: [1],
      crystalsSpent: 0,
      moneySpentOnUnlocks: 0,

      unlockGen: (genId) => set(s => ({
        unlockedGens: s.unlockedGens.includes(genId) ? s.unlockedGens : [...s.unlockedGens, genId],
      })),

      // --- Pending boosters (to open) ---
      pendingBoosters: [],
      setPendingBoosters: (boosters) => set({ pendingBoosters: boosters }),
      clearPendingBoosters: () => set({ pendingBoosters: [] }),

      // --- Session booster purchases (in-memory, NOT persisted) ---
      // Drives progressive pricing: each repeat buy of the same format costs more.
      sessionBuys: {},
      recordBoosterBuy: (boosterId) => set(s => ({
        sessionBuys: { ...s.sessionBuys, [boosterId]: (s.sessionBuys[boosterId] || 0) + 1 },
      })),

      // --- Lifetime stats ---
      stats: { catches: 0, boostersOpened: 0, battlesWon: 0 },
      recordStat: (key, n = 1) => set(s => ({ stats: { ...s.stats, [key]: (s.stats[key] || 0) + n } })),

      // --- Permanent training (Salle de dressage) ---
      trainerLevels: {},   // { [speciesId]: bonusLevels }
      trainSpecies: (speciesId) => {
        const s = get()
        const cur = s.trainerLevels[speciesId] || 0
        const cost = trainCost(cur)
        if (!s.spendCrystals(cost)) return false
        set(st => ({ trainerLevels: { ...st.trainerLevels, [speciesId]: (st.trainerLevels[speciesId] || 0) + 1 } }))
        return cost
      },

      // --- Combat hand size (upgradeable via shop) ---
      handSize: 5,
      upgradeHandSize: () => {
        const s = get()
        if (s.handSize >= MAX_HAND_SIZE) return false
        const cost = handSizeUpgradeCost(s.handSize)
        if (!s.spendCrystals(cost)) return false
        set({ handSize: Math.min(MAX_HAND_SIZE, s.handSize + 1) })
        return cost
      },

      // --- Team point capacity (Pokérogue-style) ---
      starterPoints: START_POINTS,
      buyStarterPoints: () => {
        const s = get()
        if (s.starterPoints >= MAX_POINTS) return false
        const cost = pointsUpgradeCost(s.starterPoints)
        if (!s.spendCrystals(cost)) return false
        set({ starterPoints: Math.min(MAX_POINTS, s.starterPoints + POINTS_PER_UPGRADE) })
        return cost
      },

      // --- Card fusion: 3 plain copies → 1 Shiny (Holo too if eligible) ---
      fuseSpecies: (speciesId) => {
        const s = get()
        const plain = s.collection.filter(c => c.id === speciesId && !c.shiny)
        if (plain.length < 3) return false
        const consumed = new Set(plain.slice(0, 3).map(c => c.uid))
        const sp = speciesById(speciesId)
        const holo = sp ? isHoloEligible(sp) : false
        const fused = makeInstance(speciesId, 5, { rarity: plain[0].rarity, shiny: true, holo })
        set({
          collection: [...s.collection.filter(c => !consumed.has(c.uid)), fused],
          newCardUids: [...(s.newCardUids || []), fused.uid],
        })
        return holo ? 'shiny+holo' : 'shiny'
      },

      // --- Daily quests ---
      daily: { date: null, quests: [] },
      ensureDaily: () => {
        const d = todayKey()
        if (get().daily?.date === d) return
        set({ daily: { date: d, quests: generateDailyQuests(d) } })
      },
      reportQuest: (type, value = 1) => set(s => {
        if (!s.daily?.quests?.length) return s
        const quests = s.daily.quests.map(q => {
          if (q.type !== type || q.claimed) return q
          const progress = q.mode === 'max'
            ? Math.min(q.target, Math.max(q.progress, value))
            : Math.min(q.target, q.progress + value)
          return { ...q, progress }
        })
        return { daily: { ...s.daily, quests } }
      }),
      claimQuest: (id) => {
        const s = get()
        const q = s.daily?.quests?.find(x => x.id === id)
        if (!q || q.claimed || q.progress < q.target) return false
        if (q.reward.crystals) s.addCrystals(q.reward.crystals)
        if (q.reward.money) s.addMoney(q.reward.money)
        set(st => ({ daily: { ...st.daily, quests: st.daily.quests.map(x => x.id === id ? { ...x, claimed: true } : x) } }))
        return true
      },

      // --- Last combat ---
      lastBattleResult: null,
      setLastBattleResult: (result) => set({ lastBattleResult: result }),

      // --- Reset ---
      resetGame: () => set({
        money: 500,
        crystals: 0,
        rubies: 0,
        collection: [],
        team: [],
        badgesEarned: [],
        currentGymId: 1,
        elite4Defeated: 0,
        isChampion: false,
        freeBoosterQueue: 1,
        lastFreeBoosterClaimed: null,
        pendingBoosters: [],
        lastBattleResult: null,
        unlockedGens: [1],
        crystalsSpent: 0,
        moneySpentOnUnlocks: 0,
        newCardUids: [],
        routeNodeIndex: 0,
        combatContext: null,
        sessionBuys: {},
        stats: { catches: 0, boostersOpened: 0, battlesWon: 0 },
        trainerLevels: {},
        daily: { date: null, quests: [] },
        starterPoints: START_POINTS,
        handSize: 5,
      }),
    }),
    {
      name: 'pokebooster-save-v1',
      version: 3,
      // v2: reset every caught/collected Pokémon (fresh Pokédex), keep economy.
      // v3: introduces training/quests/stats — new fields default in naturally.
      migrate: (state, version) => {
        if (!state) return state
        if (version < 2) {
          return { ...state, collection: [], team: [], newCardUids: [] }
        }
        return state
      },
      partialize: (s) => ({
        money: s.money,
        crystals: s.crystals,
        rubies: s.rubies,
        handSize: s.handSize,
        collection: s.collection,
        team: s.team,
        badgesEarned: s.badgesEarned,
        currentGymId: s.currentGymId,
        elite4Defeated: s.elite4Defeated,
        isChampion: s.isChampion,
        freeBoosterQueue: s.freeBoosterQueue,
        lastFreeBoosterClaimed: s.lastFreeBoosterClaimed,
        activeGenForFreeBooster: s.activeGenForFreeBooster,
        unlockedGens: s.unlockedGens,
        crystalsSpent: s.crystalsSpent,
        moneySpentOnUnlocks: s.moneySpentOnUnlocks,
        newCardUids: s.newCardUids,
        routeNodeIndex: s.routeNodeIndex,
        stats: s.stats,
        trainerLevels: s.trainerLevels,
        daily: s.daily,
        starterPoints: s.starterPoints,
      }),
    }
  )
)
