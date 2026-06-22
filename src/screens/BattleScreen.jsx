import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { useRunStore } from '../store/runStore.js'
import {
  buildEnemy, resolveBurst, enemyStrike, xpForWin, goldForWin,
  gainXp, catchChance, isShopWave,
} from '../engine/runEngine.js'
import { aggregateRelics } from '../data/relics.js'
import { getWeakTypes } from '../engine/comboBurst.js'
import { TYPE_COLORS } from '../data/types.js'
import TypeBadge from '../components/TypeBadge.jsx'
import HPBar from '../components/HPBar.jsx'

export default function BattleScreen() {
  const { navigate } = useGameStore()
  const run = useRunStore()
  const { team, relics, wave, pendingEnemy } = run
  const relicAgg = useMemo(() => aggregateRelics(relics), [relics])

  const [enemy, setEnemy]       = useState(null)
  const [enemyHp, setEnemyHp]   = useState(0)
  const [enemyMax, setEnemyMax] = useState(1)
  const [hp, setHp]             = useState({})
  const [cooldowns, setCd]      = useState({})
  const [selected, setSelected] = useState([])
  const [phase, setPhase]       = useState('init')   // init|select|burst|enemy|win|lose
  const [turn, setTurn]         = useState(1)
  const [lastBurst, setLastBurst] = useState(null)
  const [showBurst, setShowBurst] = useState(false)
  const [floatDmg, setFloatDmg] = useState(null)
  const [log, setLog]           = useState([])
  const [shake, setShake]       = useState(null)
  const [winSummary, setWinSummary] = useState(null)
  const [caught, setCaught]     = useState(null)
  const reviveUsed = useRef(false)

  const live = useRef({})
  live.current = { enemyHp, hp, cooldowns, enemy }

  const addLog = (m) => setLog(p => [...p.slice(-4), m])

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
      : e.kind === 'elite' ? `⭐ Un ${e.name} d'élite apparaît !`
      : `Un ${e.name} sauvage apparaît !`)
    setPhase('select')
  }, []) // eslint-disable-line

  const preview = useMemo(() => {
    if (!selected.length || !enemy) return null
    const played = selected.map(uid => team.find(m => m.uid === uid)).filter(Boolean)
    return played.length ? resolveBurst(played, enemy, relicAgg) : null
  }, [selected, enemy, team, relicAgg])

  const weakTypes = useMemo(() => (enemy ? getWeakTypes(enemy.types || ['normal']) : []), [enemy])

  function toggle(uid) {
    if (phase !== 'select') return
    if ((cooldowns[uid] || 0) > 0 || (hp[uid] || 0) <= 0) return
    setSelected(p => p.includes(uid) ? p.filter(x => x !== uid) : p.length >= 3 ? p : [...p, uid])
  }

  function doShake(t, ms = 420) { setShake(t); setTimeout(() => setShake(null), ms) }

  // ── Play a burst ────────────────────────────────────────────────
  function play() {
    if (phase !== 'select' || !selected.length) return
    const { enemyHp: eHp, hp: pHp, cooldowns: cds, enemy: en } = live.current
    const played = selected.map(uid => team.find(m => m.uid === uid)).filter(Boolean)
    if (!played.length) return

    const burst = resolveBurst(played, en, relicAgg)
    const newEHp = Math.max(0, eHp - burst.totalDamage)
    const newCds = { ...cds }
    played.forEach(p => { newCds[p.uid] = 2 })

    // lifesteal → heal weakest alive
    let healHp = { ...pHp }
    if (relicAgg.lifestealPct > 0) {
      const alive = team.filter(m => (healHp[m.uid] || 0) > 0)
      if (alive.length) {
        const weak = alive.reduce((w, m) => (healHp[m.uid] / m.maxHp < healHp[w.uid] / w.maxHp ? m : w))
        const heal = Math.round(burst.totalDamage * relicAgg.lifestealPct / 100)
        healHp[weak.uid] = Math.min(weak.maxHp, healHp[weak.uid] + heal)
      }
    }

    setSelected([]); setPhase('burst'); setLastBurst(burst); setShowBurst(true)
    setFloatDmg({ dmg: burst.totalDamage, crit: burst.crit, color: burst.color })
    doShake('enemy')

    setTimeout(() => {
      setShowBurst(false); setShake(null); setFloatDmg(null)
      setEnemyHp(newEHp); setCd(newCds); setHp(healHp)
      addLog(`${burst.emoji} ${burst.name} ×${burst.multiplier}${burst.crit ? ' CRIT!' : ''} → ${burst.totalDamage} dégâts`)

      if (newEHp <= 0) { win(healHp); return }

      // Enemy turn
      setPhase('enemy')
      setTimeout(() => {
        const strike = enemyStrike(en, team, healHp)
        if (!strike) { lose(healHp); return }
        let nextHp = { ...healHp, [strike.targetUid]: Math.max(0, healHp[strike.targetUid] - strike.damage) }
        doShake(strike.targetUid)
        addLog(`💥 ${en.name} inflige ${strike.damage} à ${strike.name}`)

        // Phoenix revive
        if (nextHp[strike.targetUid] <= 0 && relicAgg.revive && !reviveUsed.current) {
          const m = team.find(t => t.uid === strike.targetUid)
          nextHp[strike.targetUid] = Math.round(m.maxHp * relicAgg.revive / 100)
          reviveUsed.current = true
          addLog(`🪶 La Plume Phénix ranime ${strike.name} !`)
        }

        // cooldown tick
        const tickedCds = {}
        Object.keys(newCds).forEach(uid => { const v = newCds[uid] - 1; if (v > 0) tickedCds[uid] = v })

        setHp(nextHp); setCd(tickedCds); setTurn(t => t + 1)
        const anyAlive = team.some(m => (nextHp[m.uid] || 0) > 0)
        setTimeout(() => { anyAlive ? setPhase('select') : lose(nextHp) }, 450)
      }, 750)
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
    run.commitTeam(updated)
    run.addGold(goldGain)
    run.setOutcome('win')
    setWinSummary({ xpEach, events, goldGain })
    setPhase('win')
    addLog(`✅ ${enemy.name} vaincu !`)
  }

  function lose(finalHp) {
    const updated = team.map(m => ({ ...m, hp: finalHp[m.uid] ?? m.hp }))
    run.commitTeam(updated)
    run.setOutcome('lose')
    setPhase('lose')
  }

  // ── Catch ───────────────────────────────────────────────────────
  function tryCatch() {
    if (enemy.isBoss || run.balls <= 0 || caught) return
    if (!run.useBall()) return
    const chance = catchChance(enemy, 0, relicAgg)
    if (Math.random() < chance) {
      const res = run.catchEnemy(enemy)
      setCaught({ ok: true, ...res })
    } else {
      setCaught({ ok: false, name: enemy.name })
    }
  }

  function continueAfterWin() {
    run.advanceWave()
    if (enemy.isBoss) navigate('runshop')
    else navigate('reward')
  }

  function continueAfterLose() {
    run.endRun()
    navigate('runend')
  }

  if (!enemy || phase === 'init') {
    return <div className="min-h-screen bg-game-bg flex items-center justify-center"><div className="text-4xl animate-spin">⚡</div></div>
  }

  const typeColor = TYPE_COLORS[enemy.types?.[0]] || '#1e293b'

  return (
    <div className="min-h-screen bg-game-bg flex flex-col">
      {/* header */}
      <div className="px-4 pt-10 pb-2 border-b border-game-border bg-game-surface">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <p className="text-[11px] text-gray-500 font-bold uppercase">Vague {wave} · Tour {turn}</p>
          <div className="flex gap-1 items-center">
            {team.map(m => <div key={m.uid} className="w-2 h-2 rounded-full" style={{ background: (hp[m.uid] ?? 0) > 0 ? '#4ade80' : '#374151' }} />)}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-w-lg mx-auto w-full px-3 py-3 flex flex-col gap-3 pb-28">

        {/* Enemy */}
        <div className={`rounded-2xl p-4 border relative ${shake === 'enemy' ? 'animate-shake' : ''}`}
          style={{ background: `linear-gradient(160deg, ${typeColor}33, #0f172a)`, borderColor: typeColor + '55' }}>
          {enemy.isBoss && <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full">💀 BOSS</div>}
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${enemy.id}.png`} alt={enemy.name}
                className="w-20 h-20 object-contain drop-shadow-lg"
                onError={e => { e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${enemy.id}.png` }} />
              {showBurst && lastBurst && <div className="absolute inset-0 flex items-center justify-center"><span className="text-4xl animate-burst-in">{lastBurst.emoji}</span></div>}
              {floatDmg && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 animate-float-dmg font-black text-xl pointer-events-none" style={{ color: floatDmg.color }}>
                  -{floatDmg.dmg}{floatDmg.crit ? '!' : ''}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-white text-sm">{enemy.name}</p>
                <p className="text-xs text-gray-500">Niv.{enemy.level}</p>
              </div>
              <div className="flex gap-1 my-1.5">{(enemy.types || ['normal']).map(t => <TypeBadge key={t} type={t} size="xs" />)}</div>
              <HPBar hp={enemyHp} maxHp={enemyMax} showNumbers size="md" />
            </div>
          </div>
          {weakTypes.length > 0 && phase !== 'win' && (
            <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] text-gray-600 font-bold uppercase">Faible vs</span>
              {weakTypes.slice(0, 8).map(t => <div key={t} className="w-3.5 h-3.5 rounded-full" style={{ background: TYPE_COLORS[t] }} title={t} />)}
            </div>
          )}
        </div>

        {/* Burst banner */}
        {showBurst && lastBurst && (
          <div className="rounded-2xl py-4 text-center animate-burst-in" style={{ background: lastBurst.color + '1a', border: `2px solid ${lastBurst.color}66` }}>
            <p className="font-black text-2xl" style={{ color: lastBurst.color, textShadow: `0 0 24px ${lastBurst.color}` }}>{lastBurst.emoji} {lastBurst.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{lastBurst.desc}{lastBurst.crit ? ' · CRITIQUE !' : ''}</p>
            <p className="font-black text-xl mt-1" style={{ color: lastBurst.color }}>×{lastBurst.multiplier} · {lastBurst.totalDamage} dégâts</p>
          </div>
        )}

        {/* Preview / status */}
        {!showBurst && phase === 'select' && (preview ? (
          <div className="rounded-xl px-3 py-2.5 border" style={{ background: preview.color + '12', borderColor: preview.color + '44' }}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xl">{preview.emoji}</span>
                <div className="min-w-0"><p className="font-bold text-sm truncate" style={{ color: preview.color }}>{preview.name}</p><p className="text-[10px] text-gray-500 truncate">{preview.desc}</p></div>
              </div>
              <div className="text-right"><p className="font-black text-base" style={{ color: preview.color }}>×{preview.multiplier}</p><p className="text-[10px] text-gray-500">~{preview.totalDamage}</p></div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl px-3 py-2.5 border border-dashed border-gray-800 text-center"><p className="text-[10px] text-gray-600">Sélectionne 1–3 Pokémon pour former un burst</p></div>
        ))}
        {phase === 'enemy' && <div className="rounded-xl py-3 text-center border border-red-900/40 bg-red-900/10"><p className="text-sm font-bold text-red-400 animate-pulse">⚔️ {enemy.name} riposte…</p></div>}

        {/* Team */}
        {phase !== 'win' && phase !== 'lose' && (
          <div>
            <p className="text-[10px] text-gray-600 font-bold uppercase mb-2">Ton équipe</p>
            <div className="grid grid-cols-3 gap-2">
              {team.map(m => {
                const h = hp[m.uid] ?? 0, maxH = m.maxHp || 1, cd = cooldowns[m.uid] || 0
                const alive = h > 0, sel = selected.includes(m.uid), idx = selected.indexOf(m.uid)
                return (
                  <button key={m.uid} onClick={() => toggle(m.uid)} disabled={phase !== 'select' || !alive || cd > 0}
                    className={`relative rounded-xl p-2 flex flex-col items-center gap-1 transition-all ${sel ? 'scale-105' : ''} ${shake === m.uid ? 'animate-shake' : ''}`}
                    style={{ background: sel ? '#0c1a2e' : '#0f172a', border: `1.5px solid ${sel ? '#60a5fa' : '#1e293b'}`, opacity: !alive ? 0.35 : cd > 0 ? 0.6 : 1, boxShadow: sel ? '0 0 12px #60a5fa44' : '' }}>
                    <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${m.id}.png`} alt={m.name} className={`w-10 h-10 object-contain pixelated ${!alive || cd > 0 ? 'grayscale' : ''}`} loading="lazy" />
                    <p className="text-[9px] text-white font-bold truncate w-full text-center leading-none">{m.name}</p>
                    <p className="text-[8px] text-gray-500 leading-none">Niv.{m.level}</p>
                    <div className="w-full h-0.5 rounded-full bg-gray-800"><div className="h-full rounded-full" style={{ width: `${Math.max(0, (h / maxH) * 100)}%`, background: h / maxH > 0.5 ? '#4ade80' : h / maxH > 0.25 ? '#fbbf24' : '#ef4444' }} /></div>
                    {cd > 0 && alive && <div className="absolute inset-0 rounded-xl bg-black/75 flex items-center justify-center"><p className="text-white font-black text-2xl">{cd}</p></div>}
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
              <span className="text-cyan-300">+{winSummary.xpEach} XP / Pokémon</span>
            </div>
            {winSummary.events.length > 0 && (
              <div className="mt-3 space-y-1">
                {winSummary.events.map((e, i) => (
                  <div key={i} className="text-xs">
                    {e.evo.length > 0
                      ? <p className="text-purple-300 font-bold animate-burst-in">✨ {e.evo[0].from} évolue en {e.evo[0].to} !</p>
                      : <p className="text-cyan-300">⬆️ {e.name} Niv.{e.from} → {e.to}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Catch */}
            {!enemy.isBoss && (
              <div className="mt-3">
                {caught ? (
                  <p className={`text-xs font-bold ${caught.ok ? 'text-green-300' : 'text-gray-500'}`}>
                    {caught.ok ? (caught.benched ? `🎉 ${caught.name} capturé (équipe pleine, ajouté au Pokédex) !` : `🎉 ${caught.name} rejoint l'équipe !`) : `💨 ${caught.name} s'est échappé…`}
                  </p>
                ) : run.balls > 0 ? (
                  <button onClick={tryCatch} className="text-xs font-bold text-white bg-red-600/80 hover:bg-red-500 rounded-lg px-4 py-2 transition-all active:scale-95">
                    🔴 Lancer une Ball ({Math.round(catchChance(enemy, 0, relicAgg) * 100)}%) — reste {run.balls}
                  </button>
                ) : <p className="text-[10px] text-gray-600">Plus de Balls</p>}
              </div>
            )}
          </div>
        )}

        {/* Lose panel */}
        {phase === 'lose' && (
          <div className="rounded-2xl p-5 border border-red-800 bg-red-900/20 text-center">
            <p className="text-4xl mb-2">💀</p>
            <p className="font-game text-sm text-red-400">Ton équipe est tombée</p>
            <p className="text-xs text-gray-500 mt-1">Expédition terminée à la vague {wave}.</p>
          </div>
        )}

        {/* Log */}
        <div className="bg-game-surface rounded-xl p-2.5 border border-game-border">
          {log.map((l, i) => <p key={i} className="text-[10px] text-gray-500 leading-relaxed">{l}</p>)}
        </div>
      </div>

      {/* Action bar */}
      <div className="fixed bottom-0 inset-x-0 bg-game-bg border-t border-game-border p-3 z-20">
        <div className="max-w-lg mx-auto">
          {phase === 'win' ? (
            <button onClick={continueAfterWin} className="w-full py-4 bg-green-600 hover:bg-green-500 active:scale-95 text-white font-black rounded-xl text-base transition-all">
              {enemy.isBoss ? '🛒 Marché du Rift →' : '🎁 Récompense →'}
            </button>
          ) : phase === 'lose' ? (
            <button onClick={continueAfterLose} className="w-full py-4 bg-gray-800 hover:bg-gray-700 text-gray-300 font-black rounded-xl text-base transition-all">
              Voir le résumé →
            </button>
          ) : (
            <button onClick={play} disabled={!selected.length || phase !== 'select'}
              className={`w-full py-4 rounded-xl font-black text-base transition-all ${selected.length && phase === 'select' ? 'bg-red-600 hover:bg-red-500 active:scale-95 text-white' : 'bg-gray-900 text-gray-700'}`}>
              {phase === 'burst' ? '⚡ BURST…' : phase === 'enemy' ? '⚔️ RIPOSTE…' : selected.length ? `⚡ PLAY BURST (${selected.length})` : '— Sélectionne 1–3 Pokémon —'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
