import React, { useState } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { useRunStore } from '../store/runStore.js'
import { buildEnemy, waveKind, xpToNext } from '../engine/runEngine.js'
import { pickTrainer, buildTrainerParty, pickLeagueTrainers } from '../data/trainers.js'
import { biomeForWave } from '../data/biomes.js'
import { eventForWave } from '../data/events.js'
import { aggregateAscension } from '../data/ascension.js'
import { getRelic, RELIC_RARITY_COLOR } from '../data/relics.js'
import { BALLS, BALL_BY_ID, CONSUMABLE_BY_ID, itemNeedsTarget } from '../data/items.js'
import { TYPE_COLORS } from '../data/types.js'
import ItemSprite from '../components/ItemSprite.jsx'

const KIND_META = {
  wild:      { icon: '🌿', label: 'Sauvage',   color: '#4ade80' },
  trainer:   { icon: '🧢', label: 'Dresseur',  color: '#60a5fa' },
  elite:     { icon: '⭐', label: 'Élite',     color: '#fbbf24' },
  boss:      { icon: '💀', label: 'BOSS',      color: '#f87171' },
  encounter: { icon: '🔭', label: 'Rencontre', color: '#c084fc' },
  league:    { icon: '🏆', label: 'LIGUE',     color: '#f59e0b' },
}

export default function RunScreen() {
  const { navigate } = useGameStore()
  const run = useRunStore()
  const { wave, gold, balls, items, team, relics, setPendingEnemy, useItem, ascensionLevel } = run
  const biome = biomeForWave(wave)
  const [msg, setMsg] = useState(null)
  const [pendingItem, setPendingItem] = useState(null)   // item awaiting a target Pokémon

  const path = Array.from({ length: 10 }, (_, i) => {
    const w = wave + i
    return { w, kind: waveKind(w) }
  })

  function startBattle() {
    const kind = waveKind(wave)
    if (kind === 'encounter') {
      navigate('encounter')
    } else if (kind === 'trainer') {
      const asc = aggregateAscension(ascensionLevel)
      const trainer = pickTrainer(wave, Math.random)
      const party = buildTrainerParty(trainer, wave, asc)
      run.setTrainerBattle(`${trainer.icon} ${trainer.name}`, party.slice(1))
      run.setPendingEnemy(party[0])
      navigate('battle')
    } else if (kind === 'league') {
      const asc = aggregateAscension(ascensionLevel)
      const trainers = pickLeagueTrainers(wave, Math.random)
      const leagueEntries = trainers.map(t => ({
        name: `${t.icon} ${t.name} (${t.class})`,
        party: buildTrainerParty(t, wave, asc),
        trainer: t,
      }))
      run.setLeagueBattle(leagueEntries)
      const firstParty = leagueEntries[0].party
      run.setTrainerBattle(leagueEntries[0].name, firstParty.slice(1))
      run.setPendingEnemy(firstParty[0])
      navigate('battle')
    } else {
      run.clearTrainerBattle()
      const enemy = buildEnemy(wave, Math.random, aggregateAscension(ascensionLevel))
      enemy.event = eventForWave(wave, team.length)   // attach wild-wave event (or null)
      run.setPendingEnemy(enemy)
      navigate('battle')
    }
  }

  const waveEvent = waveKind(wave) === 'wild' ? eventForWave(wave, team.length) : null

  function flash(m) { setMsg(m); setTimeout(() => setMsg(null), 1300) }

  function tapItem(id) {
    if (itemNeedsTarget(id)) {
      setPendingItem(pendingItem === id ? null : id)
      return
    }
    const res = useItem(id)
    if (res) flash(res)
  }

  function applyToMon(uid) {
    if (!pendingItem) return
    const res = useItem(pendingItem, uid)
    if (res) flash(res)
    // Keep targeting active only if more of the item remain (quick multi-use).
    if ((run.items?.[pendingItem] || 0) <= 0) setPendingItem(null)
  }

  const alive = team.filter(m => m.hp > 0).length
  const totalBalls = Object.values(balls || {}).reduce((s, n) => s + n, 0)
  const bagItems = Object.entries(items || {}).filter(([, n]) => n > 0)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: biome.bg }}>
      {msg && <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-black/85 text-white text-xs font-bold px-4 py-2 rounded-full">{msg}</div>}

      {/* Header */}
      <div className="px-4 pt-10 pb-3 border-b border-white/5">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <button onClick={() => navigate('home')} className="text-gray-400 text-[11px]">‹ Quitter</button>
            <p className="font-game text-base text-white mt-0.5">{biome.emoji} {biome.name}</p>
            <p className="text-[11px]" style={{ color: biome.accent }}>
              Vague {wave} · {alive}/{team.length} en forme
              {ascensionLevel > 0 && <span className="ml-1.5 text-red-300 font-bold">🔥 Asc.{ascensionLevel}</span>}
            </p>
          </div>
          <div className="flex flex-col gap-1.5 items-end">
            <span className="bg-black/40 rounded-full px-3 py-1 text-xs font-bold text-yellow-300">💰 {gold}</span>
            <span className="bg-black/40 rounded-full px-3 py-1 text-xs font-bold text-red-300 flex items-center gap-1">
              <ItemSprite slug="poke-ball" emoji="🔴" size={16} /> {totalBalls}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full">

        {/* Balls inventory */}
        <div className="mb-4">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1.5">Tes Poké Balls</p>
          <div className="flex gap-2 flex-wrap">
            {BALLS.map(b => {
              const n = balls?.[b.id] || 0
              return (
                <div key={b.id} title={`${b.name} — ${b.desc}`}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1.5"
                  style={{ background: b.color + '1f', border: `1px solid ${b.color}55`, opacity: n > 0 ? 1 : 0.4 }}>
                  <ItemSprite slug={b.slug} emoji={b.emoji} size={22} />
                  <span className="text-xs font-bold text-white tabular-nums">{n}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Equipment (held items) */}
        {relics.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1.5">Objets équipés ({relics.length})</p>
            <div className="flex gap-1.5 flex-wrap">
              {relics.map(id => {
                const r = getRelic(id)
                if (!r) return null
                const ring = RELIC_RARITY_COLOR[r.rarity] || '#666'
                return (
                  <div key={id} title={`${r.name} — ${r.desc}`}
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: ring + '22', border: `1px solid ${ring}66` }}>
                    <ItemSprite slug={r.slug} emoji={r.emoji} size={26} />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Consumables bag (tap to use) */}
        {bagItems.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1.5">Sac — appuie pour utiliser</p>
            <div className="flex gap-2 flex-wrap">
              {bagItems.map(([id, n]) => {
                const c = CONSUMABLE_BY_ID[id]
                if (!c) return null
                const selected = pendingItem === id
                return (
                  <button key={id} onClick={() => tapItem(id)} title={`${c.name} — ${c.desc}`}
                    className="relative flex items-center gap-1.5 rounded-lg px-2 py-1.5 active:scale-95 transition-all"
                    style={{ background: c.color + (selected ? '44' : '1f'), border: `2px solid ${selected ? c.color : c.color + '55'}`, boxShadow: selected ? `0 0 12px ${c.color}88` : 'none' }}>
                    <ItemSprite slug={c.slug} emoji={c.emoji} size={22} />
                    <span className="text-xs font-bold text-white tabular-nums">×{n}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Path preview — every node fully visible */}
        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-2">La route devant toi</p>
        <div className="overflow-x-auto scrollbar-hide -mx-1 px-1 mb-2 pb-1">
          <div className="flex items-center min-w-max py-1">
            {path.map((node, i) => {
              const m = KIND_META[node.kind]
              const current = i === 0
              return (
                <React.Fragment key={node.w}>
                  {i > 0 && <div className="w-5 h-0.5 flex-shrink-0" style={{ background: current ? m.color : 'rgba(255,255,255,0.18)' }} />}
                  <div className="flex flex-col items-center flex-shrink-0" style={{ width: 50 }}>
                    <div className="relative w-11 h-11 rounded-full flex items-center justify-center text-lg"
                      style={{
                        background: current ? m.color + '33' : 'rgba(0,0,0,0.5)',
                        border: `2px solid ${current ? m.color : m.color + '66'}`,
                        transform: current ? 'scale(1.12)' : 'scale(1)',
                        boxShadow: current ? `0 0 18px ${m.color}88` : 'none',
                      }}>
                      {m.icon}
                      {current && <span className="absolute inset-0 rounded-full border-2 animate-ping" style={{ borderColor: m.color + '66' }} />}
                    </div>
                    <p className="text-[9px] font-bold mt-1" style={{ color: current ? m.color : '#cbd5e1' }}>{node.w}</p>
                  </div>
                </React.Fragment>
              )
            })}
          </div>
        </div>
        {/* Legend */}
        <div className="flex gap-3 flex-wrap mb-5">
          {Object.entries(KIND_META).map(([k, m]) => (
            <div key={k} className="flex items-center gap-1">
              <span className="text-xs">{m.icon}</span>
              <span className="text-[9px] font-bold" style={{ color: m.color }}>{m.label}</span>
            </div>
          ))}
        </div>

        {/* Team */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Ton équipe</p>
          {pendingItem && (
            <button onClick={() => setPendingItem(null)} className="text-[10px] font-bold text-red-300">Annuler ✕</button>
          )}
        </div>
        {pendingItem && (
          <div className="mb-2 rounded-lg px-3 py-2 border border-cyan-500/50 bg-cyan-500/10 flex items-center gap-2">
            <ItemSprite slug={CONSUMABLE_BY_ID[pendingItem]?.slug} emoji={CONSUMABLE_BY_ID[pendingItem]?.emoji} size={18} />
            <p className="text-[11px] font-bold text-cyan-200">Choisis un Pokémon pour {CONSUMABLE_BY_ID[pendingItem]?.name}</p>
          </div>
        )}
        <div className="space-y-2 pb-28">
          {team.map(m => {
            const color = TYPE_COLORS[m.types?.[0]] || '#1e293b'
            const dead = m.hp <= 0
            const xpNeed = xpToNext(m.level)
            return (
              <div key={m.uid} onClick={() => pendingItem && applyToMon(m.uid)}
                className={`flex items-center gap-3 rounded-xl p-2.5 border ${dead ? 'opacity-40' : ''} ${pendingItem ? 'cursor-pointer active:scale-[0.99]' : ''}`}
                style={{ background: `linear-gradient(110deg, ${color}1f, #0f172a)`, borderColor: pendingItem ? '#22d3ee99' : color + '33', boxShadow: pendingItem ? '0 0 10px #22d3ee44' : 'none' }}>
                <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${m.id}.png`} alt={m.name}
                  className={`w-12 h-12 object-contain pixelated ${dead ? 'grayscale' : ''}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-bold text-sm truncate">{m.name}</p>
                    <p className="text-[11px] font-bold" style={{ color: biome.accent }}>Niv.{m.level}</p>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/50 mt-1 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, (m.hp / m.maxHp) * 100)}%`, background: m.hp / m.maxHp > 0.5 ? '#4ade80' : m.hp / m.maxHp > 0.25 ? '#fbbf24' : '#ef4444' }} />
                  </div>
                  <div className="h-1 rounded-full bg-black/50 mt-1 overflow-hidden">
                    <div className="h-full rounded-full bg-cyan-400/70 transition-all" style={{ width: `${Math.min(100, ((m.xp || 0) / xpNeed) * 100)}%` }} />
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 tabular-nums">{m.hp}/{m.maxHp}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Action */}
      <div className="fixed bottom-0 inset-x-0 p-3 z-20" style={{ background: 'linear-gradient(180deg, transparent, #0a0a14 40%)' }}>
        {waveEvent && (
          <div className="max-w-lg mx-auto mb-2 rounded-xl px-3 py-2 border flex items-center gap-2.5"
            style={{ background: waveEvent.good ? '#16a34a18' : '#f59e0b18', borderColor: waveEvent.good ? '#22c55e66' : '#f59e0b66' }}>
            <span className="text-xl flex-shrink-0">{waveEvent.icon}</span>
            <div className="min-w-0">
              <p className="text-xs font-black" style={{ color: waveEvent.good ? '#4ade80' : '#fbbf24' }}>Événement — {waveEvent.name}</p>
              <p className="text-[10px] text-gray-300 leading-snug">{waveEvent.desc}</p>
            </div>
          </div>
        )}
        <button onClick={startBattle}
          className="w-full max-w-lg mx-auto block py-4 rounded-xl font-black text-base text-white transition-all active:scale-95"
          style={{ background: `linear-gradient(90deg, ${KIND_META[waveKind(wave)].color}, #dc2626)` }}>
          {KIND_META[waveKind(wave)].icon} {
            waveKind(wave) === 'boss' ? `BOSS — Vague ${wave}`
            : waveKind(wave) === 'encounter' ? `Rencontre — Vague ${wave}`
            : `Combattre — Vague ${wave}`
          } →
        </button>
      </div>
    </div>
  )
}
