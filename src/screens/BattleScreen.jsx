import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { useRunStore } from '../store/runStore.js'
import {
  buildEnemy, xpForWin, goldForWin, gainXp, catchChance, waveKind,
} from '../engine/runEngine.js'
import {
  moveDamage, guardValue, healValue, computeIntent, STATUS_DEF,
  buildMovesetG, previewMove, getBossImmunity, rageMultiplier,
} from '../engine/combatEngine.js'
import { aggregateRelics } from '../data/relics.js'
import { biomeForWave } from '../data/biomes.js'
import { getTrait } from '../data/signatureTraits.js'
import { TYPE_COLORS, TYPE_LABELS_FR } from '../data/types.js'
import { BALLS, BALL_BY_ID } from '../data/items.js'
import TypeBadge from '../components/TypeBadge.jsx'
import HPBar from '../components/HPBar.jsx'
import ItemSprite from '../components/ItemSprite.jsx'

export default function BattleScreen() {
  const { navigate } = useGameStore()
  const run = useRunStore()
  const { team, relics, wave, pendingEnemy } = run
  const relicAgg = useMemo(() => aggregateRelics(relics), [relics])
  const kind = waveKind(wave)
  const biome = useMemo(() => biomeForWave(wave), [wave])

  // ── Core state ───────────────────────────────────────────────────
  const [enemy, setEnemy]           = useState(null)
  const [enemyHp, setEnemyHp]       = useState(0)
  const [enemyMax, setEnemyMax]     = useState(1)
  const [hp, setHp]                 = useState({})
  const [guard, setGuard]           = useState(0)
  const [enemyStatus, setEStatus]   = useState(null)
  const [intent, setIntent]         = useState(null)
  const [enraged, setEnraged]       = useState(false)
  const [phase, setPhase]           = useState('init')
  const [turn, setTurn]             = useState(1)
  const [floatDmg, setFloatDmg]     = useState(null)
  const [log, setLog]               = useState([])
  const [shake, setShake]           = useState(null)
  const [winSummary, setWinSummary] = useState(null)
  const [caught, setCaught]         = useState(null)
  const reviveUsed = useRef(false)

  // ── System G state ───────────────────────────────────────────────
  const [rageLevel, setRageLevel]   = useState(0)
  const [cooldowns, setCooldowns]   = useState({})
  const [actedUids, setActedUids]   = useState(new Set())
  const [teamBuff, setTeamBuff]     = useState(0)
  const [preview, setPreview]       = useState(null)

  // Stable movesets for the whole battle
  const movesets = useMemo(() => {
    if (!team) return {}
    const m = {}
    team.forEach(mon => { m[mon.uid] = buildMovesetG(mon) })
    return m
  }, [team]) // eslint-disable-line

  // Ref mirror for synchronous access inside callbacks
  const live = useRef({})
  live.current = { enemyHp, hp, guard, enemyStatus, intent, enraged, rageLevel, cooldowns, actedUids, teamBuff }

  const addLog = (m) => setLog(p => [...p.slice(-6), m])
  const doShake = (t, ms = 420) => { setShake(t); setTimeout(() => setShake(null), ms) }

  // ── Init ─────────────────────────────────────────────────────────
  useEffect(() => {
    const e = pendingEnemy || buildEnemy(wave)
    const startHp = {}
    team.forEach(m => {
      let h = m.hp
      if (relicAgg.healWavePct) h = Math.min(m.maxHp, Math.round(h + m.maxHp * relicAgg.healWavePct / 100))
      startHp[m.uid] = h
    })
    setEnemy(e); setEnemyHp(e.hp); setEnemyMax(e.maxHp); setHp(startHp)
    reviveUsed.current = false
    addLog(
      e.isBoss       ? `💀 BOSS : ${e.name} (Niv.${e.level}) surgit !`
      : kind === 'elite'   ? `⭐ ${e.name} d'élite apparaît !`
      : kind === 'trainer' ? `🧢 Dresseur envoie ${e.name} !`
      : `Un ${e.name} sauvage apparaît !`
    )
    setIntent(computeIntent(e, team, startHp))
    setPhase('player')
  }, []) // eslint-disable-line

  // Boss immunity rotates every 3 turns
  const bossImmunity = useMemo(() => {
    if (!enemy?.isBoss) return null
    return getBossImmunity(turn)
  }, [enemy, turn])
  const immunityChangesIn = enemy?.isBoss ? (3 - ((turn - 1) % 3)) : null

  // ── Heal helpers ─────────────────────────────────────────────────
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

  // ── First click: open preview ─────────────────────────────────────
  function handleAttackClick(move, mon) {
    if (phase !== 'player') return
    if ((live.current.hp[mon.uid] || 0) <= 0) return
    if (live.current.actedUids.has(mon.uid)) return
    if ((live.current.cooldowns[move.key] || 0) > 0) return
    if (enemy?.isBoss && move.kind === 'attack' && move.type === bossImmunity) {
      addLog(`🔒 ${enemy.name} est immunisé au type ${TYPE_LABELS_FR[move.type] || move.type} ce cycle !`)
      return
    }
    const info = previewMove(move, mon, enemy, relicAgg)
    setPreview({ move, mon, info })
  }

  // ── Second click: execute the previewed move ─────────────────────
  function confirmAttack() {
    if (!preview) return
    const { move, mon } = preview
    setPreview(null)

    const { enemyHp: eHp0, hp: hp0, teamBuff: buff0 } = live.current

    setActedUids(prev => new Set([...prev, mon.uid]))
    if (move.cooldown > 0) setCooldowns(prev => ({ ...prev, [move.key]: move.cooldown }))

    if (move.kind === 'attack' || move.kind === 'drain') {
      let { dmg, eff } = moveDamage(move, mon, enemy, relicAgg)
      if (buff0 > 0) { dmg = Math.round(dmg * (1 + buff0)); setTeamBuff(0) }
      const newE = Math.max(0, eHp0 - dmg)
      setEnemyHp(newE)
      setFloatDmg({ dmg, color: TYPE_COLORS[move.type] || '#fff', eff })
      doShake('enemy')
      setTimeout(() => setFloatDmg(null), 900)
      addLog(`${move.emoji} ${mon.name} · ${move.name} → ${dmg}${eff >= 2 ? ' ⚡efficace!' : eff < 1 ? ' (peu efficace)' : ''}`)

      let teamHp = hp0
      if (move.kind === 'drain') {
        const h = healValue(move, mon); teamHp = healAll(teamHp, h)
        addLog(`🌿 Drain → +${h} PV équipe`)
      }
      if (relicAgg.lifestealPct) teamHp = healWeakest(teamHp, Math.round(dmg * relicAgg.lifestealPct / 100))
      if (teamHp !== hp0) setHp(teamHp)

      if (enemy.isBoss && newE <= enemyMax * 0.5 && !live.current.enraged) {
        setEnraged(true); addLog(`😡 ${enemy.name} entre en RAGE !`)
      }
      if (newE <= 0) { setTimeout(() => win(teamHp), 650); return }

    } else if (move.kind === 'guard') {
      const g = guardValue(move, mon)
      setGuard(prev => prev + g)
      addLog(`${move.emoji} ${mon.name} · ${move.name} → 🛡️ +${g}`)

    } else if (move.kind === 'heal') {
      const h = healValue(move, mon)
      setHp(healAll(hp0, h))
      addLog(`${move.emoji} ${mon.name} · ${move.name} → +${h} PV équipe`)

    } else if (move.kind === 'status') {
      const def = STATUS_DEF[move.status]
      const trait = getTrait(mon.id, mon.types)
      const turns = def.turns + (trait.statusTurns || 0)
      setEStatus(prev => {
        if (prev && prev.type === move.status) return { ...prev, turns }
        return { type: move.status, turns, stacks: move.status === 'poison' ? 1 : 0 }
      })
      addLog(`${move.emoji} ${mon.name} · ${move.name} → ${enemy.name} ${def.label} !`)

    } else if (move.kind === 'buff') {
      const trait = getTrait(mon.id, mon.types)
      setTeamBuff((move.bonus || 0.7) + (trait.buffPlus || 0))
      addLog(`${move.emoji} ${mon.name} · ${move.name} → prochaine attaque renforcée !`)
    }
  }

  // ── End turn: rage tick → enemy attacks → next turn setup ────────
  function endTurn() {
    if (phase !== 'player') return
    setPhase('enemy')
    setPreview(null)

    const { enemyStatus: st0, guard: guard0, intent: intent0, enraged: enraged0, rageLevel: rage0 } = live.current
    let eHp = live.current.enemyHp
    let teamHp = { ...live.current.hp }
    let status = st0
    let skipEnemy = false
    const logs = []

    // 1) Rage increases every player turn
    const newRage = rage0 + 1
    setRageLevel(newRage)
    if (newRage === 5)  logs.push(`😤 Rage 5 — dégâts ennemis +20% !`)
    if (newRage === 10) logs.push(`😡 Rage 10 — dégâts ennemis +50% !`)
    if (newRage >= 15) {
      const heal = Math.round(enemyMax * 0.1)
      eHp = Math.min(enemyMax, eHp + heal)
      logs.push(`🩸 Rage max — ${enemy.name} récupère ${heal} PV !`)
    }

    // 2) Status tick on enemy
    if (st0) {
      const def = STATUS_DEF[st0.type]
      if (st0.type === 'burn') {
        const d = Math.max(1, Math.round(enemyMax * def.tickPct))
        eHp = Math.max(0, eHp - d); logs.push(`🔥 ${enemy.name} subit ${d} (brûlure)`)
      } else if (st0.type === 'poison') {
        const stacks = st0.stacks || 1
        const d = Math.max(1, Math.round(enemyMax * def.tickPct * stacks))
        eHp = Math.max(0, eHp - d); logs.push(`☠️ ${enemy.name} subit ${d} (poison)`)
      } else if (st0.type === 'freeze') {
        skipEnemy = true; logs.push(`❄️ ${enemy.name} gelé — tour sauté`)
      } else if (st0.type === 'paralyze' && Math.random() < def.skip) {
        skipEnemy = true; logs.push(`⚡ ${enemy.name} paralysé — attaque ratée`)
      }
      const turns = st0.turns - 1
      status = turns <= 0 ? null : { ...st0, turns, stacks: st0.type === 'poison' ? (st0.stacks || 1) + 1 : st0.stacks }
      if (!status) logs.push(`${enemy.name} se rétablit du statut`)
    }

    setEnemyHp(eHp); setEStatus(status)
    logs.forEach(addLog)
    if (eHp <= 0) { setTimeout(() => win(teamHp), 650); return }

    // 3) Enemy executes telegraphed intent
    setTimeout(() => {
      if (!skipEnemy) {
        const rageMult = rageMultiplier(newRage)
        let dmg = Math.round((intent0?.damage ?? 1) * rageMult)
        if (enraged0 || enraged) dmg = Math.round(dmg * 1.3)
        const absorbed = Math.min(guard0, dmg)
        dmg = Math.max(0, dmg - guard0)

        let targetUid = intent0?.targetUid
        if (!targetUid || (teamHp[targetUid] || 0) <= 0) {
          const alive = team.filter(m => (teamHp[m.uid] || 0) > 0)
          if (alive.length) targetUid = alive.reduce((a, b) => (teamHp[a.uid] / a.maxHp < teamHp[b.uid] / b.maxHp ? a : b)).uid
        }
        if (targetUid) {
          const tname = team.find(m => m.uid === targetUid)?.name
          teamHp = { ...teamHp, [targetUid]: Math.max(0, (teamHp[targetUid] || 0) - dmg) }
          doShake(targetUid)
          if (absorbed > 0) addLog(`🛡️ Bouclier absorbe ${absorbed}`)
          addLog(`💥 ${enemy.name} inflige ${dmg} à ${tname}${rageMult > 1 ? ` [×${rageMult} rage]` : ''}${(enraged0 || enraged) ? ' [RAGE]' : ''}`)
          if ((teamHp[targetUid] || 0) <= 0 && relicAgg.revive && !reviveUsed.current) {
            const m = team.find(t => t.uid === targetUid)
            teamHp[targetUid] = Math.round(m.maxHp * relicAgg.revive / 100)
            reviveUsed.current = true
            addLog(`🪶 Plume Phénix ranime ${tname} !`)
          }
        }
      }
      setHp(teamHp)
      setTeamBuff(0)
      const anyAlive = team.some(m => (teamHp[m.uid] || 0) > 0)
      if (!anyAlive) { setTimeout(() => lose(teamHp), 450); return }

      // 4) Next turn setup
      setTimeout(() => {
        setTurn(t => t + 1)
        setGuard(0)
        setActedUids(new Set())
        setCooldowns(prev => {
          const next = {}
          for (const [k, v] of Object.entries(prev)) if (v > 1) next[k] = v - 1
          return next
        })
        setIntent(computeIntent(enemy, team, teamHp))
        setPhase('player')
      }, 480)
    }, 720)
  }

  // ── Win / Lose ────────────────────────────────────────────────────
  function win(finalHp) {
    // Efficiency: bonus if fast, penalty if slow
    const effMult = turn <= 6 ? 1.25 : turn >= 13 ? 0.7 : 1
    const xpEach = Math.round(xpForWin(enemy, wave) * (relicAgg.xpMult || 1) * effMult)
    const events = []
    const updated = team.map(m => {
      const copy = { ...m, hp: finalHp[m.uid] ?? m.hp }
      if (copy.hp > 0) {
        const before = copy.level
        const ev = gainXp(copy, xpEach)
        if (ev.levels.length || ev.evolutions.length) events.push({ name: m.name, from: before, to: copy.level, evo: ev.evolutions })
      }
      return copy
    })
    const goldGain = Math.round((goldForWin(wave) + (relicAgg.goldWin || 0)) * effMult)
    run.commitTeam(updated); run.addGold(goldGain); run.setOutcome('win')
    const g = useGameStore.getState()
    g.recordStat('battlesWon'); g.reportQuest('win', 1); g.reportQuest('wave', wave)
    setWinSummary({ xpEach, events, goldGain, turns: turn, effMult })
    setPhase('win')
    addLog(`✅ ${enemy.name} vaincu !`)
  }

  function lose(finalHp) {
    run.commitTeam(team.map(m => ({ ...m, hp: finalHp[m.uid] ?? m.hp })))
    run.setOutcome('lose')
    setPhase('lose')
  }

  // ── Catch ─────────────────────────────────────────────────────────
  function ballCatchChance(ballId) {
    const b = BALL_BY_ID[ballId]
    if (!b) return 0
    if (b.mult === Infinity) return 1
    const base = catchChance(enemy, enemyHp / Math.max(1, enemyMax), relicAgg)
    return base <= 0 ? 0 : Math.min(0.99, base * b.mult)
  }
  function tryCatch(ballId = 'poke-ball') {
    if (caught) return
    const b = BALL_BY_ID[ballId]
    if (!b || enemy.isBoss && b.mult !== Infinity || (run.balls?.[ballId] || 0) <= 0) return
    if (!run.useBall(ballId)) return
    if (Math.random() < ballCatchChance(ballId)) {
      setCaught({ ok: true, ...run.catchEnemy(enemy, ballId) })
      const g = useGameStore.getState()
      g.recordStat('catches'); g.reportQuest('catch', 1)
    } else setCaught({ ok: false, name: enemy.name })
  }

  function continueAfterWin() { run.advanceWave(); navigate(enemy.isBoss ? 'runshop' : 'reward') }
  function continueAfterLose() { run.endRun(); navigate('runend') }

  if (!enemy || phase === 'init') {
    return <div className="min-h-screen bg-game-bg flex items-center justify-center"><div className="text-4xl animate-spin">⚡</div></div>
  }

  const typeColor = TYPE_COLORS[enemy.types?.[0]] || '#1e293b'
  const intentTarget = intent ? team.find(m => m.uid === intent.targetUid) : null
  const rageMult = rageMultiplier(rageLevel)
  const aliveTeam = team.filter(m => (hp[m.uid] ?? 0) > 0)
  const allActed = aliveTeam.length > 0 && aliveTeam.every(m => actedUids.has(m.uid))
  const notActedCount = aliveTeam.filter(m => !actedUids.has(m.uid)).length

  return (
    <div className="min-h-screen flex flex-col" style={{ background: biome.bg }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="px-4 pt-10 pb-2 border-b border-white/5" style={{ background: 'rgba(10,10,20,0.6)' }}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[11px] text-gray-500 font-bold uppercase">
                Vague {wave} · {kind === 'boss' ? '💀 BOSS' : kind === 'elite' ? '⭐ Élite' : kind === 'trainer' ? '🧢 Dresseur' : '🌿 Sauvage'}
              </p>
              <p className="text-[10px] text-gray-600">Tour {turn}</p>
            </div>
            <div className="flex gap-1 items-center">
              {team.map(m => (
                <div key={m.uid} className="w-2.5 h-2.5 rounded-full" style={{ background: (hp[m.uid] ?? 0) > 0 ? '#4ade80' : '#374151' }} />
              ))}
            </div>
          </div>
          {/* Rage gauge */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-gray-500 uppercase">Rage</span>
            <div className="flex-1 h-1.5 rounded-full bg-gray-800 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (rageLevel / 15) * 100)}%`,
                  background: rageLevel >= 10 ? '#ef4444' : rageLevel >= 5 ? '#f97316' : '#22c55e',
                }}
              />
            </div>
            <span className="text-[9px] font-bold w-8 text-right" style={{ color: rageLevel >= 10 ? '#ef4444' : rageLevel >= 5 ? '#f97316' : '#4ade80' }}>
              {rageLevel}/15
            </span>
            {rageMult > 1 && (
              <span className="text-[9px] font-black animate-pulse ml-1" style={{ color: rageLevel >= 10 ? '#ef4444' : '#f97316' }}>
                ×{rageMult} ATK
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-w-lg mx-auto w-full px-3 py-3 flex flex-col gap-3 pb-24">

        {/* ── Enemy card ─────────────────────────────────────────────── */}
        <div
          className={`rounded-2xl p-4 border relative ${shake === 'enemy' ? 'animate-shake' : ''} ${enraged ? 'animate-rage-pulse' : ''}`}
          style={{ background: `linear-gradient(160deg, ${typeColor}33, #0f172a)`, borderColor: enraged ? '#ef4444aa' : typeColor + '55' }}
        >
          {enemy.isBoss && <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full">💀 BOSS</div>}
          {enraged && <div className="absolute -top-2 right-3 bg-orange-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">😡 RAGE</div>}

          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <img
                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${enemy.id}.png`}
                alt={enemy.name} className="w-20 h-20 object-contain drop-shadow-lg"
                onError={e => { e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${enemy.id}.png` }}
              />
              {floatDmg && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 animate-float-dmg font-black text-xl pointer-events-none" style={{ color: floatDmg.color }}>
                  -{floatDmg.dmg}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-white text-sm">{enemy.name}</p>
                <p className="text-xs text-gray-500">Niv.{enemy.level}</p>
                {enemyStatus && (
                  <span className="text-[9px] font-bold px-1 py-0.5 rounded"
                    style={{ color: STATUS_DEF[enemyStatus.type]?.color, background: STATUS_DEF[enemyStatus.type]?.color + '22' }}>
                    {STATUS_DEF[enemyStatus.type]?.label} {enemyStatus.turns}t
                  </span>
                )}
              </div>
              <div className="flex gap-1 my-1">{(enemy.types || ['normal']).map(t => <TypeBadge key={t} type={t} size="xs" />)}</div>
              <HPBar hp={enemyHp} maxHp={enemyMax} showNumbers size="md" />
            </div>
          </div>

          {/* Boss immunity bar */}
          {enemy.isBoss && bossImmunity && phase !== 'win' && phase !== 'lose' && (
            <div className="mt-2 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-black/40">
              <span className="text-[9px] font-bold text-gray-400 uppercase">🔒 Immunisé</span>
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: TYPE_COLORS[bossImmunity] || '#64748b' }} />
              <span className="text-[9px] font-bold" style={{ color: TYPE_COLORS[bossImmunity] }}>
                {TYPE_LABELS_FR[bossImmunity] || bossImmunity}
              </span>
              <span className="text-[8px] text-gray-600 ml-auto">change dans {immunityChangesIn}t</span>
            </div>
          )}
        </div>

        {/* ── Enemy intent ───────────────────────────────────────────── */}
        {phase !== 'win' && phase !== 'lose' && intent && (
          <div className="rounded-xl px-3 py-2.5 border flex items-center justify-between gap-2"
            style={{
              background: (intent.kind === 'heavy' ? '#ef4444' : TYPE_COLORS[intent.type] || '#64748b') + '14',
              borderColor: (intent.kind === 'heavy' ? '#ef4444' : TYPE_COLORS[intent.type] || '#64748b') + '55',
            }}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl">{intent.kind === 'heavy' ? '🌋' : '⚔️'}</span>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Prochaine attaque ennemie</p>
                <p className="text-xs text-white font-bold truncate">
                  {intent.kind === 'heavy' ? 'Charge puissante' : 'Attaque'} → {intentTarget?.name || intent.targetName}
                  {intent.eff >= 2 && <span className="text-red-300"> (efficace !)</span>}
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-black text-lg" style={{ color: intent.kind === 'heavy' ? '#f87171' : '#e2e8f0' }}>
                -{Math.max(0, Math.round(intent.damage * rageMult) - guard)}
              </p>
              {guard > 0 && <p className="text-[9px] text-cyan-300">🛡️ {guard} absorbé</p>}
              {rageMult > 1 && <p className="text-[8px] text-orange-300">×{rageMult} rage</p>}
            </div>
          </div>
        )}

        {phase === 'enemy' && (
          <div className="rounded-xl py-3 text-center border border-red-900/40 bg-red-900/10">
            <p className="text-sm font-bold text-red-400 animate-pulse">⚔️ {enemy.name} riposte…</p>
          </div>
        )}

        {/* ── Win panel ──────────────────────────────────────────────── */}
        {phase === 'win' && winSummary && (
          <div className="rounded-2xl p-4 border border-green-700/50 bg-green-900/15 text-center relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              {['10%', '30%', '55%', '75%', '90%'].map((left, i) => (
                <span key={i} className="absolute text-sm animate-sparkle-float" style={{ left, top: '60%', animationDelay: `${i * 0.18}s` }}>✨</span>
              ))}
            </div>
            <p className="text-3xl mb-1 animate-burst-in">{enemy.isBoss ? '🏆' : '✅'}</p>
            <p className="font-game text-sm text-green-400">Victoire !</p>
            {winSummary.effMult > 1 && (
              <p className="text-[10px] text-yellow-300 font-bold mt-1">⚡ Victoire Éclair ({winSummary.turns} tours) — +25% XP & Or !</p>
            )}
            {winSummary.effMult < 1 && (
              <p className="text-[10px] text-red-400 font-bold mt-1">⏳ Combat trop long ({winSummary.turns} tours) — -30% XP & Or</p>
            )}
            <div className="flex justify-center gap-4 mt-2 text-xs">
              <span className="text-yellow-300">+{winSummary.goldGain} 💰</span>
              <span className="text-cyan-300">+{winSummary.xpEach} XP</span>
            </div>
            {winSummary.events.length > 0 && (
              <div className="mt-3 space-y-1">
                {winSummary.events.map((ev, i) => (
                  <div key={i} className="text-xs">
                    {ev.evo.length > 0
                      ? <p className="text-purple-300 font-bold animate-burst-in">✨ {ev.evo[0].from} → {ev.evo[0].to} !</p>
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
                    {enemy.isBoss ? 'Master Ball uniquement' : 'Tente une capture'}
                  </p>
                  <div className="flex justify-center gap-2 flex-wrap">
                    {BALLS.map(b => {
                      const owned = run.balls?.[b.id] || 0
                      const usable = owned > 0 && (!enemy.isBoss || b.mult === Infinity)
                      const pct = Math.round(ballCatchChance(b.id) * 100)
                      return (
                        <button key={b.id} onClick={() => tryCatch(b.id)} disabled={!usable}
                          className={`flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-1.5 transition-all ${usable ? 'active:scale-95' : 'opacity-30'}`}
                          style={{ background: b.color + '22', border: `1px solid ${b.color}66` }}>
                          <ItemSprite slug={b.slug} emoji={b.emoji} size={26} />
                          <span className="text-[9px] font-bold text-white">×{owned}</span>
                          <span className="text-[8px] font-bold" style={{ color: b.color }}>{b.mult === Infinity ? '100%' : `${pct}%`}</span>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Lose panel ─────────────────────────────────────────────── */}
        {phase === 'lose' && (
          <div className="rounded-2xl p-5 border border-red-800 bg-red-900/20 text-center">
            <p className="text-4xl mb-2">💀</p>
            <p className="font-game text-sm text-red-400">Ton équipe est tombée</p>
            <p className="text-xs text-gray-500 mt-1">Vague {wave} — {kind === 'boss' ? 'le Boss vous a écrasés' : 'défaite au combat'}.</p>
          </div>
        )}

        {/* ── Battle log ─────────────────────────────────────────────── */}
        <div className="bg-game-surface rounded-xl p-2.5 border border-game-border">
          {log.length === 0 && <p className="text-[10px] text-gray-700">…</p>}
          {log.map((l, i) => <p key={i} className="text-[10px] text-gray-500 leading-relaxed">{l}</p>)}
        </div>

        {/* ── Team attack panels ─────────────────────────────────────── */}
        {phase !== 'win' && phase !== 'lose' && (
          <div className="space-y-2">
            <p className="text-[10px] text-gray-600 font-bold uppercase">Attaques de l'équipe</p>
            {team.map(mon => {
              const monHp = hp[mon.uid] ?? 0
              const alive = monHp > 0
              const acted = actedUids.has(mon.uid)
              const moves = movesets[mon.uid] || []
              return (
                <div key={mon.uid}
                  className={`rounded-xl border transition-all ${!alive ? 'opacity-35' : acted ? 'opacity-60' : ''}`}
                  style={{ background: '#0a0f1a', borderColor: acted ? '#1e293b' : alive ? '#334155' : '#1a1a2e' }}>
                  {/* Mon header row */}
                  <div className={`flex items-center gap-2 px-3 pt-2.5 pb-1.5 ${shake === mon.uid ? 'animate-shake' : ''}`}>
                    <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${mon.id}.png`}
                      alt={mon.name} className={`w-10 h-10 object-contain pixelated flex-shrink-0 ${!alive ? 'grayscale' : ''}`} loading="lazy" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-white truncate">{mon.name}</p>
                        <p className="text-[9px] text-gray-600">Niv.{mon.level}</p>
                        {acted && <span className="text-[9px] font-bold text-green-500">✓</span>}
                        {!alive && <span className="text-[9px] font-bold text-red-500">KO</span>}
                        {teamBuff > 0 && !acted && alive && (
                          <span className="text-[9px] font-bold text-orange-300">💪 +{Math.round(teamBuff * 100)}%</span>
                        )}
                      </div>
                      <div className="w-full h-1 rounded-full bg-gray-800 mt-0.5">
                        <div className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.max(0, (monHp / (mon.maxHp || 1)) * 100)}%`,
                            background: monHp / (mon.maxHp || 1) > 0.5 ? '#4ade80' : monHp / (mon.maxHp || 1) > 0.25 ? '#fbbf24' : '#ef4444',
                          }} />
                      </div>
                      <p className="text-[8px] text-gray-600 mt-0.5">{monHp}/{mon.maxHp} PV</p>
                    </div>
                  </div>

                  {/* Attack buttons */}
                  <div className="flex gap-1.5 px-2.5 pb-2.5 flex-wrap">
                    {moves.map(move => {
                      const cd = cooldowns[move.key] || 0
                      const isImmune = enemy?.isBoss && move.kind === 'attack' && move.type === bossImmunity
                      const disabled = !alive || acted || cd > 0 || phase !== 'player' || isImmune
                      const tc = TYPE_COLORS[move.type] || '#64748b'
                      return (
                        <button key={move.key}
                          onClick={() => handleAttackClick(move, mon)}
                          disabled={disabled}
                          className={`flex-1 min-w-[58px] rounded-lg p-1.5 flex flex-col items-center gap-0.5 transition-all text-center ${!disabled ? 'active:scale-95 hover:brightness-125' : 'opacity-30 cursor-not-allowed'}`}
                          style={{ background: disabled ? '#0a0f1a' : `${tc}1a`, border: `1.5px solid ${disabled ? '#1e293b' : tc + '77'}` }}>
                          <span className="text-base leading-none">{move.emoji}</span>
                          <p className="text-[8px] font-bold text-white leading-tight truncate w-full text-center mt-0.5">{move.name}</p>
                          {cd > 0
                            ? <p className="text-[7px] text-red-400 font-bold">⏳ {cd}t</p>
                            : isImmune
                            ? <p className="text-[7px] text-orange-400 font-bold">🔒</p>
                            : move.cooldown > 0
                            ? <p className="text-[7px] text-gray-600">CD {move.cooldown}t</p>
                            : <p className="text-[7px] text-green-700">Prêt</p>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>

      {/* ── Attack preview modal ────────────────────────────────────── */}
      {preview && (
        <div className="fixed inset-0 z-30 flex items-end justify-center pb-4 px-3"
          style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={e => { if (e.target === e.currentTarget) setPreview(null) }}>
          <div className="max-w-lg w-full rounded-2xl border border-white/10 p-4" style={{ background: '#0d1117' }}>
            {/* Move header */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{preview.move.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm">{preview.move.name}</p>
                <p className="text-[10px] text-gray-500">{preview.mon.name} → {enemy.name}</p>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: TYPE_COLORS[preview.move.type] || '#64748b' }} />
                <span className="text-[9px] text-gray-500">{TYPE_LABELS_FR[preview.move.type] || preview.move.type}</span>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed mb-3">{preview.move.desc}</p>

            {/* Value display */}
            <div className="rounded-xl p-3 mb-3 text-center"
              style={{ background: preview.info.color + '15', border: `1px solid ${preview.info.color}44` }}>
              {preview.info.valueType === 'damage' && (
                <>
                  <p className="font-black text-2xl" style={{ color: preview.info.color }}>-{preview.info.value}</p>
                  <p className="text-[10px] text-gray-400">
                    dégâts {preview.info.eff >= 2 ? '⚡ super efficace !' : preview.info.eff === 0 ? '— aucun effet' : preview.info.eff < 1 ? '(peu efficace)' : ''}
                  </p>
                </>
              )}
              {preview.info.valueType === 'drain' && (
                <>
                  <p className="font-black text-2xl text-red-400">-{preview.info.dmg}</p>
                  <p className="font-bold text-lg text-green-400">+{preview.info.heal} PV</p>
                  <p className="text-[10px] text-gray-400">dégâts + soin d'équipe</p>
                </>
              )}
              {preview.info.valueType === 'heal' && (
                <>
                  <p className="font-black text-2xl" style={{ color: preview.info.color }}>+{preview.info.value}</p>
                  <p className="text-[10px] text-gray-400">PV restaurés à l'équipe</p>
                </>
              )}
              {preview.info.valueType === 'shield' && (
                <>
                  <p className="font-black text-2xl" style={{ color: preview.info.color }}>🛡️ {preview.info.value}</p>
                  <p className="text-[10px] text-gray-400">points de bouclier absorbés</p>
                </>
              )}
              {preview.info.valueType === 'status' && (
                <>
                  <p className="font-black text-xl" style={{ color: preview.info.color }}>{preview.info.label}</p>
                  <p className="text-[10px] text-gray-400">appliqué à {enemy.name}</p>
                </>
              )}
              {preview.info.valueType === 'buff' && (
                <>
                  <p className="font-black text-2xl" style={{ color: preview.info.color }}>+{preview.info.value}%</p>
                  <p className="text-[10px] text-gray-400">bonus sur la prochaine attaque</p>
                </>
              )}
            </div>

            {preview.move.cooldown > 0 && (
              <p className="text-[10px] text-orange-400 text-center mb-3">
                ⏳ Indisponible pendant {preview.move.cooldown} tours après utilisation
              </p>
            )}

            <div className="flex gap-2">
              <button onClick={() => setPreview(null)}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-gray-400 border border-gray-700 active:scale-95 transition-all">
                Annuler
              </button>
              <button onClick={confirmAttack}
                className="flex-[2] py-3 rounded-xl text-sm font-black text-white active:scale-95 transition-all"
                style={{ background: preview.info.color }}>
                Confirmer ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom bar ─────────────────────────────────────────────── */}
      <div className="fixed bottom-0 inset-x-0 border-t border-game-border z-20"
        style={{ background: 'rgba(10,10,20,0.97)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-lg mx-auto px-3 py-3">
          {phase === 'win' ? (
            <button onClick={continueAfterWin}
              className="w-full py-4 bg-green-600 hover:bg-green-500 active:scale-95 text-white font-black rounded-xl text-base transition-all">
              {enemy.isBoss ? '🛒 Marché du Rift →' : '🎁 Récompense →'}
            </button>
          ) : phase === 'lose' ? (
            <button onClick={continueAfterLose}
              className="w-full py-4 bg-gray-800 hover:bg-gray-700 text-gray-300 font-black rounded-xl text-base transition-all">
              Voir le résumé →
            </button>
          ) : (
            <button onClick={endTurn} disabled={phase !== 'player'}
              className={`w-full py-3.5 rounded-xl text-sm font-black transition-all ${
                phase !== 'player' ? 'bg-gray-900 text-gray-700'
                : allActed ? 'bg-green-600 hover:bg-green-500 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-white'
              }`}>
              {phase !== 'player'
                ? '⚔️ Combat en cours…'
                : allActed
                ? `✓ Fin du Tour — tous ont agi ⏭`
                : `Fin du Tour ⏭  (${notActedCount} Pokémon n'ont pas agi)`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
