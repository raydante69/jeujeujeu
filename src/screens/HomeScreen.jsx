import React from 'react'
import { useGameStore } from '../store/gameStore.js'
import { useRunStore } from '../store/runStore.js'
import { biomeForWave } from '../data/biomes.js'

export default function HomeScreen() {
  const { navigate, crystals, money, collection } = useGameStore()
  const { bestWave, totalRuns, active, wave, abandonRun } = useRunStore()
  const ownedSpecies = new Set(collection.map(c => c.id)).size

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: 'radial-gradient(ellipse at top, #1a1030 0%, #0a0a14 70%)' }}>
      {/* ambient */}
      <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full bg-purple-700/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-24 w-96 h-96 rounded-full bg-red-700/10 blur-3xl pointer-events-none" />

      {/* Top resources */}
      <div className="px-4 pt-10 pb-2 flex justify-between items-center max-w-lg mx-auto w-full relative z-10">
        <div className="flex gap-2">
          <Pill icon="💰" value={money.toLocaleString('fr')} />
          <Pill icon="💎" value={crystals} />
        </div>
        <Pill icon="📕" value={`${ownedSpecies}/151`} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-lg mx-auto w-full relative z-10 gap-6">
        {/* Logo */}
        <div className="text-center">
          <div className="text-5xl mb-2 animate-float">⚡</div>
          <h1 className="font-game text-2xl text-white tracking-wide leading-tight">
            Poké<span className="text-red-500">Rift</span>
          </h1>
          <p className="text-gray-500 text-xs mt-2 uppercase tracking-[0.3em]">Expédition Sans Fin</p>
        </div>

        {/* Best wave banner */}
        <div className="w-full rounded-2xl p-5 text-center border border-purple-800/40" style={{ background: 'linear-gradient(160deg, rgba(168,85,247,0.12), rgba(0,0,0,0.2))' }}>
          <p className="text-[10px] text-purple-300/70 uppercase tracking-widest font-bold">Record</p>
          <p className="font-game text-3xl text-white mt-1">Vague {bestWave}</p>
          <p className="text-xs text-gray-500 mt-1">{totalRuns} expédition{totalRuns > 1 ? 's' : ''} · biome {biomeForWave(bestWave || 1).emoji}</p>
        </div>

        {/* CTA */}
        <div className="w-full space-y-3">
          {active ? (
            <>
              <button
                onClick={() => navigate('run')}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-red-600 hover:brightness-110 active:scale-95 text-white font-black rounded-2xl text-base transition-all shadow-lg shadow-purple-900/40"
              >
                ▶ Reprendre — Vague {wave}
              </button>
              <button
                onClick={() => { abandonRun(); navigate('runsetup') }}
                className="w-full py-3 bg-gray-900/70 hover:bg-gray-800 text-gray-400 font-bold rounded-xl text-sm transition-all border border-gray-800"
              >
                + Nouvelle expédition (abandonne la course actuelle)
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('runsetup')}
              className="w-full py-5 bg-gradient-to-r from-purple-600 to-red-600 hover:brightness-110 active:scale-95 text-white font-black rounded-2xl text-lg transition-all shadow-lg shadow-purple-900/40"
            >
              ⚔️ LANCER L'EXPÉDITION
            </button>
          )}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3 w-full">
          <QuickLink icon="🛍️" label="Boosters" sub="Ouvre des cartes" onClick={() => navigate('shop')} />
          <QuickLink icon="📕" label="Pokédex" sub={`${ownedSpecies} capturés`} onClick={() => navigate('collection')} />
        </div>
      </div>

      <p className="text-gray-700 text-[10px] text-center pb-4 relative z-10">
        Fan-made · sprites PokeAPI · non officiel
      </p>
    </div>
  )
}

function Pill({ icon, value }) {
  return (
    <div className="flex items-center gap-1.5 bg-black/40 rounded-full px-3 py-1.5 border border-white/5">
      <span className="text-sm">{icon}</span>
      <span className="text-white font-bold text-xs">{value}</span>
    </div>
  )
}

function QuickLink({ icon, label, sub, onClick }) {
  return (
    <button onClick={onClick} className="rounded-2xl p-4 bg-game-surface/80 hover:bg-game-surface border border-game-border text-left transition-all active:scale-95">
      <div className="text-2xl mb-1">{icon}</div>
      <p className="text-white font-bold text-sm">{label}</p>
      <p className="text-gray-500 text-[10px]">{sub}</p>
    </button>
  )
}
