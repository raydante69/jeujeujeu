import React, { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { simulateBattle } from '../engine/battle.js'
import { makeInstance, speciesById } from '../data/pokemon.js'
import { computeTraits } from '../data/traits.js'
import { makeRng, randomSeed } from '../engine/rng.js'
import { getGym, GYMS } from '../data/gyms.js'
import TypeBadge from '../components/TypeBadge.jsx'
import HPBar from '../components/HPBar.jsx'

const TICK_DELAY = 700

function buildGymTeam(gym) {
  const typePool = {
    normal: [52, 39, 143, 19, 132],
    rock: [74, 95, 111, 138, 140],
    water: [54, 60, 86, 90, 116],
    electric: [25, 26, 100, 101, 81],
    grass: [1, 43, 69, 102, 114],
    fire: [4, 58, 77, 136, 126],
    psychic: [63, 79, 96, 103, 122],
    dragon: [147, 148, 149],
  }
  const pool = typePool[gym.type] || typePool.normal
  return gym.teamLevel.map((level, i) => {
    const id = pool[i % pool.length]
    return makeInstance(id, level)
  })
}

export default function CombatScreen() {
  const { team, currentGymId, earnBadge, setLastBattleResult, navigate } = useGameStore()
  const gym = getGym(currentGymId) || GYMS[0]

  const [log, setLog] = useState([])
  const [tick, setTick] = useState(0)
  const [done, setDone] = useState(false)
  const [winner, setWinner] = useState(null)
  const [playerHPs, setPlayerHPs] = useState({})
  const [enemyHPs, setEnemyHPs] = useState({})
  const [activePlayer, setActivePlayer] = useState(null)
  const [activeEnemy, setActiveEnemy] = useState(null)
  const [logLines, setLogLines] = useState([])
  const [shakePlayer, setShakePlayer] = useState(false)
  const [shakeEnemy, setShakeEnemy] = useState(false)
  const [skip, setSkip] = useState(false)
  const logRef = useRef(null)

  const [battleData] = useState(() => {
    const enemyTeam = buildGymTeam(gym)
    const playerTeam = team.map(card => ({ ...card }))
    const traits = computeTraits(playerTeam)
    const rng = makeRng(randomSeed())
    const result = simulateBattle(playerTeam, enemyTeam, { rng, playerTraits: traits })
    return { result, playerTeam, enemyTeam, traits }
  })

  const { result, playerTeam, enemyTeam } = battleData

  const initHPs = (team) => Object.fromEntries(team.map(m => [m.uid, { hp: m.hp, maxHp: m.maxHp }]))

  useEffect(() => {
    setPlayerHPs(initHPs(playerTeam))
    setEnemyHPs(initHPs(enemyTeam))
    setLog(result.log)
  }, [])

  useEffect(() => {
    if (skip) {
      const finalEntry = result.log[result.log.length - 1]
      if (finalEntry?.type === 'end') {
        const finalHPs = {}
        for (const f of result.playerFinal) finalHPs[f.uid] = { hp: f.hp, maxHp: playerTeam.find(m => m.uid === f.uid)?.maxHp || 1 }
        setPlayerHPs(finalHPs)
        setWinner(finalEntry.winner)
        setDone(true)
      }
      return
    }
    if (tick >= log.length || done) return

    const delay = setTimeout(() => {
      const entry = log[tick]
      processEntry(entry)
      setTick(t => t + 1)
    }, TICK_DELAY)

    return () => clearTimeout(delay)
  }, [tick, log, skip])

  function processEntry(entry) {
    if (!entry) return
    switch (entry.type) {
      case 'intro':
        addLog(`⚔️ Combat contre ${gym.leader} !`)
        break
      case 'switch':
        if (entry.side === 'player') {
          setActivePlayer(entry.uid)
          const mon = playerTeam.find(m => m.uid === entry.uid)
          if (mon) addLog(`Go ! ${mon.name} !`)
        } else {
          setActiveEnemy(entry.uid)
          const mon = enemyTeam.find(m => m.uid === entry.uid)
          if (mon) addLog(`${gym.leader} envoie ${mon.name} !`)
        }
        break
      case 'attack': {
        const attacker = entry.side === 'player'
          ? playerTeam.find(m => m.uid === entry.attackerUid)
          : enemyTeam.find(m => m.uid === entry.attackerUid)
        const defender = entry.side === 'player'
          ? enemyTeam.find(m => m.uid === entry.defenderUid)
          : playerTeam.find(m => m.uid === entry.defenderUid)

        if (entry.side === 'player') {
          setEnemyHPs(prev => ({
            ...prev,
            [entry.defenderUid]: { ...prev[entry.defenderUid], hp: entry.defenderHp }
          }))
          setShakeEnemy(true)
          setTimeout(() => setShakeEnemy(false), 400)
        } else {
          setPlayerHPs(prev => ({
            ...prev,
            [entry.defenderUid]: { ...prev[entry.defenderUid], hp: entry.defenderHp }
          }))
          setShakePlayer(true)
          setTimeout(() => setShakePlayer(false), 400)
        }

        const effText = entry.eff >= 2 ? ' 🔥 Super efficace !' : entry.eff === 0 ? ' Sans effet.' : entry.eff <= 0.5 ? ' Pas très efficace…' : ''
        if (attacker && defender) {
          addLog(`${attacker.name} attaque ${defender.name} (${entry.damage} dégâts)${effText}`)
        }
        break
      }
      case 'faint': {
        const mon = entry.side === 'player'
          ? playerTeam.find(m => m.uid === entry.uid)
          : enemyTeam.find(m => m.uid === entry.uid)
        if (mon) addLog(`💀 ${mon.name} est K.O. !`)
        break
      }
      case 'end':
        setWinner(entry.winner)
        setDone(true)
        setLastBattleResult(entry)
        if (entry.winner === 'player') {
          earnBadge(gym.reward.badge)
          addLog(`🏆 Victoire ! Tu obtiens le badge ${gym.reward.badge} !`)
        } else {
          addLog(`😞 Défaite… Entraîne-toi encore !`)
        }
        break
    }
  }

  function addLog(line) {
    setLogLines(prev => {
      const next = [...prev, line]
      return next.slice(-8)
    })
    setTimeout(() => {
      logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
    }, 50)
  }

  const playerActive = playerTeam.find(m => m.uid === activePlayer)
  const enemyActive = enemyTeam.find(m => m.uid === activeEnemy)

  return (
    <div className="min-h-screen bg-game-bg flex flex-col">
      {/* Arena header */}
      <div className="bg-game-surface border-b border-game-border px-4 pt-10 pb-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">{gym.name}</p>
            <p className="font-game text-sm text-white">{gym.leader}</p>
          </div>
          <TypeBadge type={gym.type} size="md" />
        </div>
      </div>

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-4 gap-4">
        {/* Battle field */}
        <div className="grid grid-cols-2 gap-4">
          {/* Player side */}
          <div className={`bg-game-card rounded-xl p-3 border border-blue-800/40 ${shakePlayer ? 'animate-shake' : ''}`}>
            <p className="text-[10px] text-blue-400 font-bold mb-2">TON ÉQUIPE</p>
            {playerActive ? (
              <>
                <img
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${playerActive.id}.png`}
                  alt={playerActive.name}
                  className="w-16 h-16 mx-auto object-contain"
                />
                <p className="text-center text-xs font-bold text-white mt-1">{playerActive.name}</p>
                <p className="text-center text-[10px] text-gray-400">Niv.{playerActive.level}</p>
                {playerHPs[playerActive.uid] && (
                  <HPBar
                    hp={playerHPs[playerActive.uid].hp}
                    maxHp={playerHPs[playerActive.uid].maxHp}
                    showNumbers
                    size="md"
                  />
                )}
              </>
            ) : (
              <div className="h-20 flex items-center justify-center text-gray-600 text-2xl">💀</div>
            )}
            {/* Team status dots */}
            <div className="flex gap-1 justify-center mt-2">
              {playerTeam.map(m => (
                <div
                  key={m.uid}
                  className={`w-2 h-2 rounded-full ${(playerHPs[m.uid]?.hp ?? m.hp) > 0 ? 'bg-green-500' : 'bg-gray-600'}`}
                />
              ))}
            </div>
          </div>

          {/* Enemy side */}
          <div className={`bg-game-card rounded-xl p-3 border border-red-800/40 ${shakeEnemy ? 'animate-shake' : ''}`}>
            <p className="text-[10px] text-red-400 font-bold mb-2">ADVERSAIRE</p>
            {enemyActive ? (
              <>
                <img
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${enemyActive.id}.png`}
                  alt={enemyActive.name}
                  className="w-16 h-16 mx-auto object-contain"
                />
                <p className="text-center text-xs font-bold text-white mt-1">{enemyActive.name}</p>
                <p className="text-center text-[10px] text-gray-400">Niv.{enemyActive.level}</p>
                {enemyHPs[enemyActive.uid] && (
                  <HPBar
                    hp={enemyHPs[enemyActive.uid].hp}
                    maxHp={enemyHPs[enemyActive.uid].maxHp}
                    showNumbers
                    size="md"
                  />
                )}
              </>
            ) : (
              <div className="h-20 flex items-center justify-center text-gray-600 text-2xl">💀</div>
            )}
            <div className="flex gap-1 justify-center mt-2">
              {enemyTeam.map(m => (
                <div
                  key={m.uid}
                  className={`w-2 h-2 rounded-full ${(enemyHPs[m.uid]?.hp ?? m.hp) > 0 ? 'bg-red-500' : 'bg-gray-600'}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Battle log */}
        <div
          ref={logRef}
          className="bg-game-card rounded-xl p-3 border border-game-border flex-1 overflow-y-auto min-h-28 max-h-40"
        >
          {logLines.map((line, i) => (
            <p key={i} className="text-xs text-gray-300 leading-relaxed">{line}</p>
          ))}
          {!done && log.length > 0 && (
            <p className="text-xs text-gray-600 animate-pulse mt-1">…</p>
          )}
        </div>

        {/* Controls */}
        {!done && (
          <button
            onClick={() => setSkip(true)}
            className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm font-bold rounded-xl transition-all"
          >
            ⏩ Passer
          </button>
        )}

        {done && (
          <div className={`rounded-2xl p-5 text-center border ${winner === 'player' ? 'bg-green-900/30 border-green-700' : 'bg-red-900/30 border-red-800'}`}>
            <p className="text-2xl mb-1">{winner === 'player' ? '🏆' : '😞'}</p>
            <p className={`font-game text-sm ${winner === 'player' ? 'text-green-400' : 'text-red-400'}`}>
              {winner === 'player' ? 'Victoire !' : 'Défaite'}
            </p>
            {winner === 'player' && (
              <p className="text-xs text-gray-400 mt-1">
                Badge {gym.reward.badge} · +{gym.reward.money} ₽
              </p>
            )}
            <button
              onClick={() => navigate('rewards')}
              className={`mt-3 px-6 py-3 rounded-xl font-bold text-sm transition-all ${winner === 'player' ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
            >
              {winner === 'player' ? 'Voir les récompenses →' : 'Retourner au shop →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
