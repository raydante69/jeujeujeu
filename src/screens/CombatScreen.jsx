import React, { useState, useMemo } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { makeInstance } from '../data/pokemon.js'
import { getGym, GYMS } from '../data/gyms.js'
import {
  buildMovesetG, moveDamage, guardValue, healValue, rageMultiplier,
} from '../engine/combatEngine.js'
import { TYPE_COLORS } from '../data/types.js'
import TypeBadge from '../components/TypeBadge.jsx'
import HPBar from '../components/HPBar.jsx'

const GYM_POOLS = {
  normal:   [52, 39, 143, 19, 132],
  rock:     [74, 95, 111, 138, 140],
  water:    [54, 60, 86,  90, 116],
  electric: [25, 26, 100, 101, 81],
  grass:    [1,  43, 69,  102, 114],
  fire:     [4,  58, 77,  136, 126],
  psychic:  [63, 79, 96,  103, 122],
  dragon:   [147, 148, 149],
}

function buildGymTeam(gym) {
  const pool = GYM_POOLS[gym.type] || GYM_POOLS.normal
  return gym.teamLevel.map((level, i) => makeInstance(pool[i % pool.length], level))
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildPool(team, teamHps, cooldowns) {
  const moves = []
  for (const mon of team) {
    if ((teamHps[mon.uid] ?? 0) <= 0) continue
    for (const m of buildMovesetG(mon)) {
      if ((cooldowns[m.key] || 0) <= 0) moves.push(m)
    }
  }
  return shuffle(moves)
}

function tickCooldowns(cooldowns) {
  const next = {}
  for (const [k, v] of Object.entries(cooldowns)) {
    if (v > 1) next[k] = v - 1
  }
  return next
}

function addLog(state, msg) {
  return { ...state, log: [...state.log.slice(-12), msg] }
}

function initBattle(team, gymTeam, gym, handSize) {
  const teamHps = Object.fromEntries(team.map(m => [m.uid, m.maxHp || m.hp || 100]))
  const gymHps = Object.fromEntries(gymTeam.map((_, i) => [i, gymTeam[i].maxHp || gymTeam[i].hp || 100]))
  const cooldowns = {}
  const hand = buildPool(team, teamHps, cooldowns).slice(0, handSize)
  return {
    teamHps, gymHps, activeEnemyIdx: 0,
    guard: 0, rageLevel: 0, turn: 1, cooldowns, hand,
    log: [`⚔️ Combat contre ${gym.leader} !`],
    done: false, winner: null, rerollsLeft: 2,
  }
}

export default function CombatScreen() {
  const {
    team, currentGymId, earnBadge, setLastBattleResult, navigate,
    addMoney, addCombatWin, combatWins, handSize: storeHandSize,
  } = useGameStore()
  const handSize = storeHandSize || 5

  const gym = useMemo(() => getGym(currentGymId) || GYMS[0], [currentGymId])
  const gymTeam = useMemo(() => buildGymTeam(gym), [gym])

  const [battle, setBattle] = useState(() => initBattle(team, gymTeam, gym, handSize))

  function getMoveValue(move) {
    const caster = team.find(m => m.uid === move.ownerUid)
    const curEnemy = gymTeam[battle.activeEnemyIdx]
    if (!caster) return { text: '?', color: '#94a3b8' }
    if (move.kind === 'attack') {
      const { dmg } = moveDamage(move, caster, curEnemy || { types: ['normal'] })
      return { text: `-${dmg}`, color: '#ef4444' }
    }
    if (move.kind === 'drain') {
      const { dmg } = moveDamage(move, caster, curEnemy || { types: ['normal'] })
      const heal = healValue(move, caster)
      return { text: `-${dmg}/+${heal}`, color: '#4ade80' }
    }
    if (move.kind === 'heal') {
      return { text: `+${healValue(move, caster)} PV`, color: '#4ade80' }
    }
    if (move.kind === 'guard') {
      return { text: `🛡️ ${guardValue(move, caster)}`, color: '#60a5fa' }
    }
    if (move.kind === 'status') return { text: move.emoji || '⚡', color: '#a855f7' }
    if (move.kind === 'buff') return { text: `+${Math.round((move.bonus || 0.7) * 100)}% ATK`, color: '#f97316' }
    return { text: '?', color: '#94a3b8' }
  }

  function playCard(move) {
    setBattle(prev => {
      if (prev.done) return prev
      let s = {
        ...prev,
        cooldowns: { ...prev.cooldowns },
        teamHps: { ...prev.teamHps },
        gymHps: { ...prev.gymHps },
      }

      const caster = team.find(m => m.uid === move.ownerUid)
      const enemy = gymTeam[s.activeEnemyIdx]

      // Apply player move
      if ((move.kind === 'attack' || move.kind === 'drain') && caster && enemy) {
        const { dmg, eff } = moveDamage(move, caster, enemy)
        const effText = eff >= 2 ? ' ✨ Super efficace !' : eff <= 0.5 ? ' 💫 Peu efficace' : ''
        s.gymHps[s.activeEnemyIdx] = Math.max(0, (s.gymHps[s.activeEnemyIdx] ?? 0) - dmg)
        s = addLog(s, `${move.emoji} ${caster.name} → ${move.name} : ${dmg} dégâts${effText}`)
        if (move.kind === 'drain') {
          const heal = healValue(move, caster)
          for (const mon of team) {
            if ((s.teamHps[mon.uid] ?? 0) > 0)
              s.teamHps[mon.uid] = Math.min(mon.maxHp || mon.hp, (s.teamHps[mon.uid] ?? 0) + heal)
          }
          s = addLog(s, `💚 Drain → +${heal} PV à l'équipe`)
        }
      } else if (move.kind === 'heal' && caster) {
        const heal = healValue(move, caster)
        for (const mon of team) {
          if ((s.teamHps[mon.uid] ?? 0) > 0)
            s.teamHps[mon.uid] = Math.min(mon.maxHp || mon.hp, (s.teamHps[mon.uid] ?? 0) + heal)
        }
        s = addLog(s, `💚 ${caster.name} → ${move.name} : +${heal} PV à l'équipe`)
      } else if (move.kind === 'guard' && caster) {
        const shield = guardValue(move, caster)
        s.guard = (s.guard || 0) + shield
        s = addLog(s, `🛡️ ${caster.name} → ${move.name} : +${shield} bouclier`)
      } else if (move.kind === 'status') {
        s = addLog(s, `${move.emoji} ${move.ownerName} → ${move.name}`)
      } else if (move.kind === 'buff') {
        s = addLog(s, `💪 ${move.ownerName} → ${move.name}`)
      }

      // Set cooldown
      if ((move.cooldown || 0) > 0) s.cooldowns[move.key] = move.cooldown

      // Check enemy KO
      if ((s.gymHps[s.activeEnemyIdx] ?? 0) <= 0) {
        s = addLog(s, `💀 ${enemy?.name} est K.O. !`)
        let nextIdx = s.activeEnemyIdx + 1
        while (nextIdx < gymTeam.length && (s.gymHps[nextIdx] ?? 0) <= 0) nextIdx++
        if (nextIdx >= gymTeam.length) {
          s.done = true; s.winner = 'player'
          s = addLog(s, `🏆 Victoire ! Badge ${gym.reward.badge} obtenu !`)
          return s
        }
        s.activeEnemyIdx = nextIdx
        s = addLog(s, `${gym.leader} envoie ${gymTeam[nextIdx].name} !`)
      }

      // Enemy attacks player
      const aliveTeam = team.filter(m => (s.teamHps[m.uid] ?? 0) > 0)
      if (aliveTeam.length > 0) {
        const curEnemy = gymTeam[s.activeEnemyIdx]
        const target = aliveTeam[Math.floor(Math.random() * aliveTeam.length)]
        const rageMult = rageMultiplier(s.rageLevel)
        const lvl = curEnemy.level || 5
        let dmg = Math.max(1, Math.round(lvl * 1.8 * rageMult))

        if ((s.guard || 0) > 0) {
          const absorbed = Math.min(s.guard, dmg)
          dmg = Math.max(0, dmg - absorbed)
          s.guard = Math.max(0, s.guard - absorbed)
          if (absorbed > 0) s = addLog(s, `🛡️ Bouclier absorbe ${absorbed} dégâts !`)
        }

        s.teamHps[target.uid] = Math.max(0, (s.teamHps[target.uid] ?? 0) - dmg)
        const rageTag = s.rageLevel >= 10 ? ' 🔴🔥' : s.rageLevel >= 5 ? ' 🔴' : ''
        s = addLog(s, `${curEnemy?.name} attaque ${target.name} : ${dmg} dégâts${rageTag}`)
        if (s.teamHps[target.uid] <= 0) s = addLog(s, `💀 ${target.name} est K.O. !`)
      }

      // Check player loss
      if (!team.some(m => (s.teamHps[m.uid] ?? 0) > 0)) {
        s.done = true; s.winner = 'enemy'
        s = addLog(s, `😞 Défaite... Entraîne-toi encore !`)
        return s
      }

      // Advance turn
      s.rageLevel = s.rageLevel + 1
      s.turn = s.turn + 1
      s.cooldowns = tickCooldowns(s.cooldowns)

      // Enemy HP regen at rage 15+
      if (s.rageLevel >= 15) {
        const curEnemy = gymTeam[s.activeEnemyIdx]
        const maxHp = curEnemy?.maxHp || curEnemy?.hp || 100
        const regenAmt = Math.round(maxHp * 0.05)
        s.gymHps[s.activeEnemyIdx] = Math.min(maxHp, (s.gymHps[s.activeEnemyIdx] ?? 0) + regenAmt)
        s = addLog(s, `😤 ${curEnemy?.name} regagne ${regenAmt} PV (RAGE !)`)
      }

      // Refresh hand
      s.hand = buildPool(team, s.teamHps, s.cooldowns).slice(0, handSize)
      return s
    })
  }

  function handleReroll() {
    setBattle(prev => {
      if (prev.rerollsLeft <= 0) return prev
      return {
        ...prev,
        rerollsLeft: prev.rerollsLeft - 1,
        hand: buildPool(team, prev.teamHps, prev.cooldowns).slice(0, handSize),
      }
    })
  }

  function handleContinue() {
    setLastBattleResult({ winner: battle.winner })
    if (battle.winner === 'player') {
      earnBadge(gym.reward.badge)
      if (gym.reward.money) addMoney(gym.reward.money)
      addCombatWin?.()
      const newWins = (combatWins || 0) + 1
      if (newWins % 5 === 0) {
        navigate('milestone')
        return
      }
      navigate('rewards')
    } else {
      navigate('shop')
    }
  }

  const activeEnemy = gymTeam[battle.activeEnemyIdx]
  const activeEnemyHp = battle.gymHps[battle.activeEnemyIdx] ?? 0
  const activeEnemyMaxHp = activeEnemy?.maxHp || activeEnemy?.hp || 100
  const ragePct = Math.min(100, (battle.rageLevel / 15) * 100)
  const rageColor = battle.rageLevel >= 10 ? '#ef4444' : battle.rageLevel >= 5 ? '#f97316' : '#4ade80'

  return (
    <div className="min-h-screen bg-game-bg flex flex-col">
      {/* Header */}
      <div className="bg-game-surface border-b border-game-border px-4 pt-10 pb-3">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-gray-400">{gym.name}</p>
            <p className="font-game text-sm text-white">{gym.leader}</p>
          </div>
          <div className="flex items-center gap-2 flex-1 justify-center">
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">RAGE</span>
            <div className="flex-1 max-w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${ragePct}%`, backgroundColor: rageColor }}
              />
            </div>
            <span className="text-xs font-bold" style={{ color: rageColor }}>{battle.rageLevel}</span>
          </div>
          <TypeBadge type={gym.type} size="md" />
        </div>
      </div>

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-3 gap-3">
        {/* Battle field */}
        <div className="grid grid-cols-2 gap-3">
          {/* Player side */}
          <div className="bg-game-card rounded-xl p-3 border border-blue-800/40">
            <p className="text-[10px] text-blue-400 font-bold mb-2">TON ÉQUIPE</p>
            <div className="space-y-1.5">
              {team.map(mon => {
                const hp = battle.teamHps[mon.uid] ?? 0
                const maxHp = mon.maxHp || mon.hp || 100
                return (
                  <div key={mon.uid} className={`flex items-center gap-1.5 ${hp <= 0 ? 'opacity-35' : ''}`}>
                    <img
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${mon.id}.png`}
                      alt={mon.name}
                      className="w-8 h-8 object-contain flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-white truncate leading-tight">{mon.name}</p>
                      <HPBar hp={hp} maxHp={maxHp} size="sm" />
                    </div>
                  </div>
                )
              })}
            </div>
            {battle.guard > 0 && (
              <p className="text-xs text-blue-300 font-bold mt-2">🛡️ {battle.guard}</p>
            )}
          </div>

          {/* Enemy side */}
          <div className="bg-game-card rounded-xl p-3 border border-red-800/40">
            <p className="text-[10px] text-red-400 font-bold mb-2">ADVERSAIRE</p>
            {activeEnemy ? (
              <>
                <img
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${activeEnemy.id}.png`}
                  alt={activeEnemy.name}
                  className="w-14 h-14 mx-auto object-contain"
                />
                <p className="text-center text-xs font-bold text-white mt-1 truncate">{activeEnemy.name}</p>
                <p className="text-center text-[10px] text-gray-400">Niv.{activeEnemy.level}</p>
                <HPBar hp={activeEnemyHp} maxHp={activeEnemyMaxHp} showNumbers size="sm" />
              </>
            ) : (
              <div className="h-20 flex items-center justify-center text-3xl">💀</div>
            )}
            <div className="flex gap-1 justify-center mt-2">
              {gymTeam.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${(battle.gymHps[i] ?? 0) > 0 ? 'bg-red-500' : 'bg-gray-600'} ${i === battle.activeEnemyIdx ? 'ring-1 ring-white scale-125' : ''}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Battle log */}
        <div className="bg-game-card rounded-xl px-3 py-2 border border-game-border h-20 overflow-y-auto">
          {battle.log.slice(-5).map((line, i) => (
            <p key={i} className="text-[11px] text-gray-300 leading-relaxed">{line}</p>
          ))}
        </div>

        {/* Card hand */}
        {!battle.done && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                CARTES — Tour {battle.turn}
              </p>
              <button
                onClick={handleReroll}
                disabled={battle.rerollsLeft <= 0}
                className={`text-xs px-3 py-1 rounded-lg font-bold transition-all ${
                  battle.rerollsLeft > 0
                    ? 'bg-yellow-900/40 text-yellow-400 border border-yellow-700/40 hover:bg-yellow-900/60'
                    : 'bg-game-card text-gray-600 cursor-not-allowed'
                }`}
              >
                🔀 Relancer ({battle.rerollsLeft})
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {battle.hand.length === 0 ? (
                <p className="text-xs text-gray-600 py-6 px-3 w-full text-center">
                  Toutes les attaques sont en recharge — fin du tour automatique.
                </p>
              ) : battle.hand.map(move => {
                const typeColor = TYPE_COLORS[move.type] || '#94a3b8'
                const { text, color } = getMoveValue(move)
                const caster = team.find(m => m.uid === move.ownerUid)
                return (
                  <button
                    key={move.key}
                    onClick={() => playCard(move)}
                    className="flex-shrink-0 w-28 rounded-xl p-2.5 flex flex-col items-center gap-1 active:scale-95 transition-transform hover:brightness-110"
                    style={{
                      backgroundColor: typeColor + '18',
                      border: `2px solid ${typeColor}99`,
                      minHeight: '108px',
                    }}
                  >
                    <span className="text-xl leading-none">{move.emoji || '⚔️'}</span>
                    <span className="text-[10px] font-bold text-white text-center leading-tight line-clamp-2 w-full">
                      {move.name}
                    </span>
                    <span className="text-xs font-bold" style={{ color }}>{text}</span>
                    {caster && (
                      <span className="text-[9px] text-gray-500 truncate w-full text-center">{caster.name}</span>
                    )}
                    {(move.cooldown || 0) > 0 && (
                      <span className="text-[9px] text-gray-600">CD {move.cooldown}t</span>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* Done screen */}
        {battle.done && (
          <div className={`rounded-2xl p-5 text-center border ${battle.winner === 'player' ? 'bg-green-900/30 border-green-700' : 'bg-red-900/30 border-red-800'}`}>
            <p className="text-3xl mb-1">{battle.winner === 'player' ? '🏆' : '😞'}</p>
            <p className={`font-game text-sm ${battle.winner === 'player' ? 'text-green-400' : 'text-red-400'}`}>
              {battle.winner === 'player' ? 'Victoire !' : 'Défaite'}
            </p>
            {battle.winner === 'player' && (
              <p className="text-xs text-gray-400 mt-1">
                Badge {gym.reward.badge} · +{gym.reward.money} ₽
              </p>
            )}
            <button
              onClick={handleContinue}
              className={`mt-4 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                battle.winner === 'player'
                  ? 'bg-green-600 hover:bg-green-500 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              {battle.winner === 'player' ? 'Continuer →' : 'Retour au shop →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
