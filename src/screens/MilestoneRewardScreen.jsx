import React, { useMemo, useState } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { useRunStore } from '../store/runStore.js'
import { speciesById } from '../data/pokemon.js'
import { starterCost } from '../data/cardModel.js'
import { TYPE_COLORS } from '../data/types.js'

// Centre Pokémon — soin payant. Coût par Pokémon = 10 % de l'or actuel + un
// surcoût selon la valeur en points de l'espèce. Total plafonné à 90 % de l'or.
const BASE_PCT = 0.10
const POINT_PCT = 0.015
const CAP_PCT = 0.90

function monCost(mon, goldRef) {
  const pts = starterCost(speciesById(mon.id))
  return Math.round(goldRef * (BASE_PCT + pts * POINT_PCT))
}

export default function MilestoneRewardScreen() {
  const { navigate } = useGameStore()
  const run = useRunStore()
  const team = run.team

  // Gold reference is frozen at entry so selection costs don't shift live.
  const goldRef = useMemo(() => run.gold, []) // eslint-disable-line
  const cap = Math.floor(goldRef * CAP_PCT)

  const [selected, setSelected] = useState(() => new Set())
  const [done, setDone] = useState(false)
  const [msg, setMsg] = useState(null)

  const hurt = team.filter(m => m.hp < m.maxHp)
  const rawCost = team.filter(m => selected.has(m.uid)).reduce((s, m) => s + monCost(m, goldRef), 0)
  const cost = Math.min(rawCost, cap)
  const canPay = selected.size > 0 && run.gold >= cost

  function toggle(uid) {
    if (done) return
    setSelected(s => { const n = new Set(s); n.has(uid) ? n.delete(uid) : n.add(uid); return n })
  }

  function heal() {
    if (!canPay) return
    const ok = run.healAtCenter([...selected], cost)
    if (ok) { setDone(true); setMsg('Pokémon soignés !'); setTimeout(() => navigate('run'), 800) }
    else setMsg('Pas assez d\'or.')
  }

  return (
    <div className="min-h-screen bg-game-bg flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-5">
          <div className="flex justify-center mb-2">
            <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" alt="Centre Pokémon"
              className="hidden" onError={() => {}}
              style={{ display: 'none' }} />
            <span className="text-6xl drop-shadow-lg">🏥</span>
          </div>
          <h2 className="font-game text-sm text-red-400">Centre Pokémon</h2>
          <p className="text-xs text-gray-500 mt-2">Soigne tes Pokémon contre de l'or. Choisis qui soigner.</p>
          <div className="mt-3 inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 rounded-full px-3 py-1">
            <span className="text-[11px] text-yellow-300 font-bold">💰 {run.gold} or</span>
          </div>
        </div>

        {msg && <div className="text-center mb-3 text-xs font-bold text-green-300">{msg}</div>}

        {/* Team selection */}
        <div className="space-y-2 mb-4">
          {team.map(m => {
            const tc = TYPE_COLORS[m.types?.[0]] || '#1e293b'
            const full = m.hp >= m.maxHp
            const sel = selected.has(m.uid)
            const c = monCost(m, goldRef)
            return (
              <button key={m.uid} onClick={() => !full && toggle(m.uid)} disabled={full || done}
                className={`w-full flex items-center gap-3 rounded-xl p-2.5 border-2 text-left transition-all ${full ? 'opacity-40' : 'active:scale-[0.99]'}`}
                style={{ background: `linear-gradient(110deg, ${tc}1f, #0f172a)`, borderColor: sel ? '#22d3ee' : tc + '33', boxShadow: sel ? '0 0 10px #22d3ee55' : 'none' }}>
                <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${m.id}.png`} alt={m.name}
                  className={`w-11 h-11 object-contain pixelated ${m.hp <= 0 ? 'grayscale' : ''}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-bold text-sm truncate">{m.name}</p>
                    <p className="text-[11px] text-gray-400 tabular-nums">{m.hp}/{m.maxHp} PV</p>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/50 mt-1 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(0, (m.hp / m.maxHp) * 100)}%`, background: m.hp / m.maxHp > 0.5 ? '#4ade80' : m.hp / m.maxHp > 0.25 ? '#fbbf24' : '#ef4444' }} />
                  </div>
                </div>
                <span className="text-[11px] font-black flex-shrink-0" style={{ color: full ? '#4ade80' : sel ? '#22d3ee' : '#facc15' }}>
                  {full ? '✓' : `${c} 💰`}
                </span>
              </button>
            )
          })}
        </div>

        {hurt.length > 0 && (
          <p className="text-center text-[10px] text-gray-600 mb-2">Total plafonné à 90 % de ton or ({cap} 💰 max).</p>
        )}

        {/* Actions */}
        {!done && (
          <div className="flex items-center gap-3">
            <button onClick={heal} disabled={!canPay}
              className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${canPay ? 'bg-red-500 text-white hover:brightness-110 active:scale-95' : 'bg-gray-900 text-gray-600 border border-gray-800'}`}>
              {selected.size > 0 ? `Soigner (${cost} 💰)` : 'Choisis un Pokémon'}
            </button>
            <button onClick={() => navigate('run')}
              className="flex-1 py-3 text-gray-500 text-sm hover:text-gray-300 transition-all border border-gray-800 rounded-xl">
              Passer →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
