import React, { useState, useMemo } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { useRunStore } from '../store/runStore.js'
import { allSpecies, makeInstance } from '../data/pokemon.js'
import { buildMoveset, movesetSize } from '../engine/combatEngine.js'
import { makeRunMon } from '../engine/runEngine.js'
import { TYPE_COLORS } from '../data/types.js'

// Available encounters (randomly one is chosen per visit)
const ENCOUNTERS = ['prof_shen']

// ─────────────────────────────────────────────────────────────────────────
//  ProfShen lets you choose between:
//   A) Swap one team Pokémon for a random one (not added to Pokédex)
//   B) Swap one attack from one team Pokémon with another from the pool
// ─────────────────────────────────────────────────────────────────────────

function randomSpecies(excludeIds = []) {
  const all = allSpecies()
  const pool = all.filter(s => !excludeIds.includes(s.id))
  return pool[Math.floor(Math.random() * pool.length)]
}

function ProfShenSwapPokemon({ team, onConfirm, onBack }) {
  const [selectedUid, setSelectedUid] = useState(null)

  // Generate a random replacement Pokémon at average team level
  const avgLevel = Math.round(team.reduce((s, m) => s + (m.level || 5), 0) / Math.max(1, team.length))
  const replacement = useMemo(() => {
    const sp = randomSpecies(team.map(m => m.id))
    const mon = makeRunMon(sp.id, avgLevel)
    return mon
  }, []) // eslint-disable-line

  function confirm() {
    if (!selectedUid) return
    onConfirm({ swapUid: selectedUid, replacement })
  }

  return (
    <div className="space-y-4">
      <div className="bg-purple-900/20 border border-purple-700/40 rounded-xl p-3">
        <p className="text-xs text-gray-400 mb-1 font-bold uppercase text-[10px]">Pokémon proposé</p>
        <div className="flex items-center gap-3">
          <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${replacement.id}.png`}
            alt={replacement.name} className="w-16 h-16 object-contain"
            onError={e => { e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${replacement.id}.png` }} />
          <div>
            <p className="font-black text-white text-sm">{replacement.name}</p>
            <p className="text-[11px] text-gray-400">Niv.{replacement.level} · {movesetSize(replacement)} attaque{movesetSize(replacement) > 1 ? 's' : ''}</p>
            <p className="text-[10px] text-purple-300 mt-0.5">{(replacement.types || []).join(' / ')}</p>
            <p className="text-[9px] text-yellow-500/70 mt-0.5 italic">Ne sera pas ajouté au Pokédex.</p>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400">Choisis le Pokémon à échanger :</p>
      <div className="space-y-2">
        {team.map(mon => {
          const tc = TYPE_COLORS[(mon.types || ['normal'])[0]] || '#64748b'
          const sel = selectedUid === mon.uid
          return (
            <button key={mon.uid} onClick={() => setSelectedUid(mon.uid)}
              className="w-full flex items-center gap-3 rounded-xl p-3 border text-left transition-all active:scale-95"
              style={{ background: sel ? tc + '33' : tc + '11', borderColor: sel ? tc + 'cc' : tc + '33', boxShadow: sel ? `0 0 10px ${tc}55` : 'none' }}>
              <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${mon.shiny ? 'shiny/' : ''}${mon.id}.png`}
                alt={mon.name} className="w-12 h-12 object-contain pixelated" />
              <div>
                <p className="font-bold text-white text-sm">{mon.name}</p>
                <p className="text-[11px] text-gray-400">Niv.{mon.level} · {movesetSize(mon)} attaque{movesetSize(mon) > 1 ? 's' : ''}</p>
                <p className="text-[10px]" style={{ color: tc }}>{mon.rarity}</p>
              </div>
              {sel && <span className="ml-auto text-xl">✓</span>}
            </button>
          )
        })}
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 text-sm font-bold">
          Annuler
        </button>
        <button onClick={confirm} disabled={!selectedUid}
          className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${selectedUid ? 'bg-purple-600 text-white active:scale-95' : 'bg-gray-800 text-gray-600'}`}>
          Échanger →
        </button>
      </div>
    </div>
  )
}

function ProfShenSwapAttack({ team, hp, onConfirm, onBack }) {
  const [step, setStep] = useState('pick_slot')  // 'pick_slot' | 'pick_replacement'
  const [selectedMonUid, setSelectedMonUid] = useState(null)
  const [selectedCardKey, setSelectedCardKey] = useState(null)

  // All attacks available in the full pool (all team Pokémon's full moveset)
  const fullPool = useMemo(() => {
    const seen = new Set()
    const pool = []
    for (const mon of team) {
      const moves = buildMoveset(mon)
      for (const m of moves) {
        if (!seen.has(m.key)) { seen.add(m.key); pool.push({ ...m, ownerName: mon.name, ownerId: mon.id }) }
      }
    }
    return pool
  }, [team])

  // The slot being replaced
  const selectedMon = team.find(m => m.uid === selectedMonUid)
  const selectedMonMoves = selectedMon ? buildMoveset(selectedMon).slice(0, movesetSize(selectedMon)) : []

  function confirmReplacement(newMove) {
    if (!selectedMon || !selectedCardKey) return
    // Build the new customMoves array for that Pokémon
    const curMoves = buildMoveset(selectedMon).slice(0, movesetSize(selectedMon))
    const newMoves = curMoves.map(m => m.key === selectedCardKey ? { ...newMove, key: selectedCardKey, ownerUid: selectedMon.uid, ownerName: selectedMon.name, ownerId: selectedMon.id, ownerRarity: selectedMon.rarity } : m)
    onConfirm({ monUid: selectedMonUid, customMoves: newMoves })
  }

  if (step === 'pick_replacement') {
    const oldMove = selectedMonMoves.find(m => m.key === selectedCardKey)
    return (
      <div className="space-y-4">
        <div className="bg-blue-900/20 border border-blue-700/40 rounded-xl p-3 text-sm">
          <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Remplacer</p>
          <p className="font-bold text-white">{oldMove?.emoji} {oldMove?.name}</p>
          <p className="text-[10px] text-gray-400">sur {selectedMon?.name}</p>
        </div>
        <p className="text-xs text-gray-400">Choisir le remplacement :</p>
        <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-hide">
          {fullPool.filter(m => m.key !== selectedCardKey).map((move, i) => {
            const tc = TYPE_COLORS[move.type] || '#64748b'
            return (
              <button key={i} onClick={() => confirmReplacement(move)}
                className="w-full flex items-center gap-3 rounded-xl p-3 border text-left transition-all active:scale-95"
                style={{ background: tc + '11', borderColor: tc + '33' }}>
                <span className="text-2xl flex-shrink-0">{move.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white text-sm">{move.name}</p>
                  <p className="text-[10px] text-gray-400">{move.desc}</p>
                  <p className="text-[9px] font-bold mt-0.5" style={{ color: tc }}>{move.type} · {move.ownerName}</p>
                </div>
              </button>
            )
          })}
        </div>
        <button onClick={() => setStep('pick_slot')} className="w-full py-3 rounded-xl border border-gray-700 text-gray-400 text-sm font-bold">
          ← Retour
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400">Choisis l'attaque à remplacer :</p>
      <div className="space-y-3">
        {team.map(mon => {
          const tc = TYPE_COLORS[(mon.types || ['normal'])[0]] || '#64748b'
          const moves = buildMoveset(mon).slice(0, movesetSize(mon))
          return (
            <div key={mon.uid} className="rounded-xl border p-3" style={{ background: tc + '0a', borderColor: tc + '33' }}>
              <div className="flex items-center gap-2 mb-2">
                <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${mon.shiny ? 'shiny/' : ''}${mon.id}.png`}
                  alt={mon.name} className="w-8 h-8 object-contain pixelated" />
                <p className="font-bold text-white text-sm">{mon.name}</p>
                {mon.shiny && <span className="text-[10px]">✨</span>}
                {mon.holo  && <span className="text-[10px]">🌈</span>}
              </div>
              <div className="flex gap-2 flex-wrap">
                {moves.map(move => {
                  const mtc = TYPE_COLORS[move.type] || '#64748b'
                  const sel = selectedMonUid === mon.uid && selectedCardKey === move.key
                  return (
                    <button key={move.key} onClick={() => { setSelectedMonUid(mon.uid); setSelectedCardKey(move.key) }}
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 border text-left transition-all active:scale-95 text-xs"
                      style={{ background: sel ? mtc + '44' : mtc + '18', borderColor: sel ? mtc + 'cc' : mtc + '44' }}>
                      <span>{move.emoji}</span>
                      <span className="font-bold text-white">{move.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 text-sm font-bold">
          Annuler
        </button>
        <button onClick={() => setStep('pick_replacement')} disabled={!selectedCardKey}
          className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${selectedCardKey ? 'bg-blue-600 text-white active:scale-95' : 'bg-gray-800 text-gray-600'}`}>
          Choisir le remplacement →
        </button>
      </div>
    </div>
  )
}

export default function EncounterScreen() {
  const { navigate } = useGameStore()
  const run = useRunStore()
  const { team, wave, hp: runHp } = run
  const hp = useMemo(() => {
    const map = {}
    team.forEach(m => { map[m.uid] = m.hp })
    return map
  }, [team])

  // For now only Prof. Shen; extend ENCOUNTERS array for more variety
  const [mode, setMode] = useState('menu')  // 'menu' | 'swap_mon' | 'swap_attack'
  const [done, setDone] = useState(false)

  function finish() {
    run.advanceWave()
    navigate('run')
  }

  function handleSwapMon({ swapUid, replacement }) {
    const updated = team.map(m => m.uid === swapUid ? { ...replacement } : m)
    run.commitTeam(updated)
    setDone(true)
  }

  function handleSwapAttack({ monUid, customMoves }) {
    const updated = team.map(m => m.uid === monUid ? { ...m, customMoves } : m)
    run.commitTeam(updated)
    setDone(true)
  }

  return (
    <div className="min-h-screen bg-game-bg flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-5xl mb-3">🔭</p>
          <h2 className="font-game text-xs text-purple-400">Rencontre Spéciale</h2>
          <p className="text-[11px] text-gray-500 mt-1">Vague {wave}</p>
        </div>

        {done ? (
          <div className="space-y-4">
            <div className="rounded-2xl p-6 border border-purple-700/40 bg-purple-900/15 text-center">
              <p className="text-3xl mb-2">✅</p>
              <p className="font-bold text-white">Échange effectué !</p>
              <p className="text-xs text-gray-400 mt-1">Le Professeur Shen te remercie de ta confiance.</p>
            </div>
            <button onClick={finish} className="w-full py-4 bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-black rounded-xl text-base transition-all">
              Continuer →
            </button>
          </div>
        ) : mode === 'menu' ? (
          <div className="space-y-4">
            {/* Prof Shen card */}
            <div className="rounded-2xl p-4 border border-purple-700/40 bg-purple-900/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 rounded-full bg-purple-900/50 border border-purple-600/50 flex items-center justify-center text-3xl flex-shrink-0">
                  🧑‍🔬
                </div>
                <div>
                  <p className="font-black text-white text-sm">Professeur Shen</p>
                  <p className="text-[11px] text-gray-400">Chercheur en comportement Pokémon</p>
                </div>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed italic">
                "Fascinant ! Vos Pokémon ont un potentiel remarquable. Je pourrais vous aider à optimiser votre équipe — si vous êtes partant·e pour un échange, bien sûr…"
              </p>
            </div>

            <p className="text-[11px] text-gray-500 text-center">Choisissez une proposition :</p>

            {/* Option A: swap Pokémon */}
            <button onClick={() => setMode('swap_mon')}
              className="w-full flex items-center gap-3 rounded-2xl p-4 border border-purple-700/40 text-left transition-all hover:bg-purple-900/20 active:scale-95"
              style={{ background: 'linear-gradient(110deg, #7c3aed18, #0f172a)' }}>
              <div className="w-12 h-12 rounded-xl bg-purple-900/50 flex items-center justify-center text-2xl flex-shrink-0">🔄</div>
              <div>
                <p className="font-bold text-white text-sm">Échanger un Pokémon</p>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">Le Shen propose un Pokémon aléatoire en échange d'un des vôtres. Il ne rejoindra pas votre Pokédex.</p>
              </div>
            </button>

            {/* Option B: swap attack */}
            <button onClick={() => setMode('swap_attack')}
              className="w-full flex items-center gap-3 rounded-2xl p-4 border border-blue-700/40 text-left transition-all hover:bg-blue-900/20 active:scale-95"
              style={{ background: 'linear-gradient(110deg, #1d4ed818, #0f172a)' }}>
              <div className="w-12 h-12 rounded-xl bg-blue-900/50 flex items-center justify-center text-2xl flex-shrink-0">⚡</div>
              <div>
                <p className="font-bold text-white text-sm">Échanger une attaque</p>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">Remplacez une attaque d'un Pokémon par une autre issue du répertoire de votre équipe.</p>
              </div>
            </button>

            {/* Skip */}
            <button onClick={finish}
              className="w-full py-3 text-gray-600 text-sm hover:text-gray-400 transition-all border border-gray-800 rounded-xl">
              Décliner et continuer →
            </button>
          </div>
        ) : mode === 'swap_mon' ? (
          <ProfShenSwapPokemon
            team={team}
            onConfirm={handleSwapMon}
            onBack={() => setMode('menu')}
          />
        ) : (
          <ProfShenSwapAttack
            team={team}
            hp={hp}
            onConfirm={handleSwapAttack}
            onBack={() => setMode('menu')}
          />
        )}
      </div>
    </div>
  )
}
