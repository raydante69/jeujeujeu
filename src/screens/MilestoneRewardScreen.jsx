import React, { useMemo, useState, useCallback } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { useRunStore } from '../store/runStore.js'
import { BALLS, BALL_BY_ID, CONSUMABLES, CONSUMABLE_BY_ID } from '../data/items.js'
import ItemSprite from '../components/ItemSprite.jsx'

// Full reward pool with weights (higher = more common).
const POOL = [
  // Balls
  { type: 'ball', id: 'poke-ball',   n: 3, weight: 28 },
  { type: 'ball', id: 'great-ball',  n: 2, weight: 18 },
  { type: 'ball', id: 'ultra-ball',  n: 1, weight: 8  },
  { type: 'ball', id: 'master-ball', n: 1, weight: 1.2},
  // Consumables
  { type: 'item', id: 'potion',       n: 2, weight: 26 },
  { type: 'item', id: 'super-potion', n: 1, weight: 18 },
  { type: 'item', id: 'hyper-potion', n: 1, weight: 7  },
  { type: 'item', id: 'revive',       n: 1, weight: 16 },
  { type: 'item', id: 'max-revive',   n: 1, weight: 5  },
  { type: 'item', id: 'rare-candy',   n: 1, weight: 12 },
  { type: 'item', id: 'rare-candy',   n: 2, weight: 4  },
  // Money
  { type: 'money', value: 200,  label: '200 ₽',  emoji: '💰', color: '#eab308', weight: 22 },
  { type: 'money', value: 500,  label: '500 ₽',  emoji: '💰', color: '#eab308', weight: 10 },
  { type: 'money', value: 1000, label: '1 000 ₽',emoji: '💰', color: '#eab308', weight: 4  },
  // Diamonds / Cristaux (rare)
  { type: 'crystals', value: 15, label: '15 💎', emoji: '💎', color: '#67e8f9', weight: 9 },
  { type: 'crystals', value: 40, label: '40 💎', emoji: '💎', color: '#67e8f9', weight: 3 },
  // Rubis (very rare)
  { type: 'rubies', value: 1, label: '1 Rubis', emoji: '🔴', color: '#f43f5e', weight: 1.5 },
  { type: 'rubies', value: 3, label: '3 Rubis', emoji: '🔴', color: '#f43f5e', weight: 0.5 },
]

const MAX_REROLLS = 1

function resolveOption(entry) {
  if (entry.type === 'ball') {
    const b = BALL_BY_ID[entry.id]
    return { ...entry, slug: b.slug, emoji: b.emoji, color: b.color, title: `${b.name} ×${entry.n}`, desc: b.desc }
  }
  if (entry.type === 'item') {
    const c = CONSUMABLE_BY_ID[entry.id]
    return { ...entry, slug: c.slug, emoji: c.emoji, color: c.color, title: `${c.name} ×${entry.n}`, desc: c.desc }
  }
  if (entry.type === 'money') {
    return { ...entry, slug: null, title: entry.label, desc: 'À dépenser au prochain marché du Rift.' }
  }
  if (entry.type === 'crystals') {
    return { ...entry, slug: null, title: entry.label, desc: 'Cristaux : achète de la capacité ou des boosts.' }
  }
  if (entry.type === 'rubies') {
    return { ...entry, slug: null, title: entry.label, desc: 'Rubis : monnaie précieuse, très rare.' }
  }
  return entry
}

function pickThree() {
  const total = POOL.reduce((s, e) => s + e.weight, 0)
  const picked = []
  const used = new Set()
  const attempts = POOL.length * 3
  let tries = 0
  while (picked.length < 3 && tries < attempts) {
    tries++
    let roll = Math.random() * total
    for (const entry of POOL) {
      roll -= entry.weight
      if (roll <= 0 && !used.has(entry)) {
        used.add(entry)
        picked.push(resolveOption(entry))
        break
      }
    }
  }
  // Fallback: fill remaining with first unselected entries
  for (const entry of POOL) {
    if (picked.length >= 3) break
    if (!used.has(entry)) { used.add(entry); picked.push(resolveOption(entry)) }
  }
  return picked
}

export default function MilestoneRewardScreen() {
  const { navigate, addMoney, addCrystals, addRubies } = useGameStore()
  const run = useRunStore()

  const [options, setOptions] = useState(() => pickThree())
  const [rerolls, setRerolls] = useState(MAX_REROLLS)
  const [chosen, setChosen] = useState(false)

  const reroll = useCallback(() => {
    if (rerolls <= 0 || chosen) return
    setRerolls(r => r - 1)
    setOptions(pickThree())
  }, [rerolls, chosen])

  function pick(opt) {
    if (chosen) return
    setChosen(true)
    switch (opt.type) {
      case 'ball':     run.addBall(opt.id, opt.n); break
      case 'item':     run.addItem(opt.id, opt.n); break
      case 'money':    addMoney(opt.value); break
      case 'crystals': addCrystals(opt.value); break
      case 'rubies':   addRubies(opt.value); break
    }
    setTimeout(() => navigate('run'), 550)
  }

  return (
    <div className="min-h-screen bg-game-bg flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-5xl mb-3">🏅</p>
          <h2 className="font-game text-sm text-yellow-400">Récompense ×5 Victoires</h2>
          <p className="text-xs text-gray-500 mt-2">Choisis parmi ces 3 récompenses.</p>
          <div className="mt-3 inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 rounded-full px-3 py-1">
            <span className="text-[10px] text-yellow-300 font-bold">✨ Toutes les 5 victoires</span>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {options.map((opt, i) => (
            <button key={i} onClick={() => pick(opt)} disabled={chosen}
              className={`w-full flex items-center gap-3 rounded-2xl p-4 border-2 text-left transition-all ${chosen ? 'opacity-40' : 'hover:scale-[1.02] active:scale-95'}`}
              style={{ background: `linear-gradient(110deg, ${opt.color}18, #0f172a)`, borderColor: opt.color + '77' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
                style={{ background: opt.color + '22', border: `1px solid ${opt.color}44` }}>
                {opt.slug
                  ? <ItemSprite slug={opt.slug} emoji={opt.emoji} size={32} />
                  : opt.emoji
                }
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-white text-sm">{opt.title}</p>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{opt.desc}</p>
              </div>
              {(opt.type === 'rubies' || opt.type === 'crystals') && (
                <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded border flex-shrink-0"
                  style={{ color: opt.color, background: opt.color + '22', borderColor: opt.color + '55' }}>
                  {opt.type === 'rubies' ? 'Rare' : ''}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Reroll + skip */}
        {!chosen && (
          <div className="mt-5 flex items-center gap-3">
            <button onClick={reroll} disabled={rerolls <= 0}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${rerolls > 0 ? 'bg-blue-900/50 hover:bg-blue-800/70 active:scale-95 text-blue-300 border border-blue-700/50' : 'bg-gray-900 text-gray-700 border border-gray-800'}`}>
              🔄 Relancer ({rerolls} restante{rerolls !== 1 ? 's' : ''})
            </button>
            <button onClick={() => { setChosen(true); setTimeout(() => navigate('run'), 200) }}
              className="flex-1 py-2.5 text-gray-600 text-sm hover:text-gray-400 transition-all border border-gray-800 rounded-xl">
              Passer →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
