import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { makeInstance } from '../data/pokemon.js'
import { generateDailyQuests, todayKey } from '../data/quests.js'

let _uidCounter = 1000
export function nextUid() { return _uidCounter++ }

// Fusion ladder: three identical cards combine into one of the next tier.
const FUSION_NEXT = {
  common: 'uncommon', uncommon: 'rare', rare: 'holo_rare', reverse_holo: 'holo_rare',
  holo_rare: 'ex', ex: 'full_art', full_art: 'vmax', vmax: 'alt_art', alt_art: 'rainbow',
  rainbow: 'gold', holo: 'ex', ultra: 'full_art', secret: 'gold',
}
export function fusionNext(rarity) { return FUSION_NEXT[rarity] || null }

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

      // --- Card fusion ---
      fuseSpecies: (speciesId, rarity) => {
        const s = get()
        const matching = s.collection.filter(c => c.id === speciesId && c.rarity === rarity)
        const next = fusionNext(rarity)
        if (matching.length < 3 || !next) return false
        const consumed = new Set(matching.slice(0, 3).map(c => c.uid))
        const lvl = Math.max(...matching.slice(0, 3).map(c => c.level || 5))
        const fused = makeInstance(speciesId, lvl, { rarity: next })
        set({
          collection: [...s.collection.filter(c => !consumed.has(c.uid)), fused],
          newCardUids: [...(s.newCardUids || []), fused.uid],
        })
        return next
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
      }),
    }
  )
)
