import React, { useState, useMemo } from 'react'
import { useGameStore } from '../store/gameStore.js'
import PokemonCard from '../components/PokemonCard.jsx'
import { TYPES, TYPE_LABELS_FR } from '../data/types.js'

const RARITIES = ['common', 'uncommon', 'rare', 'holo', 'ultra', 'secret']
const RARITY_LABELS = { common: 'Commune', uncommon: 'Peu commune', rare: 'Rare', holo: 'Holo', ultra: 'Ultra', secret: 'Secret' }

export default function CollectionScreen() {
  const { collection, navigate } = useGameStore()
  const [filterType, setFilterType] = useState(null)
  const [filterRarity, setFilterRarity] = useState(null)
  const [sortBy, setSortBy] = useState('recent')

  const filtered = useMemo(() => {
    let list = [...collection]
    if (filterType) list = list.filter(p => p.types?.includes(filterType))
    if (filterRarity) list = list.filter(p => p.rarity === filterRarity)
    if (sortBy === 'recent') list.reverse()
    else if (sortBy === 'level') list.sort((a, b) => b.level - a.level)
    else if (sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name))
    else if (sortBy === 'rarity') {
      const order = { secret: 0, ultra: 1, holo: 2, rare: 3, uncommon: 4, common: 5 }
      list.sort((a, b) => (order[a.rarity] || 5) - (order[b.rarity] || 5))
    }
    return list
  }, [collection, filterType, filterRarity, sortBy])

  const usedTypes = useMemo(() => {
    const types = new Set()
    collection.forEach(p => p.types?.forEach(t => types.add(t)))
    return [...types]
  }, [collection])

  return (
    <div className="min-h-screen bg-game-bg flex flex-col">
      {/* Header */}
      <div className="bg-game-surface border-b border-game-border px-4 pt-10 pb-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-game text-sm text-white">Collection</h2>
            <span className="text-xs text-gray-400">{collection.length} cartes</span>
          </div>

          {/* Filters */}
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-1.5 pb-1 min-w-max">
              {/* Types */}
              {usedTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(filterType === type ? null : type)}
                  className={`
                    flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded-full border transition-all
                    ${filterType === type ? 'border-white text-white bg-white/10' : 'border-gray-600 text-gray-400 hover:border-gray-400'}
                  `}
                >
                  {TYPE_LABELS_FR[type]}
                </button>
              ))}
              {/* Rarities */}
              {RARITIES.map(r => {
                const hasRarity = collection.some(p => p.rarity === r)
                if (!hasRarity) return null
                return (
                  <button
                    key={r}
                    onClick={() => setFilterRarity(filterRarity === r ? null : r)}
                    className={`
                      flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded-full border transition-all
                      ${filterRarity === r ? 'border-white text-white bg-white/10' : 'border-gray-600 text-gray-400 hover:border-gray-400'}
                    `}
                  >
                    {RARITY_LABELS[r]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sort */}
          <div className="flex gap-1.5 mt-2">
            {[['recent', 'Récent'], ['rarity', 'Rareté'], ['level', 'Niveau'], ['name', 'Nom']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={`text-[10px] px-2 py-1 rounded transition-all ${sortBy === key ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 max-w-lg mx-auto w-full">
        {collection.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
            <div className="text-5xl opacity-30">📦</div>
            <p className="text-gray-500 text-sm">Ta collection est vide.</p>
            <button
              onClick={() => navigate('shop')}
              className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm"
            >
              Ouvrir des boosters
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <p className="text-gray-500 text-sm">Aucune carte pour ce filtre.</p>
            <button
              onClick={() => { setFilterType(null); setFilterRarity(null) }}
              className="text-xs text-red-400 underline"
            >
              Effacer les filtres
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 pb-6">
            {filtered.map(card => (
              <PokemonCard key={card.uid} pokemon={card} compact />
            ))}
          </div>
        )}
      </div>

      {/* Build team CTA */}
      {collection.length > 0 && (
        <div className="sticky bottom-16 px-4 pb-3 pointer-events-none">
          <button
            onClick={() => navigate('team')}
            className="w-full max-w-lg mx-auto flex py-3.5 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold rounded-xl transition-all items-center justify-center gap-2 pointer-events-auto shadow-lg shadow-red-900/50"
          >
            <span>⚔️</span> Construire mon équipe
          </button>
        </div>
      )}
    </div>
  )
}
