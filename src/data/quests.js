// Daily quests — regenerate once per calendar day, deterministic per date so a
// reload keeps the same set. Completing them feeds the meta economy and gives a
// reason to come back every day.

export const QUEST_POOL = [
  { type: 'catch', mode: 'inc', verb: 'Capture', noun: 'Pokémon',  icon: '🎯', targets: [3, 4, 5], reward: { crystals: 30 } },
  { type: 'open',  mode: 'inc', verb: 'Ouvre',   noun: 'boosters', icon: '📦', targets: [2, 3],    reward: { money: 220 } },
  { type: 'win',   mode: 'inc', verb: 'Gagne',   noun: 'combats',  icon: '⚔️', targets: [5, 6, 8], reward: { crystals: 25, money: 120 } },
  { type: 'wave',  mode: 'max', verb: 'Atteins', noun: 'la vague', icon: '🌊', targets: [8, 10, 12], reward: { crystals: 40 } },
]

function hashDate(date) {
  let h = 0
  for (const ch of date) h = (h * 31 + ch.charCodeAt(0)) | 0
  return Math.abs(h)
}

export function generateDailyQuests(date) {
  const pool = [...QUEST_POOL]
  const picks = []
  let s = hashDate(date) || 1
  const rand = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s }

  while (picks.length < 3 && pool.length) {
    picks.push(pool.splice(rand() % pool.length, 1)[0])
  }

  return picks.map(q => {
    const target = q.targets[rand() % q.targets.length]
    const label = q.type === 'wave'
      ? `Atteins la vague ${target} en expédition`
      : `${q.verb} ${target} ${q.noun}`
    return {
      id: `${date}-${q.type}`, type: q.type, mode: q.mode, target,
      progress: 0, claimed: false, reward: q.reward, label, icon: q.icon,
    }
  })
}

export const todayKey = () => new Date().toISOString().slice(0, 10)
