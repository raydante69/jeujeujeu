import React, { useMemo, useState } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { useRunStore } from '../store/runStore.js'
import { rollRelics, RELIC_RARITY_COLOR } from '../data/relics.js'
import { BALL_BY_ID, CONSUMABLE_BY_ID } from '../data/items.js'
import { CT_LIST } from '../data/ct.js'
import ItemSprite from '../components/ItemSprite.jsx'

// Roll 3 random run-only CTs for the shop
function rollRunCTs() {
  const shuffled = [...CT_LIST].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 3)
}

export default function RunShopScreen() {
  const { navigate, addCT } = useGameStore()
  const run = useRunStore()
  const [bought, setBought] = useState({})
  const [msg, setMsg] = useState(null)
  const ctOffers = useMemo(() => rollRunCTs(), []) // eslint-disable-line

  const relicOffers = useMemo(() => rollRelics(2, run.relics), []) // eslint-disable-line

  // Shop catalogue: held items (one-time) + restockable balls/consumables.
  const offers = useMemo(() => {
    const relicItems = relicOffers.map(r => ({
      key: 'relic-' + r.id, kind: 'relic', slug: r.slug, emoji: r.emoji,
      title: r.name, desc: r.desc, cost: r.rarity === 'epic' ? 120 : r.rarity === 'rare' ? 80 : 50,
      ring: RELIC_RARITY_COLOR[r.rarity] || '#c084fc', relic: r, once: true,
    }))
    const ballItems = [
      { key: 'buy-great', kind: 'ball', ballId: 'great-ball', n: 3, cost: 40 },
      { key: 'buy-ultra', kind: 'ball', ballId: 'ultra-ball', n: 2, cost: 70 },
      { key: 'buy-master',kind: 'ball', ballId: 'master-ball',n: 1, cost: 250, once: true },
    ].map(o => {
      const b = BALL_BY_ID[o.ballId]
      return { ...o, slug: b.slug, emoji: b.emoji, ring: b.color, title: `${b.name} ×${o.n}`, desc: b.desc }
    })
    const consumItems = [
      { key: 'buy-superpot', kind: 'item', itemId: 'super-potion', n: 1, cost: 35 },
      { key: 'buy-revive',   kind: 'item', itemId: 'revive',       n: 1, cost: 45 },
      { key: 'buy-candy',    kind: 'item', itemId: 'rare-candy',   n: 1, cost: 60 },
    ].map(o => {
      const c = CONSUMABLE_BY_ID[o.itemId]
      return { ...o, slug: c.slug, emoji: c.emoji, ring: c.color, title: `${c.name} ×${o.n}`, desc: c.desc }
    })
    const ctItems = ctOffers.map((ct, i) => ({
      key: 'ct-' + ct.id, kind: 'ct', ctId: ct.id, slug: null, emoji: ct.emoji,
      title: `CT${ct.num} — ${ct.name}`, desc: ct.desc,
      cost: [80, 100, 120][i] ?? 90,
      ring: '#a78bfa', once: true,
    }))
    return [...relicItems, ...ctItems, ...ballItems, ...consumItems]
  }, [relicOffers, ctOffers])

  function buy(o) {
    if (o.once && bought[o.key]) return
    if (!run.spendGold(o.cost)) { flash('Pas assez d\'or !'); return }
    if (o.kind === 'relic') {
      run.addRelic(o.relic.id)
      // HP-penalty relics shave HP at each wave start via hpPenaltyPct.
    } else if (o.kind === 'ball') {
      run.addBall(o.ballId, o.n)
    } else if (o.kind === 'item') {
      run.addItem(o.itemId, o.n)
    } else if (o.kind === 'ct') {
      addCT(o.ctId)
    }
    setBought(b => ({ ...b, [o.key]: (b[o.key] || 0) + 1 }))
    flash('Acheté !')
  }

  function flash(m) { setMsg(m); setTimeout(() => setMsg(null), 1200) }

  return (
    <div className="min-h-screen bg-game-bg flex flex-col">
      <div className="px-4 pt-10 pb-3 bg-game-surface border-b border-game-border">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h2 className="font-game text-sm text-white">🛒 Marché du Rift</h2>
            <p className="text-[11px] text-gray-500">Dépense ton or avant de continuer.</p>
          </div>
          <span className="bg-black/40 rounded-full px-3 py-1.5 text-sm font-bold text-yellow-300">💰 {run.gold}</span>
        </div>
      </div>

      {msg && <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-black/80 text-white text-xs font-bold px-4 py-2 rounded-full">{msg}</div>}

      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full space-y-3 pb-28">
        {offers.map(o => {
          const soldOut = o.once && bought[o.key]
          const afford = run.gold >= o.cost
          return (
            <div key={o.key} className="flex items-center gap-3 rounded-2xl p-3 border" style={{ background: `linear-gradient(110deg, ${o.ring}14, #0f172a)`, borderColor: o.ring + '55' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: o.ring + '22' }}>
                <ItemSprite slug={o.slug} emoji={o.emoji} size={30} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm">{o.title}</p>
                <p className="text-[11px] text-gray-400 leading-snug">{o.desc}</p>
                {o.kind === 'relic' && o.relic.curse && (
                  <p className="text-[10px] text-red-400 mt-0.5 font-bold">⚠️ Malédiction</p>
                )}
              </div>
              <button onClick={() => buy(o)} disabled={soldOut || !afford}
                className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-black transition-all ${soldOut ? 'bg-green-900/40 text-green-400' : afford ? 'bg-yellow-500 text-black hover:brightness-110 active:scale-95' : 'bg-gray-900 text-gray-600'}`}>
                {soldOut ? '✓' : `${o.cost} 💰`}
              </button>
            </div>
          )
        })}
      </div>

      <div className="fixed bottom-0 inset-x-0 p-3 bg-game-bg border-t border-game-border z-20">
        <button onClick={() => navigate('run')} className="w-full max-w-lg mx-auto block py-4 bg-gradient-to-r from-purple-600 to-red-600 text-white font-black rounded-xl text-base active:scale-95 transition-all">
          Continuer l'expédition →
        </button>
      </div>
    </div>
  )
}
