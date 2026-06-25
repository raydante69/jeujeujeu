import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { useRunStore } from '../store/runStore.js'
import {
  buildEnemy, xpForWin, goldForWin, gainXp, waveKind,
} from '../engine/runEngine.js'
import { recomputeStats } from '../data/pokemon.js'
import {
  drawHand, moveDamage, guardValue, healValue, computeIntent, STATUS_DEF,
} from '../engine/combatEngine.js'
import { aggregateRelics } from '../data/relics.js'
import { getWeakTypes } from '../engine/comboBurst.js'
import { biomeForWave } from '../data/biomes.js'
import { getTrait } from '../data/signatureTraits.js'
import { TYPE_COLORS } from '../data/types.js'
import { BALLS, BALL_BY_ID } from '../data/items.js'
import { rollRandomCT } from '../data/ct.js'
import TypeBadge from '../components/TypeBadge.jsx'
import HPBar from '../components/HPBar.jsx'
import ItemSprite from '../components/ItemSprite.jsx'

const KIND_ICON = { attack: '⚔️', guard: '🛡️', heal: '➕', drain: '🌿', status: '✨', buff: '💪' }

// Boss signature abilities (set on the enemy by buildEnemy from biome data).
const ABILITY_LABEL = {
  enrage:    '😡 Furie croissante (dégâts +8% / tour)',
  shield:    '🛡️ Carapace (bouclier périodique)',
  lifedrain: '🩸 Drain vital (se soigne en frappant)',
}

// Preview the numeric value a card will deal/heal.
function previewCard(card, caster, enemy, relicAgg) {
  if (!caster || !enemy) return null
  if (card.kind === 'attack' || card.kind === 'drain') {
    const { dmg } = moveDamage(card, caster, enemy, relicAgg)
    let d = dmg
    if (caster.shiny) d = Math.round(d * 1.15)
    if (caster.holo)  d = Math.round(d * 1.20)
    if (card.kind === 'drain') {
      const h = Math.round(healValue(card, caster, relicAgg) * (caster.holo ? 1.20 : 1))
      return [{ label: `-${d}`, color: '#f87171' }, { label: `+${h}`, color: '#4ade80' }]
    }
    return [{ label: `-${d}`, color: '#f87171' }]
  }
  if (card.kind === 'guard') {
    const g = guardValue(card, caster, relicAgg)
    return [{ label: g > 0 ? `🛡️${g}` : '🚫', color: '#38bdf8' }]
  }
  if (card.kind === 'heal') {
    const h = Math.round(healValue(card, caster, relicAgg) * (caster.holo ? 1.20 : 1))
    return [{ label: `+${h}`, color: '#4ade80' }]
  }
  if (card.kind === 'status') {
    const def = STATUS_DEF[card.status]
    return [{ label: def?.label?.split(' ')[0] || '⚡', color: def?.color || '#facc15' }]
  }
  if (card.kind === 'buff') {
    return [{ label: `+${Math.round((card.bonus || 0.7) * 100)}%`, color: '#f97316' }]
  }
  return null
}

const MAX_REROLLS = 2

export default function BattleScreen() {
  const { navigate, cardsPerSlot, addCT } = useGameStore()
  const run = useRunStore()
  const { team, relics, wave, pendingEnemy } = run
  const relicAgg = useMemo(() => aggregateRelics(relics), [relics])
  const kind = waveKind(wave)
  const biome = useMemo(() => biomeForWave(wave), [wave])
  const handSize = cardsPerSlot || 1

  // ── State ───────────────────────────────────────────────────────────────
  const [enemy, setEnemy]         = useState(null)
  const [enemyHp, setEnemyHp]     = useState(0)
  const [enemyMax, setEnemyMax]   = useState(1)
  const [hp, setHp]               = useState({})
  // hand: a single shared row of N cards from the whole team's combined movepool
  const [hand, setHand]           = useState([])
  const [guard, setGuard]         = useState(0)
  const [buff, setBuff]           = useState(0)
  const [enemyStatus, setEStatus] = useState(null)
  const [teamStatus, setTeamStatus] = useState({})  // { [uid]: { type, turns, stacks } }
  const [enemyShield, setEnemyShield] = useState(0) // boss 'shield' ability: reduces next player burst
  const [intent, setIntent]       = useState(null)
  const [enraged, setEnraged]     = useState(false)
  const [phase, setPhase]         = useState('init')
  const [turn, setTurn]           = useState(1)
  const [floatDmg, setFloatDmg]   = useState(null)
  const [log, setLog]             = useState([])
  const [shake, setShake]         = useState(null)
  const [winSummary, setWinSummary] = useState(null)
  const [caught, setCaught]       = useState(null)
  const [throwUsed, setThrowUsed] = useState(false)
  const [rerolls, setRerolls]     = useState(MAX_REROLLS)
  const reviveUsed = useRef(false)

  const live = useRef({})
  live.current = { enemyHp, hp, guard, buff, enemyStatus, intent, enraged, teamStatus, enemyShield }

  // Mons that can't act this turn (paralyzed) are excluded from the drawn hand,
  // unless that would leave no living mon able to play (avoid a soft-lock).
  const drawableTeam = (ts, hps) => {
    const filtered = team.filter(m => ts?.[m.uid]?.type !== 'paralyze')
    const livingFiltered = filtered.filter(m => (hps?.[m.uid] ?? m.hp ?? 0) > 0)
    return livingFiltered.length ? filtered : team
  }

  const addLog = (m) => setLog(p => [...p.slice(-5), m])
  const doShake = (t, ms = 420) => { setShake(t); setTimeout(() => setShake(null), ms) }

  // ── Init ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const e = pendingEnemy || buildEnemy(wave)
    const startHp = {}
    team.forEach(m => {
      let h = m.hp
      // Cursed/glass relics shave HP at the start of each wave.
      if (relicAgg.hpPenaltyPct) h = Math.round(h * (1 - relicAgg.hpPenaltyPct / 100))
      if (relicAgg.healWavePct) h = Math.min(m.maxHp, Math.round(h + m.maxHp * relicAgg.healWavePct / 100))
      startHp[m.uid] = m.hp > 0 ? Math.max(1, h) : h
    })
    setEnemy(e); setEnemyHp(e.hp); setEnemyMax(e.maxHp); setHp(startHp)
    setTeamStatus({}); setEnemyShield(0)
    reviveUsed.current = false
    if (e.ability) addLog(`✨ Capacité du boss : ${ABILITY_LABEL[e.ability] || e.ability}`)

    addLog(e.isBoss ? `💀 BOSS : ${e.name} (Niv.${e.level}) surgit !`
      : kind === 'elite'   ? `⭐ ${e.name} d'élite apparaît !`
      : kind === 'trainer' ? `🧢 Dresseur envoie ${e.name} !`
      : `Un ${e.name} sauvage apparaît !`)

    setHand(drawHand(team, startHp, handSize))
    setIntent(computeIntent(e, team, startHp))
    setRerolls(MAX_REROLLS)
    setPhase('player')
  }, []) // eslint-disable-line

  const weakTypes = useMemo(() => (enemy ? getWeakTypes(enemy.types || ['normal']) : []), [enemy])

  // ── Swap hand (re-draw the shared hand from the team movepool) ───────
  function swapHand() {
    if (phase !== 'player' || rerolls <= 0) return
    setRerolls(r => r - 1)
    setHand(drawHand(drawableTeam(live.current.teamStatus, live.current.hp), live.current.hp, handSize))
    addLog(`🔄 Pokémon échangés`)
  }

  // Healing cleanses team afflictions (burn/poison/paralyze) — the counterplay.
  function cleanseStatuses() {
    if (Object.keys(live.current.teamStatus || {}).length === 0) return
    setTeamStatus({})
    addLog('💧 Les soins purifient les statuts de l\'équipe')
  }

  // ── Heal helpers ─────────────────────────────────────────────────────
  function healAll(teamHp, amount) {
    const next = { ...teamHp }
    for (const m of team) if ((next[m.uid] || 0) > 0) next[m.uid] = Math.min(m.maxHp, next[m.uid] + amount)
    return next
  }
  function healWeakest(teamHp, amount) {
    const alive = team.filter(m => (teamHp[m.uid] || 0) > 0)
    if (!alive.length) return teamHp
    const w = alive.reduce((a, b) => (teamHp[a.uid] / a.maxHp < teamHp[b.uid] / b.maxHp ? a : b))
    return { ...teamHp, [w.uid]: Math.min(w.maxHp, teamHp[w.uid] + amount) }
  }

  // ── Enemy turn (auto-runs after player picks a card) ──────────────────
  function runEnemyTurn(teamHp, eHp, currentGuard) {
    setPhase('enemy')
    const { enemyStatus: st0, intent: intent0, enraged: isRaged } = live.current
    let localEHp = eHp
    let localHp = { ...teamHp }
    let status = st0
    let skipEnemy = false
    const logs = []

    if (st0) {
      const def = STATUS_DEF[st0.type]
      if (st0.type === 'burn') {
        const d = Math.max(1, Math.round(enemyMax * def.tickPct))
        localEHp = Math.max(0, localEHp - d); logs.push(`🔥 ${enemy.name} subit ${d} (brûlure)`)
      } else if (st0.type === 'poison') {
        const stacks = st0.stacks || 1
        const d = Math.max(1, Math.round(enemyMax * def.tickPct * stacks))
        localEHp = Math.max(0, localEHp - d); logs.push(`☠️ ${enemy.name} subit ${d} (poison)`)
      } else if (st0.type === 'freeze') {
        skipEnemy = true; logs.push(`❄️ ${enemy.name} est gelé : tour sauté`)
      } else if (st0.type === 'paralyze' && Math.random() < def.skip) {
        skipEnemy = true; logs.push(`⚡ ${enemy.name} paralysé : attaque ratée`)
      }
      const turns = st0.turns - 1
      status = turns <= 0 ? null : { ...st0, turns, stacks: st0.type === 'poison' ? (st0.stacks || 1) + 1 : st0.stacks }
      if (!status) logs.push(`${enemy.name} se rétablit`)
    }

    // ── Team status ticks (burn/poison/paralyze inflicted by elites/bosses) ──
    const ts0 = live.current.teamStatus || {}
    let nextTeamStatus = {}
    for (const m of team) {
      const tsm = ts0[m.uid]
      if (!tsm || (localHp[m.uid] || 0) <= 0) continue
      const tdef = STATUS_DEF[tsm.type]
      if (tsm.type === 'burn' || tsm.type === 'poison') {
        const stacks = tsm.type === 'poison' ? (tsm.stacks || 1) : 1
        const d = Math.max(1, Math.round((m.maxHp || 20) * tdef.tickPct * stacks))
        localHp[m.uid] = Math.max(0, (localHp[m.uid] || 0) - d)
        logs.push(`${(tdef.label || '').split(' ')[0]} ${m.name} subit ${d}`)
      }
      const tt = tsm.turns - 1
      if (tt > 0) nextTeamStatus[m.uid] = { ...tsm, turns: tt, stacks: tsm.type === 'poison' ? (tsm.stacks || 1) + 1 : tsm.stacks }
      else logs.push(`${m.name} se libère de ${(tdef.label || '').split(' ')[1] || 'son état'}`)
    }

    setEnemyHp(localEHp); setEStatus(status); setHp(localHp)
    logs.forEach(addLog)

    if (localEHp <= 0) { setTeamStatus(nextTeamStatus); setTimeout(() => win(localHp), 650); return }

    setTimeout(() => {
      if (!skipEnemy) {
        // Enemy may strike one OR several Pokémon this turn.
        const fallback = intent0?.targets?.length
          ? intent0.targets
          : (intent0 ? [{ targetUid: intent0.targetUid, targetName: intent0.targetName, damage: intent0.damage }] : [])
        const hits = fallback.length ? fallback : (computeIntent(enemy, team, localHp)?.targets || [])
        let remainingGuard = currentGuard
        let dealtTotal = 0

        for (const hit of hits) {
          let targetUid = hit.targetUid
          if (!targetUid || (localHp[targetUid] || 0) <= 0) {
            const alive = team.filter(m => (localHp[m.uid] || 0) > 0)
            if (!alive.length) break
            targetUid = alive[Math.floor(Math.random() * alive.length)].uid
          }
          let dmg = hit.damage ?? 1
          if (isRaged || enraged) dmg = Math.round(dmg * 1.3)
          // Boss 'enrage' ability ramps damage every turn that passes.
          if (enemy.ability === 'enrage') dmg = Math.round(dmg * (1 + 0.08 * turn))
          const absorbed = Math.min(remainingGuard, dmg)
          remainingGuard -= absorbed
          dmg = Math.max(0, dmg - absorbed)
          dealtTotal += dmg

          const tname = team.find(m => m.uid === targetUid)?.name
          localHp = { ...localHp, [targetUid]: Math.max(0, (localHp[targetUid] || 0) - dmg) }
          doShake(targetUid)
          if (absorbed > 0) addLog(`🛡️ Bouclier absorbe ${absorbed}`)
          addLog(`💥 ${enemy.name} inflige ${dmg} à ${tname}${(isRaged || enraged) ? ' [RAGE]' : ''}`)

          if ((localHp[targetUid] || 0) <= 0 && relicAgg.revive && !reviveUsed.current) {
            const m = team.find(t => t.uid === targetUid)
            localHp[targetUid] = Math.round(m.maxHp * relicAgg.revive / 100)
            reviveUsed.current = true
            addLog(`🪶 La Plume Phénix ranime ${tname} !`)
          }
        }

        // Boss 'lifedrain' ability: heal a fraction of the damage it dealt.
        if (enemy.ability === 'lifedrain' && dealtTotal > 0) {
          const heal = Math.round(dealtTotal * 0.25)
          localEHp = Math.min(enemyMax, localEHp + heal)
          setEnemyHp(localEHp)
          addLog(`🩸 ${enemy.name} draine ${heal} PV`)
        }
        // Boss 'shield' ability: erect a periodic barrier on the next player burst.
        if (enemy.ability === 'shield' && turn % 3 === 0) {
          const sh = Math.round((enemy.level || 5) * 3)
          setEnemyShield(sh)
          addLog(`🛡️ ${enemy.name} érige une carapace (absorbe ${sh})`)
        }
        // Apply a freshly inflicted status to the targeted team member.
        if (intent0?.applyStatus) {
          const as = intent0.applyStatus
          if ((localHp[as.targetUid] || 0) > 0) {
            const sdef = STATUS_DEF[as.type]
            nextTeamStatus[as.targetUid] = { type: as.type, turns: sdef.turns, stacks: 1 }
            addLog(`${sdef.label} infligé à ${team.find(t => t.uid === as.targetUid)?.name} !`)
          }
        }
      }
      setHp(localHp)
      setTeamStatus(nextTeamStatus)
      const anyAlive = team.some(m => (localHp[m.uid] || 0) > 0)
      if (!anyAlive) { setTimeout(() => lose(localHp), 450); return }

      // New turn — paralyzed mons are excluded from the drawn hand.
      setTimeout(() => {
        setTurn(t => t + 1)
        setGuard(0)
        setHand(drawHand(drawableTeam(nextTeamStatus, localHp), localHp, handSize))
        setIntent(computeIntent(enemy, team, localHp))
        setPhase('player')
      }, 480)
    }, 720)
  }

  // ── Play a card (1 card per turn, no energy) ────────────────────────
  function playCard(card) {
    if (phase !== 'player') return
    const caster = team.find(m => m.uid === card.ownerUid)
    if (!caster || (live.current.hp[caster.uid] || 0) <= 0) return

    // Clear the hand immediately (card has been played)
    setHand([])

    const { enemyHp: eHp0, hp: hp0, buff: buff0, guard: guard0 } = live.current

    let finalHp = hp0
    let finalEHp = eHp0
    let finalGuard = guard0

    if (card.kind === 'attack' || card.kind === 'drain') {
      let { dmg, eff } = moveDamage(card, caster, enemy, relicAgg)
      if (caster.shiny) dmg = Math.round(dmg * 1.15)
      if (caster.holo)  dmg = Math.round(dmg * 1.20)
      let crit = false
      if (buff0 > 0) { dmg = Math.round(dmg * (1 + buff0)); setBuff(0) }
      if (Math.random() < (relicAgg.critChance || 0)) { dmg = Math.round(dmg * 2); crit = true }
      // Boss 'shield' ability absorbs part of this burst, then breaks.
      if (live.current.enemyShield > 0) {
        const blocked = Math.min(live.current.enemyShield, dmg)
        dmg = Math.max(0, dmg - blocked)
        setEnemyShield(0)
        addLog(`🛡️ La carapace de ${enemy.name} absorbe ${blocked} !`)
      }

      const newE = Math.max(0, eHp0 - dmg)
      finalEHp = newE
      setEnemyHp(newE)
      setFloatDmg({ dmg, crit, color: TYPE_COLORS[card.type] || '#fff', eff })
      doShake('enemy')
      setTimeout(() => setFloatDmg(null), 900)
      addLog(`${card.emoji} ${caster.name} · ${card.name} → ${dmg}${crit ? ' CRIT!' : ''}${eff >= 2 ? ' ⚡efficace' : eff < 1 ? ' ·peu efficace' : ''}`)

      if (card.kind === 'drain') {
        const h = Math.round(healValue(card, caster, relicAgg) * (caster.holo ? 1.20 : 1))
        finalHp = healAll(hp0, h)
        cleanseStatuses()  // healing washes away team afflictions
      }
      if (relicAgg.lifestealPct) finalHp = healWeakest(finalHp, Math.round(dmg * relicAgg.lifestealPct / 100))
      if (finalHp !== hp0) setHp(finalHp)

      if (enemy.isBoss && newE <= enemyMax * 0.5 && !live.current.enraged) {
        setEnraged(true); addLog(`😡 ${enemy.name} entre en RAGE !`)
      }
      if (newE <= 0) { setTimeout(() => win(finalHp), 650); return }

    } else if (card.kind === 'guard') {
      const g = guardValue(card, caster, relicAgg)
      const newG = guard0 + g
      setGuard(newG)
      finalGuard = newG
      addLog(g > 0
        ? `${card.emoji} ${caster.name} · ${card.name} → bouclier +${g}`
        : `🚫 ${caster.name} · ${card.name} → bouclier annulé (malédiction)`)

    } else if (card.kind === 'heal') {
      const h = Math.round(healValue(card, caster, relicAgg) * (caster.holo ? 1.20 : 1))
      finalHp = healAll(hp0, h)
      setHp(finalHp)
      cleanseStatuses()  // healing washes away team afflictions
      addLog(`${card.emoji} ${caster.name} · ${card.name} → +${h} PV équipe`)

    } else if (card.kind === 'status') {
      const def = STATUS_DEF[card.status]
      const trait = getTrait(caster.id, caster.types)
      const turns = def.turns + (trait.statusTurns || 0)
      setEStatus(prev => {
        if (prev && prev.type === card.status) return { ...prev, turns }
        return { type: card.status, turns, stacks: card.status === 'poison' ? 1 : 0 }
      })
      addLog(`${card.emoji} ${caster.name} · ${card.name} → ${enemy.name} ${def.label} !`)

    } else if (card.kind === 'buff') {
      const trait = getTrait(caster.id, caster.types)
      setBuff((card.bonus || 0.7) + (trait.buffPlus || 0))
      addLog(`${card.emoji} ${caster.name} · ${card.name} → prochaine attaque renforcée !`)
    }

    // Automatically trigger enemy turn after the card resolves
    setTimeout(() => runEnemyTurn(finalHp, finalEHp, finalGuard), 300)
  }

  // ── Win / Lose ──────────────────────────────────────────────────────
  function win(finalHp) {
    const xpEach = Math.round(xpForWin(enemy, wave) * (relicAgg.xpMult || 1))
    const events = []
    // Level cap: Pokémon can't exceed wave + 3 to prevent easy snowballing
    const levelCap = Math.max(5, wave + 3)
    const updated = team.map(m => {
      const copy = { ...m, hp: finalHp[m.uid] ?? m.hp }
      if (copy.hp > 0) {
        const before = copy.level
        const ev = gainXp(copy, xpEach)
        if (copy.level > levelCap) {
          copy.level = levelCap
          copy.xp = 0
          recomputeStats(copy)
          copy.hp = Math.min(copy.hp, copy.maxHp)
        }
        if (ev.levels.length || ev.evolutions.length) events.push({ name: copy.name, from: before, to: copy.level, evo: ev.evolutions })
      }
      return copy
    })
    const goldGain = goldForWin(wave) + (relicAgg.goldWin || 0)
    run.commitTeam(updated); run.addGold(goldGain); run.setOutcome('win')
    const g = useGameStore.getState()
    g.recordStat('battlesWon'); g.reportQuest('win', 1); g.reportQuest('wave', wave)

    // Random combat drops: CT (3%), potion (5%), great-ball (4%)
    const drops = []
    const rn = Math.random()
    if (rn < 0.03) {
      const ct = rollRandomCT()
      g.addCT(ct.id)
      drops.push(`🎴 CT${ct.num} ${ct.name} obtenue !`)
    } else if (rn < 0.08) {
      run.addItem('super-potion', 1)
      drops.push('🧪 Super Potion trouvée !')
    } else if (rn < 0.12) {
      run.addBall('great-ball', 1)
      drops.push('🔵 Super Ball trouvée !')
    }

    setWinSummary({ xpEach, events, goldGain, drops })
    setPhase('win')
    addLog(`✅ ${enemy.name} vaincu !`)
    drops.forEach(d => addLog(d))
  }

  function lose(finalHp) {
    run.commitTeam(team.map(m => ({ ...m, hp: finalHp[m.uid] ?? m.hp })))
    run.setOutcome('lose')
    setPhase('lose')
  }

  // ── Catch ───────────────────────────────────────────────────────────
  function tryCatch(ballId = 'poke-ball') {
    if (caught || throwUsed) return
    const b = BALL_BY_ID[ballId]
    if (!b) return
    if (enemy.isBoss && b.rate < 1) return
    if ((run.balls?.[ballId] || 0) <= 0) return
    if (!run.useBall(ballId)) return
    setThrowUsed(true)
    if (Math.random() < (b.rate ?? 0)) {
      setCaught({ ok: true, ...run.catchEnemy(enemy, ballId) })
      const g = useGameStore.getState()
      g.recordStat('catches'); g.reportQuest('catch', 1)
    } else setCaught({ ok: false, name: enemy.name })
  }

  function continueAfterWin() {
    run.advanceWave()
    if (enemy.isBoss) {
      navigate('runshop')
    } else {
      const newWins = run.recordRunWin()
      if (newWins % 5 === 0) navigate('milestone')
      else navigate('run')
    }
  }
  function continueAfterLose() { run.endRun(); navigate('runend') }

  if (!enemy || phase === 'init') {
    return <div className="min-h-screen bg-game-bg flex items-center justify-center"><div className="text-4xl animate-spin">⚡</div></div>
  }

  const typeColor = TYPE_COLORS[enemy.types?.[0]] || '#1e293b'
  const livingTeam = team.filter(m => (hp[m.uid] ?? 0) > 0)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: biome.bg }}>
      {/* Header */}
      <div className="px-4 pt-10 pb-2 border-b border-white/5" style={{ background: 'rgba(10,10,20,0.55)' }}>
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <p className="text-[11px] text-gray-500 font-bold uppercase">Vague {wave} · {kind === 'boss' ? '💀 BOSS' : kind === 'elite' ? '⭐ Élite' : kind === 'trainer' ? '🧢 Dresseur' : '🌿 Sauvage'}</p>
            <p className="text-[10px] text-gray-600">Tour {turn}</p>
          </div>
          <div className="flex gap-1 items-center">
            {team.map(m => (
              <div key={m.uid} className="w-2.5 h-2.5 rounded-full" style={{ background: (hp[m.uid] ?? 0) > 0 ? '#4ade80' : '#374151' }} />
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-w-lg mx-auto w-full px-3 py-3 flex flex-col gap-3 pb-72">

        {/* Enemy */}
        <div className={`rounded-2xl p-4 border relative ${shake === 'enemy' ? 'animate-shake' : ''} ${enraged ? 'animate-pulse' : ''}`}
          style={{ background: `linear-gradient(160deg, ${typeColor}33, #0f172a)`, borderColor: enraged ? '#ef4444aa' : typeColor + '55' }}>
          {enemy.isBoss && <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full">💀 BOSS</div>}
          {enraged && <div className="absolute -top-2 right-3 bg-orange-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">😡 RAGE</div>}
          {enemy.ability && <div className="absolute -top-2 left-3 bg-purple-700 text-white text-[9px] font-black px-2 py-0.5 rounded-full" title={ABILITY_LABEL[enemy.ability]}>{(ABILITY_LABEL[enemy.ability] || '').split(' ')[0]} {enemy.ability}</div>}
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${enemy.id}.png`}
                alt={enemy.name} className="w-20 h-20 object-contain drop-shadow-lg"
                onError={e => { e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${enemy.id}.png` }} />
              {floatDmg && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 font-black text-xl pointer-events-none animate-bounce" style={{ color: floatDmg.color }}>
                  -{floatDmg.dmg}{floatDmg.crit ? '!' : ''}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-white text-sm">{enemy.name}</p>
                <p className="text-xs text-gray-500">Niv.{enemy.level}</p>
                {enemyStatus && (
                  <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={{ color: STATUS_DEF[enemyStatus.type]?.color, background: STATUS_DEF[enemyStatus.type]?.color + '22' }}>
                    {STATUS_DEF[enemyStatus.type]?.label} {enemyStatus.turns}t
                  </span>
                )}
              </div>
              <div className="flex gap-1 my-1 items-center">
                {(enemy.types || ['normal']).map(t => <TypeBadge key={t} type={t} size="xs" />)}
                {enemyShield > 0 && <span className="text-[9px] font-bold text-cyan-300 ml-1">🛡️ {enemyShield}</span>}
              </div>
              <HPBar hp={enemyHp} maxHp={enemyMax} showNumbers size="md" />
            </div>
          </div>
          {weakTypes.length > 0 && phase !== 'win' && (
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] text-gray-600 font-bold uppercase">Faible vs</span>
              {weakTypes.slice(0, 8).map(t => (
                <div key={t} className="w-3.5 h-3.5 rounded-full" style={{ background: TYPE_COLORS[t] }} title={t} />
              ))}
            </div>
          )}
        </div>

        {/* Intent */}
        {phase !== 'win' && phase !== 'lose' && intent && (
          <div className="rounded-xl px-3 py-2.5 border flex items-center justify-between gap-2"
            style={{ background: (intent.kind === 'heavy' ? '#ef4444' : TYPE_COLORS[intent.type] || '#64748b') + '14', borderColor: (intent.kind === 'heavy' ? '#ef4444' : TYPE_COLORS[intent.type] || '#64748b') + '55' }}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl">{intent.kind === 'heavy' ? '🌋' : intent.multi ? '🎯' : '⚔️'}</span>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">
                  Prochain coup ennemi{intent.multi ? ` · ${intent.targets.length} cibles` : ''}
                </p>
                <p className="text-xs text-white font-bold truncate">
                  {intent.moveName || (intent.kind === 'heavy' ? 'Charge puissante' : 'Attaque')}
                  {' → '}
                  {(intent.targets || []).map(t => t.targetName).join(', ')}
                  {intent.eff >= 2 && <span className="text-red-300"> ⚡</span>}
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-black text-lg" style={{ color: intent.kind === 'heavy' ? '#f87171' : '#e2e8f0' }}>
                -{(intent.targets || []).reduce((s, t) => s + t.damage, 0)}
              </p>
              {guard > 0 && <p className="text-[9px] text-cyan-300">🛡️ {guard} absorbé</p>}
            </div>
          </div>
        )}

        {phase === 'enemy' && (
          <div className="rounded-xl py-3 text-center border border-red-900/40 bg-red-900/10">
            <p className="text-sm font-bold text-red-400 animate-pulse">⚔️ {enemy.name} riposte…</p>
          </div>
        )}

        {/* Team status row */}
        {phase !== 'win' && phase !== 'lose' && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] text-gray-600 font-bold uppercase">Ton équipe</p>
              <div className="flex items-center gap-2">
                {guard > 0 && <span className="text-[10px] font-bold text-cyan-300">🛡️ {guard}</span>}
                {buff > 0 && <span className="text-[10px] font-bold text-orange-300">💪 +{Math.round(buff * 100)}%</span>}
              </div>
            </div>
            <div className="flex gap-2">
              {team.map(m => {
                const h = hp[m.uid] ?? 0, maxH = m.maxHp || 1
                const alive = h > 0
                return (
                  <div key={m.uid} className={`flex-1 rounded-xl p-1.5 flex flex-col items-center gap-0.5 border ${shake === m.uid ? 'animate-shake' : ''}`}
                    style={{ background: '#0f172a', borderColor: alive ? (m.holo ? '#c084fc55' : m.shiny ? '#fbbf2455' : '#1e293b') : '#1a1a2e', opacity: alive ? 1 : 0.4 }}>
                    <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${m.shiny ? 'shiny/' : ''}${m.id}.png`}
                      alt={m.name} className={`w-9 h-9 object-contain pixelated ${!alive ? 'grayscale' : ''}`} loading="lazy" />
                    <p className="text-[8px] text-white font-bold truncate w-full text-center leading-none">{m.name}</p>
                    <div className="flex gap-0.5 items-center">
                      {m.shiny && <span className="text-[7px]">✨</span>}
                      {m.holo  && <span className="text-[7px]">🌈</span>}
                      {teamStatus[m.uid] && alive && (
                        <span className="text-[8px] leading-none" title={`${STATUS_DEF[teamStatus[m.uid].type]?.label} ${teamStatus[m.uid].turns}t`}>
                          {STATUS_DEF[teamStatus[m.uid].type]?.label?.split(' ')[0]}
                        </span>
                      )}
                    </div>
                    <div className="w-full h-1 rounded-full bg-gray-800">
                      <div className="h-full rounded-full" style={{ width: `${Math.max(0, (h / maxH) * 100)}%`, background: h / maxH > 0.5 ? '#4ade80' : h / maxH > 0.25 ? '#fbbf24' : '#ef4444' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Win panel */}
        {phase === 'win' && winSummary && (
          <div className="rounded-2xl p-4 border border-green-700/50 bg-green-900/15 text-center">
            <p className="text-3xl mb-1">{enemy.isBoss ? '🏆' : '✅'}</p>
            <p className="font-game text-sm text-green-400">Victoire !</p>
            <div className="flex justify-center gap-4 mt-2 text-xs">
              <span className="text-yellow-300">+{winSummary.goldGain} 💰</span>
              <span className="text-cyan-300">+{winSummary.xpEach} XP</span>
            </div>
            {winSummary.events.length > 0 && (
              <div className="mt-3 space-y-1">
                {winSummary.events.map((ev, i) => (
                  <div key={i} className="text-xs">
                    {ev.evo.length > 0
                      ? <p className="text-purple-300 font-bold">✨ {ev.evo[0].from} → {ev.evo[0].to} !</p>
                      : <p className="text-cyan-300">⬆️ {ev.name} Niv.{ev.from} → {ev.to}</p>}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3">
              {caught ? (
                <p className={`text-xs font-bold ${caught.ok ? 'text-green-300' : 'text-gray-500'}`}>
                  {caught.ok
                    ? (caught.benched ? `🎉 ${caught.name} capturé (Pokédex) !` : `🎉 ${caught.name} rejoint l'équipe !`)
                    : `💨 ${caught.name} s'est échappé…`}
                </p>
              ) : (
                <>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">
                    {enemy.isBoss ? 'Master Ball uniquement' : throwUsed ? '1 lancer max utilisé' : 'Tente une capture'}
                  </p>
                  {!throwUsed && (
                    <div className="flex justify-center gap-2 flex-wrap">
                      {BALLS.map(b => {
                        const owned = run.balls?.[b.id] || 0
                        const usable = owned > 0 && (!enemy.isBoss || b.rate >= 1)
                        return (
                          <button key={b.id} onClick={() => tryCatch(b.id)} disabled={!usable}
                            className={`flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-1.5 transition-all ${usable ? 'active:scale-95' : 'opacity-30'}`}
                            style={{ background: b.color + '22', border: `1px solid ${b.color}66` }}>
                            <ItemSprite slug={b.slug} emoji={b.emoji} size={26} />
                            <span className="text-[9px] font-bold text-white">×{owned}</span>
                            <span className="text-[8px] font-bold" style={{ color: b.color }}>{Math.round((b.rate ?? 0) * 100)}%</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Lose panel */}
        {phase === 'lose' && (
          <div className="rounded-2xl p-5 border border-red-800 bg-red-900/20 text-center">
            <p className="text-4xl mb-2">💀</p>
            <p className="font-game text-sm text-red-400">Ton équipe est tombée</p>
            <p className="text-xs text-gray-500 mt-1">Vague {wave} — {kind === 'boss' ? 'le Boss vous a écrasés' : 'défaite au combat'}.</p>
          </div>
        )}

        {/* Battle log */}
        <div className="bg-game-surface rounded-xl p-2.5 border border-game-border">
          {log.length === 0 && <p className="text-[10px] text-gray-700">…</p>}
          {log.map((l, i) => <p key={i} className="text-[10px] text-gray-500 leading-relaxed">{l}</p>)}
        </div>
      </div>

      {/* Bottom: shared random hand */}
      <div className="fixed bottom-0 inset-x-0 border-t border-game-border z-20" style={{ background: 'rgba(10,10,20,0.97)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-lg mx-auto px-3 py-3">
          {phase === 'win' ? (
            <button onClick={continueAfterWin} className="w-full py-4 bg-green-600 hover:bg-green-500 active:scale-95 text-white font-black rounded-xl text-base transition-all">
              {enemy.isBoss ? '🛒 Marché du Rift →' : `${run.winsThisRun > 0 && (run.winsThisRun + 1) % 5 === 0 ? '🏅 Récompense ×5 →' : '⏭ Vague suivante →'}`}
            </button>
          ) : phase === 'lose' ? (
            <button onClick={continueAfterLose} className="w-full py-4 bg-gray-800 hover:bg-gray-700 text-gray-300 font-black rounded-xl text-base transition-all">
              Voir le résumé →
            </button>
          ) : phase === 'player' ? (
            <>
              {/* Swap + hint */}
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-gray-600 font-bold uppercase">Choisis 1 attaque · {hand.length} tirée{hand.length > 1 ? 's' : ''}</p>
                <button onClick={swapHand} disabled={rerolls <= 0}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-all ${rerolls > 0 ? 'bg-blue-900/70 hover:bg-blue-800 active:scale-95 text-blue-300 border border-blue-700/50' : 'bg-gray-900 text-gray-700'}`}>
                  🔄 Échanger ×{rerolls}
                </button>
              </div>

              {/* Shared hand: N random cards from the whole team's movepool */}
              <div className="flex gap-2 justify-center flex-wrap">
                {hand.length === 0 && (
                  <p className="text-[10px] text-gray-600 py-4">Aucune attaque disponible…</p>
                )}
                {hand.map(card => {
                  const owner = team.find(m => m.uid === card.ownerUid)
                  if (!owner) return null
                  const tc = TYPE_COLORS[card.type] || '#64748b'
                  const preview = previewCard(card, owner, enemy, relicAgg)
                  return (
                    <button key={card.uid} onClick={() => playCard(card)}
                      className="rounded-xl p-2 flex flex-col items-center gap-1 transition-all active:scale-95 hover:-translate-y-0.5"
                      style={{
                        width: 104,
                        background: `linear-gradient(160deg, ${tc}2a, #0f172a)`,
                        border: `2px solid ${tc}cc`,
                        boxShadow: `0 0 8px ${tc}44`,
                      }}>
                      {/* Owner header */}
                      <div className="flex items-center gap-1 w-full">
                        <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${owner.shiny ? 'shiny/' : ''}${owner.id}.png`}
                          alt={owner.name} className="w-7 h-7 object-contain pixelated flex-shrink-0" />
                        <p className="text-[7px] text-gray-300 font-bold truncate leading-none flex-1">{owner.name}</p>
                      </div>
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10px]">{KIND_ICON[card.kind]}</span>
                        <span className="text-[7px] font-bold rounded px-1" style={{ background: tc + '33', color: tc }}>
                          {card.type?.toUpperCase().slice(0, 3)}
                        </span>
                      </div>
                      <p className="text-[9px] font-black text-white text-center leading-tight w-full">{card.name}</p>
                      {preview && (
                        <div className="flex gap-1 flex-wrap justify-center">
                          {preview.map((p, i) => (
                            <span key={i} className="text-[9px] font-black tabular-nums" style={{ color: p.color }}>{p.label}</span>
                          ))}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="py-4 text-center">
              <p className="text-sm font-bold text-red-400 animate-pulse">⚔️ Ennemi attaque…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
