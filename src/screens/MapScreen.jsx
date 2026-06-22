import React, { useMemo, useState } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { getGym } from '../data/gyms.js'
import TypeBadge from '../components/TypeBadge.jsx'

const NODE_CFG = {
  wild:    { icon: '🌿', label: 'Sauvage', color: '#4ade80', bg: '#052e16' },
  trainer: { icon: '👤', label: 'Dresseur', color: '#60a5fa', bg: '#0c1a2e' },
  rest:    { icon: '💊', label: 'Repos',   color: '#fbbf24', bg: '#1c1003' },
  treasure:{ icon: '💎', label: 'Trésor',  color: '#c084fc', bg: '#1a0533' },
  gym:     { icon: '🏆', label: 'Arène',   color: '#f87171', bg: '#1a0505' },
}

function generateRoute(gymIndex) {
  const patterns = [
    ['wild', 'trainer', 'rest', 'wild', 'gym'],
    ['wild', 'wild', 'trainer', 'treasure', 'trainer', 'gym'],
    ['wild', 'trainer', 'wild', 'rest', 'trainer', 'wild', 'gym'],
    ['wild', 'trainer', 'treasure', 'wild', 'rest', 'trainer', 'trainer', 'gym'],
  ]
  return patterns[Math.min(gymIndex - 1, patterns.length - 1)].map((type, i) => ({ type, id: i }))
}

export default function MapScreen() {
  const {
    currentGymId, routeNodeIndex, team,
    setCombatContext, navigate, setRouteNodeIndex,
    addMoney, addCrystals,
  } = useGameStore()
  const [flash, setFlash] = useState(null)

  const gym = getGym(currentGymId) || {
    name: `Arène ${currentGymId}`, type: 'normal', leader: 'Champion',
    reward: { badge: `Badge ${currentGymId}`, money: 200, card: 'ultra' },
  }
  const route = useMemo(() => generateRoute(currentGymId), [currentGymId])

  function handleNode(node) {
    if (node.id !== routeNodeIndex) return

    if (node.type === 'rest') {
      addMoney(50)
      showFlash('+50₽  Ton équipe se repose !', '#fbbf24')
      setTimeout(() => setRouteNodeIndex(routeNodeIndex + 1), 1400)
      return
    }
    if (node.type === 'treasure') {
      addCrystals(25)
      showFlash('+25💎  Trésor trouvé !', '#c084fc')
      setTimeout(() => setRouteNodeIndex(routeNodeIndex + 1), 1400)
      return
    }
    if (!team || team.length === 0) {
      showFlash('Construis ton équipe d\'abord !', '#f87171')
      return
    }
    setCombatContext({ nodeType: node.type, nodeIndex: node.id })
    navigate('combat')
  }

  function showFlash(msg, color) {
    setFlash({ msg, color })
    setTimeout(() => setFlash(null), 1300)
  }

  const routeDone = routeNodeIndex >= route.length

  return (
    <div className="min-h-screen bg-game-bg flex flex-col">
      {/* Header */}
      <div className="bg-game-surface border-b border-game-border px-4 pt-10 pb-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h2 className="font-game text-sm text-white">{gym.name}</h2>
            <p className="text-xs text-gray-500">Leader : {gym.leader}</p>
          </div>
          <TypeBadge type={gym.type} size="md" />
        </div>
      </div>

      {/* Flash */}
      {flash && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl font-bold text-sm shadow-xl pointer-events-none transition-all"
          style={{ background: flash.color + '22', border: `1px solid ${flash.color}88`, color: flash.color }}
        >
          {flash.msg}
        </div>
      )}

      {/* Route path */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full px-4 py-8">
        {routeDone ? (
          <div className="text-center py-10">
            <p className="text-4xl mb-3">🏅</p>
            <p className="font-game text-sm text-white">Arène terminée !</p>
            <p className="text-xs text-gray-500 mt-1">La prochaine arène s'ouvre…</p>
          </div>
        ) : (
          <>
            {/* Nodes row */}
            <div className="w-full overflow-x-auto scrollbar-hide pb-3">
              <div className="flex items-center min-w-max mx-auto px-2">
                {route.map((node, i) => {
                  const cfg = NODE_CFG[node.type]
                  const done = i < routeNodeIndex
                  const current = i === routeNodeIndex
                  const future = i > routeNodeIndex
                  return (
                    <React.Fragment key={node.id}>
                      {i > 0 && (
                        <div
                          className="w-8 h-0.5 flex-shrink-0 transition-all duration-500"
                          style={{ background: done || current ? cfg.color + '88' : '#1e293b' }}
                        />
                      )}
                      <button
                        onClick={() => handleNode(node)}
                        disabled={!current}
                        className="relative flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all duration-200"
                        style={{
                          background: done ? '#0f172a' : cfg.bg,
                          border: `2.5px solid ${current ? cfg.color : done ? '#1e293b' : cfg.color + '30'}`,
                          boxShadow: current ? `0 0 24px ${cfg.color}66, 0 0 48px ${cfg.color}33` : '',
                          opacity: future ? 0.3 : 1,
                          transform: current ? 'scale(1.1)' : 'scale(1)',
                        }}
                      >
                        {done ? '✓' : cfg.icon}
                        {current && (
                          <span
                            className="absolute inset-0 rounded-full border-2 animate-ping"
                            style={{ borderColor: cfg.color + '66' }}
                          />
                        )}
                      </button>
                    </React.Fragment>
                  )
                })}
              </div>
            </div>

            {/* Labels row */}
            <div className="w-full overflow-x-auto scrollbar-hide">
              <div className="flex items-start min-w-max mx-auto px-2">
                {route.map((node, i) => {
                  const cfg = NODE_CFG[node.type]
                  const done = i < routeNodeIndex
                  const current = i === routeNodeIndex
                  return (
                    <React.Fragment key={node.id}>
                      {i > 0 && <div className="w-8 flex-shrink-0" />}
                      <div className="w-16 text-center flex-shrink-0 pt-1">
                        <p
                          className="text-[9px] font-bold leading-tight"
                          style={{ color: current ? cfg.color : done ? '#374151' : '#1e293b' }}
                        >
                          {cfg.label}
                        </p>
                      </div>
                    </React.Fragment>
                  )
                })}
              </div>
            </div>

            {/* Progress */}
            <p className="text-gray-700 text-xs mt-6">
              {routeNodeIndex} / {route.length} étapes
            </p>

            {/* Current node hint */}
            {(() => {
              const node = route[routeNodeIndex]
              if (!node) return null
              const cfg = NODE_CFG[node.type]
              return (
                <div
                  className="mt-4 rounded-xl px-4 py-2.5 text-center"
                  style={{ background: cfg.bg, border: `1px solid ${cfg.color}44` }}
                >
                  <p className="text-xs font-bold" style={{ color: cfg.color }}>
                    {cfg.icon} Prochain nœud : {cfg.label}
                  </p>
                  <p className="text-[10px] text-gray-600 mt-0.5">
                    {node.type === 'rest' && 'Appuie pour récupérer +50₽'}
                    {node.type === 'treasure' && 'Appuie pour obtenir +25💎'}
                    {node.type === 'wild' && 'Combat contre un Pokémon sauvage'}
                    {node.type === 'trainer' && 'Défi d\'un dresseur'}
                    {node.type === 'gym' && `Affronte ${gym.leader} !`}
                  </p>
                </div>
              )
            })()}
          </>
        )}
      </div>

      {/* Gym info card */}
      <div className="px-4 pb-24 max-w-lg mx-auto w-full">
        <div className="bg-game-surface rounded-2xl p-4 border border-game-border">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mb-0.5">Arène {currentGymId}</p>
              <p className="font-bold text-white text-sm">{gym.leader}</p>
              <p className="text-xs text-gray-500">{gym.name}</p>
            </div>
            <div className="text-right flex flex-col items-end gap-1.5">
              <TypeBadge type={gym.type} size="md" />
              <p className="text-[10px] text-yellow-400 font-bold">{gym.reward?.badge}</p>
            </div>
          </div>
          <div className="flex gap-3 text-xs text-gray-600 mt-2">
            <span>💰 {gym.reward?.money}₽</span>
            <span>💎 +{20 + currentGymId * 10}</span>
            <span>🃏 Carte {gym.reward?.card}</span>
          </div>
          {team.length === 0 && (
            <button
              onClick={() => navigate('team')}
              className="mt-3 w-full py-2.5 bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-bold rounded-xl transition-all"
            >
              ⚔️ Construire mon équipe d'abord
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
