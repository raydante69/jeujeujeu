import React, { useMemo } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { speciesById } from '../data/pokemon.js'
import { frName } from '../data/frenchNames.js'
import { KANTO_TOTAL } from '../data/badges.js'

const sprite = (id) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`

// Battle Pokédex: every Kanto species shown by how it was met in COMBAT.
//  • not encountered → hidden silhouette (???)
//  • seen but not beaten → real sprite in grayscale (visible but not "owned")
//  • defeated → full colour
export default function BattleDexScreen() {
  const { navigate, seenSpecies, defeatedSpecies } = useGameStore()
  const seen = useMemo(() => new Set(seenSpecies || []), [seenSpecies])
  const beaten = useMemo(() => new Set(defeatedSpecies || []), [defeatedSpecies])

  const ids = Array.from({ length: KANTO_TOTAL }, (_, i) => i + 1)
  const beatenCount = ids.filter(id => beaten.has(id)).length
  const seenCount = ids.filter(id => seen.has(id) || beaten.has(id)).length

  return (
    <div className="min-h-screen flex flex-col bg-game-bg">
      {/* Header */}
      <div className="px-4 pt-10 pb-3 bg-game-surface border-b border-game-border sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate('progression')} className="text-gray-400 text-sm font-bold">← Retour</button>
          <p className="font-game text-xs text-white">Pokédex de combat</p>
          <span className="w-12" />
        </div>
        <div className="max-w-lg mx-auto mt-2 flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-black/50 overflow-hidden">
            <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${(beatenCount / KANTO_TOTAL) * 100}%` }} />
          </div>
          <span className="text-[10px] text-gray-400 font-bold tabular-nums">{beatenCount}/{KANTO_TOTAL} vaincus</span>
        </div>
        <p className="max-w-lg mx-auto text-[9px] text-gray-600 mt-1">{seenCount} rencontrés · couleur = vaincu · gris = aperçu</p>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-3 py-4 max-w-lg mx-auto w-full">
        <div className="grid grid-cols-4 gap-2">
          {ids.map(id => {
            const sp = speciesById(id)
            const isBeaten = beaten.has(id)
            const isSeen = seen.has(id) || isBeaten
            const name = isSeen ? frName(id, sp?.name || '') : '???'
            return (
              <div key={id}
                className="relative rounded-xl border flex flex-col items-center justify-between p-1.5"
                style={{
                  aspectRatio: '3/4',
                  background: isBeaten ? 'linear-gradient(165deg,#16331f,#0f172a)' : '#0f172a',
                  borderColor: isBeaten ? '#22c55e55' : isSeen ? '#33415566' : '#1e293b',
                }}>
                <span className={`text-[7px] font-bold self-end ${isSeen ? 'text-gray-400' : 'text-gray-700'}`}>
                  #{String(id).padStart(3, '0')}
                </span>
                {isSeen ? (
                  <img src={sprite(id)} alt={name}
                    className={`w-12 h-12 object-contain pixelated ${isBeaten ? '' : 'grayscale opacity-80'}`}
                    loading="lazy" />
                ) : (
                  <img src={sprite(id)} alt="???"
                    className="w-12 h-12 object-contain pixelated" style={{ filter: 'brightness(0)', opacity: 0.12 }} loading="lazy" />
                )}
                <p className={`text-[8px] font-bold truncate w-full text-center leading-none ${isSeen ? 'text-white' : 'text-gray-700'}`}>
                  {name}
                </p>
                {isBeaten && <span className="absolute top-1 left-1 text-[8px]">✅</span>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
