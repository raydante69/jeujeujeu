import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { evaluateBurst, getWeakTypes } from '../engine/comboBurst.js'
import { makeInstance } from '../data/pokemon.js'
import { getGym } from '../data/gyms.js'
import { TYPE_COLORS } from '../data/types.js'
import TypeBadge from '../components/TypeBadge.jsx'
import HPBar from '../components/HPBar.jsx'

const WILD_POOL    = [16, 19, 21, 41, 46, 48, 52, 69, 74, 79, 43, 60, 120, 129, 98]
const TRAINER_POOL = [1, 4, 7, 25, 35, 39, 50, 54, 58, 63, 66, 72, 74, 79, 81, 86, 90, 96, 100]
const GYM_POOLS = {
  1: [74, 95, 111, 138, 140],
  2: [70, 71, 114, 1, 2, 3],
  3: [25, 26, 100, 101, 81],
  4: [54, 55, 60, 61, 86, 87],
  5: [63, 64, 65, 79, 80, 96, 97],
  6: [77, 78, 126, 4, 5, 6, 58, 59],
  7: [23, 24, 73, 89, 109, 110],
  8: [147, 148, 149],
}

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)] }

function buildEnemy(nodeType, gymId) {
  let id, level, hpMult
  if (nodeType === 'gym') {
    id = pickRandom(GYM_POOLS[gymId] || GYM_POOLS[1])
    level = 10 + gymId * 5
    hpMult = 18
  } else if (nodeType === 'trainer') {
    id = pickRandom(TRAINER_POOL)
    level = 5 + gymId * 4
    hpMult = 13
  } else {
    id = pickRandom(WILD_POOL)
    level = 3 + gymId * 2 + Math.floor(Math.random() * 4)
    hpMult = 10
  }
  const mon = makeInstance(id, level)
  mon.maxHp = level * hpMult + (nodeType === 'gym' ? 60 : 20)
  mon.hp = mon.maxHp
  return mon
}

export default function CombatScreen() {
  const {
    team, currentGymId, combatContext, routeNodeIndex,
    earnBadge, addMoney, addCrystals,
    setLastBattleResult, setRouteNodeIndex, navigate,
  } = useGameStore()

  const nodeType = combatContext?.nodeType || 'wild'
  const gym = getGym(currentGymId) || {
    name: `Arène ${currentGymId}`, leader: 'Champion', type: 'normal',
    reward: { badge: `Badge ${currentGymId}`, money: 200, card: 'ultra' },
  }

  const [phase, setPhase]         = useState('init')
  const [enemyMon, setEnemyMon]   = useState(null)
  const [enemyHp, setEnemyHp]     = useState(0)
  const [enemyMaxHp, setEnemyMaxHp] = useState(1)
  const [playerHps, setPlayerHps] = useState({})
  const [cooldowns, setCooldowns] = useState({})
  const [selected, setSelected]   = useState([])
  const [turn, setTurn]           = useState(1)
  const [lastBurst, setLastBurst] = useState(null)
  const [showBurst, setShowBurst] = useState(false)
  const [log, setLog]             = useState([])
  const [winner, setWinner]       = useState(null)
  const [shaking, setShaking]     = useState(null)

  // Always-fresh ref to avoid stale closure in setTimeout chains
  const live = useRef({})
  live.current = { enemyHp, playerHps, cooldowns, enemyMon }

  const addLog = (msg) => setLog(prev => [...prev.slice(-5), msg])

  // ── Init ──────────────────────────────────────────────────────────
  useEffect(() => {
    const mon = buildEnemy(nodeType, currentGymId)
    const hps = {}
    team.forEach(c => { hps[c.uid] = c.maxHp || c.hp || (c.level || 5) * 12 + 20 })
    setEnemyMon(mon)
    setEnemyHp(mon.maxHp)
    setEnemyMaxHp(mon.maxHp)
    setPlayerHps(hps)
    const intro = nodeType === 'gym'
      ? `⚔️ Combat contre ${gym.leader} !`
      : nodeType === 'trainer'
      ? '👤 Un dresseur vous défie !'
      : '🌿 Un Pokémon sauvage apparaît !'
    addLog(intro)
    setPhase('select')
  }, []) // eslint-disable-line

  // ── Burst preview ─────────────────────────────────────────────────
  const preview = useMemo(() => {
    if (!selected.length || !enemyMon) return null
    const played = selected.map(uid => team.find(c => c.uid === uid)).filter(Boolean)
    return played.length ? evaluateBurst(played, enemyMon.types || ['normal']) : null
  }, [selected, enemyMon, team])

  const weakTypes = useMemo(
    () => (enemyMon ? getWeakTypes(enemyMon.types || ['normal']) : []),
    [enemyMon]
  )

  // ── Helpers ────────────────────────────────────────────────────────
  function toggleSelect(uid) {
    if (phase !== 'select') return
    if ((cooldowns[uid] || 0) > 0) return
    if ((playerHps[uid] || 0) <= 0) return
    setSelected(prev =>
      prev.includes(uid)
        ? prev.filter(u => u !== uid)
        : prev.length >= 3 ? prev : [...prev, uid]
    )
  }

  function shake(target, ms = 400) {
    setShaking(target)
    setTimeout(() => setShaking(null), ms)
  }

  // ── Play burst ────────────────────────────────────────────────────
  function playBurst() {
    if (phase !== 'select' || !selected.length) return
    const { enemyHp: curEHp, playerHps: curPHps, cooldowns: curCDs, enemyMon: curEnemy } = live.current

    const played = selected.map(uid => team.find(c => c.uid === uid)).filter(Boolean)
    if (!played.length) return

    const burst    = evaluateBurst(played, curEnemy.types || ['normal'])
    const newEHp   = Math.max(0, curEHp - burst.totalDamage)
    const newCDs   = { ...curCDs }
    played.forEach(p => { newCDs[p.uid] = 2 })

    setLastBurst(burst)
    setSelected([])
    setPhase('burst')
    setShowBurst(true)
    shake('enemy')

    // Phase 1: burst animation (1.4 s) → apply damage
    setTimeout(() => {
      setShowBurst(false)
      setShaking(null)
      setEnemyHp(newEHp)
      setCooldowns(newCDs)
      addLog(`${burst.emoji} ${burst.name} ×${burst.multiplier} → ${burst.totalDamage} dégâts !`)

      if (newEHp <= 0) { victory(curEnemy); return }

      // Phase 2: enemy turn (0.8 s delay)
      setPhase('enemy')
      setTimeout(() => {
        const { playerHps: latestHps, enemyMon: latestEnemy } = live.current
        const alive = team.filter(c => (latestHps[c.uid] ?? 0) > 0)
        if (!alive.length) { defeat(); return }

        const target = alive.reduce((w, p) => {
          const r1 = (latestHps[p.uid] || 0) / (p.maxHp || p.hp || 1)
          const r2 = (latestHps[w.uid] || 0) / (w.maxHp || w.hp || 1)
          return r1 < r2 ? p : w
        })

        const lvl = latestEnemy?.level || 5
        const dmg = Math.max(1, Math.floor(lvl * 1.8 + Math.random() * lvl * 0.6))
        const newTHp = Math.max(0, (latestHps[target.uid] || 0) - dmg)

        setPlayerHps(prev => ({ ...prev, [target.uid]: newTHp }))
        shake(target.uid)
        addLog(`💥 ${latestEnemy?.name} frappe ${target.name} (−${dmg} HP)`)

        setCooldowns(prev => {
          const next = { ...prev }
          Object.keys(next).forEach(uid => {
            next[uid] = Math.max(0, (next[uid] || 0) - 1)
            if (next[uid] <= 0) delete next[uid]
          })
          return next
        })
        setTurn(t => t + 1)

        const updatedHps = { ...latestHps, [target.uid]: newTHp }
        const anyAlive = team.some(c => (updatedHps[c.uid] || 0) > 0)

        setTimeout(() => {
          if (!anyAlive) defeat()
          else setPhase('select')
        }, 500)
      }, 800)
    }, 1400)
  }

  // ── End states ────────────────────────────────────────────────────
  function victory(curEnemy) {
    let money = 0, crystals = 0
    if (nodeType === 'gym') {
      money = gym.reward?.money || 150
      crystals = 20 + currentGymId * 10
      earnBadge(gym.reward?.badge || `Badge ${currentGymId}`)
      addLog(`🏆 Badge ${gym.reward?.badge || currentGymId} obtenu !`)
    } else {
      money = nodeType === 'trainer'
        ? 60 + Math.floor(Math.random() * 60)
        : 20 + Math.floor(Math.random() * 30)
      crystals = nodeType === 'trainer' ? 10 : 5
      setRouteNodeIndex(routeNodeIndex + 1)
      addLog(`✅ Victoire ! +${money}₽`)
    }
    addMoney(money)
    addCrystals(crystals)
    setLastBattleResult({
      winner: 'player',
      nodeType,
      rewardMoney: money,
      rewardCrystals: crystals,
      ...(nodeType === 'gym' ? { badgeName: gym.reward?.badge, cardRarity: gym.reward?.card } : {}),
    })
    setWinner('player')
    setPhase('end')
  }

  function defeat() {
    setLastBattleResult({ winner: 'enemy', nodeType })
    setWinner('enemy')
    setPhase('end')
    addLog('😞 Défaite… Ton équipe est K.O.')
  }

  // ── Loading guard ─────────────────────────────────────────────────
  if (!enemyMon || phase === 'init') {
    return (
      <div className="min-h-screen bg-game-bg flex items-center justify-center">
        <div className="text-4xl animate-spin">⚡</div>
      </div>
    )
  }

  const typeColor = TYPE_COLORS[enemyMon.types?.[0]] || '#1e293b'

  return (
    <div className="min-h-screen bg-game-bg flex flex-col">
      {/* Header */}
      <div className="bg-game-surface border-b border-game-border px-4 pt-10 pb-2">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-500 uppercase font-bold">
              {nodeType === 'gym' ? `Arène ${currentGymId} · ${gym.leader}` : nodeType === 'trainer' ? 'Dresseur' : 'Sauvage'}
            </p>
            <p className="text-[10px] text-gray-600">Tour {turn}</p>
          </div>
          <div className="flex gap-1 items-center">
            {team.map(c => (
              <div
                key={c.uid}
                className="w-2 h-2 rounded-full"
                style={{ background: (playerHps[c.uid] ?? 0) > 0 ? '#4ade80' : '#374151' }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-w-lg mx-auto w-full px-3 py-3 flex flex-col gap-3 pb-28">

        {/* Enemy card */}
        <div
          className={`rounded-2xl p-4 border transition-all ${shaking === 'enemy' ? 'animate-shake' : ''}`}
          style={{
            background: `linear-gradient(160deg, ${typeColor}33 0%, #0f172a 100%)`,
            borderColor: typeColor + '44',
          }}
        >
          <div className="flex items-center gap-3">
            {/* Sprite + burst flash */}
            <div className="relative flex-shrink-0">
              <img
                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${enemyMon.id}.png`}
                alt={enemyMon.name}
                className="w-20 h-20 object-contain drop-shadow-lg"
                onError={e => { e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${enemyMon.id}.png` }}
              />
              {showBurst && lastBurst && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl animate-burst-in pointer-events-none">{lastBurst.emoji}</span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-bold text-white text-sm">{enemyMon.name}</p>
                <p className="text-xs text-gray-500">Lv.{enemyMon.level}</p>
              </div>
              <div className="flex gap-1 mb-2">
                {(enemyMon.types || ['normal']).map(t => <TypeBadge key={t} type={t} size="xs" />)}
              </div>
              <HPBar hp={enemyHp} maxHp={enemyMaxHp} showNumbers size="md" />
            </div>
          </div>

          {weakTypes.length > 0 && (
            <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] text-gray-600 font-bold uppercase">Faible vs</span>
              {weakTypes.slice(0, 8).map(t => (
                <div
                  key={t}
                  className="w-3.5 h-3.5 rounded-full"
                  style={{ background: TYPE_COLORS[t] || '#666' }}
                  title={t}
                />
              ))}
            </div>
          )}
        </div>

        {/* Burst banner */}
        {showBurst && lastBurst && (
          <div
            className="rounded-2xl py-4 px-4 text-center animate-burst-in"
            style={{
              background: lastBurst.color + '1a',
              border: `2px solid ${lastBurst.color}66`,
            }}
          >
            <p
              className="font-black text-2xl leading-tight"
              style={{ color: lastBurst.color, textShadow: `0 0 24px ${lastBurst.color}` }}
            >
              {lastBurst.emoji} {lastBurst.name}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{lastBurst.desc}</p>
            <p className="font-black text-xl mt-1" style={{ color: lastBurst.color }}>
              ×{lastBurst.multiplier} · {lastBurst.totalDamage} dégâts !
            </p>
          </div>
        )}

        {/* Preview / status */}
        {!showBurst && phase === 'select' && (
          preview ? (
            <div
              className="rounded-xl px-3 py-2.5 border transition-all"
              style={{ background: preview.color + '12', borderColor: preview.color + '44' }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl flex-shrink-0">{preview.emoji}</span>
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate" style={{ color: preview.color }}>{preview.name}</p>
                    <p className="text-[10px] text-gray-500 truncate">{preview.desc}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-black text-base" style={{ color: preview.color }}>×{preview.multiplier}</p>
                  <p className="text-[10px] text-gray-500">~{preview.totalDamage} dégâts</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl px-3 py-2.5 border border-dashed border-gray-800 text-center">
              <p className="text-[10px] text-gray-600">Sélectionne 1–3 Pokémon pour voir le combo</p>
            </div>
          )
        )}

        {phase === 'enemy' && (
          <div className="rounded-xl py-3 text-center border border-red-900/40 bg-red-900/10">
            <p className="text-sm font-bold text-red-400 animate-pulse">⚔️ {enemyMon.name} contre-attaque !</p>
          </div>
        )}

        {/* Player team */}
        <div>
          <p className="text-[10px] text-gray-600 font-bold uppercase mb-2">Ton équipe</p>
          <div className="grid grid-cols-3 gap-2">
            {team.map(card => {
              const hp    = playerHps[card.uid] ?? 0
              const maxHp = card.maxHp || card.hp || 1
              const cd    = cooldowns[card.uid] || 0
              const alive = hp > 0
              const sel   = selected.includes(card.uid)
              const selIdx = selected.indexOf(card.uid)
              const isShk = shaking === card.uid
              return (
                <button
                  key={card.uid}
                  onClick={() => toggleSelect(card.uid)}
                  disabled={phase !== 'select' || !alive || cd > 0}
                  className={`relative rounded-xl p-2 flex flex-col items-center gap-1 transition-all duration-150
                    ${sel ? 'scale-105' : ''}
                    ${isShk ? 'animate-shake' : ''}
                  `}
                  style={{
                    background: sel ? '#0c1a2e' : '#0f172a',
                    border: `1.5px solid ${sel ? '#60a5fa' : '#1e293b'}`,
                    opacity: !alive ? 0.35 : cd > 0 ? 0.65 : 1,
                    boxShadow: sel ? '0 0 12px #60a5fa44' : '',
                  }}
                >
                  <img
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${card.id}.png`}
                    alt={card.name}
                    className={`w-10 h-10 object-contain pixelated ${!alive || cd > 0 ? 'grayscale' : ''}`}
                    loading="lazy"
                  />
                  <p className="text-[9px] text-white font-bold truncate w-full text-center leading-none">
                    {card.name}
                  </p>
                  {/* Mini HP bar */}
                  <div className="w-full h-0.5 rounded-full bg-gray-800">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(0, (hp / maxHp) * 100)}%`,
                        background: hp / maxHp > 0.5 ? '#4ade80' : hp / maxHp > 0.25 ? '#fbbf24' : '#ef4444',
                      }}
                    />
                  </div>

                  {/* Cooldown overlay */}
                  {cd > 0 && alive && (
                    <div className="absolute inset-0 rounded-xl bg-black/75 flex items-center justify-center">
                      <p className="text-white font-black text-2xl leading-none">{cd}</p>
                    </div>
                  )}
                  {/* Dead overlay */}
                  {!alive && (
                    <div className="absolute inset-0 rounded-xl bg-black/75 flex items-center justify-center">
                      <span className="text-xl">💀</span>
                    </div>
                  )}
                  {/* Selection badge */}
                  {sel && (
                    <div className="absolute top-1 right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-[8px] font-black text-white">{selIdx + 1}</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Log */}
        <div className="bg-game-surface rounded-xl p-2.5 border border-game-border">
          {log.map((line, i) => (
            <p key={i} className="text-[10px] text-gray-500 leading-relaxed">{line}</p>
          ))}
        </div>
      </div>

      {/* Action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-game-bg border-t border-game-border p-3 z-20">
        <div className="max-w-lg mx-auto">
          {phase === 'end' ? (
            <div className="flex gap-2">
              {winner === 'player' ? (
                <>
                  <button
                    onClick={() => navigate('rewards')}
                    className="flex-1 py-3.5 bg-green-600 hover:bg-green-500 active:scale-95 text-white font-bold rounded-xl text-sm transition-all"
                  >
                    🏆 Récompenses →
                  </button>
                  <button
                    onClick={() => navigate('map')}
                    className="px-5 py-3.5 bg-gray-800 hover:bg-gray-700 text-gray-400 font-bold rounded-xl text-sm transition-all"
                  >
                    🗺️
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate('map')}
                    className="flex-1 py-3.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl text-sm transition-all"
                  >
                    ← Carte
                  </button>
                  <button
                    onClick={() => navigate('shop')}
                    className="flex-1 py-3.5 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold rounded-xl text-sm transition-all"
                  >
                    🛍️ Boosters
                  </button>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={playBurst}
              disabled={!selected.length || phase !== 'select'}
              className={`w-full py-4 rounded-xl font-black text-base transition-all ${
                selected.length && phase === 'select'
                  ? 'bg-red-600 hover:bg-red-500 active:scale-95 text-white'
                  : 'bg-gray-900 text-gray-700 cursor-default'
              }`}
            >
              {phase === 'burst' ? '⚡ BURST EN COURS…'
                : phase === 'enemy' ? '⚔️ ATTAQUE ENNEMIE…'
                : selected.length ? `⚡ PLAY BURST (${selected.length})`
                : '— Sélectionne 1–3 Pokémon —'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
