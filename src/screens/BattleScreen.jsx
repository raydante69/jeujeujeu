import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { useRunStore } from '../store/runStore.js'
import {
  buildEnemy, xpForWin, goldForWin, gainXp, waveKind, xpToNext,
} from '../engine/runEngine.js'
import { sfx } from '../lib/sfx.js'
import { recomputeStats } from '../data/pokemon.js'
import {
  drawHand, moveDamage, guardValue, healValue, computeIntent, STATUS_DEF, buildMoveset, movesetSize,
} from '../engine/combatEngine.js'
import { aggregateRelics } from '../data/relics.js'
import { aggregateAscension } from '../data/ascension.js'
import { biomeForWave } from '../data/biomes.js'
import { getTrait } from '../data/signatureTraits.js'
import { TYPE_COLORS, TYPE_LABELS_FR, typeMatchups } from '../data/types.js'
import { MODIFIER_DEF } from '../data/enemyModifiers.js'
import { BALLS, BALL_BY_ID, CONSUMABLE_BY_ID } from '../data/items.js'
import { rollRandomCT } from '../data/ct.js'
import TypeBadge from '../components/TypeBadge.jsx'
import HPBar from '../components/HPBar.jsx'
import ItemSprite from '../components/ItemSprite.jsx'
import StatBars from '../components/StatBars.jsx'

const KIND_ICON = { attack: '⚔️', guard: '🛡️', heal: '➕', drain: '🌿', status: '✨', buff: '💪' }

// Boss signature abilities (set on the enemy by buildEnemy from biome data).
const ABILITY_LABEL = {
  enrage:    '😡 Furie croissante (dégâts +8% / tour)',
  shield:    '🛡️ Carapace (bouclier périodique)',
  lifedrain: '🩸 Drain vital (se soigne en frappant)',
}

// Preview the numeric value a card will deal/heal.
function previewCard(card, caster, enemy, relicAgg) {
  if (!caster || !enemy) return null
  if (card.kind === 'attack' || card.kind === 'drain') {
    const { dmg } = moveDamage(card, caster, enemy, relicAgg)
    let d = dmg
    if (caster.shiny) d = Math.round(d * 1.15)
    if (caster.holo)  d = Math.round(d * 1.20)
    if (card.kind === 'drain') {
      const h = Math.round(healValue(card, caster, relicAgg) * (caster.holo ? 1.20 : 1))
      return [{ label: `-${d}`, color: '#f87171' }, { label: `+${h}`, color: '#4ade80' }]
    }
    return [{ label: `-${d}`, color: '#f87171' }]
  }
  if (card.kind === 'guard') {
    const g = guardValue(card, caster, relicAgg)
    return [{ label: g > 0 ? `🛡️${g}` : '🚫', color: '#38bdf8' }]
  }
  if (card.kind === 'heal') {
    const h = Math.round(healValue(card, caster, relicAgg) * (caster.holo ? 1.20 : 1))
    return [{ label: `+${h}`, color: '#4ade80' }]
  }
  if (card.kind === 'status') {
    const def = STATUS_DEF[card.status]
    return [{ label: def?.label?.split(' ')[0] || '⚡', color: def?.color || '#facc15' }]
  }
  if (card.kind === 'buff') {
    return [{ label: `+${Math.round((card.bonus || 0.7) * 100)}%`, color: '#f97316' }]
  }
  return null
}

// Faint background glyph behind the card sprite, by move kind.
const CARD_BG_ICON = { attack: '⚔️', drain: '⚔️', guard: '🛡️', heal: '❤️', status: '✨', buff: '💪' }

// Compute what the damage row shows: base vs effective with weakness/resist coloring.
function cardDamageInfo(card, caster, enemy, relicAgg) {
  const sh = (caster.shiny ? 1.15 : 1) * (caster.holo ? 1.20 : 1)
  if (card.kind === 'attack' || card.kind === 'drain') {
    const { dmg, eff } = moveDamage(card, caster, enemy, relicAgg)
    const factor = Math.max(eff, 0.25)
    return {
      kind: 'dmg',
      eff,
      effDmg: Math.max(1, Math.round(dmg * sh)),
      baseDmg: Math.max(1, Math.round((dmg / factor) * sh)),
    }
  }
  if (card.kind === 'guard') {
    const g = guardValue(card, caster, relicAgg)
    return { kind: 'guard', value: g }
  }
  if (card.kind === 'heal') {
    return { kind: 'heal', value: Math.round(healValue(card, caster, relicAgg) * (caster.holo ? 1.20 : 1)) }
  }
  if (card.kind === 'status') {
    const def = STATUS_DEF[card.status]
    return { kind: 'status', label: def?.label || '✨', color: def?.color || '#facc15' }
  }
  if (card.kind === 'buff') {
    return { kind: 'buff', label: `+${Math.round((card.bonus || 0.7) * 100)}%` }
  }
  return { kind: 'none' }
}

// Reusable combat card: big sprite center, faint kind glyph behind, name + damage.
// Damage in white = neutral; on weakness the base is struck-through (left) and the
// boosted value shows in red (right); on resistance the value shows in blue.
function AttackCard({ card, caster, enemy, relicAgg = {}, onClick, disabled }) {
  const tc = TYPE_COLORS[card.type] || '#64748b'
  const info = cardDamageInfo(card, caster, enemy, relicAgg)
  return (
    <button onClick={onClick} disabled={disabled}
      className="relative rounded-xl flex flex-col items-center justify-between overflow-hidden transition-all active:scale-95 hover:-translate-y-0.5 disabled:opacity-50"
      style={{ width: 104, height: 124, paddingTop: 6, paddingBottom: 6,
        background: `linear-gradient(160deg, ${tc}26, #0f172a)`, border: `2px solid ${tc}cc`, boxShadow: `0 0 8px ${tc}44` }}>
      {/* Faint background glyph (behind the sprite) */}
      <span className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
        style={{ fontSize: 64, opacity: 0.10, lineHeight: 1 }}>{CARD_BG_ICON[card.kind] || '⚔️'}</span>
      {/* Sprite */}
      <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${caster.shiny ? 'shiny/' : ''}${caster.id}.png`}
        alt={caster.name} className="relative z-10 w-14 h-14 object-contain pixelated" />
      {/* Name */}
      <p className="relative z-10 text-[9px] font-black text-white text-center leading-tight px-1 w-full truncate">{card.name}</p>
      {/* Damage / value row */}
      <div className="relative z-10 flex items-baseline justify-center gap-1 h-5">
        {info.kind === 'dmg' && (
          info.eff > 1 ? (
            <>
              <span className="text-[10px] font-bold line-through text-gray-500">{info.baseDmg}</span>
              <span className="text-sm font-black text-red-400">{info.effDmg}</span>
            </>
          ) : info.eff < 1 ? (
            <>
              <span className="text-[10px] font-bold line-through text-gray-500">{info.baseDmg}</span>
              <span className="text-sm font-black text-sky-400">{info.effDmg}</span>
            </>
          ) : (
            <span className="text-sm font-black text-white">{info.effDmg}</span>
          )
        )}
        {info.kind === 'guard'  && <span className="text-sm font-black text-sky-300">{info.value > 0 ? `🛡️ ${info.value}` : '🚫'}</span>}
        {info.kind === 'heal'   && <span className="text-sm font-black text-green-400">+{info.value}</span>}
        {info.kind === 'status' && <span className="text-[11px] font-black" style={{ color: info.color }}>{info.label}</span>}
        {info.kind === 'buff'   && <span className="text-sm font-black text-orange-400">{info.label}</span>}
      </div>
    </button>
  )
}

// Weaknesses / resistances / immunities of a Pokémon, shown with real type icons.
function MatchupSection({ types }) {
  const { weak, resist, immune } = typeMatchups(types || ['normal'])
  const Row = ({ label, list, color }) => (
    list.length === 0 ? null : (
      <div className="flex items-start gap-2 mb-1.5">
        <span className="text-[9px] font-black uppercase w-16 flex-shrink-0 pt-1" style={{ color }}>{label}</span>
        <div className="flex flex-wrap gap-1">
          {list.map(t => <TypeBadge key={t} type={t} size="img" />)}
        </div>
      </div>
    )
  )
  return (
    <div>
      <p className="text-[10px] text-gray-500 font-bold uppercase mb-1.5">Faiblesses & résistances</p>
      <Row label="Faible" list={weak} color="#f87171" />
      <Row label="Résiste" list={resist} color="#60a5fa" />
      <Row label="Immunisé" list={immune} color="#a78bfa" />
      {weak.length === 0 && resist.length === 0 && immune.length === 0 && (
        <p className="text-[10px] text-gray-600 italic">Aucune affinité notable.</p>
      )}
    </div>
  )
}

const MAX_REROLLS = 2

// Animated end-of-combat XP row: fills the bar from startPct→endPct and, on a
// level-up, plays the level-up jingle and flashes the new level in gold.
function XpGainRow({ row }) {
  const [pct, setPct] = useState(row.startPct)
  const [flash, setFlash] = useState(false)
  useEffect(() => {
    const t1 = setTimeout(() => setPct(row.endPct), 60)
    let t2
    if (row.leveled || row.evoTo) {
      t2 = setTimeout(() => {
        setFlash(true)
        sfx(row.evoTo ? 'evolve' : 'levelUp')
        setTimeout(() => setFlash(false), 1400)
      }, 520)
    }
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [row])

  return (
    <div className="flex items-center gap-2">
      <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${row.shiny ? 'shiny/' : ''}${row.id}.png`}
        alt={row.name} className={`w-8 h-8 object-contain pixelated flex-shrink-0 ${!row.alive ? 'grayscale opacity-50' : ''}`} loading="lazy" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <p className="text-[10px] font-bold text-white truncate">{row.name}</p>
          <div className="flex items-center gap-1 flex-shrink-0">
            {row.evoTo && <span className="text-[8px] font-black text-purple-300">✨ Évolution !</span>}
            <span className={`text-[10px] font-black transition-all ${flash ? 'scale-125' : ''}`}
              style={{ color: flash ? '#fde047' : '#9ca3af', textShadow: flash ? '0 0 8px #fde04788' : 'none' }}>
              Niv.{row.levelAfter}
            </span>
            {row.leveled && <span className="text-[8px] font-black text-green-300">↑</span>}
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-black/50 mt-0.5 overflow-hidden">
          <div className="h-full rounded-full bg-cyan-400 transition-all duration-700 ease-out" style={{ width: `${Math.round(pct * 100)}%` }} />
        </div>
      </div>
    </div>
  )
}

export default function BattleScreen() {
  const { navigate, cardsPerSlot, addCT } = useGameStore()
  const run = useRunStore()
  const { team, relics, wave, pendingEnemy, ascensionLevel } = run
  const relicAgg = useMemo(() => aggregateRelics(relics), [relics])
  const asc = useMemo(() => aggregateAscension(ascensionLevel || 0), [ascensionLevel])
  const kind = waveKind(wave)
  const biome = useMemo(() => biomeForWave(wave), [wave])
  const handSize = cardsPerSlot || 1

  // ── State ───────────────────────────────────────────────────────────────
  const [enemy, setEnemy]         = useState(null)
  const [enemyHp, setEnemyHp]     = useState(0)
  const [enemyMax, setEnemyMax]   = useState(1)
  const [hp, setHp]               = useState({})
  // hand: a single shared row of N cards from the whole team's combined movepool
  const [hand, setHand]           = useState([])
  const [guard, setGuard]         = useState(0)
  const [buff, setBuff]           = useState(0)
  const [lastCardKind, setLastCardKind] = useState(null)  // prevents 2 consecutive guard plays
  const [enemyStatus, setEStatus] = useState(null)
  const [teamStatus, setTeamStatus] = useState({})  // { [uid]: { type, turns, stacks } }
  const [enemyShield, setEnemyShield] = useState(0) // boss 'shield' ability: reduces next player burst
  const [intent, setIntent]       = useState(null)
  const [enraged, setEnraged]     = useState(false)
  // ── Double battle (event 'double'): a second, simpler enemy fought at the same time
  const [enemy2, setEnemy2]       = useState(null)
  const [e2Hp, setE2Hp]           = useState(0)
  const [e2Max, setE2Max]         = useState(1)
  const [e2Intent, setE2Intent]   = useState(null)
  const [target, setTarget]       = useState(1)  // which enemy the player's attack hits (1 | 2)
  const [phase, setPhase]         = useState('init')
  const [turn, setTurn]           = useState(1)
  const [floatDmg, setFloatDmg]   = useState(null)
  const [log, setLog]             = useState([])
  const logRef = useRef(null)
  const [shake, setShake]         = useState(null)
  const [winSummary, setWinSummary] = useState(null)
  const [caught, setCaught]       = useState(null)
  const [throwUsed, setThrowUsed] = useState(false)
  const [rerolls, setRerolls]     = useState(MAX_REROLLS)
  const [showMoves, setShowMoves] = useState(false)
  const [focusedCard, setFocusedCard] = useState(null)
  const [selectedMon, setSelectedMon] = useState(null)
  const [benchedUid, setBenchedUid] = useState(null)   // event 'handicap_bench': mon can't attack for 5 turns
  const reviveUsed = useRef(false)
  const eventRef = useRef({ goldMult: 1, dmgMult: 1, forceDrop: false })

  const live = useRef({})
  live.current = { enemyHp, hp, guard, buff, enemyStatus, intent, enraged, teamStatus, enemyShield, benchedUid, enemy2, e2Hp, e2Intent, target }

  // True while both enemies (in a double battle) are down — or the single enemy is.
  const allEnemiesDead = (e1Hp, e2HpVal) => e1Hp <= 0 && (!live.current.enemy2 || e2HpVal <= 0)

  // Auto-scroll the combat log to bottom on each new entry (Lot 8)
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [log])

  // Full moveset for all team members (used in "Mes Attaques" panel)
  const allTeamMoves = useMemo(() => {
    return team.map(m => ({
      mon: m,
      moves: buildMoveset(m).slice(0, movesetSize(m)),
    }))
  }, [team])

  // Mons that can't act this turn (paralyzed) are excluded from the drawn hand,
  // unless that would leave no living mon able to play (avoid a soft-lock).
  const drawableTeam = (ts, hps) => {
    const filtered = team.filter(m => ts?.[m.uid]?.type !== 'paralyze' && m.uid !== live.current.benchedUid)
    const livingFiltered = filtered.filter(m => (hps?.[m.uid] ?? m.hp ?? 0) > 0)
    return livingFiltered.length ? filtered : team
  }

  const addLog = (m) => setLog(p => [...p.slice(-5), m])
  const doShake = (t, ms = 420) => { setShake(t); setTimeout(() => setShake(null), ms) }

  // ── Init ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const e = pendingEnemy || buildEnemy(wave, Math.random, asc)
    const ev = e.event || null   // wild-wave event (Lot D)
    eventRef.current = {
      goldMult: ev?.id === 'golden' ? 3 : ev?.id === 'frenzy' ? 1.5 : 1,
      dmgMult:  ev?.id === 'frenzy' ? 1.3 : 1,
      forceDrop: ev?.id === 'treasure',
    }
    // Event 'double': spawn a second, simpler enemy. Both are weakened so two
    // foes at once stay fair.
    let e2 = null
    if (ev?.id === 'double') {
      e2 = buildEnemy(wave, Math.random, asc)
      e2.event = null; e2.modifiers = []; e2.ability = null; e2.isBoss = false
      e.maxHp = Math.round(e.maxHp * 0.7); e.hp = e.maxHp
      e2.maxHp = Math.round(e2.maxHp * 0.7); e2.hp = e2.maxHp
    }
    live.current.enemy2 = e2
    const startHp = {}
    team.forEach(m => {
      let h = m.hp
      // Cursed/glass relics shave HP at the start of each wave.
      if (relicAgg.hpPenaltyPct) h = Math.round(h * (1 - relicAgg.hpPenaltyPct / 100))
      if (relicAgg.healWavePct) h = Math.min(m.maxHp, Math.round(h + m.maxHp * relicAgg.healWavePct / 100))
      if (ev?.id === 'healing_spring' && m.hp > 0) h = m.maxHp   // event: full heal at start
      startHp[m.uid] = m.hp > 0 ? Math.max(1, h) : h
    })
    // Event 'handicap_bench': one living mon can't attack for the first 5 turns.
    if (ev?.id === 'handicap_bench' && team.length > 1) {
      const livingAtStart = team.filter(m => startHp[m.uid] > 0)
      if (livingAtStart.length > 1) {
        const pick = livingAtStart[Math.floor(Math.random() * livingAtStart.length)]
        setBenchedUid(pick.uid)
        live.current.benchedUid = pick.uid
        addLog(`⛓️ ${pick.name} est indisponible (5 tours)`)
      }
    } else {
      setBenchedUid(null)
      live.current.benchedUid = null
    }
    if (ev) addLog(`${ev.icon} Événement : ${ev.name}`)
    setEnemy(e); setEnemyHp(e.hp); setEnemyMax(e.maxHp); setHp(startHp)
    setTeamStatus({})
    reviveUsed.current = false
    useGameStore.getState().markSpeciesSeen(e.id)   // Battle Pokédex tracking
    // Second enemy state (double battle)
    setEnemy2(e2); setTarget(1)
    if (e2) {
      setE2Hp(e2.hp); setE2Max(e2.maxHp)
      setE2Intent(computeIntent(e2, team, startHp, asc))
      useGameStore.getState().markSpeciesSeen(e2.id)
      live.current.e2Hp = e2.hp
      addLog(`⚔️ Deux ennemis : ${e.name} & ${e2.name} !`)
    }
    // Apply shield_start modifier
    const shieldMod = e.modifiers?.find(m => m.id === 'shield_start')
    setEnemyShield(shieldMod ? Math.round((e.level || 5) * 4) : 0)
    // Ascension 'Boss Enragés' : the boss starts in a rage.
    if (e.isBoss && asc.bossRageFromStart) { setEnraged(true); addLog(`😡 ${e.name} démarre enragé (Ascension) !`) }
    if (e.ability) addLog(`✨ Capacité du boss : ${ABILITY_LABEL[e.ability] || e.ability}`)

    addLog(e.isBoss ? `💀 BOSS : ${e.name} (Niv.${e.level}) surgit !`
      : kind === 'elite'   ? `⭐ ${e.name} d'élite apparaît !`
      : kind === 'trainer' ? `🧢 Dresseur envoie ${e.name} !`
      : `Un ${e.name} sauvage apparaît !`)

    setHand(drawHand(drawableTeam({}, startHp), startHp, handSize))
    setIntent(computeIntent(e, team, startHp, asc))
    setRerolls(MAX_REROLLS)
    setPhase('player')
  }, []) // eslint-disable-line


  // ── Swap hand (re-draw the shared hand from the team movepool) ───────
  function swapHand() {
    if (phase !== 'player' || rerolls <= 0) return
    setRerolls(r => r - 1)
    setHand(drawHand(drawableTeam(live.current.teamStatus, live.current.hp), live.current.hp, handSize))
    addLog(`🔄 Pokémon échangés`)
  }

  // Healing cleanses team afflictions (burn/poison/paralyze) — the counterplay.
  function cleanseStatuses() {
    if (Object.keys(live.current.teamStatus || {}).length === 0) return
    setTeamStatus({})
    addLog('💧 Les soins purifient les statuts de l\'équipe')
  }
  // Cleanse a single Pokémon's affliction (the one that was healed).
  function cleanseStatus(uid) {
    if (!live.current.teamStatus?.[uid]) return
    setTeamStatus(ts => { const next = { ...ts }; delete next[uid]; return next })
  }

  // ── Heal helpers ─────────────────────────────────────────────────────
  function healWeakest(teamHp, amount) {
    const alive = team.filter(m => (teamHp[m.uid] || 0) > 0)
    if (!alive.length) return teamHp
    const w = alive.reduce((a, b) => (teamHp[a.uid] / a.maxHp < teamHp[b.uid] / b.maxHp ? a : b))
    return { ...teamHp, [w.uid]: Math.min(w.maxHp, teamHp[w.uid] + amount) }
  }

  // ── Enemy turn (auto-runs after player picks a card) ──────────────────
  function runEnemyTurn(teamHp, eHp, currentGuard) {
    setPhase('enemy')
    const { enemyStatus: st0, intent: intent0, enraged: isRaged } = live.current
    let localEHp = eHp
    let localHp = { ...teamHp }
    let status = st0
    let skipEnemy = false
    const logs = []

    if (st0) {
      const def = STATUS_DEF[st0.type]
      if (st0.type === 'burn') {
        const d = Math.max(1, Math.round(enemyMax * def.tickPct))
        localEHp = Math.max(0, localEHp - d); logs.push(`🔥 ${enemy.name} subit ${d} (brûlure)`)
      } else if (st0.type === 'poison') {
        const stacks = st0.stacks || 1
        const d = Math.max(1, Math.round(enemyMax * def.tickPct * stacks))
        localEHp = Math.max(0, localEHp - d); logs.push(`☠️ ${enemy.name} subit ${d} (poison)`)
      } else if (st0.type === 'freeze') {
        skipEnemy = true; logs.push(`❄️ ${enemy.name} est gelé : tour sauté`)
      } else if (st0.type === 'paralyze' && Math.random() < def.skip) {
        skipEnemy = true; logs.push(`⚡ ${enemy.name} paralysé : attaque ratée`)
      }
      const turns = st0.turns - 1
      status = turns <= 0 ? null : { ...st0, turns, stacks: st0.type === 'poison' ? (st0.stacks || 1) + 1 : st0.stacks }
      if (!status) logs.push(`${enemy.name} se rétablit`)
    }

    // ── Team status ticks (burn/poison/paralyze inflicted by elites/bosses) ──
    const ts0 = live.current.teamStatus || {}
    let nextTeamStatus = {}
    for (const m of team) {
      const tsm = ts0[m.uid]
      if (!tsm || (localHp[m.uid] || 0) <= 0) continue
      const tdef = STATUS_DEF[tsm.type]
      if (tsm.type === 'burn' || tsm.type === 'poison') {
        const stacks = tsm.type === 'poison' ? (tsm.stacks || 1) : 1
        const d = Math.max(1, Math.round((m.maxHp || 20) * tdef.tickPct * stacks))
        localHp[m.uid] = Math.max(0, (localHp[m.uid] || 0) - d)
        logs.push(`${(tdef.label || '').split(' ')[0]} ${m.name} subit ${d}`)
      }
      const tt = tsm.turns - 1
      if (tt > 0) nextTeamStatus[m.uid] = { ...tsm, turns: tt, stacks: tsm.type === 'poison' ? (tsm.stacks || 1) + 1 : tsm.stacks }
      else logs.push(`${m.name} se libère de ${(tdef.label || '').split(' ')[1] || 'son état'}`)
    }

    setEnemyHp(localEHp); setEStatus(status); setHp(localHp)
    logs.forEach(addLog)

    // Win only when ALL enemies are down (primary may die to a DoT here).
    if (allEnemiesDead(localEHp, live.current.e2Hp)) { setTeamStatus(nextTeamStatus); setTimeout(() => win(localHp), 650); return }

    setTimeout(() => {
      let remainingGuard = currentGuard  // tracks shield left after absorption (persists to next turn)
      // The primary enemy only attacks if it's still alive.
      if (!skipEnemy && localEHp > 0) {
        // Enemy may strike one OR several Pokémon this turn.
        const fallback = intent0?.targets?.length
          ? intent0.targets
          : (intent0 ? [{ targetUid: intent0.targetUid, targetName: intent0.targetName, damage: intent0.damage }] : [])
        const hits = fallback.length ? fallback : (computeIntent(enemy, team, localHp, asc)?.targets || [])
        let dealtTotal = 0

        for (const hit of hits) {
          let targetUid = hit.targetUid
          if (!targetUid || (localHp[targetUid] || 0) <= 0) {
            const alive = team.filter(m => (localHp[m.uid] || 0) > 0)
            if (!alive.length) break
            targetUid = alive[Math.floor(Math.random() * alive.length)].uid
          }
          let dmg = hit.damage ?? 1
          if (isRaged || enraged) dmg = Math.round(dmg * 1.3)
          if (enemy.ability === 'enrage') dmg = Math.round(dmg * (1 + 0.08 * turn))
          if (enemy.modifiers?.some(m => m.id === 'attack_up')) dmg = Math.round(dmg * 1.25)
          if (eventRef.current.dmgMult !== 1) dmg = Math.round(dmg * eventRef.current.dmgMult)
          const absorbed = Math.min(remainingGuard, dmg)
          remainingGuard -= absorbed
          dmg = Math.max(0, dmg - absorbed)
          dealtTotal += dmg

          const tname = team.find(m => m.uid === targetUid)?.name
          localHp = { ...localHp, [targetUid]: Math.max(0, (localHp[targetUid] || 0) - dmg) }
          doShake(targetUid)
          if (absorbed > 0) addLog(`🛡️ Bouclier absorbe ${absorbed}`)
          addLog(`💥 ${enemy.name} inflige ${dmg} à ${tname}${(isRaged || enraged) ? ' [RAGE]' : ''}`)

          if ((localHp[targetUid] || 0) <= 0 && relicAgg.revive && !reviveUsed.current) {
            const m = team.find(t => t.uid === targetUid)
            localHp[targetUid] = Math.round(m.maxHp * relicAgg.revive / 100)
            reviveUsed.current = true
            addLog(`🪶 La Plume Phénix ranime ${tname} !`)
          }
        }

        // Boss 'lifedrain' ability: heal a fraction of the damage it dealt.
        if (enemy.ability === 'lifedrain' && dealtTotal > 0) {
          const heal = Math.round(dealtTotal * 0.25)
          localEHp = Math.min(enemyMax, localEHp + heal)
          setEnemyHp(localEHp)
          addLog(`🩸 ${enemy.name} draine ${heal} PV`)
        }
        // Boss 'shield' ability: erect a periodic barrier on the next player burst.
        if (enemy.ability === 'shield' && turn % 3 === 0) {
          const sh = Math.round((enemy.level || 5) * 3)
          setEnemyShield(sh)
          addLog(`🛡️ ${enemy.name} érige une carapace (absorbe ${sh})`)
        }
        // Apply a freshly inflicted status to the targeted team member.
        if (intent0?.applyStatus) {
          const as = intent0.applyStatus
          if ((localHp[as.targetUid] || 0) > 0) {
            const sdef = STATUS_DEF[as.type]
            nextTeamStatus[as.targetUid] = { type: as.type, turns: sdef.turns, stacks: 1 }
            addLog(`${sdef.label} infligé à ${team.find(t => t.uid === as.targetUid)?.name} !`)
          }
        }
      }

      // ── Second enemy (double battle) attacks too, with its own intent ──
      const foe2 = live.current.enemy2
      if (foe2 && live.current.e2Hp > 0) {
        const i2 = live.current.e2Intent || computeIntent(foe2, team, localHp, asc)
        const hits2 = i2?.targets?.length ? i2.targets : (i2 ? [{ targetUid: i2.targetUid, targetName: i2.targetName, damage: i2.damage }] : [])
        for (const hit of hits2) {
          let targetUid = hit.targetUid
          if (!targetUid || (localHp[targetUid] || 0) <= 0) {
            const alive = team.filter(m => (localHp[m.uid] || 0) > 0)
            if (!alive.length) break
            targetUid = alive[Math.floor(Math.random() * alive.length)].uid
          }
          let dmg = hit.damage ?? 1
          if (eventRef.current.dmgMult !== 1) dmg = Math.round(dmg * eventRef.current.dmgMult)
          const absorbed = Math.min(remainingGuard, dmg)
          remainingGuard -= absorbed
          dmg = Math.max(0, dmg - absorbed)
          const tname = team.find(m => m.uid === targetUid)?.name
          localHp = { ...localHp, [targetUid]: Math.max(0, (localHp[targetUid] || 0) - dmg) }
          doShake(targetUid)
          if (absorbed > 0) addLog(`🛡️ Bouclier absorbe ${absorbed}`)
          addLog(`💥 ${foe2.name} inflige ${dmg} à ${tname}`)
          if ((localHp[targetUid] || 0) <= 0 && relicAgg.revive && !reviveUsed.current) {
            const m = team.find(t => t.uid === targetUid)
            localHp[targetUid] = Math.round(m.maxHp * relicAgg.revive / 100)
            reviveUsed.current = true
            addLog(`🪶 La Plume Phénix ranime ${tname} !`)
          }
        }
      }

      setHp(localHp)
      setTeamStatus(nextTeamStatus)
      const anyAlive = team.some(m => (localHp[m.uid] || 0) > 0)
      if (!anyAlive) { setTimeout(() => lose(localHp), 450); return }

      // New turn — paralyzed mons are excluded from the drawn hand.
      setTimeout(() => {
        let benchCleared = false
        setTurn(t => {
          const nt = t + 1
          if (nt >= 6 && live.current.benchedUid) benchCleared = true
          return nt
        })
        if (benchCleared) { setBenchedUid(null); live.current.benchedUid = null; addLog('⛓️ Ton Pokémon est de nouveau disponible !') }
        setGuard(remainingGuard)   // shield persists between turns (reset only in resetBattleState)
        setLastCardKind(null)      // allow guard again after one non-guard turn
        setHand(drawHand(drawableTeam(nextTeamStatus, localHp), localHp, handSize))
        setIntent(localEHp > 0 ? computeIntent(enemy, team, localHp, asc) : null)
        if (live.current.enemy2 && live.current.e2Hp > 0) {
          const ni2 = computeIntent(live.current.enemy2, team, localHp, asc)
          setE2Intent(ni2); live.current.e2Intent = ni2
        } else { setE2Intent(null) }
        // If the player's current target is dead, switch to the surviving enemy.
        if (live.current.target === 1 && localEHp <= 0) setTarget(2)
        if (live.current.target === 2 && live.current.e2Hp <= 0) setTarget(1)
        setPhase('player')
      }, 480)
    }, 720)
  }

  // ── Play a card (1 card per turn, no energy) ────────────────────────
  function playCard(card) {
    if (phase !== 'player') return
    const caster = team.find(m => m.uid === card.ownerUid)
    if (!caster || (live.current.hp[caster.uid] || 0) <= 0) return

    // Prevent 2 consecutive guard plays in a row
    if (card.kind === 'guard' && lastCardKind === 'guard') {
      addLog('🚫 Tu ne peux pas jouer 2 boucliers d\'affilé !')
      return
    }
    setLastCardKind(card.kind)

    // Clear the hand immediately (card has been played)
    setHand([])

    const { enemyHp: eHp0, hp: hp0, buff: buff0, guard: guard0 } = live.current

    let finalHp = hp0
    let finalEHp = eHp0
    let finalGuard = guard0

    // ── Double battle: route the attack to enemy 2 when it's the chosen target
    //    (or when the primary enemy is already down). Simpler resolution: the
    //    companion has no shield/rage/abilities.
    const e2Alive0 = live.current.enemy2 && live.current.e2Hp > 0
    const e1Alive0 = eHp0 > 0
    const hitE2 = (card.kind === 'attack' || card.kind === 'drain') && e2Alive0 && (live.current.target === 2 || !e1Alive0)
    if (hitE2) {
      const foe = live.current.enemy2
      let { dmg, eff } = moveDamage(card, caster, foe, relicAgg)
      if (caster.shiny) dmg = Math.round(dmg * 1.15)
      if (caster.holo)  dmg = Math.round(dmg * 1.20)
      let crit = false
      if (buff0 > 0) { dmg = Math.round(dmg * (1 + buff0)); setBuff(0) }
      if (Math.random() < (relicAgg.critChance || 0)) { dmg = Math.round(dmg * 2); crit = true }
      const newE2 = Math.max(0, live.current.e2Hp - dmg)
      setE2Hp(newE2); live.current.e2Hp = newE2
      setFloatDmg({ dmg, crit, color: TYPE_COLORS[card.type] || '#fff', eff, slot: 2 })
      doShake('enemy2')
      setTimeout(() => setFloatDmg(null), 900)
      addLog(`${card.emoji} ${caster.name} · ${card.name} → ${foe.name} ${dmg}${crit ? ' CRIT!' : ''}`)
      if (card.kind === 'drain') {
        const lifesteal = Math.max(1, Math.round(dmg * 0.5 * (caster.holo ? 1.20 : 1)))
        finalHp = { ...hp0, [caster.uid]: Math.min(caster.maxHp, (hp0[caster.uid] || 0) + lifesteal) }
        cleanseStatus(caster.uid); addLog(`🌿 ${caster.name} draine ${lifesteal} PV`)
      }
      if (relicAgg.lifestealPct) finalHp = healWeakest(finalHp, Math.round(dmg * relicAgg.lifestealPct / 100))
      if (finalHp !== hp0) setHp(finalHp)
      if (newE2 <= 0) addLog(`✅ ${foe.name} vaincu !`)
      if (allEnemiesDead(eHp0, newE2)) { setTimeout(() => win(finalHp), 650); return }
      setTimeout(() => runEnemyTurn(finalHp, eHp0, finalGuard), 300)
      return
    }

    if (card.kind === 'attack' || card.kind === 'drain') {
      let { dmg, eff } = moveDamage(card, caster, enemy, relicAgg)
      if (caster.shiny) dmg = Math.round(dmg * 1.15)
      if (caster.holo)  dmg = Math.round(dmg * 1.20)
      let crit = false
      if (buff0 > 0) { dmg = Math.round(dmg * (1 + buff0)); setBuff(0) }
      if (Math.random() < (relicAgg.critChance || 0)) { dmg = Math.round(dmg * 2); crit = true }
      // Enemy type modifiers: resist (×0.5) or weakness (×2)
      for (const mod of enemy.modifiers || []) {
        if (mod.param === card.type) {
          if (mod.id === 'type_resist') { dmg = Math.round(dmg * 0.5); addLog(`🔒 Résistance ${TYPE_LABELS_FR[mod.param] || mod.param}`) }
          if (mod.id === 'type_weak')   { dmg = Math.round(dmg * 2);   addLog(`💥 Fragilité ${TYPE_LABELS_FR[mod.param] || mod.param} !`) }
        }
      }
      // Boss 'shield' ability absorbs part of this burst, then breaks.
      if (live.current.enemyShield > 0) {
        const blocked = Math.min(live.current.enemyShield, dmg)
        dmg = Math.max(0, dmg - blocked)
        setEnemyShield(0)
        addLog(`🛡️ La carapace de ${enemy.name} absorbe ${blocked} !`)
      }

      const newE = Math.max(0, eHp0 - dmg)
      finalEHp = newE
      setEnemyHp(newE)
      setFloatDmg({ dmg, crit, color: TYPE_COLORS[card.type] || '#fff', eff })
      doShake('enemy')
      setTimeout(() => setFloatDmg(null), 900)
      addLog(`${card.emoji} ${caster.name} · ${card.name} → ${dmg}${crit ? ' CRIT!' : ''}${eff >= 2 ? ' ⚡efficace' : eff < 1 ? ' ·peu efficace' : ''}`)

      if (card.kind === 'drain') {
        // Lifesteal: the CASTER recovers half the damage dealt (no team-wide heal).
        const lifesteal = Math.max(1, Math.round(dmg * 0.5 * (caster.holo ? 1.20 : 1)))
        finalHp = { ...hp0, [caster.uid]: Math.min(caster.maxHp, (hp0[caster.uid] || 0) + lifesteal) }
        cleanseStatus(caster.uid)
        addLog(`🌿 ${caster.name} draine ${lifesteal} PV`)
      }
      if (relicAgg.lifestealPct) finalHp = healWeakest(finalHp, Math.round(dmg * relicAgg.lifestealPct / 100))
      if (finalHp !== hp0) setHp(finalHp)

      if (enemy.isBoss && newE <= enemyMax * 0.5 && !live.current.enraged) {
        setEnraged(true); addLog(`😡 ${enemy.name} entre en RAGE !`)
      }
      if (newE <= 0 && live.current.enemy2) addLog(`✅ ${enemy.name} vaincu !`)
      if (allEnemiesDead(newE, live.current.e2Hp)) { setTimeout(() => win(finalHp), 650); return }

    } else if (card.kind === 'guard') {
      const g = guardValue(card, caster, relicAgg)
      const newG = guard0 + g
      setGuard(newG)
      finalGuard = newG
      addLog(g > 0
        ? `${card.emoji} ${caster.name} · ${card.name} → bouclier +${g}`
        : `🚫 ${caster.name} · ${card.name} → bouclier annulé (malédiction)`)

    } else if (card.kind === 'heal') {
      // Heals the single weakest living ally (no longer the whole team).
      const h = Math.round(healValue(card, caster, relicAgg) * (caster.holo ? 1.20 : 1))
      const alive = team.filter(m => (hp0[m.uid] || 0) > 0)
      const weakest = alive.length
        ? alive.reduce((a, b) => (hp0[a.uid] / a.maxHp < hp0[b.uid] / b.maxHp ? a : b))
        : caster
      finalHp = { ...hp0, [weakest.uid]: Math.min(weakest.maxHp, (hp0[weakest.uid] || 0) + h) }
      setHp(finalHp)
      cleanseStatus(weakest.uid)
      addLog(`${card.emoji} ${caster.name} · ${card.name} → +${h} PV à ${weakest.name}`)

    } else if (card.kind === 'status') {
      const def = STATUS_DEF[card.status]
      const trait = getTrait(caster.id, caster.types)
      const turns = def.turns + (trait.statusTurns || 0)
      setEStatus(prev => {
        if (prev && prev.type === card.status) return { ...prev, turns }
        return { type: card.status, turns, stacks: card.status === 'poison' ? 1 : 0 }
      })
      addLog(`${card.emoji} ${caster.name} · ${card.name} → ${enemy.name} ${def.label} !`)

    } else if (card.kind === 'buff') {
      const trait = getTrait(caster.id, caster.types)
      setBuff((card.bonus || 0.7) + (trait.buffPlus || 0))
      addLog(`${card.emoji} ${caster.name} · ${card.name} → prochaine attaque renforcée !`)
    }

    // Automatically trigger enemy turn after the card resolves
    setTimeout(() => runEnemyTurn(finalHp, finalEHp, finalGuard), 300)
  }

  // ── Win / Lose ──────────────────────────────────────────────────────
  function win(finalHp) {
    const doubleBonus = live.current.enemy2 ? 1.5 : 1   // two foes → more rewards
    const xpMult = (relicAgg.xpMult || 1) * (enemy.modifiers?.some(m => m.id === 'xp_gift') ? 1.5 : 1) * doubleBonus
    const xpEach = Math.round(xpForWin(enemy, wave) * xpMult)
    const events = []
    const xpRows = []   // per-mon XP animation data for the win panel
    // Level cap: Pokémon can't exceed wave + 3 to prevent easy snowballing
    const levelCap = Math.max(5, wave + 3)
    const updated = team.map(m => {
      const copy = { ...m, hp: finalHp[m.uid] ?? m.hp }
      const alive = copy.hp > 0
      const lvlBefore = copy.level
      const xpBefore = copy.xp || 0
      if (alive) {
        const ev = gainXp(copy, xpEach)
        if (copy.level > levelCap) {
          copy.level = levelCap
          copy.xp = 0
          recomputeStats(copy)
          copy.hp = Math.min(copy.hp, copy.maxHp)
        }
        if (ev.levels.length || ev.evolutions.length) events.push({ name: copy.name, from: lvlBefore, to: copy.level, evo: ev.evolutions })
      }
      const leveled = copy.level > lvlBefore
      xpRows.push({
        uid: copy.uid, name: copy.name, id: copy.id, shiny: copy.shiny, holo: copy.holo,
        alive, gained: alive ? xpEach : 0,
        levelBefore: lvlBefore, levelAfter: copy.level, leveled,
        startPct: leveled ? 0 : Math.min(1, xpBefore / xpToNext(lvlBefore)),
        endPct: Math.min(1, (copy.xp || 0) / xpToNext(copy.level)),
      })
      return copy
    })
    // Attach evolution names to rows.
    for (const ev of events) {
      if (!ev.evo?.length) continue
      const row = xpRows.find(r => r.name === ev.evo[0].to)
      if (row) row.evoTo = ev.evo[0].to
    }
    let goldGain = goldForWin(wave, asc) + (relicAgg.goldWin || 0)
    if (enemy.modifiers?.some(m => m.id === 'gold_gift')) goldGain = Math.round(goldGain * 1.5)
    if (eventRef.current.goldMult !== 1) goldGain = Math.round(goldGain * eventRef.current.goldMult)
    if (doubleBonus !== 1) goldGain = Math.round(goldGain * doubleBonus)
    run.commitTeam(updated); run.addGold(goldGain); run.setOutcome('win')
    const g = useGameStore.getState()
    g.recordStat('battlesWon'); g.reportQuest('win', 1); g.reportQuest('wave', wave)

    // Random combat drops (~30% chance of something). Returns {itemId|ball|ct, n, label}.
    const drops = []
    const dropTable = [
      { w: 3,  ct: true },
      { w: 8,  item: 'potion',       n: 1 },
      { w: 5,  item: 'super-potion', n: 1 },
      { w: 3,  item: 'revive',       n: 1 },
      { w: 2,  item: 'nugget',       n: 1 },
      { w: 2,  item: 'hp-up',        n: 1 },
      { w: 2,  item: 'protein',      n: 1 },
      { w: 2,  item: 'carbos',       n: 1 },
      { w: 4,  ball: 'poke-ball',    n: 1 },
      { w: 3,  ball: 'great-ball',   n: 1 },
    ]
    if (eventRef.current.forceDrop || Math.random() < 0.30) {
      const total = dropTable.reduce((s, d) => s + d.w, 0)
      let roll = Math.random() * total
      const d = dropTable.find(x => (roll -= x.w) <= 0) || dropTable[0]
      if (d.ct) {
        const ct = rollRandomCT()
        g.addCT(ct.id)
        drops.push({ slug: null, emoji: '🎴', label: `CT${ct.num} ${ct.name}` })
      } else if (d.item) {
        const c = CONSUMABLE_BY_ID[d.item]
        run.addItem(d.item, d.n)
        drops.push({ slug: c.slug, emoji: c.emoji, label: `${c.name} ×${d.n}` })
      } else if (d.ball) {
        const b = BALL_BY_ID[d.ball]
        run.addBall(d.ball, d.n)
        drops.push({ slug: b.slug, emoji: b.emoji, label: `${b.name} ×${d.n}` })
      }
    }

    // Track species seen/defeated for the Battle Pokédex (Progression).
    g.markSpeciesDefeated(enemy.id)
    if (live.current.enemy2) g.markSpeciesDefeated(live.current.enemy2.id)

    setWinSummary({ xpEach, events, goldGain, drops, xpRows })
    setPhase('win')
    sfx('win')
    addLog(`✅ ${enemy.name} vaincu !`)
    drops.forEach(d => addLog(`🎁 ${d.label}`))
  }

  function lose(finalHp) {
    run.commitTeam(team.map(m => ({ ...m, hp: finalHp[m.uid] ?? m.hp })))
    run.setOutcome('lose')
    sfx('lose')
    setPhase('lose')
  }

  // ── Catch ───────────────────────────────────────────────────────────
  function tryCatch(ballId = 'poke-ball') {
    if (caught || throwUsed) return
    const b = BALL_BY_ID[ballId]
    if (!b) return
    if (enemy.isBoss && b.rate < 1) return
    if ((run.balls?.[ballId] || 0) <= 0) return
    if (!run.useBall(ballId)) return
    setThrowUsed(true)
    if (Math.random() < (b.rate ?? 0)) {
      setCaught({ ok: true, ...run.catchEnemy(enemy, ballId) })
      const g = useGameStore.getState()
      g.recordStat('catches'); g.reportQuest('catch', 1)
    } else setCaught({ ok: false, name: enemy.name })
  }

  function resetBattleState(newEnemy) {
    setEnemy(newEnemy)
    useGameStore.getState().markSpeciesSeen(newEnemy.id)
    setEnemyHp(newEnemy.maxHp)
    setEnemyMax(newEnemy.maxHp)
    setEStatus(null)
    const shieldMod = newEnemy.modifiers?.find(m => m.id === 'shield_start')
    setEnemyShield(shieldMod ? Math.round((newEnemy.level || 5) * 4) : 0)
    setEnraged(false)
    setGuard(0)
    setLastCardKind(null)
    setBuff(0)
    setPhase('player')
    setTurn(1)
    setWinSummary(null)
    setCaught(null)
    setThrowUsed(false)
    setFloatDmg(null)
    setShake(null)
    setTeamStatus({})
    setRerolls(MAX_REROLLS)
    setBenchedUid(null); live.current.benchedUid = null
    setEnemy2(null); setE2Hp(0); setE2Intent(null); setTarget(1)
    live.current.enemy2 = null; live.current.e2Hp = 0; live.current.e2Intent = null
    eventRef.current = { goldMult: 1, dmgMult: 1, forceDrop: false }
    reviveUsed.current = false
    const currentHp = live.current.hp
    setHand(drawHand(drawableTeam({}, currentHp), currentHp, handSize))
    setIntent(computeIntent(newEnemy, team, currentHp, asc))
    addLog(`${run.trainerName ? run.trainerName + ' envoie ' : ''}${newEnemy.name} !`)
  }

  function continueAfterWin() {
    // Trainer still has more Pokémon to send?
    const nextTrainerEnemy = run.advanceTrainer()
    if (nextTrainerEnemy) {
      resetBattleState(nextTrainerEnemy)
      return
    }
    // League: next trainer in the gauntlet?
    const nextLeagueEnemy = run.advanceLeague()
    if (nextLeagueEnemy) {
      resetBattleState(nextLeagueEnemy)
      return
    }
    // Normal flow
    run.advanceWave()
    if (enemy.isBoss) {
      // Clearing a boss at the current ceiling unlocks the next Ascension tier.
      useGameStore.getState().unlockNextAscension(ascensionLevel || 0)
      navigate('runshop')
    } else {
      const newWins = run.recordRunWin()
      if (newWins % 5 === 0) navigate('milestone')
      else navigate('run')
    }
  }
  function continueAfterLose() { run.endRun(); navigate('runend') }

  if (!enemy || phase === 'init') {
    return <div className="min-h-screen bg-game-bg flex items-center justify-center"><div className="text-4xl animate-spin">⚡</div></div>
  }

  const typeColor = TYPE_COLORS[enemy.types?.[0]] || '#1e293b'
  const livingTeam = team.filter(m => (hp[m.uid] ?? 0) > 0)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: biome.bg }}>
      {/* Header */}
      <div className="px-4 pt-10 pb-2 border-b border-white/5" style={{ background: 'rgba(10,10,20,0.55)' }}>
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <p className="text-[11px] text-gray-500 font-bold uppercase">
              Vague {wave} · {kind === 'boss' ? '💀 BOSS' : kind === 'elite' ? '⭐ Élite' : kind === 'league' ? '🏆 LIGUE' : (kind === 'trainer' || run.trainerName) ? '🧢 Dresseur' : '🌿 Sauvage'}
            </p>
            {run.trainerName ? (
              <p className="text-[10px] font-bold text-blue-300">
                {run.trainerName}
                {run.trainerTotalParty > 1 && (
                  <span className="text-gray-500 ml-1">· Pokémon {run.trainerKilled + 1}/{run.trainerTotalParty}</span>
                )}
                {run.leagueQueue?.length > 0 && (
                  <span className="text-amber-400 ml-1">· Dresseur {run.leagueIndex + 1}/{run.leagueQueue.length}</span>
                )}
              </p>
            ) : (
              <p className="text-[10px] text-gray-600">Tour {turn}</p>
            )}
          </div>
          <div className="flex gap-1 items-center">
            {team.map(m => (
              <div key={m.uid} className="w-2.5 h-2.5 rounded-full" style={{ background: (hp[m.uid] ?? 0) > 0 ? '#4ade80' : '#374151' }} />
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-w-lg mx-auto w-full px-3 py-3 flex flex-col gap-3 pb-72">

        {/* Double battle: two enemy panels, tap to choose the attack target */}
        {enemy2 && (
          <div className="grid grid-cols-2 gap-2">
            {[{ slot: 1, foe: enemy, hpV: enemyHp, maxV: enemyMax }, { slot: 2, foe: enemy2, hpV: e2Hp, maxV: e2Max }].map(({ slot, foe, hpV, maxV }) => {
              const dead = hpV <= 0
              const isTarget = target === slot && !dead
              const tcol = TYPE_COLORS[foe.types?.[0]] || '#1e293b'
              const shakeKey = slot === 1 ? 'enemy' : 'enemy2'
              return (
                <button key={slot} onClick={() => !dead && setTarget(slot)}
                  className={`relative rounded-2xl p-3 border flex flex-col items-center transition-all ${shake === shakeKey ? 'animate-shake' : ''}`}
                  style={{ background: `linear-gradient(160deg, ${tcol}33, #0f172a)`, borderColor: isTarget ? '#fbbf24' : tcol + '55', opacity: dead ? 0.4 : 1, boxShadow: isTarget ? '0 0 12px #fbbf2466' : 'none' }}>
                  {isTarget && <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-[8px] font-black px-2 py-0.5 rounded-full">🎯 CIBLE</div>}
                  <div className="relative">
                    <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${foe.id}.png`}
                      alt={foe.name} className={`w-16 h-16 object-contain ${dead ? 'grayscale' : ''}`}
                      onError={e => { e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${foe.id}.png` }} />
                    {floatDmg && (floatDmg.slot === slot || (!floatDmg.slot && slot === 1)) && (
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 font-black text-lg pointer-events-none animate-bounce" style={{ color: floatDmg.color }}>-{floatDmg.dmg}{floatDmg.crit ? '!' : ''}</div>
                    )}
                  </div>
                  <p className="text-white font-bold text-[11px] truncate w-full text-center">{foe.name}</p>
                  <p className="text-[8px] text-gray-500">Niv.{foe.level}</p>
                  <div className="flex gap-1 my-1 flex-wrap justify-center">{(foe.types || ['normal']).map(t => <TypeBadge key={t} type={t} size="xs" />)}</div>
                  <div className="w-full"><HPBar hp={hpV} maxHp={maxV} showNumbers size="sm" /></div>
                </button>
              )
            })}
          </div>
        )}

        {/* Single enemy panel (hidden during double battles) — clickable for detail */}
        {!enemy2 && (
        <div className={`rounded-2xl p-4 border relative cursor-pointer active:scale-[0.99] transition-transform ${shake === 'enemy' ? 'animate-shake' : ''} ${enraged ? 'animate-pulse' : ''}`}
          style={{ background: `linear-gradient(160deg, ${typeColor}33, #0f172a)`, borderColor: enraged ? '#ef4444aa' : typeColor + '55' }}
          onClick={() => setSelectedMon({ kind: 'enemy' })}>
          {enemy.isBoss && <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full">💀 BOSS</div>}
          {enraged && <div className="absolute -top-2 right-3 bg-orange-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">😡 RAGE</div>}
          {enemy.ability && <div className="absolute -top-2 left-3 bg-purple-700 text-white text-[9px] font-black px-2 py-0.5 rounded-full" title={ABILITY_LABEL[enemy.ability]}>{(ABILITY_LABEL[enemy.ability] || '').split(' ')[0]} {enemy.ability}</div>}
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${enemy.id}.png`}
                alt={enemy.name} className="w-20 h-20 object-contain drop-shadow-lg"
                onError={e => { e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${enemy.id}.png` }} />
              {floatDmg && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 font-black text-xl pointer-events-none animate-bounce" style={{ color: floatDmg.color }}>
                  -{floatDmg.dmg}{floatDmg.crit ? '!' : ''}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-white text-sm">{enemy.name}</p>
                <p className="text-xs text-gray-500">Niv.{enemy.level}</p>
                {enemyStatus && (
                  <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={{ color: STATUS_DEF[enemyStatus.type]?.color, background: STATUS_DEF[enemyStatus.type]?.color + '22' }}>
                    {STATUS_DEF[enemyStatus.type]?.label} {enemyStatus.turns}t
                  </span>
                )}
              </div>
              <div className="flex gap-1 my-1 items-center">
                {(enemy.types || ['normal']).map(t => <TypeBadge key={t} type={t} size="xs" />)}
                {enemyShield > 0 && <span className="text-[9px] font-bold text-cyan-300 ml-1">🛡️ {enemyShield}</span>}
              </div>
              <HPBar hp={enemyHp} maxHp={enemyMax} showNumbers size="md" />
            </div>
          </div>
          {/* Weaknesses/resistances moved to the detail modal (tap the Pokémon). */}
          {/* Modifier badges — red = buff enemy, blue = nerf enemy */}
          {enemy.modifiers?.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              {enemy.modifiers.map((mod, i) => {
                const def = MODIFIER_DEF[mod.id]
                if (!def) return null
                return (
                  <div key={i} className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5"
                    style={{ background: mod.isNerf ? '#3b82f622' : '#ef444422', border: `1px solid ${mod.isNerf ? '#3b82f666' : '#ef444466'}` }}
                    title={def.name}>
                    <span className="text-[10px]">{def.icon}</span>
                  </div>
                )
              })}
              <span className="text-[8px] text-gray-600 italic">Tape pour détails</span>
            </div>
          )}
        </div>
        )}

        {/* Intent */}
        {phase !== 'win' && phase !== 'lose' && intent && (
          <div className="rounded-xl px-3 py-2.5 border flex items-center justify-between gap-2"
            style={{ background: (intent.kind === 'heavy' ? '#ef4444' : TYPE_COLORS[intent.type] || '#64748b') + '14', borderColor: (intent.kind === 'heavy' ? '#ef4444' : TYPE_COLORS[intent.type] || '#64748b') + '55' }}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl">{intent.kind === 'heavy' ? '🌋' : intent.multi ? '🎯' : '⚔️'}</span>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">
                  Prochain coup ennemi{intent.multi ? ` · ${intent.targets.length} cibles` : ''}
                </p>
                <p className="text-xs text-white font-bold truncate">
                  {intent.moveName || (intent.kind === 'heavy' ? 'Charge puissante' : 'Attaque')}
                  {' → '}
                  {(intent.targets || []).map(t => t.targetName).join(', ')}
                  {intent.eff >= 2 && <span className="text-red-300"> ⚡</span>}
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-black text-lg" style={{ color: intent.kind === 'heavy' ? '#f87171' : '#e2e8f0' }}>
                -{(intent.targets || []).reduce((s, t) => s + t.damage, 0)}
              </p>
              {guard > 0 && <p className="text-[9px] text-cyan-300">🛡️ {guard} absorbé</p>}
            </div>
          </div>
        )}

        {/* Second enemy intent (double battle) */}
        {phase !== 'win' && phase !== 'lose' && enemy2 && e2Hp > 0 && e2Intent && (
          <div className="rounded-xl px-3 py-2 border flex items-center justify-between gap-2"
            style={{ background: (TYPE_COLORS[e2Intent.type] || '#64748b') + '12', borderColor: (TYPE_COLORS[e2Intent.type] || '#64748b') + '44' }}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base">⚔️</span>
              <p className="text-[11px] text-white font-bold truncate">
                {enemy2.name} → {(e2Intent.targets || []).map(t => t.targetName).join(', ')}
              </p>
            </div>
            <p className="font-black text-sm text-gray-200">-{(e2Intent.targets || []).reduce((s, t) => s + t.damage, 0)}</p>
          </div>
        )}

        {phase === 'enemy' && (
          <div className="rounded-xl py-3 text-center border border-red-900/40 bg-red-900/10">
            <p className="text-sm font-bold text-red-400 animate-pulse">⚔️ {enemy.name} riposte…</p>
          </div>
        )}

        {/* Team — responsive to team size, clickable for detail */}
        {phase !== 'win' && phase !== 'lose' && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] text-gray-600 font-bold uppercase">Ton équipe</p>
              <div className="flex items-center gap-2">
                {guard > 0 && <span className="text-[10px] font-bold text-cyan-300">🛡️ {guard}</span>}
                {buff > 0 && <span className="text-[10px] font-bold text-orange-300">💪 +{Math.round(buff * 100)}%</span>}
              </div>
            </div>

            {team.length === 1 ? (
              /* Single mon: mirror the enemy panel */
              (() => {
                const m = team[0]
                const h = hp[m.uid] ?? 0, maxH = m.maxHp || 1
                const alive = h > 0
                const tc = TYPE_COLORS[m.types?.[0]] || '#1e293b'
                const borderCol = m.holo ? '#c084fc88' : m.shiny ? '#fbbf2488' : tc + '66'
                return (
                  <div className={`rounded-2xl p-4 border cursor-pointer active:scale-[0.99] transition-transform ${shake === m.uid ? 'animate-shake' : ''}`}
                    style={{ background: `linear-gradient(160deg, ${tc}22, #0f172a)`, borderColor: alive ? borderCol : '#1a1a2e', opacity: alive ? 1 : 0.5 }}
                    onClick={() => setSelectedMon({ kind: 'ally', mon: m })}>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${m.shiny ? 'shiny/' : ''}${m.id}.png`}
                          alt={m.name} className={`w-20 h-20 object-contain pixelated ${!alive ? 'grayscale' : ''}`} loading="lazy" />
                        {m.shiny && <span className="absolute -top-1 -right-1 text-sm leading-none">✨</span>}
                        {m.holo  && <span className="absolute -top-1 -left-1 text-sm leading-none">🌈</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <p className="font-bold text-white text-sm truncate">{m.name}</p>
                          <p className="text-[11px] font-bold text-gray-400 flex-shrink-0">Niv.{m.level}</p>
                        </div>
                        <div className="flex gap-1 items-center flex-wrap mb-1.5">
                          {(m.types || ['normal']).map(t => <TypeBadge key={t} type={t} size="xs" />)}
                          {teamStatus[m.uid] && alive && (
                            <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={{ color: STATUS_DEF[teamStatus[m.uid].type]?.color, background: STATUS_DEF[teamStatus[m.uid].type]?.color + '22' }}>
                              {STATUS_DEF[teamStatus[m.uid].type]?.label?.split(' ')[0]}
                            </span>
                          )}
                        </div>
                        <HPBar hp={h} maxHp={maxH} showNumbers size="md" />
                      </div>
                    </div>
                  </div>
                )
              })()
            ) : (
              /* Multiple mons: equal-width cards, sprite size scales with count */
              <div className="flex gap-1.5">
                {team.map(m => {
                  const h = hp[m.uid] ?? 0, maxH = m.maxHp || 1
                  const alive = h > 0
                  const tc = TYPE_COLORS[m.types?.[0]] || '#1e293b'
                  const borderCol = m.holo ? '#c084fc66' : m.shiny ? '#fbbf2466' : tc + '44'
                  const spriteClass = team.length <= 2 ? 'w-14 h-14' : team.length === 3 ? 'w-11 h-11' : 'w-9 h-9'
                  return (
                    <div key={m.uid}
                      className={`flex-1 rounded-xl p-2 flex flex-col items-center gap-1 border cursor-pointer active:scale-95 transition-transform ${shake === m.uid ? 'animate-shake' : ''}`}
                      style={{ background: `linear-gradient(160deg, ${tc}15, #0f172a)`, borderColor: alive ? borderCol : '#1a1a2e', opacity: alive ? 1 : 0.4 }}
                      onClick={() => setSelectedMon({ kind: 'ally', mon: m })}>
                      <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${m.shiny ? 'shiny/' : ''}${m.id}.png`}
                        alt={m.name} className={`${spriteClass} object-contain pixelated ${!alive ? 'grayscale' : ''}`} loading="lazy" />
                      <p className="text-[8px] text-white font-bold truncate w-full text-center leading-none">{m.name}</p>
                      <p className="text-[8px] text-gray-400 tabular-nums leading-none">{h}/{maxH}</p>
                      <div className="flex gap-0.5 items-center">
                        {m.shiny && <span className="text-[7px]">✨</span>}
                        {m.holo  && <span className="text-[7px]">🌈</span>}
                        {teamStatus[m.uid] && alive && (
                          <span className="text-[8px] leading-none" style={{ color: STATUS_DEF[teamStatus[m.uid].type]?.color }}>
                            {STATUS_DEF[teamStatus[m.uid].type]?.label?.split(' ')[0]}
                          </span>
                        )}
                      </div>
                      <div className="w-full h-1 rounded-full bg-gray-800">
                        <div className="h-full rounded-full" style={{ width: `${Math.max(0, (h / maxH) * 100)}%`, background: h / maxH > 0.5 ? '#4ade80' : h / maxH > 0.25 ? '#fbbf24' : '#ef4444' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Win panel */}
        {phase === 'win' && winSummary && (
          <div className="rounded-2xl p-4 border border-green-700/50 bg-green-900/15 text-center">
            <p className="text-3xl mb-1">{enemy.isBoss ? '🏆' : '✅'}</p>
            <p className="font-game text-sm text-green-400">Victoire !</p>
            <div className="flex justify-center gap-4 mt-2 text-xs">
              <span className="text-yellow-300">+{winSummary.goldGain} 💰</span>
              <span className="text-cyan-300">+{winSummary.xpEach} XP</span>
            </div>

            {/* Drops earned */}
            {winSummary.drops?.length > 0 && (
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {winSummary.drops.map((d, i) => (
                  <div key={i} className="flex items-center gap-1.5 rounded-lg px-2 py-1 bg-black/30 border border-white/10">
                    {d.slug
                      ? <ItemSprite slug={d.slug} emoji={d.emoji} size={18} />
                      : <span className="text-sm">{d.emoji}</span>}
                    <span className="text-[10px] font-bold text-gray-200">{d.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Per-Pokémon XP gain — animated bars + level-up flash */}
            {winSummary.xpRows?.length > 0 && (
              <div className="mt-3 space-y-1.5 text-left">
                {winSummary.xpRows.map(row => <XpGainRow key={row.uid} row={row} />)}
              </div>
            )}
            {/* No capture during trainer/league battles — you fight the trainer, not wild mons */}
            {!run.trainerName && (
              <div className="mt-3">
                {caught ? (
                  <p className={`text-xs font-bold ${caught.ok ? 'text-green-300' : 'text-gray-500'}`}>
                    {caught.ok
                      ? (caught.benched ? `🎉 ${caught.name} capturé (Pokédex) !` : `🎉 ${caught.name} rejoint l'équipe !`)
                      : `💨 ${caught.name} s'est échappé…`}
                  </p>
                ) : (
                  <>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">
                      {enemy.isBoss ? 'Master Ball uniquement' : throwUsed ? '1 lancer max utilisé' : 'Tente une capture'}
                    </p>
                    {!throwUsed && (
                      <div className="flex justify-center gap-2 flex-wrap">
                        {BALLS.map(b => {
                          const owned = run.balls?.[b.id] || 0
                          const usable = owned > 0 && (!enemy.isBoss || b.rate >= 1)
                          return (
                            <button key={b.id} onClick={() => tryCatch(b.id)} disabled={!usable}
                              className={`flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-1.5 transition-all ${usable ? 'active:scale-95' : 'opacity-30'}`}
                              style={{ background: b.color + '22', border: `1px solid ${b.color}66` }}>
                              <ItemSprite slug={b.slug} emoji={b.emoji} size={26} />
                              <span className="text-[9px] font-bold text-white">×{owned}</span>
                              <span className="text-[8px] font-bold" style={{ color: b.color }}>{Math.round((b.rate ?? 0) * 100)}%</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Lose panel */}
        {phase === 'lose' && (
          <div className="rounded-2xl p-5 border border-red-800 bg-red-900/20 text-center">
            <p className="text-4xl mb-2">💀</p>
            <p className="font-game text-sm text-red-400">Ton équipe est tombée</p>
            <p className="text-xs text-gray-500 mt-1">Vague {wave} — {kind === 'boss' ? 'le Boss vous a écrasés' : 'défaite au combat'}.</p>
          </div>
        )}

        {/* Battle log — auto-scrolls to latest entry */}
        <div ref={logRef} className="bg-game-surface rounded-xl p-2.5 border border-game-border max-h-24 overflow-y-auto scroll-smooth">
          {log.length === 0 && <p className="text-[10px] text-gray-700">…</p>}
          {log.map((l, i) => <p key={i} className="text-[10px] text-gray-500 leading-relaxed">{l}</p>)}
        </div>
      </div>

      {/* Bottom: shared random hand */}
      <div className="fixed bottom-0 inset-x-0 border-t border-game-border z-20" style={{ background: 'rgba(10,10,20,0.97)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-lg mx-auto px-3 py-3">
          {phase === 'win' ? (
            <button onClick={continueAfterWin} className="w-full py-4 bg-green-600 hover:bg-green-500 active:scale-95 text-white font-black rounded-xl text-base transition-all">
              {run.trainerQueue?.length > 0
                ? `⚔️ Pokémon suivant (${run.trainerKilled + 2}/${run.trainerTotalParty}) →`
                : (run.leagueQueue?.length > 0 && run.leagueIndex + 1 < run.leagueQueue.length)
                ? `🏆 Dresseur suivant (${run.leagueIndex + 2}/${run.leagueQueue.length}) →`
                : enemy.isBoss ? '🛒 Marché du Rift →'
                : `${run.winsThisRun > 0 && (run.winsThisRun + 1) % 5 === 0 ? '🏅 Récompense ×5 →' : '⏭ Vague suivante →'}`}
            </button>
          ) : phase === 'lose' ? (
            <button onClick={continueAfterLose} className="w-full py-4 bg-gray-800 hover:bg-gray-700 text-gray-300 font-black rounded-xl text-base transition-all">
              Voir le résumé →
            </button>
          ) : phase === 'player' ? (
            <>
              {/* Swap + hint + Mes Attaques */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-gray-600 font-bold uppercase">Choisis 1 attaque · {hand.length} tirée{hand.length > 1 ? 's' : ''}</p>
                  <button onClick={() => setShowMoves(true)}
                    className="px-2 py-1 rounded-lg text-[10px] font-black bg-violet-900/70 hover:bg-violet-800 active:scale-95 text-violet-300 border border-violet-700/50 transition-all">
                    📖 Attaques
                  </button>
                </div>
                <button onClick={swapHand} disabled={rerolls <= 0}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-all ${rerolls > 0 ? 'bg-blue-900/70 hover:bg-blue-800 active:scale-95 text-blue-300 border border-blue-700/50' : 'bg-gray-900 text-gray-700'}`}>
                  🔄 Échanger ×{rerolls}
                </button>
              </div>

              {/* Shared hand: N random cards from the whole team's movepool */}
              <div className="flex gap-2 justify-center flex-wrap">
                {hand.length === 0 && (
                  <p className="text-[10px] text-gray-600 py-4">Aucune attaque disponible…</p>
                )}
                {hand.map(card => {
                  const owner = team.find(m => m.uid === card.ownerUid)
                  if (!owner) return null
                  // In a double battle, preview damage against the currently selected target.
                  const previewFoe = (enemy2 && target === 2 && e2Hp > 0) ? enemy2 : enemy
                  return <AttackCard key={card.uid} card={card} caster={owner} enemy={previewFoe} relicAgg={relicAgg} onClick={() => playCard(card)} />
                })}
              </div>
            </>
          ) : (
            <div className="py-4 text-center">
              <p className="text-sm font-bold text-red-400 animate-pulse">⚔️ Ennemi attaque…</p>
            </div>
          )}
        </div>
      </div>

      {/* ── "Mes Attaques" overlay ─────────────────────────────────────── */}
      {showMoves && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,0.92)' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-10 pb-3 border-b border-white/10">
            <p className="font-game text-white text-base">📖 Toutes tes attaques</p>
            <button onClick={() => { setShowMoves(false); setFocusedCard(null) }}
              className="text-gray-400 hover:text-white text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full bg-white/10">✕</button>
          </div>
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
            {allTeamMoves.map(({ mon, moves }) => {
              if (mon.hp <= 0) return null
              const tc = TYPE_COLORS[mon.types?.[0]] || '#64748b'
              return (
                <div key={mon.uid}>
                  <div className="flex items-center gap-2 mb-2">
                    <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${mon.shiny ? 'shiny/' : ''}${mon.id}.png`}
                      alt={mon.name} className="w-8 h-8 object-contain pixelated" />
                    <p className="text-sm font-bold text-white">{mon.name}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: tc + '33', color: tc }}>Niv.{mon.level}</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {moves.map(card => (
                      <AttackCard key={card.uid} card={card} caster={mon} enemy={enemy} relicAgg={relicAgg} onClick={() => setFocusedCard({ card, mon })} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Card detail popup */}
          {focusedCard && (() => {
            const { card, mon } = focusedCard
            const cardTc = TYPE_COLORS[card.type] || '#64748b'
            const preview = previewCard(card, mon, enemy, relicAgg)
            return (
              <div className="fixed inset-0 z-60 flex items-end justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
                onClick={() => setFocusedCard(null)}>
                <div onClick={e => e.stopPropagation()}
                  className="w-full max-w-sm rounded-2xl p-5 border"
                  style={{ background: `linear-gradient(160deg, ${cardTc}22, #0f172a)`, borderColor: cardTc + '88' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{KIND_ICON[card.kind]}</span>
                      <p className="font-black text-white text-base">{card.name}</p>
                    </div>
                    <span className="text-[10px] font-bold rounded-full px-2 py-0.5" style={{ background: cardTc + '33', color: cardTc }}>
                      {card.type?.toUpperCase()}
                    </span>
                  </div>
                  {/* Stat row */}
                  {preview && (
                    <div className="flex gap-3 mb-3">
                      {preview.map((p, i) => (
                        <span key={i} className="text-lg font-black tabular-nums" style={{ color: p.color }}>{p.label}</span>
                      ))}
                    </div>
                  )}
                  {card.desc && <p className="text-[11px] text-gray-300 leading-relaxed mb-3">{card.desc}</p>}
                  <div className="text-[10px] text-gray-500">
                    Pokémon : <span className="text-gray-300 font-bold">{mon.name}</span>
                  </div>
                  <button onClick={() => setFocusedCard(null)}
                    className="mt-4 w-full py-2 rounded-xl font-black text-sm text-white bg-white/10 hover:bg-white/20 transition-all">
                    Fermer
                  </button>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* ── Pokémon detail modal (ally or enemy) — centered ─────────────── */}
      {selectedMon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3"
          style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSelectedMon(null)}>
          <div onClick={e => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{
              background: '#0a0a14',
              border: `1px solid ${selectedMon.kind === 'ally'
                ? (TYPE_COLORS[selectedMon.mon?.types?.[0]] || '#334155') + '66'
                : typeColor + '66'}`,
              maxHeight: '82vh',
              overflowY: 'auto',
            }}>

            {selectedMon.kind === 'ally' ? (() => {
              const m = selectedMon.mon
              const h = hp[m.uid] ?? 0
              const maxH = m.maxHp || 1
              const tc = TYPE_COLORS[m.types?.[0]] || '#1e293b'
              const xpNeed = xpToNext(m.level)
              const moves = allTeamMoves.find(x => x.mon.uid === m.uid)?.moves || []
              return (
                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="relative flex-shrink-0">
                      <img
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${m.id}.png`}
                        alt={m.name} className="w-20 h-20 object-contain drop-shadow-lg"
                        onError={e => { e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${m.shiny ? 'shiny/' : ''}${m.id}.png` }}
                      />
                      {m.shiny && <span className="absolute -top-1 -right-1 text-sm">✨</span>}
                      {m.holo  && <span className="absolute -top-1 -left-1 text-sm">🌈</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-base">{m.name}</p>
                      <p className="text-[11px] text-gray-400 font-bold mb-1">Niv.{m.level}</p>
                      <div className="flex gap-1 flex-wrap mb-2">
                        {(m.types || ['normal']).map(t => <TypeBadge key={t} type={t} size="xs" />)}
                      </div>
                      <HPBar hp={h} maxHp={maxH} showNumbers size="md" />
                    </div>
                  </div>

                  {/* XP bar */}
                  <div className="mb-3">
                    <div className="flex justify-between mb-1">
                      <p className="text-[10px] text-gray-500 font-bold uppercase">Expérience</p>
                      <p className="text-[10px] text-gray-500">{m.xp || 0} / {xpNeed} XP</p>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
                      <div className="h-full rounded-full bg-cyan-400/80 transition-all"
                        style={{ width: `${Math.min(100, ((m.xp || 0) / xpNeed) * 100)}%` }} />
                    </div>
                  </div>

                  {/* Stats (bars, like the Pokédex) */}
                  {m.stats && (
                    <div className="mb-3">
                      <p className="text-[10px] text-gray-500 font-bold uppercase mb-1.5">Statistiques</p>
                      <StatBars stats={m.stats} accent={tc} />
                    </div>
                  )}

                  {/* Weaknesses / resistances */}
                  <div className="mb-3">
                    <MatchupSection types={m.types} />
                  </div>

                  {/* Moves */}
                  <p className="text-[10px] text-gray-500 font-bold uppercase mb-1.5">Attaques ({moves.length})</p>
                  <div className="space-y-1.5">
                    {moves.map(card => {
                      const ct = TYPE_COLORS[card.type] || '#64748b'
                      const preview = previewCard(card, m, enemy, relicAgg)
                      return (
                        <div key={card.uid} className="flex items-center gap-2 rounded-lg px-2.5 py-2"
                          style={{ background: ct + '18', border: `1px solid ${ct}44` }}>
                          <span className="text-sm flex-shrink-0">{KIND_ICON[card.kind]}</span>
                          <p className="text-[11px] font-bold text-white flex-1 truncate">{card.name}</p>
                          <span className="text-[8px] font-bold rounded px-1 flex-shrink-0" style={{ background: ct + '33', color: ct }}>
                            {card.type?.toUpperCase().slice(0, 3)}
                          </span>
                          {preview?.map((p, i) => (
                            <span key={i} className="text-[10px] font-black tabular-nums flex-shrink-0" style={{ color: p.color }}>{p.label}</span>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })() : (() => {
              // Enemy detail
              return (
                <div className="p-4">
                  <div className="flex items-start gap-3 mb-4">
                    <img
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${enemy.id}.png`}
                      alt={enemy.name} className="w-20 h-20 object-contain drop-shadow-lg flex-shrink-0"
                      onError={e => { e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${enemy.id}.png` }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-base">{enemy.name}</p>
                      <p className="text-[11px] text-gray-400 font-bold mb-1">
                        Niv.{enemy.level}{enemy.isBoss ? ' 💀 BOSS' : kind === 'elite' ? ' ⭐ Élite' : ''}
                      </p>
                      <div className="flex gap-1 flex-wrap mb-2">
                        {(enemy.types || ['normal']).map(t => <TypeBadge key={t} type={t} size="xs" />)}
                      </div>
                      <HPBar hp={enemyHp} maxHp={enemyMax} showNumbers size="md" />
                    </div>
                  </div>

                  {/* Enemy stats (bars) */}
                  {enemy.stats && (
                    <div className="mb-3">
                      <p className="text-[10px] text-gray-500 font-bold uppercase mb-1.5">Statistiques</p>
                      <StatBars stats={enemy.stats} accent={typeColor} />
                    </div>
                  )}

                  {/* Weaknesses / resistances */}
                  <div className="mb-3">
                    <MatchupSection types={enemy.types} />
                  </div>

                  {/* Boss ability */}
                  {enemy.ability && (
                    <div className="mb-3 rounded-xl px-3 py-2.5 border border-purple-700/40 bg-purple-900/20">
                      <p className="text-[11px] text-purple-300 font-bold">{ABILITY_LABEL[enemy.ability]}</p>
                    </div>
                  )}

                  {/* Modifiers with full descriptions */}
                  {enemy.modifiers?.length > 0 ? (
                    <div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase mb-1.5">Effets actifs ({enemy.modifiers.length})</p>
                      <div className="space-y-2">
                        {enemy.modifiers.map((mod, i) => {
                          const def = MODIFIER_DEF[mod.id]
                          if (!def) return null
                          const typeLabel = TYPE_LABELS_FR[mod.param] || mod.param || ''
                          const desc = def.desc.replace('{TYPE}', typeLabel)
                          return (
                            <div key={i} className="flex items-start gap-2.5 rounded-xl px-3 py-2.5 border"
                              style={{ background: mod.isNerf ? '#3b82f615' : '#ef444415', borderColor: mod.isNerf ? '#3b82f644' : '#ef444444' }}>
                              <span className="text-base mt-0.5 flex-shrink-0">{def.icon}</span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                  <p className="text-[11px] font-bold text-white">{def.name}</p>
                                  <span className="text-[8px] font-black rounded-full px-1.5 py-0.5"
                                    style={{ background: mod.isNerf ? '#3b82f633' : '#ef444433', color: mod.isNerf ? '#60a5fa' : '#f87171' }}>
                                    {mod.isNerf ? '🔵 Affaiblit' : '🔴 Renforce'}
                                  </span>
                                </div>
                                <p className="text-[10px] text-gray-400">{desc}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-gray-600 italic">Aucun effet actif</p>
                  )}
                </div>
              )
            })()}

            <button onClick={() => setSelectedMon(null)}
              className="w-full py-3 text-gray-500 text-sm font-bold border-t border-white/10 hover:text-white transition-colors">
              Fermer ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
