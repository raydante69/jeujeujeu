import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { useRunStore } from '../store/runStore.js'
import {
  buildEnemy, xpForWin, goldForWin, gainXp, catchChance, waveKind,
} from '../engine/runEngine.js'
import {
  drawPerMon, moveDamage, guardValue, healValue, computeIntent, STATUS_DEF, movesetSize,
} from '../engine/combatEngine.js'
import { aggregateRelics } from '../data/relics.js'
import { getWeakTypes } from '../engine/comboBurst.js'
import { biomeForWave } from '../data/biomes.js'
import { getTrait } from '../data/signatureTraits.js'
import { TYPE_COLORS } from '../data/types.js'
import { BALLS, BALL_BY_ID } from '../data/items.js'
import TypeBadge from '../components/TypeBadge.jsx'
import HPBar from '../components/HPBar.jsx'
import ItemSprite from '../components/ItemSprite.jsx'

const KIND_ICON = { attack: '⚔️', guard: '🛡️', heal: '➕', drain: '🌿', status: '✨', buff: '💪' }

// Preview the numeric value a card will deal/heal.
function previewCard(card, caster, enemy, relicAgg) {
  if (!caster || !enemy) return null
  if (card.kind === 'attack' || card.kind === 'drain') {
    const { dmg } = moveDamage(card, caster, enemy, relicAgg)
    let d = dmg
    if (caster.shiny) d = Math.round(d * 1.15)
    if (caster.holo)  d = Math.round(d * 1.20)
    if (card.kind === 'drain') {
      const h = Math.round(healValue(card, caster) * (caster.holo ? 1.20 : 1))
      return [{ label: `-${d}`, color: '#f87171' }, { label: `+${h}`, color: '#4ade80' }]
    }
    return [{ label: `-${d}`, color: '#f87171' }]
  }
  if (card.kind === 'guard') {
    const g = guardValue(card, caster)
    return [{ label: `🛡️${g}`, color: '#38bdf8' }]
  }
  if (card.kind === 'heal') {
    const h = Math.round(healValue(card, caster) * (caster.holo ? 1.20 : 1))
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
  const { navigate, cardsPerSlot } = useGameStore()
  const run = useRunStore()
  const { team, relics, wave, pendingEnemy } = run
  const relicAgg = useMemo(() => aggregateRelics(relics), [relics])
  const kind = waveKind(wave)
  const biome = useMemo(() => biomeForWave(wave), [wave])
  const effectiveSlots = cardsPerSlot || 1

  // ── State ───────────────────────────────────────────────────────────────
  const [enemy, setEnemy]         = useState(null)
  const [enemyHp, setEnemyHp]     = useState(0)
  const [enemyMax, setEnemyMax]   = useState(1)
  const [hp, setHp]               = useState({})
  // slots: { [monUid]: Card[] }
  const [slots, setSlots]         = useState({})
  const [guard, setGuard]         = useState(0)
  const [buff, setBuff]           = useState(0)
  const [enemyStatus, setEStatus] = useState(null)
  const [intent, setIntent]       = useState(null)
  const [enraged, setEnraged]     = useState(false)
  const [phase, setPhase]         = useState('init')
  const [turn, setTurn]           = useState(1)
  const [floatDmg, setFloatDmg]   = useState(null)
  const [log, setLog]             = useState([])
  const [shake, setShake]         = useState(null)
  const [winSummary, setWinSummary] = useState(null)
  const [caught, setCaught]       = useState(null)
  const [rerolls, setRerolls]     = useState(MAX_REROLLS)
  const reviveUsed = useRef(false)

  const live = useRef({})
  live.current = { enemyHp, hp, guard, buff, enemyStatus, intent, enraged }

  const addLog = (m) => setLog(p => [...p.slice(-5), m])
  const doShake = (t, ms = 420) => { setShake(t); setTimeout(() => setShake(null), ms) }

  // ── Init ─────────────────────────────────────────────────────────────
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

    addLog(e.isBoss ? `💀 BOSS : ${e.name} (Niv.${e.level}) surgit !`
      : kind === 'elite'   ? `⭐ ${e.name} d'élite apparaît !`
      : kind === 'trainer' ? `🧢 Dresseur envoie ${e.name} !`
      : `Un ${e.name} sauvage apparaît !`)

    setSlots(drawPerMon(team, startHp, effectiveSlots))
    setIntent(computeIntent(e, team, startHp))
    setRerolls(MAX_REROLLS)
    setPhase('player')
  }, []) // eslint-disable-line

  const weakTypes = useMemo(() => (enemy ? getWeakTypes(enemy.types || ['normal']) : []), [enemy])

  // ── Reroll ──────────────────────────────────────────────────────────
  function rerollSlots() {
    if (phase !== 'player' || rerolls <= 0) return
    setRerolls(r => r - 1)
    setSlots(drawPerMon(team, live.current.hp, effectiveSlots))
    addLog(`🔄 Cartes relancées`)
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

    setEnemyHp(localEHp); setEStatus(status)
    logs.forEach(addLog)

    if (localEHp <= 0) { setTimeout(() => win(localHp), 650); return }

    setTimeout(() => {
      if (!skipEnemy) {
        let dmg = intent0?.damage ?? computeIntent(enemy, team, localHp)?.damage ?? 1
        if (isRaged || enraged) dmg = Math.round(dmg * 1.3)
        const absorbed = Math.min(currentGuard, dmg)
        dmg = Math.max(0, dmg - currentGuard)

        let targetUid = intent0?.targetUid
        if (!targetUid || (localHp[targetUid] || 0) <= 0) {
          const alive = team.filter(m => (localHp[m.uid] || 0) > 0)
          if (alive.length) targetUid = alive.reduce((a, b) => (localHp[a.uid] / a.maxHp < localHp[b.uid] / b.maxHp ? a : b)).uid
        }
        if (targetUid) {
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
      }
      setHp(localHp)
      const anyAlive = team.some(m => (localHp[m.uid] || 0) > 0)
      if (!anyAlive) { setTimeout(() => lose(localHp), 450); return }

      // New turn
      setTimeout(() => {
        setTurn(t => t + 1)
        setGuard(0)
        setSlots(drawPerMon(team, localHp, effectiveSlots))
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

    // Clear all slots immediately (card has been played)
    setSlots({})

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

      const newE = Math.max(0, eHp0 - dmg)
      finalEHp = newE
      setEnemyHp(newE)
      setFloatDmg({ dmg, crit, color: TYPE_COLORS[card.type] || '#fff', eff })
      doShake('enemy')
      setTimeout(() => setFloatDmg(null), 900)
      addLog(`${card.emoji} ${caster.name} · ${card.name} → ${dmg}${crit ? ' CRIT!' : ''}${eff >= 2 ? ' ⚡efficace' : eff < 1 ? ' ·peu efficace' : ''}`)

      if (card.kind === 'drain') {
        const h = Math.round(healValue(card, caster) * (caster.holo ? 1.20 : 1))
        finalHp = healAll(hp0, h)
      }
      if (relicAgg.lifestealPct) finalHp = healWeakest(finalHp, Math.round(dmg * relicAgg.lifestealPct / 100))
      if (finalHp !== hp0) setHp(finalHp)

      if (enemy.isBoss && newE <= enemyMax * 0.5 && !live.current.enraged) {
        setEnraged(true); addLog(`😡 ${enemy.name} entre en RAGE !`)
      }
      if (newE <= 0) { setTimeout(() => win(finalHp), 650); return }

    } else if (card.kind === 'guard') {
      const g = guardValue(card, caster)
      const newG = guard0 + g
      setGuard(newG)
      finalGuard = newG
      addLog(`${card.emoji} ${caster.name} · ${card.name} → bouclier +${g}`)

    } else if (card.kind === 'heal') {
      const h = Math.round(healValue(card, caster) * (caster.holo ? 1.20 : 1))
      finalHp = healAll(hp0, h)
      setHp(finalHp)
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
    const updated = team.map(m => {
      const copy = { ...m, hp: finalHp[m.uid] ?? m.hp }
      if (copy.hp > 0) {
        const before = copy.level
        const ev = gainXp(copy, xpEach)
        if (ev.levels.length || ev.evolutions.length) events.push({ name: m.name, from: before, to: copy.level, evo: ev.evolutions })
      }
      return copy
    })
    const goldGain = goldForWin(wave) + (relicAgg.goldWin || 0)
    run.commitTeam(updated); run.addGold(goldGain); run.setOutcome('win')
    const g = useGameStore.getState()
    g.recordStat('battlesWon'); g.reportQuest('win', 1); g.reportQuest('wave', wave)
    setWinSummary({ xpEach, events, goldGain })
    setPhase('win')
    addLog(`✅ ${enemy.name} vaincu !`)
  }

  function lose(finalHp) {
    run.commitTeam(team.map(m => ({ ...m, hp: finalHp[m.uid] ?? m.hp })))
    run.setOutcome('lose')
    setPhase('lose')
  }

  // ── Catch ───────────────────────────────────────────────────────────
  function ballCatchChance(ballId) {
    const b = BALL_BY_ID[ballId]
    if (!b) return 0
    if (b.mult === Infinity) return 1
    const hpFrac = enemyHp / Math.max(1, enemyMax)
    const base = catchChance(enemy, hpFrac, relicAgg)
    if (base <= 0) return 0
    return Math.min(0.99, base * b.mult)
  }
  function tryCatch(ballId = 'poke-ball') {
    if (caught) return
    const b = BALL_BY_ID[ballId]
    if (!b) return
    if (enemy.isBoss && b.mult !== Infinity) return
    if ((run.balls?.[ballId] || 0) <= 0) return
    if (!run.useBall(ballId)) return
    if (Math.random() < ballCatchChance(ballId)) {
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
  const intentTarget = intent ? team.find(m => m.uid === intent.targetUid) : null
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
              <div className="flex gap-1 my-1">{(enemy.types || ['normal']).map(t => <TypeBadge key={t} type={t} size="xs" />)}</div>
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
              <span className="text-xl">{intent.kind === 'heavy' ? '🌋' : '⚔️'}</span>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Prochain coup ennemi</p>
                <p className="text-xs text-white font-bold truncate">
                  {intent.kind === 'heavy' ? 'Charge puissante' : 'Attaque'} sur {intentTarget?.name || intent.targetName}
                  {intent.eff >= 2 && <span className="text-red-300"> (efficace !)</span>}
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-black text-lg" style={{ color: intent.kind === 'heavy' ? '#f87171' : '#e2e8f0' }}>
                -{Math.max(0, intent.damage - guard)}
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
                    <div className="flex gap-0.5">
                      {m.shiny && <span className="text-[7px]">✨</span>}
                      {m.holo  && <span className="text-[7px]">🌈</span>}
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

      {/* Bottom: per-Pokémon card slots */}
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
              {/* Reroll + hint */}
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-gray-600 font-bold uppercase">Choisis 1 attaque</p>
                <button onClick={rerollSlots} disabled={rerolls <= 0}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-all ${rerolls > 0 ? 'bg-blue-900/70 hover:bg-blue-800 active:scale-95 text-blue-300 border border-blue-700/50' : 'bg-gray-900 text-gray-700'}`}>
                  🔄 ×{rerolls}
                </button>
              </div>

              {/* Per-Pokémon slots */}
              <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
                <div className="flex gap-2 pb-1" style={{ minWidth: `${team.length * 110}px` }}>
                  {team.map(mon => {
                    const h = hp[mon.uid] ?? 0
                    const alive = h > 0
                    const monSlots = slots[mon.uid] || []
                    const tc0 = TYPE_COLORS[(mon.types || ['normal'])[0]] || '#64748b'
                    const size = movesetSize(mon)
                    return (
                      <div key={mon.uid} className="flex flex-col items-center gap-1.5" style={{ minWidth: 100 }}>
                        {/* Mini Pokémon header */}
                        <div className={`w-full rounded-xl p-1.5 flex items-center gap-1.5 border ${alive ? '' : 'opacity-30'}`}
                          style={{ background: tc0 + '18', borderColor: tc0 + '44' }}>
                          <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${mon.shiny ? 'shiny/' : ''}${mon.id}.png`}
                            alt={mon.name} className={`w-8 h-8 object-contain pixelated flex-shrink-0 ${!alive ? 'grayscale' : ''}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-[9px] font-black text-white truncate leading-none">{mon.name}</p>
                            <p className="text-[7px] text-gray-500 mt-0.5">{size} att. {mon.shiny ? '✨' : ''}{mon.holo ? '🌈' : ''}</p>
                            <div className="h-0.5 rounded-full bg-gray-800 mt-0.5">
                              <div className="h-full rounded-full" style={{ width: `${Math.max(0, (h / (mon.maxHp || 1)) * 100)}%`, background: h / (mon.maxHp || 1) > 0.5 ? '#4ade80' : '#ef4444' }} />
                            </div>
                          </div>
                        </div>

                        {/* Card(s) for this Pokémon */}
                        {alive ? monSlots.map(card => {
                          const tc = TYPE_COLORS[card.type] || '#64748b'
                          const preview = previewCard(card, mon, enemy, relicAgg)
                          return (
                            <button key={card.uid} onClick={() => playCard(card)}
                              className="w-full rounded-xl p-2 flex flex-col items-center gap-1 transition-all active:scale-95 hover:-translate-y-0.5"
                              style={{
                                background: `linear-gradient(160deg, ${tc}2a, #0f172a)`,
                                border: `2px solid ${tc}cc`,
                                boxShadow: `0 0 8px ${tc}44`,
                              }}>
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
                        }) : (
                          <div className="w-full rounded-xl p-2 flex items-center justify-center h-14 border border-gray-800/50 opacity-30">
                            <p className="text-[9px] text-gray-600">K.O.</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
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
