import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { makeInstance, speciesById } from '../data/pokemon.js'
import { isHoloEligible } from '../data/cardModel.js'
import { generateDailyQuests, todayKey } from '../data/quests.js'
import { ACHIEVEMENT_BY_ID } from '../data/achievements.js'
import { MAX_ASCENSION } from '../data/ascension.js'

let _uidCounter = 1000
export function nextUid() { return _uidCounter++ }

// Daily streak milestone rewards (granted once each, tracked in streakClaimed).
export const STREAK_REWARDS = [
  { day: 3,  reward: { crystals: 15 } },
  { day: 7,  reward: { crystals: 40 } },
  { day: 14, reward: { crystals: 80, money: 200 } },
  { day: 30, reward: { crystals: 200, money: 500 } },
]

const dayKey = (d) => d.toISOString().slice(0, 10)

// Pokérogue-style team budget: you build a starter team within a point cap.
export const START_POINTS = 4        // affords ~2 starter Pokémon at the very start
export const POINTS_PER_UPGRADE = 2
export const MAX_POINTS = 20
// Crystal cost of buying +2 capacity grows with current capacity.
export function pointsUpgradeCost(currentMax) {
  return 80 + Math.max(0, (currentMax - START_POINTS) / POINTS_PER_UPGRADE) * 60
}

// How many attack cards are drawn each combat turn (the shared hand size).
// Upgradable from 1 up to 4 with crystals; each step costs more.
export const MAX_CARDS_PER_SLOT = 4
export const CARDS_PER_SLOT_UPGRADE_COST = 80
export function cardsPerSlotUpgradeCost(current) {
  return CARDS_PER_SLOT_UPGRADE_COST + Math.max(0, current - 1) * 70
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
      money: 0,
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

      // --- Out-of-combat card leveling ---
      cardLevels: {},      // { [speciesId]: number } 1-5, upgraded via duplicates
      scrollToNew: false,  // transient: CollectionScreen scrolls to new cards when true
      levelUpCard: (speciesId) => {
        const s = get()
        const currentLevel = s.cardLevels?.[speciesId] || 1
        if (currentLevel >= 5) return false
        const normalCards = s.collection.filter(c => c.id === speciesId && !c.shiny)
        if (normalCards.length < 2) return false
        const toConsume = normalCards[normalCards.length - 1]
        set(st => ({
          collection: st.collection.filter(c => c.uid !== toConsume.uid),
          cardLevels: { ...(st.cardLevels || {}), [speciesId]: currentLevel + 1 },
        }))
        return currentLevel + 1
      },
      setScrollToNew: (v) => set({ scrollToNew: v }),

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

      // --- Combat hand size (how many random attack cards per turn, 1→4) ---
      cardsPerSlot: 1,
      upgradeCardsPerSlot: () => {
        const s = get()
        if (s.cardsPerSlot >= MAX_CARDS_PER_SLOT) return false
        const cost = cardsPerSlotUpgradeCost(s.cardsPerSlot)
        if (!s.spendCrystals(cost)) return false
        set({ cardsPerSlot: Math.min(MAX_CARDS_PER_SLOT, s.cardsPerSlot + 1) })
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

      // --- Achievements / Trophées ---
      achievementsClaimed: [],
      // The screen passes the computed progress (derived from both stores) so the
      // store stays authoritative without importing runStore (avoids a cycle).
      claimAchievement: (id, progress) => {
        const s = get()
        const ach = ACHIEVEMENT_BY_ID[id]
        if (!ach) return false
        if (s.achievementsClaimed.includes(id)) return false
        if ((progress ?? 0) < ach.target) return false
        if (ach.reward?.crystals) s.addCrystals(ach.reward.crystals)
        if (ach.reward?.money) s.addMoney(ach.reward.money)
        set(st => ({ achievementsClaimed: [...st.achievementsClaimed, id] }))
        return true
      },

      // --- Daily streak ---
      dailyStreak: 0,
      lastPlayedDate: null,
      streakClaimed: [],   // milestone days already rewarded
      // Call once when the home screen mounts. Advances/keeps/resets the streak
      // and auto-grants any newly reached milestone reward.
      tickDailyStreak: () => {
        const s = get()
        const today = todayKey()
        if (s.lastPlayedDate === today) return
        const yesterday = dayKey(new Date(Date.now() - 86400000))
        const nextStreak = s.lastPlayedDate === yesterday ? (s.dailyStreak || 0) + 1 : 1
        set({ dailyStreak: nextStreak, lastPlayedDate: today })
        // Grant any milestone now satisfied and not yet claimed.
        for (const m of STREAK_REWARDS) {
          if (nextStreak >= m.day && !get().streakClaimed.includes(m.day)) {
            if (m.reward.crystals) get().addCrystals(m.reward.crystals)
            if (m.reward.money) get().addMoney(m.reward.money)
            set(st => ({ streakClaimed: [...st.streakClaimed, m.day] }))
          }
        }
      },

      // --- Ascension (difficulty ladder) ---
      maxAscension: 0,
      // Called when the wave-10 boss is cleared on a run played at the current
      // ceiling — unlocks the next tier.
      unlockNextAscension: (playedLevel) => {
        const s = get()
        if (playedLevel >= s.maxAscension && s.maxAscension < MAX_ASCENSION) {
          set({ maxAscension: s.maxAscension + 1 })
          return true
        }
        return false
      },

      // --- Last combat ---
      lastBattleResult: null,
      setLastBattleResult: (result) => set({ lastBattleResult: result }),

      // --- CT (Technical Machines) ---
      ctInventory: [],   // array of CT ids
      attachedCTs: {},   // { [speciesId]: ctId }
      addCT: (ctId) => set(s => ({ ctInventory: [...s.ctInventory, ctId] })),
      attachCT: (speciesId, ctId) => set(s => ({
        ctInventory: (() => { const idx = s.ctInventory.indexOf(ctId); if (idx === -1) return s.ctInventory; const a = [...s.ctInventory]; a.splice(idx, 1); return a })(),
        attachedCTs: { ...s.attachedCTs, [speciesId]: ctId },
      })),
      detachCT: (speciesId) => set(s => {
        const ctId = s.attachedCTs[speciesId]
        const next = { ...s.attachedCTs }; delete next[speciesId]
        return {
          attachedCTs: next,
          ctInventory: ctId ? [...s.ctInventory, ctId] : s.ctInventory,
        }
      }),

      // --- Favorites & usage count ---
      favorites: [],
      toggleFavorite: (speciesId) => set(s => ({
        favorites: s.favorites.includes(speciesId)
          ? s.favorites.filter(x => x !== speciesId)
          : [...s.favorites, speciesId],
      })),
      pokemonUsageCount: {},
      recordUsage: (speciesId) => set(s => ({
        pokemonUsageCount: { ...s.pokemonUsageCount, [speciesId]: (s.pokemonUsageCount[speciesId] || 0) + 1 },
      })),

      // --- Reset ---
      resetGame: () => set({
        money: 0,
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
        cardLevels: {},
        daily: { date: null, quests: [] },
        achievementsClaimed: [],
        dailyStreak: 0,
        lastPlayedDate: null,
        streakClaimed: [],
        maxAscension: 0,
        starterPoints: START_POINTS,
        cardsPerSlot: 1,
        ctInventory: [],
        attachedCTs: {},
        favorites: [],
        pokemonUsageCount: {},
      }),
    }),
    {
      name: 'pokebooster-save-v1',
      version: 4,
      // v2: reset every caught/collected Pokémon (fresh Pokédex), keep economy.
      // v3: introduces training/quests/stats — new fields default in naturally.
      // v4: adds achievements + daily streak — new fields default in naturally.
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
        cardsPerSlot: s.cardsPerSlot,
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
        cardLevels: s.cardLevels,
        daily: s.daily,
        achievementsClaimed: s.achievementsClaimed,
        dailyStreak: s.dailyStreak,
        lastPlayedDate: s.lastPlayedDate,
        streakClaimed: s.streakClaimed,
        maxAscension: s.maxAscension,
        starterPoints: s.starterPoints,
        ctInventory: s.ctInventory,
        attachedCTs: s.attachedCTs,
        favorites: s.favorites,
        pokemonUsageCount: s.pokemonUsageCount,
      }),
    }
  )
)
