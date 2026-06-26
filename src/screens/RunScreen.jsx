import React, { useState } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { useRunStore } from '../store/runStore.js'
import { buildEnemy, waveKind } from '../engine/runEngine.js'
import { pickTrainer, buildTrainerParty, pickLeagueTrainers, trainerSpriteUrl } from '../data/trainers.js'
import { biomeForWave } from '../data/biomes.js'
import { eventForWave } from '../data/events.js'
import { aggregateAscension } from '../data/ascension.js'
import { getRelic, RELIC_RARITY_COLOR } from '../data/relics.js'
import { CONSUMABLE_BY_ID, itemNeedsTarget } from '../data/items.js'
import { TYPE_COLORS } from '../data/types.js'
import ItemSprite from '../components/ItemSprite.jsx'
import TeamSheet from '../components/TeamSheet.jsx'

const KIND_META = {
  wild:      { icon: '🌿', label: 'Sauvage',   color: '#4ade80', desc: 'Un Pokémon sauvage : combats-le ou capture-le.' },
  trainer:   { icon: '🧢', label: 'Dresseur',  color: '#60a5fa', desc: 'Un dresseur et son équipe — pas de capture possible.' },
  elite:     { icon: '⭐', label: 'Élite',     color: '#fbbf24', desc: 'Un Pokémon plus coriace, mais de meilleures récompenses.' },
  boss:      { icon: '💀', label: 'Boss',      color: '#f87171', desc: 'Le combat majeur de la zone : ouvre le Centre Commercial.' },
  encounter: { icon: '🔭', label: 'Rencontre', color: '#c084fc', desc: 'Un événement spécial : échange de Pokémon ou d\'attaque.' },
  league:    { icon: '🏆', label: 'Ligue',     color: '#f59e0b', desc: 'Une enfilade de plusieurs dresseurs d\'affilée.' },
}

const pokeSprite = (id) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`

// Representative artwork inside each path node.
function nodeArt(kind, w, biome) {
  const pool = biome.pool || [1]
  const bosses = biome.bosses || pool
  switch (kind) {
    case 'wild':  return { img: pokeSprite(pool[w % pool.length]) }
    case 'elite': return { img: pokeSprite(pool[(w + 3) % pool.length]), badge: '⭐' }
    case 'boss':  return { img: pokeSprite(bosses[w % bosses.length]), badge: '💀', gray: true }
    case 'trainer':   return { emoji: '🧢' }
    case 'encounter': return { emoji: '🔭' }
    case 'league':    return { emoji: '🏆' }
    default: return { emoji: '🌿' }
  }
}

export default function RunScreen() {
  const { navigate } = useGameStore()
  const run = useRunStore()
  const { wave, gold, balls, items, team, relics, useItem, ascensionLevel } = run
  const biome = biomeForWave(wave)
  const [msg, setMsg] = useState(null)
  const [pendingItem, setPendingItem] = useState(null)
  const [showTeam, setShowTeam] = useState(false)
  const [showLegend, setShowLegend] = useState(false)

  // Path is rendered bottom→top, current wave at the bottom.
  const path = Array.from({ length: 8 }, (_, i) => ({ w: wave + i, kind: waveKind(wave + i) }))

  function startBattle() {
    const kind = waveKind(wave)
    if (kind === 'encounter') {
      navigate('encounter')
    } else if (kind === 'trainer') {
      const asc = aggregateAscension(ascensionLevel)
      const trainer = pickTrainer(wave, Math.random)
      const party = buildTrainerParty(trainer, wave, asc)
      run.setTrainerBattle(`${trainer.icon} ${trainer.name}`, party.slice(1), trainerSpriteUrl(trainer.id))
      run.setPendingEnemy(party[0])
      navigate('battle')
    } else if (kind === 'league') {
      const asc = aggregateAscension(ascensionLevel)
      const trainers = pickLeagueTrainers(wave, Math.random)
      const leagueEntries = trainers.map(t => ({
        name: `${t.icon} ${t.name} (${t.class})`,
        party: buildTrainerParty(t, wave, asc),
        trainer: t,
        sprite: trainerSpriteUrl(t.id),
      }))
      run.setLeagueBattle(leagueEntries)
      const firstParty = leagueEntries[0].party
      run.setTrainerBattle(leagueEntries[0].name, firstParty.slice(1), leagueEntries[0].sprite)
      run.setPendingEnemy(firstParty[0])
      navigate('battle')
    } else {
      run.clearTrainerBattle()
      const enemy = buildEnemy(wave, Math.random, aggregateAscension(ascensionLevel))
      enemy.event = eventForWave(wave, team.length)
      run.setPendingEnemy(enemy)
      navigate('battle')
    }
  }

  const waveEvent = waveKind(wave) === 'wild' ? eventForWave(wave, team.length) : null

  function flash(m) { setMsg(m); setTimeout(() => setMsg(null), 1300) }

  function tapItem(id) {
    if (itemNeedsTarget(id)) { setPendingItem(pendingItem === id ? null : id); return }
    const res = useItem(id)
    if (res) flash(res)
  }
  function applyToMon(uid) {
    if (!pendingItem) return
    const res = useItem(pendingItem, uid)
    if (res) flash(res)
    if ((run.items?.[pendingItem] || 0) <= 0) setPendingItem(null)
  }

  const alive = team.filter(m => m.hp > 0).length
  const totalBalls = Object.values(balls || {}).reduce((s, n) => s + n, 0)
  const bagItems = Object.entries(items || {}).filter(([, n]) => n > 0)
  const curMeta = KIND_META[waveKind(wave)]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: biome.bg }}>
      {msg && <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-black/85 text-white text-xs font-bold px-4 py-2 rounded-full">{msg}</div>}

      {/* Header — back, region, location */}
      <div className="px-4 pt-10 pb-3 border-b border-white/5">
        <div className="max-w-lg mx-auto flex items-start justify-between">
          <div className="min-w-0">
            <button onClick={() => navigate('home')} className="text-gray-300 text-[12px] font-bold mb-1">‹ Quitter</button>
            <p className="font-game text-base text-white">{biome.emoji} {biome.name}</p>
            <p className="text-[11px]" style={{ color: biome.accent }}>
              Vague {wave} · {alive}/{team.length} en forme
              {ascensionLevel > 0 && <span className="ml-1.5 text-red-300 font-bold">🔥 Asc.{ascensionLevel}</span>}
            </p>
          </div>
          <div className="flex flex-col gap-1.5 items-end flex-shrink-0">
            <span className="bg-black/40 rounded-full px-3 py-1 text-xs font-bold text-yellow-300">💰 {gold}</span>
            <span className="bg-black/40 rounded-full px-3 py-1 text-xs font-bold text-red-300 flex items-center gap-1">
              <ItemSprite slug="poke-ball" emoji="🔴" size={16} /> {totalBalls}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full">
        {/* Legend toggle */}
        <div className="flex justify-end mb-1">
          <button onClick={() => setShowLegend(true)} className="text-[11px] font-bold text-white/80 bg-black/30 rounded-full px-3 py-1">❔ Légende</button>
        </div>

        {/* Vertical path — bottom→top, current wave at the bottom */}
        <div className="flex flex-col items-center">
          {[...path].reverse().map((node, idx, arr) => {
            const m = KIND_META[node.kind]
            const current = node.w === wave
            const art = nodeArt(node.kind, node.w, biome)
            return (
              <React.Fragment key={node.w}>
                <div className="flex flex-col items-center">
                  <div className="relative rounded-full flex items-center justify-center"
                    style={{
                      width: current ? 76 : 60, height: current ? 76 : 60,
                      background: current ? m.color + '33' : 'rgba(0,0,0,0.45)',
                      border: `3px solid ${current ? m.color : m.color + '55'}`,
                      boxShadow: current ? `0 0 22px ${m.color}aa` : 'none',
                    }}>
                    {art.img ? (
                      <img src={art.img} alt={m.label}
                        className={`object-contain pixelated ${art.gray ? 'grayscale brightness-50' : ''}`}
                        style={{ width: current ? 56 : 42, height: current ? 56 : 42 }} />
                    ) : (
                      <span style={{ fontSize: current ? 34 : 26 }}>{art.emoji}</span>
                    )}
                    {art.badge && <span className="absolute -top-1 -right-1 text-base">{art.badge}</span>}
                    {current && <span className="absolute inset-0 rounded-full border-2 animate-ping" style={{ borderColor: m.color + '66' }} />}
                  </div>
                  <p className="text-[11px] font-black mt-1" style={{ color: current ? m.color : '#cbd5e1' }}>{node.w}</p>
                </div>
                {idx < arr.length - 1 && (
                  <div className="w-1 h-5" style={{ background: 'rgba(255,255,255,0.18)' }} />
                )}
              </React.Fragment>
            )
          })}
        </div>

        {/* Equipment (held items) */}
        {relics.length > 0 && (
          <div className="mt-5">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1.5">Objets équipés ({relics.length})</p>
            <div className="flex gap-1.5 flex-wrap">
              {relics.map(id => {
                const r = getRelic(id); if (!r) return null
                const ring = RELIC_RARITY_COLOR[r.rarity] || '#666'
                return (
                  <div key={id} title={`${r.name} — ${r.desc}`} className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: ring + '22', border: `1px solid ${ring}66` }}>
                    <ItemSprite slug={r.slug} emoji={r.emoji} size={26} />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Bag — tap an item, then tap a Pokémon (target picker appears) */}
        {bagItems.length > 0 && (
          <div className="mt-5">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1.5">Sac — appuie pour utiliser</p>
            <div className="flex gap-2 flex-wrap">
              {bagItems.map(([id, n]) => {
                const c = CONSUMABLE_BY_ID[id]; if (!c) return null
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
            {pendingItem && (
              <div className="mt-2">
                <p className="text-[11px] font-bold text-cyan-200 mb-1.5">Choisis un Pokémon pour {CONSUMABLE_BY_ID[pendingItem]?.name} <button onClick={() => setPendingItem(null)} className="text-red-300 ml-1">✕</button></p>
                <div className="flex gap-2 flex-wrap">
                  {team.map(m => (
                    <button key={m.uid} onClick={() => applyToMon(m.uid)}
                      className="flex flex-col items-center rounded-lg px-1.5 py-1 active:scale-95"
                      style={{ background: '#0f172a', border: '2px solid #22d3ee99' }}>
                      <img src={pokeSprite(m.id)} alt={m.name} className={`w-9 h-9 object-contain pixelated ${m.hp <= 0 ? 'grayscale' : ''}`} />
                      <span className="text-[8px] text-gray-300 tabular-nums">{m.hp}/{m.maxHp}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom: event banner + team encart + fight */}
      <div className="fixed bottom-0 inset-x-0 p-3 z-20" style={{ background: 'linear-gradient(180deg, transparent, #0a0a14 35%)' }}>
        <div className="max-w-lg mx-auto">
          {waveEvent && (
            <div className="mb-2 rounded-xl px-3 py-2 border flex items-center gap-2.5"
              style={{ background: waveEvent.good ? '#16a34a18' : '#f59e0b18', borderColor: waveEvent.good ? '#22c55e66' : '#f59e0b66' }}>
              <span className="text-xl flex-shrink-0">{waveEvent.icon}</span>
              <div className="min-w-0">
                <p className="text-xs font-black" style={{ color: waveEvent.good ? '#4ade80' : '#fbbf24' }}>Événement — {waveEvent.name}</p>
                <p className="text-[10px] text-gray-300 leading-snug">{waveEvent.desc}</p>
              </div>
            </div>
          )}
          {/* Team encart */}
          <button onClick={() => setShowTeam(true)}
            className="w-full mb-2 rounded-xl px-3 py-2 border border-white/15 bg-black/40 flex items-center gap-2 active:scale-[0.99] transition-all">
            <div className="flex -space-x-2">
              {team.slice(0, 6).map(m => (
                <img key={m.uid} src={pokeSprite(m.id)} alt={m.name}
                  className={`w-8 h-8 object-contain pixelated rounded-full bg-black/40 border border-white/10 ${m.hp <= 0 ? 'grayscale' : ''}`} />
              ))}
            </div>
            <span className="ml-auto text-[12px] font-black text-white">👥 Mon équipe ›</span>
          </button>
          <button onClick={startBattle}
            className="w-full block py-4 rounded-xl font-black text-base text-white transition-all active:scale-95"
            style={{ background: `linear-gradient(90deg, ${curMeta.color}, #dc2626)` }}>
            {curMeta.icon} {waveKind(wave) === 'boss' ? `BOSS — Vague ${wave}` : waveKind(wave) === 'encounter' ? `Rencontre — Vague ${wave}` : `Combattre — Vague ${wave}`} →
          </button>
        </div>
      </div>

      {/* Legend modal */}
      {showLegend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => setShowLegend(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-2xl p-4 bg-[#0a0a14] border border-white/15">
            <div className="flex items-center justify-between mb-3">
              <p className="font-game text-white text-sm">Légende</p>
              <button onClick={() => setShowLegend(false)} className="text-gray-400 text-lg w-7 h-7 rounded-full bg-white/10">✕</button>
            </div>
            <div className="space-y-2.5">
              {Object.entries(KIND_META).map(([k, m]) => (
                <div key={k} className="flex items-start gap-2.5">
                  <span className="text-xl flex-shrink-0 w-7 text-center">{m.icon}</span>
                  <div>
                    <p className="text-[12px] font-black" style={{ color: m.color }}>{m.label}</p>
                    <p className="text-[10px] text-gray-400 leading-snug">{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showTeam && <TeamSheet onClose={() => setShowTeam(false)} />}
    </div>
  )
}
