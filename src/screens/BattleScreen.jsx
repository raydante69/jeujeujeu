import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { useRunStore } from '../store/runStore.js'
import {
  buildEnemy, resolveBurst, enemyStrike, xpForWin, goldForWin,
  gainXp, catchChance, waveKind,
} from '../engine/runEngine.js'
import { aggregateRelics } from '../data/relics.js'
import { getWeakTypes } from '../engine/comboBurst.js'
import { TYPE_COLORS } from '../data/types.js'
import { BALLS, BALL_BY_ID } from '../data/items.js'
import TypeBadge from '../components/TypeBadge.jsx'
import HPBar from '../components/HPBar.jsx'
import ItemSprite from '../components/ItemSprite.jsx'

// Energy cost based on level
function energyCost(mon) {
  if (mon.level >= 50) return 3
  if (mon.level >= 25) return 2
  return 1
}

// Generate shields based on wave kind
function generateShields(enemy, kind) {
  if (kind === 'wild') return []
  const types = ['fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark', 'fighting', 'ghost']
  const pick = () => types[Math.floor(Math.random() * types.length)]
  if (kind === 'trainer') return [{ type: enemy.types?.[0] || pick(), maxHits: 2, hits: 0, broken: false }]
  if (kind === 'elite')   return [
    { type: enemy.types?.[0] || pick(), maxHits: 2, hits: 0, broken: false },
    { type: pick(), maxHits: 1, hits: 0, broken: false },
  ]
  if (kind === 'boss')    return [
    { type: enemy.types?.[0] || pick(), maxHits: 3, hits: 0, broken: false },
    { type: pick(), maxHits: 2, hits: 0, broken: false },
    { type: pick(), maxHits: 2, hits: 0, broken: false },
  ]
  return []
}

// Hit shields with played types — returns updated shields
function hitShields(shields, played) {
  const updated = shields.map(s => ({ ...s }))
  for (const mon of played) {
    for (const mt of (mon.types || ['normal'])) {
      for (const s of updated) {
        if (s.broken) continue
        const weakTo = getWeakTypes([s.type])
        if (weakTo.includes(mt)) {
          s.hits += 1
          if (s.hits >= s.maxHits) s.broken = true
        }
      }
    }
  }
  return updated
}

const STATUS_INFO = {
  burn:      { label: '🔥 BRÛLÉ',     color: '#f97316', dmgPct: 3, skipChance: 0 },
  paralyze:  { label: '⚡ PARALYSÉ',  color: '#facc15', dmgPct: 0, skipChance: 0.3 },
  freeze:    { label: '❄️ GELÉ',      color: '#7dd3fc', dmgPct: 0, skipChance: 1 },
}

export default function BattleScreen() {
  const { navigate } = useGameStore()
  const run = useRunStore()
  const { team, relics, wave, pendingEnemy } = run
  const relicAgg = useMemo(() => aggregateRelics(relics), [relics])
  const kind = waveKind(wave)

  const maxEnergy = Math.min(7, 4 + Math.floor(wave / 5))

  // ── State ───────────────────────────────────────────────────────
  const [enemy, setEnemy]           = useState(null)
  const [enemyHp, setEnemyHp]       = useState(0)
  const [enemyMax, setEnemyMax]     = useState(1)
  const [hp, setHp]                 = useState({})
  const [selected, setSelected]     = useState([])
  const [energy, setEnergy]         = useState(maxEnergy)
  const [phase, setPhase]           = useState('init')
  const [turn, setTurn]             = useState(1)
  const [shields, setShields]       = useState([])
  const [shieldBreakBonus, setSBB]  = useState(false)
  const [enemyStatus, setEStatus]   = useState(null)
  const [enraged, setEnraged]       = useState(false)
  const [lastBurst, setLastBurst]   = useState(null)
  const [showBurst, setShowBurst]   = useState(false)
  const [floatDmg, setFloatDmg]     = useState(null)
  const [log, setLog]               = useState([])
  const [shake, setShake]           = useState(null)
  const [winSummary, setWinSummary] = useState(null)
  const [caught, setCaught]         = useState(null)
  const reviveUsed = useRef(false)

  const live = useRef({})
  live.current = { enemyHp, hp, enemy, shields, shieldBreakBonus, enemyStatus, enraged }

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
    const sh = generateShields(e, waveKind(wave))
    setEnemy(e); setEnemyHp(e.hp); setEnemyMax(e.maxHp); setHp(startHp)
    setShields(sh); reviveUsed.current = false

    const k = waveKind(wave)
    addLog(e.isBoss ? `💀 BOSS : ${e.name} (Niv.${e.level}) surgit !`
      : k === 'elite'   ? `⭐ ${e.name} d'élite apparaît !`
      : k === 'trainer' ? `🧢 Dresseur envoie ${e.name} !`
      : `Un ${e.name} sauvage apparaît !`)
    if (sh.length) addLog(`🛡️ ${e.name} a ${sh.length} bouclier${sh.length > 1 ? 's' : ''} !`)
    setPhase('select')
  }, []) // eslint-disable-line

  // ── Selection ───────────────────────────────────────────────────
  const usedEnergy = useMemo(
    () => selected.reduce((s, uid) => s + energyCost(team.find(m => m.uid === uid) || { level: 1 }), 0),
    [selected, team]
  )

  const preview = useMemo(() => {
    if (!selected.length || !enemy) return null
    const played = selected.map(uid => team.find(m => m.uid === uid)).filter(Boolean)
    return played.length ? resolveBurst(played, enemy, relicAgg) : null
  }, [selected, enemy, team, relicAgg])

  const weakTypes = useMemo(() => (enemy ? getWeakTypes(enemy.types || ['normal']) : []), [enemy])

  function toggle(uid) {
    if (phase !== 'select') return
    const mon = team.find(m => m.uid === uid)
    if (!mon || (hp[uid] || 0) <= 0) return
    if (selected.includes(uid)) {
      setSelected(p => p.filter(x => x !== uid))
    } else {
      const cost = energyCost(mon)
      if (usedEnergy + cost > energy || selected.length >= 3) return
      setSelected(p => [...p, uid])
    }
  }

  // ── Play a burst ────────────────────────────────────────────────
  function play() {
    if (phase !== 'select' || !selected.length) return
    const { enemyHp: eHp, hp: pHp, enemy: en, shields: sh, shieldBreakBonus: sbb, enemyStatus: es, enraged: er } = live.current
    const played = selected.map(uid => team.find(m => m.uid === uid)).filter(Boolean)
    if (!played.length) return

    const burst = resolveBurst(played, en, relicAgg)
    if (!burst) return

    // Shield interaction
    let newShields = sh
    let allJustBroken = false
    let shieldReduction = 1
    const activeShields = sh.filter(s => !s.broken)
    if (activeShields.length > 0) {
      newShields = hitShields(sh, played)
      const stillActive = newShields.filter(s => !s.broken)
      allJustBroken = stillActive.length === 0 && activeShields.length > 0
      shieldReduction = stillActive.length > 0 ? 0.5 : 1
    }

    // Compute final damage
    let finalDmg = Math.round(burst.totalDamage * shieldReduction)
    if (sbb) { finalDmg *= 2; setSBB(false) }
    const newEHp = Math.max(0, eHp - finalDmg)

    // Energy cost
    const cost = played.reduce((s, m) => s + energyCost(m), 0)
    setEnergy(e => Math.max(0, e - cost))

    // Status procs (only if no existing status)
    const playedTypes = new Set(played.flatMap(p => p.types || []))
    let newStatus = es
    if (!es) {
      if (playedTypes.has('fire') && Math.random() < 0.22) {
        newStatus = { type: 'burn', turns: 3 }
        addLog(`🔥 ${en.name} est brûlé !`)
      } else if (playedTypes.has('electric') && Math.random() < 0.28) {
        newStatus = { type: 'paralyze', turns: 3 }
        addLog(`⚡ ${en.name} est paralysé !`)
      } else if (playedTypes.has('ice') && Math.random() < 0.18) {
        newStatus = { type: 'freeze', turns: 2 }
        addLog(`❄️ ${en.name} est gelé !`)
      }
      if (newStatus !== es) setEStatus(newStatus)
    }

    // Lifesteal
    let healHp = { ...pHp }
    if (relicAgg.lifestealPct > 0) {
      const alive = team.filter(m => (healHp[m.uid] || 0) > 0)
      if (alive.length) {
        const weak = alive.reduce((w, m) => (healHp[m.uid] / m.maxHp < healHp[w.uid] / w.maxHp ? m : w))
        const heal = Math.round(finalDmg * relicAgg.lifestealPct / 100)
        healHp[weak.uid] = Math.min(weak.maxHp, healHp[weak.uid] + heal)
      }
    }

    setSelected([])
    setPhase('burst')
    setLastBurst({ ...burst, totalDamage: finalDmg })
    setShowBurst(true)
    setFloatDmg({ dmg: finalDmg, crit: burst.crit, color: burst.color })
    doShake('enemy')

    if (shieldReduction < 1) addLog(`🛡️ Les boucliers absorbent une partie des dégâts !`)
    if (sbb) addLog(`💥 BRISEUR DE BOUCLIER ! Dégâts ×2 !`)

    setTimeout(() => {
      setShowBurst(false); setFloatDmg(null)
      setEnemyHp(newEHp)
      setShields(newShields)

      if (allJustBroken) {
        setSBB(true)
        addLog(`💥 TOUS LES BOUCLIERS BRISÉS ! Prochain burst ×2 !`)
      }

      addLog(`${burst.emoji} ${burst.name} ×${burst.multiplier}${burst.crit ? ' CRIT!' : ''}${allJustBroken ? ' 💥' : ''} → ${finalDmg} dégâts`)

      if (newEHp <= 0) { win(healHp); return }

      // Check boss rage at 50% HP
      const newEnraged = en.isBoss && newEHp <= enemyMax * 0.5
      if (newEnraged && !er) {
        setEnraged(true)
        addLog(`😡 ${en.name} entre en RAGE ! Dégâts +30% !`)
      }

      // Enemy turn
      setPhase('enemy')
      setTimeout(() => {
        const { enemyStatus: latestStatus } = live.current

        // Burn damage
        let afterBurnHp = newEHp
        if (latestStatus?.type === 'burn') {
          const burnDmg = Math.max(1, Math.round(enemyMax * 0.03))
          afterBurnHp = Math.max(0, newEHp - burnDmg)
          addLog(`🔥 ${en.name} subit ${burnDmg} de brûlure !`)
          setEnemyHp(afterBurnHp)
          const updatedSt = { ...latestStatus, turns: latestStatus.turns - 1 }
          if (updatedSt.turns <= 0) { setEStatus(null); addLog(`🔥 ${en.name} n'est plus brûlé.`) }
          else setEStatus(updatedSt)
          if (afterBurnHp <= 0) { win(healHp); return }
        }

        // Freeze / paralyze skip
        if (latestStatus?.type === 'freeze') {
          addLog(`❄️ ${en.name} est gelé et ne peut pas attaquer !`)
          const updatedSt = { ...latestStatus, turns: latestStatus.turns - 1 }
          if (updatedSt.turns <= 0) { setEStatus(null); addLog(`❄️ ${en.name} dégèle !`) }
          else setEStatus(updatedSt)
          setHp(healHp); setTurn(t => t + 1); setEnergy(maxEnergy)
          setTimeout(() => setPhase('select'), 450)
          return
        }
        if (latestStatus?.type === 'paralyze' && Math.random() < STATUS_INFO.paralyze.skipChance) {
          addLog(`⚡ ${en.name} est paralysé et ne peut pas attaquer !`)
          const updatedSt = { ...latestStatus, turns: latestStatus.turns - 1 }
          if (updatedSt.turns <= 0) { setEStatus(null); addLog(`⚡ ${en.name} n'est plus paralysé.`) }
          else setEStatus(updatedSt)
          setHp(healHp); setTurn(t => t + 1); setEnergy(maxEnergy)
          setTimeout(() => setPhase('select'), 450)
          return
        }
        if (latestStatus?.type === 'paralyze') {
          const updatedSt = { ...latestStatus, turns: latestStatus.turns - 1 }
          if (updatedSt.turns <= 0) { setEStatus(null); addLog(`⚡ ${en.name} n'est plus paralysé.`) }
          else setEStatus(updatedSt)
        }

        // Enemy strike
        const strike = enemyStrike(en, team, healHp)
        if (!strike) { lose(healHp); return }

        let strikeDmg = strike.damage
        if (newEnraged || er) strikeDmg = Math.round(strikeDmg * 1.3)

        let nextHp = { ...healHp, [strike.targetUid]: Math.max(0, healHp[strike.targetUid] - strikeDmg) }
        doShake(strike.targetUid)
        addLog(`💥 ${en.name} inflige ${strikeDmg} à ${strike.name}${(newEnraged || er) ? ' [RAGE]' : ''}`)

        // Phoenix revive
        if (nextHp[strike.targetUid] <= 0 && relicAgg.revive && !reviveUsed.current) {
          const m = team.find(t => t.uid === strike.targetUid)
          nextHp[strike.targetUid] = Math.round(m.maxHp * relicAgg.revive / 100)
          reviveUsed.current = true
          addLog(`🪶 La Plume Phénix ranime ${strike.name} !`)
        }

        setHp(nextHp); setTurn(t => t + 1); setEnergy(maxEnergy)
        const anyAlive = team.some(m => (nextHp[m.uid] || 0) > 0)
        setTimeout(() => { anyAlive ? setPhase('select') : lose(nextHp) }, 450)
      }, 800)
    }, 1300)
  }

  // ── Win ─────────────────────────────────────────────────────────
  function win(finalHp) {
    const xpEach = Math.round(xpForWin(enemy, wave) * (relicAgg.xpMult || 1))
    const events = []
    const updated = team.map(m => {
      const copy = { ...m, hp: finalHp[m.uid] ?? m.hp }
      if (copy.hp > 0) {
        const before = copy.level
        const ev = gainXp(copy, xpEach)
        if (ev.levels.length || ev.evolutions.length) {
          events.push({ name: m.name, from: before, to: copy.level, evo: ev.evolutions })
        }
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
    if (b.mult === Infinity) return 1 // master ball always succeeds
    const hpFrac = enemyHp / Math.max(1, enemyMax)
    const base = catchChance(enemy, hpFrac, relicAgg)
    if (base <= 0) return 0 // bosses / un-catchable with normal balls
    return Math.min(0.99, base * b.mult)
  }

  function tryCatch(ballId = 'poke-ball') {
    if (caught) return
    const b = BALL_BY_ID[ballId]
    if (!b) return
    // Only the Master Ball can catch a boss.
    if (enemy.isBoss && b.mult !== Infinity) return
    if ((run.balls?.[ballId] || 0) <= 0) return
    if (!run.useBall(ballId)) return
    const chance = ballCatchChance(ballId)
    if (Math.random() < chance) {
      const res = run.catchEnemy(enemy, ballId)
      setCaught({ ok: true, ...res })
    } else {
      setCaught({ ok: false, name: enemy.name })
    }
  }

  function continueAfterWin() {
    run.advanceWave()
    navigate(enemy.isBoss ? 'runshop' : 'reward')
  }

  function continueAfterLose() {
    run.endRun(); navigate('runend')
  }

  if (!enemy || phase === 'init') {
    return <div className="min-h-screen bg-game-bg flex items-center justify-center"><div className="text-4xl animate-spin">⚡</div></div>
  }

  const typeColor = TYPE_COLORS[enemy.types?.[0]] || '#1e293b'
  const activeShields = shields.filter(s => !s.broken)

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

      <div className="flex-1 overflow-y-auto max-w-lg mx-auto w-full px-3 py-3 flex flex-col gap-3 pb-32">

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
              {showBurst && lastBurst && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl animate-burst-in">{lastBurst.emoji}</span>
                </div>
              )}
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
                  <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={{ color: STATUS_INFO[enemyStatus.type]?.color, background: STATUS_INFO[enemyStatus.type]?.color + '22' }}>
                    {STATUS_INFO[enemyStatus.type]?.label} {enemyStatus.turns}t
                  </span>
                )}
              </div>
              <div className="flex gap-1 my-1">{(enemy.types || ['normal']).map(t => <TypeBadge key={t} type={t} size="xs" />)}</div>
              <HPBar hp={enemyHp} maxHp={enemyMax} showNumbers size="md" />
            </div>
          </div>

          {/* Shields row */}
          {shields.length > 0 && (
            <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] text-gray-600 font-bold uppercase">Boucliers</span>
              {shields.map((s, i) => (
                <div
                  key={i}
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-white transition-all ${s.broken ? 'opacity-15 scale-75' : ''}`}
                  style={{ background: s.broken ? '#374151' : (TYPE_COLORS[s.type] || '#888'), border: `1.5px solid ${s.broken ? '#1f2937' : 'rgba(255,255,255,0.3)'}` }}
                  title={s.type}
                >
                  {s.broken ? '✕' : s.maxHits - s.hits}
                </div>
              ))}
              {shieldBreakBonus && (
                <span className="text-[9px] font-black text-yellow-400 animate-pulse ml-1">×2 NEXT!</span>
              )}
            </div>
          )}

          {/* Weak types hint */}
          {weakTypes.length > 0 && phase !== 'win' && activeShields.length === 0 && (
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] text-gray-600 font-bold uppercase">Faible vs</span>
              {weakTypes.slice(0, 8).map(t => (
                <div key={t} className="w-3.5 h-3.5 rounded-full" style={{ background: TYPE_COLORS[t] }} title={t} />
              ))}
            </div>
          )}
          {activeShields.length > 0 && phase !== 'win' && (
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              {activeShields.map((s, i) => {
                const wb = getWeakTypes([s.type])
                return (
                  <div key={i} className="flex items-center gap-1">
                    <span className="text-[9px] text-gray-600">Casser</span>
                    <div className="w-3.5 h-3.5 rounded-full" style={{ background: TYPE_COLORS[s.type] || '#888' }} />
                    <span className="text-[9px] text-gray-600">→</span>
                    {wb.slice(0, 3).map(t => <div key={t} className="w-3.5 h-3.5 rounded-full" style={{ background: TYPE_COLORS[t] }} title={t} />)}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Burst banner */}
        {showBurst && lastBurst && (
          <div className="rounded-2xl py-4 text-center animate-burst-in" style={{ background: lastBurst.color + '1a', border: `2px solid ${lastBurst.color}66` }}>
            <p className="font-black text-2xl text-shadow-glow" style={{ color: lastBurst.color }}>{lastBurst.emoji} {lastBurst.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{lastBurst.desc}{lastBurst.crit ? ' · CRITIQUE !' : ''}</p>
            <p className="font-black text-xl mt-1" style={{ color: lastBurst.color }}>×{lastBurst.multiplier} · {lastBurst.totalDamage} dégâts</p>
          </div>
        )}

        {/* Burst preview */}
        {!showBurst && phase === 'select' && (preview ? (
          <div className="rounded-xl px-3 py-2.5 border" style={{ background: preview.color + '12', borderColor: preview.color + '44' }}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xl">{preview.emoji}</span>
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate" style={{ color: preview.color }}>{preview.name}</p>
                  <p className="text-[10px] text-gray-500 truncate">{preview.desc}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-black text-base" style={{ color: preview.color }}>×{preview.multiplier}</p>
                <p className="text-[10px] text-gray-500">~{preview.totalDamage > 999 ? `${Math.round(preview.totalDamage / 1000 * 10) / 10}k` : preview.totalDamage}</p>
              </div>
            </div>
            {activeShields.length > 0 && (
              <p className="text-[9px] text-amber-400 mt-1">⚠️ Boucliers actifs — dégâts divisés par 2 (sauf si type efficace)</p>
            )}
          </div>
        ) : (
          <div className="rounded-xl px-3 py-2.5 border border-dashed border-gray-800 text-center">
            <p className="text-[10px] text-gray-600">
              {energy === 0 ? '⚡ Plus d\'énergie — passe le tour ou attend' : 'Sélectionne 1–3 Pokémon pour former un burst'}
            </p>
          </div>
        ))}
        {phase === 'enemy' && (
          <div className="rounded-xl py-3 text-center border border-red-900/40 bg-red-900/10">
            <p className="text-sm font-bold text-red-400 animate-pulse">⚔️ {enemy.name} riposte…</p>
          </div>
        )}

        {/* Team grid */}
        {phase !== 'win' && phase !== 'lose' && (
          <div>
            <p className="text-[10px] text-gray-600 font-bold uppercase mb-2">Ton équipe</p>
            <div className="grid grid-cols-3 gap-2">
              {team.map(m => {
                const h = hp[m.uid] ?? 0, maxH = m.maxHp || 1
                const alive = h > 0
                const sel = selected.includes(m.uid)
                const idx = selected.indexOf(m.uid)
                const cost = energyCost(m)
                const canAfford = usedEnergy + cost <= energy || sel
                return (
                  <button
                    key={m.uid}
                    onClick={() => toggle(m.uid)}
                    disabled={phase !== 'select' || !alive || (!canAfford && !sel)}
                    className={`relative rounded-xl p-2 flex flex-col items-center gap-1 transition-all ${sel ? 'scale-105' : ''} ${shake === m.uid ? 'animate-shake' : ''}`}
                    style={{
                      background: sel ? '#0c1a2e' : '#0f172a',
                      border: `1.5px solid ${sel ? '#60a5fa' : !alive ? '#1a1a2e' : (!canAfford && !sel) ? '#1f2937' : '#1e293b'}`,
                      opacity: !alive ? 0.3 : (!canAfford && !sel) ? 0.5 : 1,
                      boxShadow: sel ? '0 0 12px #60a5fa44' : '',
                    }}
                  >
                    <img
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${m.id}.png`}
                      alt={m.name} className={`w-10 h-10 object-contain pixelated ${!alive ? 'grayscale' : ''}`}
                      loading="lazy"
                    />
                    <p className="text-[9px] text-white font-bold truncate w-full text-center leading-none">{m.name}</p>
                    <p className="text-[8px] text-gray-500 leading-none">Niv.{m.level}</p>
                    {/* Energy cost dots */}
                    <div className="flex gap-0.5 mt-0.5">
                      {Array.from({ length: cost }).map((_, ci) => (
                        <div key={ci} className="w-1.5 h-1.5 rounded-full" style={{ background: sel ? '#60a5fa' : '#8b5cf6' }} />
                      ))}
                    </div>
                    <div className="w-full h-0.5 rounded-full bg-gray-800">
                      <div className="h-full rounded-full" style={{ width: `${Math.max(0, (h / maxH) * 100)}%`, background: h / maxH > 0.5 ? '#4ade80' : h / maxH > 0.25 ? '#fbbf24' : '#ef4444' }} />
                    </div>
                    {!alive && <div className="absolute inset-0 rounded-xl bg-black/75 flex items-center justify-center"><span className="text-xl">💀</span></div>}
                    {sel && <div className="absolute top-1 right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-[8px] font-black text-white">{idx + 1}</div>}
                  </button>
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
                        <button
                          key={b.id}
                          onClick={() => tryCatch(b.id)}
                          disabled={!usable}
                          title={`${b.name} — ${b.desc}`}
                          className={`flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-1.5 transition-all ${usable ? 'active:scale-95' : 'opacity-30'}`}
                          style={{ background: b.color + '22', border: `1px solid ${b.color}66` }}
                        >
                          <ItemSprite slug={b.slug} emoji={b.emoji} size={26} />
                          <span className="text-[9px] font-bold text-white">×{owned}</span>
                          <span className="text-[8px] font-bold" style={{ color: b.color }}>
                            {b.mult === Infinity ? '100%' : `${pct}%`}
                          </span>
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

      {/* Bottom action bar */}
      <div className="fixed bottom-0 inset-x-0 border-t border-game-border z-20" style={{ background: 'rgba(10,10,20,0.96)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-lg mx-auto px-3 py-3">
          {/* Energy orbs */}
          {phase === 'select' && (
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-gray-500 font-bold uppercase">Énergie</span>
                <div className="flex gap-1">
                  {Array.from({ length: maxEnergy }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full transition-all ${i < energy ? 'animate-orb-pulse' : ''}`}
                      style={{ background: i < energy ? '#8b5cf6' : '#1e293b', border: `1px solid ${i < energy ? '#7c3aed' : '#374151'}` }}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-purple-400 font-bold">{energy}/{maxEnergy}</span>
              </div>
              {usedEnergy > 0 && (
                <span className="text-[10px] text-gray-500">
                  Coût sélection : <span className="text-purple-400 font-bold">{usedEnergy} EP</span>
                </span>
              )}
            </div>
          )}

          {phase === 'win' ? (
            <button onClick={continueAfterWin} className="w-full py-4 bg-green-600 hover:bg-green-500 active:scale-95 text-white font-black rounded-xl text-base transition-all">
              {enemy.isBoss ? '🛒 Marché du Rift →' : '🎁 Récompense →'}
            </button>
          ) : phase === 'lose' ? (
            <button onClick={continueAfterLose} className="w-full py-4 bg-gray-800 hover:bg-gray-700 text-gray-300 font-black rounded-xl text-base transition-all">
              Voir le résumé →
            </button>
          ) : (
            <button
              onClick={play}
              disabled={!selected.length || phase !== 'select'}
              className={`w-full py-4 rounded-xl font-black text-base transition-all ${selected.length && phase === 'select' ? 'bg-red-600 hover:bg-red-500 active:scale-95 text-white' : 'bg-gray-900 text-gray-700'}`}
            >
              {phase === 'burst' ? '⚡ BURST…'
                : phase === 'enemy' ? '⚔️ RIPOSTE…'
                : selected.length ? `⚡ LANCER LE BURST (${usedEnergy} EP)`
                : energy === 0 ? '— Énergie épuisée —'
                : '— Sélectionne 1–3 Pokémon —'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
