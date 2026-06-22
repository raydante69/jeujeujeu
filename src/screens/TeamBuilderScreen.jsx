import React, { useState } from 'react'
import { useGameStore } from '../store/gameStore.js'
import PokemonCard from '../components/PokemonCard.jsx'
import TypeBadge from '../components/TypeBadge.jsx'
import { computeTraits } from '../data/traits.js'

const SLOT_COUNT = 6

export default function TeamBuilderScreen() {
  const { collection, team, addToTeam, removeFromTeam, navigate } = useGameStore()

  const traits = computeTraits(team.map(c => ({ ...c, fainted: false })))
  const canFight = team.length >= 1

  function handleCardClick(card) {
    const inTeam = team.find(c => c.uid === card.uid)
    if (inTeam) {
      removeFromTeam(card.uid)
    } else if (team.length < SLOT_COUNT) {
      addToTeam(card)
    }
  }

  return (
    <div className="min-h-screen bg-game-bg flex flex-col">
      {/* Header */}
      <div className="bg-game-surface border-b border-game-border px-4 pt-10 pb-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-game text-sm text-white">Équipe</h2>
            <span className="text-xs text-gray-400">{team.length}/{SLOT_COUNT}</span>
          </div>

          {/* Team slots */}
          <div className="flex gap-2">
            {Array.from({ length: SLOT_COUNT }).map((_, i) => {
              const card = team[i]
              return (
                <div key={i} className="flex-1 aspect-square rounded-lg overflow-hidden">
                  {card ? (
                    <button
                      onClick={() => removeFromTeam(card.uid)}
                      className="w-full h-full bg-game-card hover:bg-red-900/30 flex items-center justify-center relative transition-all border border-gray-600"
                    >
                      <img
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${card.id}.png`}
                        alt={card.name}
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-red-900/60 transition-all rounded-lg">
                        <span className="text-red-300 text-lg">✕</span>
                      </div>
                    </button>
                  ) : (
                    <div className="w-full h-full bg-game-card border border-dashed border-gray-700 rounded-lg flex items-center justify-center">
                      <span className="text-gray-600 text-xl">+</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Synergies */}
          {Object.keys(traits).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {Object.entries(traits).map(([type, info]) => (
                <div key={type} className="flex items-center gap-1 text-[10px] text-gray-300 bg-game-card rounded-full px-2 py-0.5" style={{ border: `1px solid ${info.color}44` }}>
                  <TypeBadge type={type} size="xs" />
                  <span style={{ color: info.color }}>+{Math.round(info.atk * 100)}% ATK {info.tierLabel}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Collection */}
      <div className="flex-1 overflow-y-auto px-3 py-4 max-w-lg mx-auto w-full">
        {collection.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
            <p className="text-gray-500 text-sm">Ouvre des boosters pour obtenir des Pokémon !</p>
            <button onClick={() => navigate('shop')} className="px-5 py-2.5 bg-red-600 text-white font-bold rounded-xl text-sm">
              Aller au Shop
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-3">
              {team.length < SLOT_COUNT
                ? `Sélectionne jusqu'à ${SLOT_COUNT} Pokémon`
                : 'Équipe complète ! Retire un Pokémon pour changer.'}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pb-6">
              {collection.map(card => {
                const inTeam = !!team.find(c => c.uid === card.uid)
                const teamFull = team.length >= SLOT_COUNT
                return (
                  <PokemonCard
                    key={card.uid}
                    pokemon={card}
                    compact
                    selected={inTeam}
                    disabled={teamFull && !inTeam}
                    onClick={() => handleCardClick(card)}
                  />
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Fight CTA */}
      <div className="sticky bottom-16 px-4 pb-3 pointer-events-none">
        <button
          onClick={() => canFight && navigate('combat')}
          disabled={!canFight}
          className={`
            w-full max-w-lg mx-auto flex py-4 font-bold rounded-xl transition-all items-center justify-center gap-2 pointer-events-auto
            ${canFight
              ? 'bg-red-600 hover:bg-red-500 active:scale-95 text-white shadow-lg shadow-red-900/50'
              : 'bg-gray-800 text-gray-600 cursor-not-allowed'}
          `}
        >
          🏆 {canFight ? 'Partir au combat !' : 'Ajoute au moins 1 Pokémon'}
        </button>
      </div>
    </div>
  )
}
