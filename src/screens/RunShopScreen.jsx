import React, { useMemo, useState } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { useRunStore } from '../store/runStore.js'
import { BALL_BY_ID, CONSUMABLE_BY_ID } from '../data/items.js'
import { CT_LIST } from '../data/ct.js'
import ItemSprite from '../components/ItemSprite.jsx'

const MAX_PURCHASES = 5

// Catalogue du Centre Commercial. `unlock` = vague (multiple de 10) à partir de
// laquelle l'article est achetable ; sinon il s'affiche grisé. `base` est le
// prix de référence, majoré exponentiellement avec la profondeur.
const CATALOG = [
  { kind: 'ball', id: 'poke-ball',    base: 30,  unlock: 1 },
  { kind: 'item', id: 'potion',       base: 25,  unlock: 1 },
  { kind: 'ball', id: 'great-ball',   base: 60,  unlock: 10 },
  { kind: 'item', id: 'super-potion', base: 55,  unlock: 10 },
  { kind: 'item', id: 'revive',       base: 70,  unlock: 20 },
  { kind: 'item', id: 'fire-stone',   base: 120, unlock: 20 },
  { kind: 'item', id: 'water-stone',  base: 120, unlock: 20 },
  { kind: 'item', id: 'thunder-stone',base: 120, unlock: 20 },
  { kind: 'item', id: 'leaf-stone',   base: 120, unlock: 30 },
  { kind: 'item', id: 'moon-stone',   base: 120, unlock: 30 },
  { kind: 'ball', id: 'ultra-ball',   base: 110, unlock: 40 },
  { kind: 'item', id: 'hyper-potion', base: 110, unlock: 40 },
  { kind: 'item', id: 'full-restore', base: 170, unlock: 50 },
  { kind: 'item', id: 'max-revive',   base: 150, unlock: 60 },
  { kind: 'ball', id: 'master-ball',  base: 900, unlock: 80 },
]

// Prix exponentiel modéré selon la profondeur de l'expédition.
function priceFor(base, wave) {
  const tier = Math.floor((wave - 1) / 10)
  return Math.round(base * Math.pow(1.10, tier))
}

// 3 CT aléatoires, vendues chères, débloquées à partir de la vague 100.
function rollShopCTs() {
  return [...CT_LIST].sort(() => Math.random() - 0.5).slice(0, 3)
}

export default function RunShopScreen() {
  const run = useRunStore()
  const { navigate } = useGameStore()
  const [bought, setBought] = useState({})
  const [purchases, setPurchases] = useState(0)
  const [msg, setMsg] = useState(null)
  const wave = run.wave

  const ctOffers = useMemo(() => (wave >= 100 ? rollShopCTs() : []), [wave])

  function flash(m) { setMsg(m); setTimeout(() => setMsg(null), 1300) }

  function buy(o) {
    if (purchases >= MAX_PURCHASES) { flash('Maximum 5 achats par visite !'); return }
    if (o.locked) { flash(`Débloqué vague ${o.unlock}`); return }
    if (o.once && bought[o.key]) return
    if (!run.spendGold(o.cost)) { flash('Pas assez d\'or !'); return }
    if (o.kind === 'ball') run.addBall(o.id, 1)
    else if (o.kind === 'item') run.addItem(o.id, 1)
    else if (o.kind === 'ct') run.addCT(o.id)
    setBought(b => ({ ...b, [o.key]: true }))
    setPurchases(p => p + 1)
    flash('Acheté !')
  }

  const offers = useMemo(() => {
    const base = CATALOG.map(c => {
      const meta = c.kind === 'ball' ? BALL_BY_ID[c.id] : CONSUMABLE_BY_ID[c.id]
      return {
        key: c.kind + '-' + c.id, kind: c.kind, id: c.id, unlock: c.unlock,
        slug: meta.slug, emoji: meta.emoji, ring: meta.color, title: meta.name, desc: meta.desc,
        cost: priceFor(c.base, wave), locked: wave < c.unlock, once: c.kind === 'ball' && c.id === 'master-ball',
      }
    })
    const cts = ctOffers.map(ct => ({
      key: 'ct-' + ct.id, kind: 'ct', id: ct.id, unlock: 100,
      slug: null, emoji: '💿', ring: '#a78bfa', title: `CT — ${ct.name}`, desc: ct.desc,
      cost: priceFor(500, wave), locked: false, once: true,
    }))
    return [...base, ...cts]
  }, [wave, ctOffers])

  return (
    <div className="min-h-screen bg-game-bg flex flex-col">
      <div className="px-4 pt-10 pb-4 bg-game-surface border-b border-game-border">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🏬</span>
            <div>
              <h2 className="font-game text-sm text-white">Centre Commercial</h2>
              <span className="bg-black/40 rounded-full px-2 py-0.5 text-[11px] font-bold text-yellow-300">💰 {run.gold}</span>
            </div>
          </div>
          <span className="text-xs font-bold text-gray-500">{purchases}/{MAX_PURCHASES}</span>
        </div>
      </div>

      {msg && <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-black/80 text-white text-xs font-bold px-4 py-2 rounded-full">{msg}</div>}

      <div className="flex-1 overflow-y-auto px-4 max-w-lg mx-auto w-full space-y-2.5 pb-28">
        <div className="py-3 text-center">
          <p className="text-sm font-black text-amber-300">Tu as droit à {MAX_PURCHASES} achats maximum</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Les prix augmentent avec l'avancement de ton expédition.</p>
        </div>
        {offers.map(o => {
          const soldOut = o.once && bought[o.key]
          const afford = run.gold >= o.cost
          const maxed = purchases >= MAX_PURCHASES
          const disabled = soldOut || o.locked || !afford || maxed
          return (
            <div key={o.key} className={`flex items-center gap-3 rounded-2xl p-3 border ${o.locked ? 'opacity-50 grayscale' : ''}`}
              style={{ background: `linear-gradient(110deg, ${o.ring}14, #0f172a)`, borderColor: o.ring + '55' }}>
              <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: o.ring + '22' }}>
                <ItemSprite slug={o.slug} emoji={o.emoji} size={38} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm">{o.title}</p>
                <p className="text-[11px] text-gray-400 leading-snug">{o.desc}</p>
                {o.locked && <p className="text-[10px] text-amber-400 mt-0.5 font-bold">🔒 Débloqué vague {o.unlock}</p>}
              </div>
              <button onClick={() => buy(o)} disabled={disabled}
                className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-black transition-all ${soldOut ? 'bg-green-900/40 text-green-400' : o.locked ? 'bg-gray-900 text-gray-600' : (afford && !maxed) ? 'bg-yellow-500 text-black hover:brightness-110 active:scale-95' : 'bg-gray-900 text-gray-600'}`}>
                {soldOut ? '✓' : o.locked ? '🔒' : `${o.cost} 💰`}
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
