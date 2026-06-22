import React, { useState, useMemo } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { allSpecies } from '../data/pokemon.js'
import { TYPE_COLORS } from '../data/types.js'
import TypeBadge from '../components/TypeBadge.jsx'

const RARITY_COLOR = { common:'#6b7280', uncommon:'#4ade80', rare:'#60a5fa', holo:'#c084fc', ultra:'#fb923c', secret:'#fde047' }
const RARITY_LABEL = { common:'C', uncommon:'UC', rare:'R', holo:'H', ultra:'UR', secret:'SR' }
const RARITY_ORDER = { secret:5, ultra:4, holo:3, rare:2, uncommon:1, common:0 }
const TYPE_FILTER_LIST = ['fire','water','grass','electric','psychic','fighting','ghost','ice','dragon','dark','rock','ground','flying','bug','poison','fairy','steel','normal']

function DexSlot({ species, ownedCards, isNew, onClick }) {
  const owned = ownedCards.length > 0
  const best = owned ? ownedCards.reduce((a,b) => (RARITY_ORDER[b.rarity]||0)>(RARITY_ORDER[a.rarity]||0)?b:a) : null
  const rarity = best?.rarity || 'common'
  const typeColor = owned ? (TYPE_COLORS[species.types?.[0]] || '#1e293b') : '#111827'
  const rarColor = RARITY_COLOR[rarity]
  return (
    <button onClick={() => owned && onClick(species, ownedCards)}
      className={`relative overflow-hidden rounded-xl transition-all duration-150 ${owned ? 'cursor-pointer hover:-translate-y-0.5 hover:scale-[1.06] active:scale-95' : 'cursor-default'}`}
      style={{ aspectRatio:'2/3', background: owned ? `linear-gradient(165deg, ${typeColor}aa 0%, ${typeColor}33 55%, #0f172a 100%)` : 'linear-gradient(165deg, #1e293b 0%, #0f172a 100%)', border: owned ? `1.5px solid ${rarColor}55` : '1.5px solid #1e293b', boxShadow: owned && rarity !== 'common' ? `0 0 8px ${rarColor}44` : '' }}>
      {owned && <div className="absolute top-0 inset-x-0 h-0.5" style={{background:rarColor}} />}
      <div className="flex flex-col items-center justify-between h-full p-1.5">
        <span className="text-[6px] text-gray-600 font-mono self-end">#{String(species.id).padStart(3,'0')}</span>
        {owned
          ? <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${species.id}.png`} alt={species.name} className="w-10 h-10 object-contain pixelated" loading="lazy" />
          : <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${species.id}.png`} alt="???" className="w-10 h-10 object-contain pixelated opacity-10" style={{filter:'brightness(0)'}} loading="lazy" />
        }
        <div className="w-full text-center leading-none">
          {owned ? <p className="text-white font-bold text-[8px] truncate">{species.name}</p> : <p className="text-gray-700 text-[8px] font-bold">???</p>}
        </div>
      </div>
      {owned && <div className="absolute top-1 right-1 text-[6px] font-black px-1 py-0.5 rounded leading-none" style={{background:rarColor+'28',color:rarColor,border:`1px solid ${rarColor}55`}}>{RARITY_LABEL[rarity]}</div>}
      {ownedCards.length > 1 && <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[6px] font-bold px-1 rounded leading-none">×{ownedCards.length}</div>}
      {isNew && owned && <div className="absolute top-1 left-1 bg-yellow-400 text-black text-[6px] font-black px-1 py-0.5 rounded leading-none">NEW</div>}
      {owned && ['holo','ultra','secret'].includes(rarity) && (
        <div className="absolute inset-0 rounded-xl pointer-events-none" style={{background:'linear-gradient(135deg,transparent 25%,rgba(255,255,255,0.10) 50%,transparent 75%)',backgroundSize:'300% 300%',animation:'shimmer 3s linear infinite'}} />
      )}
    </button>
  )
}

function DetailModal({ species, cards, onClose }) {
  const best = cards.reduce((a,b) => (RARITY_ORDER[b.rarity]||0)>(RARITY_ORDER[a.rarity]||0)?b:a)
  const rarity = best?.rarity || 'common'
  const typeColor = TYPE_COLORS[species.types?.[0]] || '#1e293b'
  const rarColor = RARITY_COLOR[rarity]
  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-6" onClick={onClose}>
      <div className="relative rounded-2xl overflow-hidden w-48 max-w-full" style={{background:`linear-gradient(160deg,${typeColor}cc 0%,#0f172a 100%)`,border:`2px solid ${rarColor}88`,aspectRatio:'2/3',boxShadow:`0 0 40px ${rarColor}55`}} onClick={e=>e.stopPropagation()}>
        <div className="absolute top-0 inset-x-0 h-1" style={{background:`linear-gradient(90deg,transparent,${rarColor},transparent)`}} />
        <div className="flex flex-col items-center h-full p-4 gap-2">
          <p className="text-gray-400 text-xs">#{String(species.id).padStart(3,'0')}</p>
          <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${species.id}.png`} alt={species.name} className="w-24 h-24 object-contain drop-shadow-xl" onError={e=>{e.target.src=`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${species.id}.png`}} />
          <p className="text-white font-bold text-base">{species.name}</p>
          <div className="flex gap-1.5">{species.types.map(t=><TypeBadge key={t} type={t} size="sm"/>)}</div>
          <div className="text-xs font-bold px-2 py-0.5 rounded" style={{color:rarColor,background:rarColor+'22',border:`1px solid ${rarColor}55`}}>{RARITY_LABEL[rarity]} · ×{cards.length} carte{cards.length>1?'s':''}</div>
          <button onClick={onClose} className="mt-auto w-full py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-xs font-bold transition-all">Fermer</button>
        </div>
        {['holo','ultra','secret'].includes(rarity) && <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{background:'linear-gradient(135deg,transparent 20%,rgba(255,255,255,0.14) 50%,transparent 80%)',backgroundSize:'300% 300%',animation:'shimmer 2s linear infinite',mixBlendMode:'overlay'}} />}
      </div>
    </div>
  )
}

export default function CollectionScreen() {
  const { collection, navigate, newCardUids, clearNewCards } = useGameStore()
  const [typeFilter, setTypeFilter] = useState(null)
  const [showOwned, setShowOwned] = useState(false)
  const [detail, setDetail] = useState(null)
  const species = allSpecies()
  const ownedBySpecies = useMemo(() => { const map={}; collection.forEach(c=>{if(!map[c.id])map[c.id]=[];map[c.id].push(c)}); return map }, [collection])
  const newSpeciesIds = useMemo(() => { const uids=new Set(newCardUids||[]); const ids=new Set(); collection.forEach(c=>{if(uids.has(c.uid))ids.add(c.id)}); return ids }, [collection, newCardUids])
  const ownedCount = useMemo(() => Object.keys(ownedBySpecies).length, [ownedBySpecies])
  const filtered = useMemo(() => { let list=species; if(typeFilter)list=list.filter(s=>s.types.includes(typeFilter)); if(showOwned)list=list.filter(s=>ownedBySpecies[s.id]?.length>0); return list }, [species,typeFilter,showOwned,ownedBySpecies])
  function handleSlotClick(sp, cards) { setDetail({species:sp,cards}); if(clearNewCards)clearNewCards(cards.map(c=>c.uid)) }
  return (
    <div className="min-h-screen bg-game-bg flex flex-col">
      {detail && <DetailModal species={detail.species} cards={detail.cards} onClose={()=>setDetail(null)} />}
      <div className="bg-game-surface border-b border-game-border px-4 pt-10 pb-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div><h2 className="font-game text-sm text-white">Pokédex</h2><p className="text-xs text-gray-500">{ownedCount} / {species.length} capturés</p></div>
            <button onClick={()=>navigate('runsetup')} className="px-3 py-1.5 bg-red-600/80 hover:bg-red-500 text-white text-xs font-bold rounded-lg">⚔️ Expédition</button>
          </div>
          <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden mb-3">
            <div className="h-full rounded-full transition-all duration-700" style={{width:`${(ownedCount/Math.max(species.length,1))*100}%`,background:'linear-gradient(90deg,#dc2626,#f97316)'}} />
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={()=>setShowOwned(!showOwned)} className={`flex-shrink-0 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${showOwned?'bg-red-600 border-red-500 text-white':'border-gray-700 text-gray-500 hover:border-gray-500'}`}>{showOwned?'✓ Obtenus':'Tous'}</button>
            <div className="flex-1 overflow-x-auto scrollbar-hide">
              <div className="flex gap-1.5 min-w-max py-0.5">
                {TYPE_FILTER_LIST.map(type=>(
                  <button key={type} onClick={()=>setTypeFilter(typeFilter===type?null:type)} title={type} className="flex-shrink-0 w-5 h-5 rounded-full transition-all"
                    style={{background:TYPE_COLORS[type]+(typeFilter===type?'ff':'55'),border:`2px solid ${typeFilter===type?TYPE_COLORS[type]:'transparent'}`,transform:typeFilter===type?'scale(1.25)':'scale(1)'}} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4 max-w-lg mx-auto w-full">
        <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5 pb-20">
          {filtered.map(sp=><DexSlot key={sp.id} species={sp} ownedCards={ownedBySpecies[sp.id]||[]} isNew={newSpeciesIds.has(sp.id)} onClick={handleSlotClick}/>)}
        </div>
      </div>
      {ownedCount > 0 && (
        <div className="sticky bottom-16 pointer-events-none px-4 pb-3">
          <button onClick={()=>navigate('runsetup')} className="pointer-events-auto w-full max-w-lg mx-auto flex py-3.5 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold rounded-xl transition-all items-center justify-center gap-2 shadow-lg shadow-red-900/50">⚔️ Lancer une expédition</button>
        </div>
      )}
    </div>
  )
}
