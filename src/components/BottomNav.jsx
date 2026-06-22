import React from 'react'
import { useGameStore } from '../store/gameStore.js'

const TABS = [
  { id: 'home',       label: 'Accueil',  icon: '🏠' },
  { id: 'shop',       label: 'Boosters', icon: '🛍️' },
  { id: 'collection', label: 'Pokédex',  icon: '📕' },
]

export default function BottomNav() {
  const { currentScreen, navigate } = useGameStore()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-game-surface border-t border-game-border safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {TABS.map(tab => {
          const active = currentScreen === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.id)}
              className={`
                flex flex-col items-center justify-center gap-0.5 flex-1 h-full
                transition-all duration-150 rounded-lg mx-0.5
                ${active
                  ? 'text-white bg-white/10'
                  : 'text-gray-500 hover:text-gray-300'}
              `}
            >
              <span className="text-xl leading-none">{tab.icon}</span>
              <span className={`text-[10px] font-bold ${active ? 'text-white' : 'text-gray-500'}`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
