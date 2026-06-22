import React, { useMemo, useState } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { useRunStore } from '../store/runStore.js'
import { rollRelics, RELIC_RARITY_COLOR } from '../data/relics.js'

export default function RunShopScreen() {
  const { navigate } = useGameStore()
  const run = useRunStore()
  const [bought, setBought] = useState({})
  const [msg, setMsg] = useState(null)

  const relicOffers = useMemo(() => rollRelics(2, run.relics), []) // eslint-disable-line

  const items = useMemo(() => {
    const base = [
      { id: 'heal',   emoji: '❤️', title: 'Soin complet',   desc: 'Restaure tous les PV', cost: 30 },
      { id: 'revive', emoji: '🪽', title: 'Rappel total',    desc: 'Ranime les K.O. à 50%', cost: 45 },
      { id: 'balls',  emoji: '🔴', title: '+5 Poké Balls',   desc: 'Pour capturer', cost: 35 },
    ]
    const relicItems = relicOffers.map((r, i) => ({
      id: 'relic-' + r.id, emoji: r.emoji, title: r.name, desc: r.desc, cost: r.rarity === 'epic' ? 120 : r.rarity === 'rare' ? 80 : 50, relic: r,
    }))
    return [...relicItems, ...base]
  }, [relicOffers])

  function buy(item) {
    if (bought[item.id]) return
    if (!run.spendGold(item.cost)) { flash('Pas assez d\'or !'); return }
    setBought(b => ({ ...b, [item.id]: true }))
    if (item.relic) {
      run.addRelic(item.relic.id)
      if (item.relic.id === 'glass-cannon') run.healTeam(-15)
    } else if (item.id === 'heal') run.fullHeal()
    else if (item.id === 'revive') run.reviveAll()
    else if (item.id === 'balls') run.addBall(5)
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
        {items.map(item => {
          const ring = item.relic ? (RELIC_RARITY_COLOR[item.relic.rarity] || '#c084fc') : '#334155'
          const owned = bought[item.id]
          const afford = run.gold >= item.cost
          return (
            <div key={item.id} className="flex items-center gap-3 rounded-2xl p-3.5 border" style={{ background: `linear-gradient(110deg, ${ring}14, #0f172a)`, borderColor: ring + '55' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: ring + '22' }}>{item.emoji}</div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm">{item.title}</p>
                <p className="text-[11px] text-gray-400 leading-snug">{item.desc}</p>
              </div>
              <button onClick={() => buy(item)} disabled={owned || !afford}
                className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-black transition-all ${owned ? 'bg-green-900/40 text-green-400' : afford ? 'bg-yellow-500 text-black hover:brightness-110 active:scale-95' : 'bg-gray-900 text-gray-600'}`}>
                {owned ? '✓' : `${item.cost} 💰`}
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
