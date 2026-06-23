import React from 'react'
import { useGameStore } from '../store/gameStore.js'
import { useRunStore } from '../store/runStore.js'
import { biomeForWave } from '../data/biomes.js'

export default function RunEndScreen() {
  const { navigate } = useGameStore()
  const { lastSummary, bestWave, team, lastStarters, startRun } = useRunStore()
  const reached = lastSummary?.reached ?? 0
  const crystals = lastSummary?.crystals ?? 0
  const money = lastSummary?.money ?? 0
  const record = lastSummary?.record
  const biome = biomeForWave(reached || 1)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10" style={{ background: 'radial-gradient(ellipse at top, #2a0f1a 0%, #0a0a14 70%)' }}>
      <div className="w-full max-w-sm text-center">
        <p className="text-5xl mb-3">{record ? '🌟' : '💀'}</p>
        <h2 className="font-game text-base text-white">{record ? 'NOUVEAU RECORD !' : 'Expédition terminée'}</h2>

        <div className="my-6 rounded-2xl p-6 border border-purple-800/40" style={{ background: 'linear-gradient(160deg, rgba(168,85,247,0.12), rgba(0,0,0,0.2))' }}>
          <p className="text-[10px] text-purple-300/70 uppercase tracking-widest font-bold">Vague atteinte</p>
          <p className="font-game text-4xl text-white mt-1">{reached}</p>
          <p className="text-xs text-gray-500 mt-1">{biome.emoji} {biome.name}</p>
          <div className="h-px bg-white/10 my-4" />
          <div className="flex justify-around text-sm">
            <div><p className="text-purple-300 font-black text-lg">+{crystals}</p><p className="text-[10px] text-gray-500">💎 Cristaux</p></div>
            <div><p className="text-yellow-300 font-black text-lg">+{money}</p><p className="text-[10px] text-gray-500">💰 Argent</p></div>
            <div><p className="text-white font-black text-lg">{bestWave}</p><p className="text-[10px] text-gray-500">🏆 Record</p></div>
          </div>
        </div>

        {/* Final team */}
        <div className="flex justify-center gap-2 mb-6 flex-wrap">
          {team.map(m => (
            <div key={m.uid} className={`flex flex-col items-center ${m.hp <= 0 ? 'opacity-40' : ''}`}>
              <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${m.id}.png`} alt={m.name} className={`w-10 h-10 object-contain pixelated ${m.hp <= 0 ? 'grayscale' : ''}`} />
              <p className="text-[8px] text-gray-500">Niv.{m.level}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {lastStarters?.length > 0 && (
            <button onClick={() => { startRun(lastStarters); navigate('run') }} className="w-full py-4 bg-gradient-to-r from-purple-600 to-red-600 text-white font-black rounded-xl text-base active:scale-95 transition-all">
              🔄 Rejouer (même équipe)
            </button>
          )}
          <button onClick={() => navigate('runsetup')} className="w-full py-3 bg-gray-900 text-gray-300 font-bold rounded-xl text-sm border border-gray-800 active:scale-95 transition-all">
            ⚔️ Nouvelle équipe
          </button>
          <button onClick={() => navigate('home')} className="w-full py-2.5 text-gray-500 font-bold rounded-xl text-sm active:scale-95 transition-all">
            🏠 Accueil
          </button>
        </div>
      </div>
    </div>
  )
}
