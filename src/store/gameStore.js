import { create } from 'zustand'
import { persist } from 'zustand/middleware'

let _uidCounter = 1000
export function nextUid() { return _uidCounter++ }

export const useGameStore = create(
  persist(
    (set, get) => ({
      // --- Navigation ---
      currentScreen: 'title',
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
      }),
    }),
    {
      name: 'pokebooster-save-v1',
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
      }),
    }
  )
)
