// Patch notes / actualités — la plus récente en tête.
// Maintenu à la main à chaque mise à jour livrée.
// change.type ∈ 'feat' | 'fix' | 'balance' | 'content'

export const PATCH_NOTES = [
  {
    version: '0.5.0',
    date: '2026-06-25',
    title: 'Refonte majeure',
    highlight: true,
    changes: [
      { type: 'feat', text: 'Connexion par email/mot de passe ou Google (compte obligatoire, sauvegarde cloud).' },
      { type: 'feat', text: 'Nouvelle section Actualités pour suivre les mises à jour du jeu.' },
      { type: 'content', text: 'Beaucoup plus d\'objets dans les récompenses ; on ne démarre plus avec potion + super bonbon.' },
      { type: 'balance', text: 'Vampigraine et les soins ne soignent plus toute l\'équipe d\'un coup.' },
      { type: 'balance', text: 'Difficulté revue : les ennemis tapent et encaissent bien plus fort en fin de partie.' },
      { type: 'feat', text: 'Fin de combat enrichie : objets gagnés, barres d\'XP animées et son de montée de niveau.' },
      { type: 'feat', text: 'Cartes d\'attaque repensées + vraies icônes de types.' },
      { type: 'feat', text: 'Onglet Progression : aventure de Kanto, Pokédex de combat et badges.' },
      { type: 'feat', text: 'Événements aléatoires et vrais combats à deux ennemis.' },
    ],
  },
  {
    version: '0.4.0',
    date: '2026-06-24',
    title: 'Gamification & challenge',
    changes: [
      { type: 'feat', text: 'Succès, série quotidienne et système de rang sur l\'accueil.' },
      { type: 'feat', text: 'Ascension : 8 paliers de difficulté à débloquer.' },
      { type: 'content', text: '40+ reliques, dont des reliques à malédiction et de synergie.' },
      { type: 'feat', text: 'Statuts infligés par les élites/boss et capacités uniques de boss.' },
      { type: 'feat', text: 'Dresseurs avec vraies équipes et Ligue tous les 50 paliers.' },
    ],
  },
  {
    version: '0.3.0',
    date: '2026-06-22',
    title: 'Équilibrage du combat',
    changes: [
      { type: 'balance', text: 'PV des Pokémon du joueur ×2.5, dégâts ennemis adoucis.' },
      { type: 'balance', text: 'La défense et l\'attaque influencent réellement les dégâts.' },
    ],
  },
]

export const LATEST_VERSION = PATCH_NOTES[0].version

const TYPE_META = {
  feat:    { icon: '✨', label: 'Nouveau',     color: '#4ade80' },
  fix:     { icon: '🔧', label: 'Correction',  color: '#60a5fa' },
  balance: { icon: '⚖️', label: 'Équilibrage', color: '#fbbf24' },
  content: { icon: '📦', label: 'Contenu',     color: '#c084fc' },
}
export function changeMeta(type) { return TYPE_META[type] || TYPE_META.feat }
