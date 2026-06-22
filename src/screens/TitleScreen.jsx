import React from 'react'
import { useGameStore } from '../store/gameStore.js'

export default function TitleScreen() {
  const { navigate, resetGame, collection, money } = useGameStore()
  const hasSave = collection.length > 0 || money !== 500

  const handleNewGame = () => {
    resetGame()
    navigate('shop')
  }

  const handleContinue = () => {
    navigate('shop')
  }

  return (
    <div className="min-h-screen bg-game-bg flex flex-col items-center justify-between px-6 py-12 relative overflow-hidden">
      {/* Bg circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-red-900/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-blue-900/10 blur-3xl" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-8 w-full max-w-xs">
        {/* Logo */}
        <div className="text-center">
          <div className="text-6xl mb-4 animate-float">⚡</div>
          <h1 className="font-game text-xl text-white leading-loose tracking-wide">
            Poké<span className="text-red-500">Booster</span>
          </h1>
          <p className="text-gray-500 text-xs mt-2">Collecte. Construis. Combats.</p>
        </div>

        {/* Preview cards */}
        <div className="flex gap-2 opacity-60">
          {[1, 4, 7, 25, 39].map((id, i) => (
            <img
              key={id}
              src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`}
              alt=""
              className="w-10 h-10 object-contain"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 w-full">
          {hasSave && (
            <button
              onClick={handleContinue}
              className="w-full py-4 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold rounded-xl transition-all text-sm shadow-lg shadow-red-900/50"
            >
              ▶ Continuer
            </button>
          )}
          <button
            onClick={handleNewGame}
            className={`
              w-full py-4 font-bold rounded-xl transition-all text-sm
              ${hasSave
                ? 'bg-gray-800 hover:bg-gray-700 active:scale-95 text-gray-300 border border-gray-600'
                : 'bg-red-600 hover:bg-red-500 active:scale-95 text-white shadow-lg shadow-red-900/50'}
            `}
          >
            {hasSave ? '+ Nouvelle partie' : '▶ Commencer'}
          </button>
        </div>
      </div>

      <p className="text-gray-700 text-[10px] text-center">
        Données et sprites via PokeAPI — fan-made, non officiel
      </p>
    </div>
  )
}
