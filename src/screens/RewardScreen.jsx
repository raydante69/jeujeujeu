import React, { useMemo, useState } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { useRunStore } from '../store/runStore.js'
import { rollRelics, RELIC_RARITY_COLOR } from '../data/relics.js'
import { gainXp, xpToNext } from '../engine/runEngine.js'

export default function RewardScreen() {
  const { navigate } = useGameStore()
  const run = useRunStore()
  const [chosen, setChosen] = useState(false)

  // Build 3 distinct reward options: always 1 relic + 2 utility picks.
  const options = useMemo(() => {
    const relic = rollRelics(1, run.relics)[0]
    const utils = shuffle([
      { type: 'heal',  emoji: '❤️', title: 'Soin complet', desc: 'Restaure tous les PV de l\'équipe.' },
      { type: 'gold',  emoji: '💰', title: '+50 Or',        desc: 'De quoi acheter au prochain marché.', amount: 50 },
      { type: 'balls', emoji: '🔴', title: '+3 Balls',      desc: 'Capture plus de Pokémon sauvages.', amount: 3 },
      { type: 'candy', emoji: '🍬', title: 'Super Bonbon',  desc: 'Fait gagner ~2 niveaux au plus faible.' },
      { type: 'revive',emoji: '🪽', title: 'Rappel',         desc: 'Ranime les K.O. à 50% PV.' },
    ]).slice(0, 2)

    const opts = []
    if (relic) opts.push({ type: 'relic', relic, emoji: relic.emoji, title: relic.name, desc: relic.desc, rarity: relic.rarity })
    return [...opts, ...utils]
  }, []) // eslint-disable-line

  function pick(opt) {
    if (chosen) return
    setChosen(true)
    switch (opt.type) {
      case 'relic':
        run.addRelic(opt.relic.id)
        if (opt.relic.id === 'glass-cannon') run.healTeam(-15) // glass cost
        break
      case 'heal':   run.fullHeal(); break
      case 'gold':   run.addGold(opt.amount); break
      case 'balls':  run.addBall(opt.amount); break
      case 'revive': run.reviveAll(); break
      case 'candy': {
        const team = run.team
        const target = team.filter(m => m.hp > 0).sort((a, b) => a.level - b.level)[0] || team[0]
        if (target) {
          const updated = team.map(m => {
            if (m.uid !== target.uid) return { ...m }
            const copy = { ...m }
            gainXp(copy, xpToNext(copy.level) + xpToNext(copy.level + 1))
            return copy
          })
          run.commitTeam(updated)
        }
        break
      }
    }
    setTimeout(() => navigate('run'), 550)
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
          {options.map((opt, i) => {
            const ring = opt.type === 'relic' ? (RELIC_RARITY_COLOR[opt.rarity] || '#c084fc') : '#334155'
            return (
              <button key={i} onClick={() => pick(opt)} disabled={chosen}
                className={`w-full flex items-center gap-3 rounded-2xl p-4 border-2 text-left transition-all ${chosen ? 'opacity-40' : 'hover:scale-[1.02] active:scale-95'}`}
                style={{ background: `linear-gradient(110deg, ${ring}1a, #0f172a)`, borderColor: ring + '88' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: ring + '22' }}>{opt.emoji}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-white text-sm">{opt.title}</p>
                    {opt.type === 'relic' && <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded" style={{ background: ring + '33', color: ring }}>Relique {opt.rarity}</span>}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{opt.desc}</p>
                </div>
              </button>
            )
          })}
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
