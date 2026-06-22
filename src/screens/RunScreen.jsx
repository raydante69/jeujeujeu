import React from 'react'
import { useGameStore } from '../store/gameStore.js'
import { useRunStore } from '../store/runStore.js'
import { buildEnemy, waveKind, xpToNext } from '../engine/runEngine.js'
import { biomeForWave } from '../data/biomes.js'
import { getRelic, RELIC_RARITY_COLOR } from '../data/relics.js'
import { TYPE_COLORS } from '../data/types.js'

const KIND_META = {
  wild:    { icon: '🌿', label: 'Sauvage', color: '#4ade80' },
  trainer: { icon: '👤', label: 'Dresseur', color: '#60a5fa' },
  elite:   { icon: '⭐', label: 'Élite',    color: '#fbbf24' },
  boss:    { icon: '💀', label: 'BOSS',     color: '#f87171' },
}

export default function RunScreen() {
  const { navigate } = useGameStore()
  const { wave, gold, balls, team, relics, setPendingEnemy } = useRunStore()
  const biome = biomeForWave(wave)

  const path = Array.from({ length: 8 }, (_, i) => {
    const w = wave + i
    return { w, kind: waveKind(w) }
  })

  function startBattle() {
    const enemy = buildEnemy(wave)
    setPendingEnemy(enemy)
    navigate('battle')
  }

  const alive = team.filter(m => m.hp > 0).length

  return (
    <div className="min-h-screen flex flex-col" style={{ background: biome.bg }}>
      {/* Header */}
      <div className="px-4 pt-10 pb-3 border-b border-white/5">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <button onClick={() => navigate('home')} className="text-gray-500 text-[11px]">‹ Quitter</button>
            <p className="font-game text-base text-white mt-0.5">{biome.emoji} {biome.name}</p>
            <p className="text-[11px]" style={{ color: biome.accent }}>Vague {wave} · {alive}/{team.length} en forme</p>
          </div>
          <div className="flex flex-col gap-1.5 items-end">
            <span className="bg-black/40 rounded-full px-3 py-1 text-xs font-bold text-yellow-300">💰 {gold}</span>
            <span className="bg-black/40 rounded-full px-3 py-1 text-xs font-bold text-red-300">🔴 {balls} balls</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full">
        {/* Relics */}
        {relics.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">Reliques ({relics.length})</p>
            <div className="flex gap-1.5 flex-wrap">
              {relics.map(id => {
                const r = getRelic(id)
                if (!r) return null
                return (
                  <div key={id} title={`${r.name} — ${r.desc}`}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
                    style={{ background: (RELIC_RARITY_COLOR[r.rarity] || '#666') + '22', border: `1px solid ${(RELIC_RARITY_COLOR[r.rarity] || '#666')}66` }}>
                    {r.emoji}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Path preview */}
        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">La route devant toi</p>
        <div className="overflow-x-auto scrollbar-hide -mx-1 px-1 mb-5">
          <div className="flex items-center min-w-max">
            {path.map((node, i) => {
              const m = KIND_META[node.kind]
              const current = i === 0
              return (
                <React.Fragment key={node.w}>
                  {i > 0 && <div className="w-6 h-0.5 flex-shrink-0" style={{ background: current ? m.color : '#ffffff14' }} />}
                  <div className="flex flex-col items-center flex-shrink-0" style={{ width: 56 }}>
                    <div className="relative w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all"
                      style={{
                        background: current ? m.color + '22' : '#00000040',
                        border: `2px solid ${current ? m.color : '#ffffff22'}`,
                        transform: current ? 'scale(1.12)' : 'scale(1)',
                        boxShadow: current ? `0 0 20px ${m.color}66` : '',
                        opacity: i > 4 ? 0.4 : 1,
                      }}>
                      {m.icon}
                      {current && <span className="absolute inset-0 rounded-full border-2 animate-ping" style={{ borderColor: m.color + '55' }} />}
                    </div>
                    <p className="text-[8px] font-bold mt-1" style={{ color: current ? m.color : '#475569' }}>{node.w}</p>
                  </div>
                </React.Fragment>
              )
            })}
          </div>
        </div>

        {/* Team */}
        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">Ton équipe</p>
        <div className="space-y-2 pb-28">
          {team.map(m => {
            const color = TYPE_COLORS[m.types?.[0]] || '#1e293b'
            const dead = m.hp <= 0
            const xpNeed = xpToNext(m.level)
            return (
              <div key={m.uid} className={`flex items-center gap-3 rounded-xl p-2.5 border ${dead ? 'opacity-40' : ''}`}
                style={{ background: `linear-gradient(110deg, ${color}1f, #0f172a)`, borderColor: color + '33' }}>
                <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${m.id}.png`} alt={m.name}
                  className={`w-12 h-12 object-contain pixelated ${dead ? 'grayscale' : ''}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-bold text-sm truncate">{m.name}</p>
                    <p className="text-[11px] font-bold" style={{ color: biome.accent }}>Niv.{m.level}</p>
                  </div>
                  {/* HP */}
                  <div className="h-1.5 rounded-full bg-black/50 mt-1 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, (m.hp / m.maxHp) * 100)}%`, background: m.hp / m.maxHp > 0.5 ? '#4ade80' : m.hp / m.maxHp > 0.25 ? '#fbbf24' : '#ef4444' }} />
                  </div>
                  {/* XP */}
                  <div className="h-1 rounded-full bg-black/50 mt-1 overflow-hidden">
                    <div className="h-full rounded-full bg-cyan-400/70 transition-all" style={{ width: `${Math.min(100, ((m.xp || 0) / xpNeed) * 100)}%` }} />
                  </div>
                </div>
                <span className="text-[10px] text-gray-500 tabular-nums">{m.hp}/{m.maxHp}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Action */}
      <div className="fixed bottom-0 inset-x-0 p-3 z-20" style={{ background: 'linear-gradient(180deg, transparent, #0a0a14 40%)' }}>
        <button onClick={startBattle}
          className="w-full max-w-lg mx-auto block py-4 rounded-xl font-black text-base text-white transition-all active:scale-95"
          style={{ background: `linear-gradient(90deg, ${KIND_META[waveKind(wave)].color}, #dc2626)` }}>
          {KIND_META[waveKind(wave)].icon} {waveKind(wave) === 'boss' ? `BOSS — Vague ${wave}` : `Combattre — Vague ${wave}`} →
        </button>
      </div>
    </div>
  )
}
