import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { makeRunMon, gainXp, xpToNext } from '../engine/runEngine.js'
import { makeInstance, speciesById, recomputeStats } from '../data/pokemon.js'
import { speciesRarity } from '../data/cardModel.js'
import { stoneEvolution } from '../data/evolutions.js'
import { frName } from '../data/frenchNames.js'
import { aggregateRelics } from '../data/relics.js'
import { DEFAULT_BALLS, BALL_BY_ID, CONSUMABLE_BY_ID } from '../data/items.js'
import { CT_BY_ID, canLearnCT } from '../data/ct.js'
import { useGameStore } from './gameStore.js'

const MAX_TEAM = 6

export const useRunStore = create(
  persist(
    (set, get) => ({
      // --- Meta (persisted across runs) ---
      bestWave: 0,
      bestFlawlessWave: 0,   // highest wave reached without ever losing a mon
      totalRuns: 0,
      relicCodex: [],
      lastStarters: [],   // [{ id, level }] used for "replay same team"

      // --- Active run ---
      active: false,
      wave: 1,
      gold: 0,
      balls: { ...DEFAULT_BALLS },   // { 'poke-ball': n, 'great-ball': n, ... }
      items: {},                     // consumables bag: { 'rare-candy': n, ... }
      cts: [],                       // CT collectées pendant la run (ids), perdues à la fin
      team: [],
      relics: [],                    // equipped held items (ids)
      pendingEnemy: null,
      lastOutcome: null,
      lastSummary: null,
      winsThisRun: 0,
      flawless: true,   // becomes false the moment any mon faints this run
      ascensionLevel: 0, // difficulty tier chosen for this run

      // --- Trainer battle (session-only, not persisted) ---
      trainerName: '',         // displayed in combat header
      trainerQueue: [],        // remaining Enemy[] from the current trainer's party
      trainerTotalParty: 0,    // total party size (for progress display)
      trainerKilled: 0,        // how many defeated so far in this trainer battle
      leagueQueue: [],         // [{ name, party, trainer }] for the League gauntlet
      leagueIndex: 0,

      setTrainerBattle: (name, remainingParty) => set({
        trainerName: name,
        trainerQueue: remainingParty,
        trainerTotalParty: remainingParty.length + 1,
        trainerKilled: 0,
      }),
      advanceTrainer: () => {
        const { trainerQueue, trainerKilled } = get()
        if (!trainerQueue || trainerQueue.length === 0) return null
        const [next, ...rest] = trainerQueue
        set({ trainerQueue: rest, trainerKilled: trainerKilled + 1 })
        return next
      },
      setLeagueBattle: (trainers) => set({ leagueQueue: trainers, leagueIndex: 0 }),
      advanceLeague: () => {
        const { leagueQueue, leagueIndex } = get()
        const nextIndex = leagueIndex + 1
        const next = leagueQueue[nextIndex]
        if (!next) return null
        set({
          leagueIndex: nextIndex,
          trainerName: next.name,
          trainerQueue: next.party.slice(1),
          trainerTotalParty: next.party.length,
          trainerKilled: 0,
        })
        return next.party[0]
      },
      clearTrainerBattle: () => set({ trainerName: '', trainerQueue: [], trainerTotalParty: 0, trainerKilled: 0, leagueQueue: [], leagueIndex: 0 }),

      // --- Derived ---
      relicAgg: () => aggregateRelics(get().relics),
      totalBalls: () => Object.values(get().balls || {}).reduce((s, n) => s + n, 0),

      // --- Run lifecycle ---
      // Accepts either [id, ...] or [{ id, level }, ...]. Levels let the
      // collection (duplicates / rarity / training) feed a stronger start.
      startRun: (starters, ascensionLevel = 0) => {
        const norm = (starters || []).slice(0, 6).map(s =>
          typeof s === 'number'
            ? { id: s, level: 5, shiny: false, holo: false }
            : { id: s.id, level: s.level || 5, shiny: s.shiny || false, holo: s.holo || false }
        )
        const team = norm.map(s => {
          const mon = makeRunMon(s.id, s.level)
          mon.shiny = s.shiny
          mon.holo = s.holo
          return mon
        })
        set({
          active: true, wave: 1, gold: 0,
          balls: { ...DEFAULT_BALLS },
          items: {},
          cts: [],
          team, relics: [], pendingEnemy: null, lastOutcome: null,
          lastStarters: norm, winsThisRun: 0, flawless: true,
          ascensionLevel: Math.max(0, ascensionLevel | 0),
        })
      },

      endRun: () => {
        const s = get()
        const reached = s.wave
        const newBest = Math.max(s.bestWave, reached)
        const record = newBest > s.bestWave
        const crystals = 8 + reached * 3 + (record ? 25 : 0)
        // Money is intentionally scarce — harder to accumulate now.
        const money = 12 + reached * 4 + (record ? 40 : 0)
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
      commitTeam: (team) => set(s => {
        const stillFlawless = s.flawless && team.every(m => (m.hp ?? 0) > 0)
        return {
          team: team.map(m => ({ ...m })),
          flawless: stillFlawless,
          // s.wave is the wave just cleared (advanceWave runs afterwards).
          bestFlawlessWave: stillFlawless ? Math.max(s.bestFlawlessWave, s.wave) : s.bestFlawlessWave,
        }
      }),
      setOutcome: (o) => set({ lastOutcome: o }),
      recordRunWin: () => {
        set(s => ({ winsThisRun: (s.winsThisRun || 0) + 1 }))
        return get().winsThisRun
      },

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
      // `targetUid` targets a single Pokémon (heal/revive/candy/stone).
      useItem: (id, targetUid) => {
        const s = get()
        if ((s.items[id] || 0) <= 0) return null
        const def = CONSUMABLE_BY_ID[id]
        if (!def) return null
        const eff = def.effect
        let msg = ''
        if (eff.kind === 'heal') {
          if (!targetUid) return null
          const mon = s.team.find(m => m.uid === targetUid)
          if (!mon) return null
          if (mon.hp <= 0) return `${mon.name} est K.O. — utilise un Rappel.`
          set({ team: s.team.map(m => (m.uid === targetUid ? { ...m, hp: Math.min(m.maxHp, Math.round(m.hp + m.maxHp * eff.value / 100)) } : m)) })
          msg = `${mon.name} : +${eff.value}% PV`
        } else if (eff.kind === 'revive') {
          if (!targetUid) return null
          const mon = s.team.find(m => m.uid === targetUid)
          if (!mon) return null
          if (mon.hp > 0) return `${mon.name} n'est pas K.O.`
          set({ team: s.team.map(m => (m.uid === targetUid ? { ...m, hp: Math.round(m.maxHp * eff.value / 100) } : m)) })
          msg = `${mon.name} ranimé !`
        } else if (eff.kind === 'candy') {
          if (!targetUid) return null
          const target = s.team.find(m => m.uid === targetUid)
          if (!target) return null
          set({ team: s.team.map(m => { if (m.uid !== targetUid) return m; const copy = { ...m }; gainXp(copy, xpToNext(copy.level)); return copy }) })
          msg = `${target.name} gagne un niveau !`
        } else if (eff.kind === 'fullrestore') {
          if (!targetUid) return null
          const mon = s.team.find(m => m.uid === targetUid)
          if (!mon) return null
          set({ team: s.team.map(m => (m.uid === targetUid ? { ...m, hp: m.maxHp } : m)) })
          msg = `${mon.name} : PV au max !`
        } else if (eff.kind === 'gold') {
          set({ gold: s.gold + eff.value })
          msg = `${def.name} : +${eff.value} or`
        } else if (eff.kind === 'vitamin') {
          set({
            team: s.team.map(m => {
              const copy = { ...m, statBonus: { ...(m.statBonus || {}), [eff.stat]: ((m.statBonus || {})[eff.stat] || 0) + eff.value } }
              const ratio = copy.maxHp ? copy.hp / copy.maxHp : 1
              recomputeStats(copy)
              if (eff.stat === 'hp') copy.hp = Math.round(copy.maxHp * ratio) // keep HP ratio when max grows
              return copy
            }),
          })
          msg = `${def.name} : toute l'équipe renforcée !`
        } else if (eff.kind === 'stone') {
          // Evolution stone — targets ONE Pokémon; no effect (and no consume) if
          // that Pokémon can't evolve with this stone.
          if (!targetUid) return null
          const mon = s.team.find(m => m.uid === targetUid)
          if (!mon) return null
          const toId = stoneEvolution(mon.id, eff.stone)
          if (!toId) return `${def.name} : aucun effet sur ${mon.name}.`
          const sp = speciesById(toId)
          const evoName = frName(toId, sp?.name)
          set({
            team: s.team.map(m => {
              if (m.uid !== targetUid) return m
              const copy = { ...m, id: toId, name: evoName, species: evoName }
              const ratio = copy.maxHp ? copy.hp / copy.maxHp : 1
              recomputeStats(copy)
              copy.hp = Math.max(1, Math.round(copy.maxHp * ratio))
              return copy
            }),
          })
          set(st => ({ items: { ...st.items, [id]: st.items[id] - 1 } }))
          return `${mon.name} évolue en ${evoName} !`
        }
        // decrement
        set(st => ({ items: { ...st.items, [id]: st.items[id] - 1 } }))
        return msg || def.name
      },

      // --- CT bag (run-scoped) ---
      addCT: (ctId) => set(s => ({ cts: [...s.cts, ctId] })),
      // Teach a run CT to a team member. Consumes the CT from the run bag and
      // appends it to the mon's learnedCTs (permanent for the run, lost on swap).
      // Returns a result message or null on failure.
      learnCT: (monUid, ctId) => {
        const s = get()
        const ct = CT_BY_ID[ctId]
        const idx = s.cts.indexOf(ctId)
        if (!ct || idx === -1) return null
        const mon = s.team.find(m => m.uid === monUid)
        if (!mon) return null
        if (!canLearnCT(mon, ct)) return `${mon.name} ne peut pas apprendre ${ct.name} (type incompatible).`
        const nextCts = [...s.cts]; nextCts.splice(idx, 1)
        set({
          cts: nextCts,
          team: s.team.map(m => m.uid === monUid
            ? { ...m, learnedCTs: [...(m.learnedCTs || []), ctId] }
            : m),
        })
        return `${mon.name} apprend ${ct.name} !`
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
      // If the team is full, the caught mon is stashed in pendingCatch so the
      // player can choose which team member to swap out (see swapCaught).
      pendingCatch: null,
      catchEnemy: (enemy, ballId = 'poke-ball') => {
        const s = get()
        const lvl = Math.max(5, Math.round((enemy.level || 5) * 0.85))
        const caught = makeRunMon(enemy.id, lvl)
        const card = makeInstance(enemy.id, lvl, { rarity: speciesRarity(speciesById(enemy.id)) })
        useGameStore.getState().addToCollection([card])
        if (s.team.length < MAX_TEAM) {
          set({ team: [...s.team, caught] })
          return { added: true, name: caught.name }
        }
        set({ pendingCatch: caught })
        return { added: false, full: true, name: caught.name }
      },
      // Resolve a full-team catch: replace `oldUid` with the stashed mon.
      // The released mon stays in the meta collection (already added on catch).
      swapCaught: (oldUid) => {
        const s = get()
        if (!s.pendingCatch) return null
        const caught = s.pendingCatch
        const old = s.team.find(m => m.uid === oldUid)
        set({
          team: s.team.map(m => (m.uid === oldUid ? caught : m)),
          pendingCatch: null,
        })
        return { name: caught.name, released: old?.name }
      },
      cancelCatchSwap: () => set({ pendingCatch: null }),
    }),
    {
      name: 'pokebooster-run-v1',
      version: 4,
      // v2: reset any active run + caught team (fresh ball/item economy).
      // v3: adds bestFlawlessWave + flawless — new fields default in naturally.
      // v4: adds run CT bag + per-mon learnedCTs (default [] naturally).
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
        bestFlawlessWave: s.bestFlawlessWave,
        totalRuns: s.totalRuns,
        relicCodex: s.relicCodex,
        lastStarters: s.lastStarters,
        active: s.active,
        wave: s.wave,
        gold: s.gold,
        balls: s.balls,
        items: s.items,
        cts: s.cts,
        team: s.team,
        relics: s.relics,
        pendingEnemy: s.pendingEnemy,
        winsThisRun: s.winsThisRun,
        flawless: s.flawless,
        ascensionLevel: s.ascensionLevel,
      }),
    }
  )
)
