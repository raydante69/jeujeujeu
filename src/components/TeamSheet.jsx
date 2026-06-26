import React, { useState } from 'react'
import { useRunStore } from '../store/runStore.js'
import { buildMoveset } from '../engine/combatEngine.js'
import { xpToNext } from '../engine/runEngine.js'
import { CT_BY_ID, canLearnCT } from '../data/ct.js'
import { TYPE_COLORS } from '../data/types.js'
import TypeBadge from './TypeBadge.jsx'
import StatBars from './StatBars.jsx'

const sprite = (id, shiny) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${shiny ? 'shiny/' : ''}${id}.png`
const art = (id) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`

// Full-screen team encart: 2-column HP-bar roster, tap a Pokémon for its detail,
// plus a "Mes CT" tab to teach collected CTs to compatible Pokémon.
export default function TeamSheet({ onClose }) {
  const run = useRunStore()
  const team = run.team
  const [tab, setTab] = useState('team')   // 'team' | 'ct'
  const [detailUid, setDetailUid] = useState(null)
  const [pickedCT, setPickedCT] = useState(null)   // ct id selected for teaching
  const [flash, setFlash] = useState(null)

  function say(m) { setFlash(m); setTimeout(() => setFlash(null), 1400) }

  const detail = detailUid ? team.find(m => m.uid === detailUid) : null

  // CT bag grouped by id → count
  const ctCounts = (run.cts || []).reduce((acc, id) => { acc[id] = (acc[id] || 0) + 1; return acc }, {})
  const ctEntries = Object.entries(ctCounts).map(([id, n]) => ({ ct: CT_BY_ID[id], n })).filter(e => e.ct)

  function teach(monUid) {
    if (!pickedCT) return
    const res = run.learnCT(monUid, pickedCT)
    if (res) say(res)
    if ((run.cts || []).filter(x => x === pickedCT).length <= 0) setPickedCT(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(8,8,16,0.96)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-10 pb-3 border-b border-white/10">
        <p className="font-game text-white text-sm">👥 Mon Équipe</p>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full bg-white/10">✕</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 py-2">
        {[['team', '👥 Équipe'], ['ct', `💿 Mes CT (${run.cts?.length || 0})`]].map(([k, label]) => (
          <button key={k} onClick={() => { setTab(k); setPickedCT(null) }}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${tab === k ? 'bg-red-500 text-white' : 'bg-white/5 text-gray-400'}`}>
            {label}
          </button>
        ))}
      </div>

      {flash && <div className="mx-4 mb-2 text-center text-[11px] font-bold text-cyan-200">{flash}</div>}

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {/* ── TEAM TAB ── */}
        {tab === 'team' && (
          <div className="grid grid-cols-2 gap-2.5">
            {team.map(m => {
              const tc = TYPE_COLORS[m.types?.[0]] || '#1e293b'
              const ratio = m.maxHp ? m.hp / m.maxHp : 0
              return (
                <button key={m.uid} onClick={() => setDetailUid(m.uid)}
                  className="rounded-xl p-2.5 border text-left active:scale-[0.98] transition-all"
                  style={{ background: `linear-gradient(135deg, ${tc}26, #0f172a)`, borderColor: tc + '55' }}>
                  <div className="flex items-center gap-2">
                    <img src={sprite(m.id, m.shiny)} alt={m.name} className={`w-12 h-12 object-contain pixelated ${m.hp <= 0 ? 'grayscale' : ''}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-bold text-[12px] truncate">{m.name}</p>
                      <p className="text-[9px] text-gray-400">Niv.{m.level}</p>
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-[8px] font-black text-green-300">PV</span>
                    <span className="text-[8px] text-gray-400 tabular-nums">{m.hp}/{m.maxHp}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/50 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(0, ratio * 100)}%`, background: ratio > 0.5 ? '#4ade80' : ratio > 0.25 ? '#fbbf24' : '#ef4444' }} />
                  </div>
                  {(m.learnedCTs?.length > 0) && (
                    <p className="mt-1 text-[8px] text-purple-300">💿 {m.learnedCTs.length} CT</p>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* ── CT TAB ── */}
        {tab === 'ct' && (
          <div>
            {ctEntries.length === 0 ? (
              <p className="text-center text-xs text-gray-500 mt-8">Aucune CT pour l'instant. Les CT se gagnent en combat (butin).</p>
            ) : (
              <>
                <p className="text-[10px] text-gray-400 mb-2">Choisis une CT, puis un Pokémon compatible pour l'apprendre. <span className="text-amber-400">CT Normal = tous ; sinon même type.</span></p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {ctEntries.map(({ ct, n }) => {
                    const tc = TYPE_COLORS[ct.type] || '#64748b'
                    const sel = pickedCT === ct.id
                    return (
                      <button key={ct.id} onClick={() => setPickedCT(sel ? null : ct.id)}
                        className="rounded-lg px-2.5 py-1.5 border flex items-center gap-1.5 transition-all"
                        style={{ background: tc + (sel ? '44' : '18'), borderColor: sel ? tc : tc + '55', boxShadow: sel ? `0 0 10px ${tc}88` : 'none' }}>
                        <span className="text-sm">💿</span>
                        <span className="text-[11px] font-bold text-white">{ct.name}</span>
                        <TypeBadge type={ct.type} size="img" />
                        <span className="text-[9px] text-gray-400">×{n}</span>
                      </button>
                    )
                  })}
                </div>

                {pickedCT && (
                  <>
                    <p className="text-[10px] text-cyan-300 font-bold mb-1.5">Apprendre {CT_BY_ID[pickedCT]?.name} à :</p>
                    <div className="grid grid-cols-2 gap-2">
                      {team.map(m => {
                        const ok = canLearnCT(m, CT_BY_ID[pickedCT])
                        const tc = TYPE_COLORS[m.types?.[0]] || '#1e293b'
                        return (
                          <button key={m.uid} onClick={() => ok && teach(m.uid)} disabled={!ok}
                            className={`rounded-lg p-2 border flex items-center gap-2 text-left transition-all ${ok ? 'active:scale-[0.98]' : 'opacity-35 grayscale'}`}
                            style={{ background: `linear-gradient(135deg, ${tc}22, #0f172a)`, borderColor: ok ? '#22d3ee99' : tc + '33' }}>
                            <img src={sprite(m.id, m.shiny)} alt={m.name} className="w-9 h-9 object-contain pixelated" />
                            <div className="min-w-0">
                              <p className="text-white font-bold text-[11px] truncate">{m.name}</p>
                              <p className="text-[8px]" style={{ color: ok ? '#67e8f9' : '#ef4444' }}>{ok ? 'Compatible' : 'Incompatible'}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={() => setDetailUid(null)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-2xl overflow-y-auto p-4"
            style={{ background: '#0a0a14', border: `1px solid ${(TYPE_COLORS[detail.types?.[0]] || '#334155')}66`, maxHeight: '84vh' }}>
            <div className="flex items-start gap-3 mb-3">
              <img src={art(detail.id)} alt={detail.name} className="w-20 h-20 object-contain"
                onError={e => { e.target.src = sprite(detail.id, detail.shiny) }} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-base">{detail.name}</p>
                <p className="text-[11px] text-gray-400 font-bold mb-1">Niv.{detail.level}</p>
                <div className="flex gap-1 flex-wrap">{(detail.types || ['normal']).map(t => <TypeBadge key={t} type={t} size="xs" />)}</div>
              </div>
            </div>
            <div className="mb-1 flex justify-between text-[10px] text-gray-400"><span>PV</span><span>{detail.hp}/{detail.maxHp}</span></div>
            <div className="h-2 rounded-full bg-black/50 overflow-hidden mb-3">
              <div className="h-full rounded-full bg-green-500" style={{ width: `${Math.max(0, (detail.hp / detail.maxHp) * 100)}%` }} />
            </div>
            {detail.stats && <div className="mb-3"><StatBars stats={detail.stats} accent={TYPE_COLORS[detail.types?.[0]]} /></div>}
            <p className="text-[10px] text-gray-500 font-bold uppercase mb-1.5">Attaques</p>
            <div className="space-y-1.5">
              {buildMoveset(detail).map(card => {
                const tc = TYPE_COLORS[card.type] || '#64748b'
                return (
                  <div key={card.key} className="flex items-center gap-2 rounded-lg px-2.5 py-2" style={{ background: tc + '18', border: `1px solid ${tc}44` }}>
                    {card.fromCT && <span className="text-xs" title={`CT${card.ctNum || ''}`}>💿</span>}
                    <p className="text-[11px] font-bold text-white flex-1 truncate">{card.name}</p>
                    <TypeBadge type={card.type} size="img" />
                  </div>
                )
              })}
            </div>
            <button onClick={() => setDetailUid(null)} className="mt-4 w-full py-2 rounded-xl font-black text-sm text-white bg-white/10 hover:bg-white/20">Fermer</button>
          </div>
        </div>
      )}
    </div>
  )
}
