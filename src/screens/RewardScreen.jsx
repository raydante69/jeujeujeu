import React, { useMemo, useState } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { useRunStore } from '../store/runStore.js'
import { rollRelics, RELIC_RARITY_COLOR } from '../data/relics.js'
import { BALL_BY_ID, CONSUMABLE_BY_ID } from '../data/items.js'
import ItemSprite from '../components/ItemSprite.jsx'

export default function RewardScreen() {
  const { navigate } = useGameStore()
  const run = useRunStore()
  const [chosen, setChosen] = useState(false)

  // 4 options: always 1 held item + 3 utility picks (granted into the bag).
  const options = useMemo(() => {
    const relic = rollRelics(1, run.relics)[0]
    const utils = shuffle([
      { type: 'item', itemId: 'super-potion', n: 2 },
      { type: 'item', itemId: 'hyper-potion', n: 1 },
      { type: 'item', itemId: 'full-restore', n: 1 },
      { type: 'item', itemId: 'rare-candy', n: 1 },
      { type: 'item', itemId: 'revive', n: 2 },
      { type: 'item', itemId: 'max-revive', n: 1 },
      { type: 'item', itemId: 'nugget', n: 1 },
      { type: 'item', itemId: 'hp-up', n: 1 },
      { type: 'item', itemId: 'protein', n: 1 },
      { type: 'item', itemId: 'iron', n: 1 },
      { type: 'item', itemId: 'calcium', n: 1 },
      { type: 'item', itemId: 'zinc', n: 1 },
      { type: 'item', itemId: 'carbos', n: 1 },
      { type: 'ball', ballId: 'great-ball', n: 3 },
      { type: 'ball', ballId: 'ultra-ball', n: 2 },
      { type: 'gold', amount: 120 },
    ]).slice(0, 3).map(u => {
      if (u.type === 'item') {
        const c = CONSUMABLE_BY_ID[u.itemId]
        return { ...u, slug: c.slug, emoji: c.emoji, ring: c.color, title: `${c.name} ×${u.n}`, desc: c.desc }
      }
      if (u.type === 'ball') {
        const b = BALL_BY_ID[u.ballId]
        return { ...u, slug: b.slug, emoji: b.emoji, ring: b.color, title: `${b.name} ×${u.n}`, desc: b.desc }
      }
      return { ...u, emoji: '💰', ring: '#fbbf24', title: `+${u.amount} Or`, desc: 'À dépenser au prochain marché.' }
    })

    const opts = []
    if (relic) opts.push({ type: 'relic', relic, slug: relic.slug, emoji: relic.emoji, title: relic.name, desc: relic.desc, rarity: relic.rarity, ring: RELIC_RARITY_COLOR[relic.rarity] || '#c084fc' })
    return [...opts, ...utils]
  }, []) // eslint-disable-line

  function pick(opt) {
    if (chosen) return
    setChosen(true)
    switch (opt.type) {
      case 'relic':
        run.addRelic(opt.relic.id)
        // HP-penalty relics (glass-cannon, cursed) now shave HP at each wave
        // start via aggregateRelics.hpPenaltyPct — no one-time hit here.
        break
      case 'item': run.addItem(opt.itemId, opt.n || 1); break
      case 'ball': run.addBall(opt.ballId, opt.n); break
      case 'gold': run.addGold(opt.amount); break
    }
    setTimeout(() => navigate('run'), 500)
  }

  return (
    <div className="min-h-screen bg-game-bg flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <p className="text-4xl mb-2">🎁</p>
          <h2 className="font-game text-sm text-white">Choisis ta récompense</h2>
          <p className="text-xs text-gray-500 mt-1">Une seule — choisis bien.</p>
        </div>

        <div className="space-y-3">
          {options.map((opt, i) => (
            <button key={i} onClick={() => pick(opt)} disabled={chosen}
              className={`w-full flex items-center gap-3 rounded-2xl p-4 border-2 text-left transition-all ${chosen ? 'opacity-40' : 'hover:scale-[1.02] active:scale-95'}`}
              style={{ background: `linear-gradient(110deg, ${opt.ring}1a, #0f172a)`, borderColor: opt.ring + '88' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: opt.ring + '22' }}>
                <ItemSprite slug={opt.slug} emoji={opt.emoji} size={32} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-white text-sm">{opt.title}</p>
                  {opt.type === 'relic' && <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded" style={{ background: opt.ring + '33', color: opt.ring }}>Objet {opt.rarity}</span>}
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{opt.desc}</p>
                {opt.type === 'relic' && opt.relic.curse && (
                  <p className="text-[10px] text-red-400 mt-1 font-bold leading-snug">⚠️ Malédiction — lis bien le malus</p>
                )}
              </div>
            </button>
          ))}
        </div>

        {!chosen && (
          <button onClick={() => { setChosen(true); setTimeout(() => navigate('run'), 200) }}
            className="w-full mt-4 py-2.5 text-gray-600 text-xs hover:text-gray-400 transition-all">
            Passer →
          </button>
        )}
      </div>
    </div>
  )
}

function shuffle(a) {
  const x = [...a]
  for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[x[i], x[j]] = [x[j], x[i]] }
  return x
}
