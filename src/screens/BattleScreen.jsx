import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { useRunStore } from '../store/runStore.js'
import {
  buildEnemy, xpForWin, goldForWin, gainXp, catchChance, waveKind,
} from '../engine/runEngine.js'
import {
  drawHand, moveDamage, guardValue, healValue, computeIntent, STATUS_DEF,
} from '../engine/combatEngine.js'
import { aggregateRelics } from '../data/relics.js'
import { getWeakTypes } from '../engine/comboBurst.js'
import { TYPE_COLORS } from '../data/types.js'
import { BALLS, BALL_BY_ID } from '../data/items.js'
import TypeBadge from '../components/TypeBadge.jsx'
import HPBar from '../components/HPBar.jsx'
import ItemSprite from '../components/ItemSprite.jsx'

const HAND_SIZE = 5

const KIND_ICON = { attack: '⚔️', guard: '🛡️', heal: '➕', drain: '🌿', status: '✨', buff: '💪' }
const KIND_LABEL = { attack: 'Attaque', guard: 'Bouclier', heal: 'Soin', drain: 'Drain', status: 'Statut', buff: 'Boost' }

export default function BattleScreen() {
  const { navigate } = useGameStore()
  const run = useRunStore()
  const { team, relics, wave, pendingEnemy } = run
  const relicAgg = useMemo(() => aggregateRelics(relics), [relics])
  const kind = waveKind(wave)
  const maxEnergy = Math.min(8, 5 + Math.floor(wave / 6))

  // ── State ───────────────────────────────────────────────────────
  const [enemy, setEnemy]       = useState(null)
  const [enemyHp, setEnemyHp]   = useState(0)
  const [enemyMax, setEnemyMax] = useState(1)
  const [hp, setHp]             = useState({})
  const [hand, setHand]         = useState([])
  const [energy, setEnergy]     = useState(maxEnergy)
  const [guard, setGuard]       = useState(0)
  const [buff, setBuff]         = useState(0)
  const [enemyStatus, setEStatus] = useState(null)
  const [intent, setIntent]     = useState(null)
  const [enraged, setEnraged]   = useState(false)
  const [phase, setPhase]       = useState('init')
  const [turn, setTurn]         = useState(1)
  const [floatDmg, setFloatDmg] = useState(null)
  const [log, setLog]           = useState([])
  const [shake, setShake]       = useState(null)
  const [winSummary, setWinSummary] = useState(null)
  const [caught, setCaught]     = useState(null)
  const reviveUsed = useRef(false)

  // Fresh mirror of state for handlers that compute synchronously.
  const live = useRef({})
  live.current = { enemyHp, hp, guard, buff, enemyStatus, intent, energy, enraged }

  const addLog = (m) => setLog(p => [...p.slice(-5), m])
  const doShake = (t, ms = 420) => { setShake(t); setTimeout(() => setShake(null), ms) }

  // ── Init ────────────────────────────────────────────────────────
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

    setHand(drawHand(team, startHp, HAND_SIZE))
    setIntent(computeIntent(e, team, startHp))
    setEnergy(maxEnergy)
    setPhase('player')
  }, []) // eslint-disable-line

  const weakTypes = useMemo(() => (enemy ? getWeakTypes(enemy.types || ['normal']) : []), [enemy])

  // ── Heal helpers (pure) ─────────────────────────────────────────
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

  // ── Play a move-card ────────────────────────────────────────────
  function playCard(card) {
    if (phase !== 'player' || card.cost > live.current.energy) return
    const caster = team.find(m => m.uid === card.ownerUid)
    if (!caster || (live.current.hp[caster.uid] || 0) <= 0) return

    setHand(h => h.filter(c => c.uid !== card.uid))
    setEnergy(e => Math.max(0, e - card.cost))

    const { enemyHp: eHp0, hp: hp0, buff: buff0 } = live.current

    if (card.kind === 'attack' || card.kind === 'drain') {
      let { dmg, eff } = moveDamage(card, caster, enemy, relicAgg)
      let crit = false
      if (buff0 > 0) { dmg = Math.round(dmg * (1 + buff0)); setBuff(0) }
      if (Math.random() < (relicAgg.critChance || 0)) { dmg = Math.round(dmg * 2); crit = true }

      const newE = Math.max(0, eHp0 - dmg)
      setEnemyHp(newE)
      setFloatDmg({ dmg, crit, color: TYPE_COLORS[card.type] || '#fff', eff })
      doShake('enemy')
      setTimeout(() => setFloatDmg(null), 900)
      addLog(`${card.emoji} ${caster.name} · ${card.name} → ${dmg}${crit ? ' CRIT!' : ''}${eff >= 2 ? ' ⚡efficace' : eff < 1 ? ' ·peu efficace' : ''}`)

      let teamHp = hp0
      if (card.kind === 'drain') { const h = healValue(card, caster); teamHp = healAll(teamHp, h) }
      if (relicAgg.lifestealPct) teamHp = healWeakest(teamHp, Math.round(dmg * relicAgg.lifestealPct / 100))
      if (teamHp !== hp0) setHp(teamHp)

      // Boss rage at 50%
      if (enemy.isBoss && newE <= enemyMax * 0.5 && !live.current.enraged) {
        setEnraged(true); addLog(`😡 ${enemy.name} entre en RAGE !`)
      }
      if (newE <= 0) { setTimeout(() => win(teamHp), 650); return }

    } else if (card.kind === 'guard') {
      const g = guardValue(card, caster)
      setGuard(prev => prev + g)
      addLog(`${card.emoji} ${caster.name} · ${card.name} → bouclier +${g}`)

    } else if (card.kind === 'heal') {
      const h = healValue(card, caster)
      setHp(healAll(hp0, h))
      addLog(`${card.emoji} ${caster.name} · ${card.name} → +${h} PV équipe`)

    } else if (card.kind === 'status') {
      const def = STATUS_DEF[card.status]
      setEStatus(prev => {
        if (prev && prev.type === card.status) return { ...prev, turns: def.turns }
        return { type: card.status, turns: def.turns, stacks: card.status === 'poison' ? 1 : 0 }
      })
      addLog(`${card.emoji} ${caster.name} · ${card.name} → ${enemy.name} ${def.label} !`)

    } else if (card.kind === 'buff') {
      setBuff(card.bonus || 0.7)
      addLog(`${card.emoji} ${caster.name} · ${card.name} → prochaine attaque renforcée !`)
    }
  }

  // ── End the player turn → enemy resolves its telegraphed intent ──
  function endTurn() {
    if (phase !== 'player') return
    setPhase('enemy')

    const { enemyStatus: st0, guard: guard0, intent: intent0 } = live.current
    let eHp = live.current.enemyHp
    let teamHp = { ...live.current.hp }
    let status = st0
    let skipEnemy = false
    const logs = []

    // 1) Status tick on the enemy
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
        skipEnemy = true; logs.push(`❄️ ${enemy.name} est gelé : tour sauté`)
      } else if (st0.type === 'paralyze' && Math.random() < def.skip) {
        skipEnemy = true; logs.push(`⚡ ${enemy.name} paralysé : attaque ratée`)
      }
      const turns = st0.turns - 1
      status = turns <= 0 ? null : { ...st0, turns, stacks: st0.type === 'poison' ? (st0.stacks || 1) + 1 : st0.stacks }
      if (!status) logs.push(`${enemy.name} se rétablit du statut`)
    }

    setEnemyHp(eHp); setEStatus(status)
    logs.forEach(addLog)

    if (eHp <= 0) { setTimeout(() => win(teamHp), 650); return }

    // 2) Enemy executes its telegraphed attack (unless skipped)
    setTimeout(() => {
      if (!skipEnemy) {
        let dmg = intent0?.damage ?? computeIntent(enemy, team, teamHp)?.damage ?? 1
        if (live.current.enraged || enraged) dmg = Math.round(dmg * 1.3)
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
          addLog(`💥 ${enemy.name} inflige ${dmg} à ${tname}${(live.current.enraged || enraged) ? ' [RAGE]' : ''}`)

          // Phoenix revive relic
          if ((teamHp[targetUid] || 0) <= 0 && relicAgg.revive && !reviveUsed.current) {
            const m = team.find(t => t.uid === targetUid)
            teamHp[targetUid] = Math.round(m.maxHp * relicAgg.revive / 100)
            reviveUsed.current = true
            addLog(`🪶 La Plume Phénix ranime ${tname} !`)
          }
        }
      }
      setHp(teamHp)
      const anyAlive = team.some(m => (teamHp[m.uid] || 0) > 0)
      if (!anyAlive) { setTimeout(() => lose(teamHp), 450); return }

      // 3) Next turn — fresh hand, energy, intent; shields expire
      setTimeout(() => {
        setTurn(t => t + 1)
        setEnergy(maxEnergy)
        setGuard(0)
        setHand(drawHand(team, teamHp, HAND_SIZE))
        setIntent(computeIntent(enemy, team, teamHp))
        setPhase('player')
      }, 480)
    }, 720)
  }

  // ── Win / Lose ──────────────────────────────────────────────────
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
    setWinSummary({ xpEach, events, goldGain })
    setPhase('win')
    addLog(`✅ ${enemy.name} vaincu !`)
  }

  function lose(finalHp) {
    run.commitTeam(team.map(m => ({ ...m, hp: finalHp[m.uid] ?? m.hp })))
    run.setOutcome('lose')
    setPhase('lose')
  }

  // ── Catch ───────────────────────────────────────────────────────
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
    if (Math.random() < ballCatchChance(ballId)) setCaught({ ok: true, ...run.catchEnemy(enemy, ballId) })
    else setCaught({ ok: false, name: enemy.name })
  }

  function continueAfterWin() { run.advanceWave(); navigate(enemy.isBoss ? 'runshop' : 'reward') }
  function continueAfterLose() { run.endRun(); navigate('runend') }

  if (!enemy || phase === 'init') {
    return <div className="min-h-screen bg-game-bg flex items-center justify-center"><div className="text-4xl animate-spin">⚡</div></div>
  }

  const typeColor = TYPE_COLORS[enemy.types?.[0]] || '#1e293b'
  const intentTarget = intent ? team.find(m => m.uid === intent.targetUid) : null

  return (
    <div className="min-h-screen bg-game-bg flex flex-col">
      {/* Header */}
      <div className="px-4 pt-10 pb-2 border-b border-game-border bg-game-surface">
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

      <div className="flex-1 overflow-y-auto max-w-lg mx-auto w-full px-3 py-3 flex flex-col gap-3 pb-44">

        {/* Enemy card */}
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

          {/* Weak types hint */}
          {weakTypes.length > 0 && phase !== 'win' && (
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] text-gray-600 font-bold uppercase">Faible vs</span>
              {weakTypes.slice(0, 8).map(t => (
                <div key={t} className="w-3.5 h-3.5 rounded-full" style={{ background: TYPE_COLORS[t] }} title={t} />
              ))}
            </div>
          )}
        </div>

        {/* Enemy intent (telegraph) */}
        {phase !== 'win' && phase !== 'lose' && intent && (
          <div className="rounded-xl px-3 py-2.5 border flex items-center justify-between gap-2"
            style={{ background: (intent.kind === 'heavy' ? '#ef4444' : TYPE_COLORS[intent.type] || '#64748b') + '14', borderColor: (intent.kind === 'heavy' ? '#ef4444' : TYPE_COLORS[intent.type] || '#64748b') + '55' }}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl">{intent.kind === 'heavy' ? '🌋' : '⚔️'}</span>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Prochaine attaque ennemie</p>
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
                    style={{ background: '#0f172a', borderColor: alive ? '#1e293b' : '#1a1a2e', opacity: alive ? 1 : 0.4 }}>
                    <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${m.id}.png`} alt={m.name}
                      className={`w-9 h-9 object-contain pixelated ${!alive ? 'grayscale' : ''}`} loading="lazy" />
                    <p className="text-[8px] text-white font-bold truncate w-full text-center leading-none">{m.name}</p>
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
                        <button key={b.id} onClick={() => tryCatch(b.id)} disabled={!usable} title={`${b.name} — ${b.desc}`}
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

      {/* Bottom: hand of move-cards + actions */}
      <div className="fixed bottom-0 inset-x-0 border-t border-game-border z-20" style={{ background: 'rgba(10,10,20,0.97)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-lg mx-auto px-3 py-3">

          {phase === 'win' ? (
            <button onClick={continueAfterWin} className="w-full py-4 bg-green-600 hover:bg-green-500 active:scale-95 text-white font-black rounded-xl text-base transition-all">
              {enemy.isBoss ? '🛒 Marché du Rift →' : '🎁 Récompense →'}
            </button>
          ) : phase === 'lose' ? (
            <button onClick={continueAfterLose} className="w-full py-4 bg-gray-800 hover:bg-gray-700 text-gray-300 font-black rounded-xl text-base transition-all">
              Voir le résumé →
            </button>
          ) : (
            <>
              {/* Energy + end turn */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Énergie</span>
                  <div className="flex gap-1">
                    {Array.from({ length: maxEnergy }).map((_, i) => (
                      <div key={i} className={`w-3 h-3 rounded-full transition-all ${i < energy ? 'animate-orb-pulse' : ''}`}
                        style={{ background: i < energy ? '#8b5cf6' : '#1e293b', border: `1px solid ${i < energy ? '#7c3aed' : '#374151'}` }} />
                    ))}
                  </div>
                  <span className="text-[10px] text-purple-400 font-bold">{energy}/{maxEnergy}</span>
                </div>
                <button onClick={endTurn} disabled={phase !== 'player'}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${phase === 'player' ? 'bg-red-600/90 hover:bg-red-500 active:scale-95 text-white' : 'bg-gray-900 text-gray-700'}`}>
                  Fin du tour ⏭
                </button>
              </div>

              {/* Hand */}
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
                {hand.length === 0 && <p className="text-[10px] text-gray-600 py-6 text-center w-full">Aucun coup — termine le tour.</p>}
                {hand.map(card => {
                  const owner = team.find(m => m.uid === card.ownerUid)
                  const ownerDead = !owner || (hp[owner.uid] || 0) <= 0
                  const tc = TYPE_COLORS[card.type] || '#64748b'
                  const playable = phase === 'player' && card.cost <= energy && !ownerDead
                  return (
                    <button key={card.uid} onClick={() => playCard(card)} disabled={!playable}
                      className={`flex-shrink-0 w-[92px] rounded-xl p-2 flex flex-col items-center gap-1 transition-all ${playable ? 'active:scale-95 hover:-translate-y-0.5' : 'opacity-40'}`}
                      style={{ background: `linear-gradient(160deg, ${tc}26, #0f172a)`, border: `1.5px solid ${tc}77` }}>
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[9px]">{KIND_ICON[card.kind]}</span>
                        <div className="flex gap-0.5">
                          {Array.from({ length: card.cost }).map((_, i) => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: '#a855f7' }} />
                          ))}
                        </div>
                      </div>
                      <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${card.ownerId}.png`} alt={owner?.name}
                        className={`w-9 h-9 object-contain pixelated ${ownerDead ? 'grayscale' : ''}`} loading="lazy" />
                      <p className="text-[9px] font-black text-white leading-tight text-center w-full truncate">{card.name}</p>
                      <p className="text-[7px] leading-none truncate w-full text-center" style={{ color: tc }}>{owner?.name}</p>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
