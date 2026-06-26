// Patch notes / actualités — la plus récente en tête.
// Maintenu à la main à chaque mise à jour livrée.
// change.type ∈ 'feat' | 'fix' | 'balance' | 'content'

export const PATCH_NOTES = [
  {
    version: '0.6.0',
    date: '2026-06-26',
    title: 'Refonte attaques & économie',
    highlight: true,
    changes: [
      { type: 'balance', text: 'Chaque Pokémon n\'a plus qu\'une seule attaque (deux pour les légendaires) ; sa puissance dépend de la force de l\'espèce — fini les petits Pokémon avec des attaques surpuissantes.' },
      { type: 'content', text: 'Gros catalogue de CT (~100) couvrant tous les types ; les soins et boucliers passent désormais par les CT ou les légendaires.' },
      { type: 'feat', text: 'Apprends une CT à un Pokémon compatible pendant l\'expédition (CT Normal pour tous, sinon même type).' },
      { type: 'balance', text: 'Les objets ne s\'achètent plus en masse : ils se DROPENT en combat. Plus le Pokémon vaincu vaut de points, plus la chance de butin est élevée.' },
      { type: 'content', text: 'Nouvelles pierres d\'évolution (Feu, Eau, Foudre, Plante, Lune) à dénicher.' },
      { type: 'feat', text: 'Les Pokémon à pierre (Pikachu, Évoli, Goupix…) évoluent en utilisant la bonne pierre sur eux.' },
      { type: 'balance', text: 'Les objets de soin (potion, rappel, super bonbon, pierre) s\'utilisent maintenant sur UN seul Pokémon : appuie sur l\'objet puis sur le Pokémon.' },
      { type: 'fix', text: 'Capturer avec une équipe pleine : on choisit désormais quel Pokémon échanger au lieu de perdre la capture.' },
      { type: 'feat', text: 'Centre Commercial (après chaque boss) : articles débloqués au fil des vagues, max 5 achats, prix croissants, CT à partir de la vague 100.' },
      { type: 'feat', text: 'Centre Pokémon (toutes les 5 victoires) : soigne tes Pokémon contre de l\'or (10 % par Pokémon + selon sa puissance, plafonné à 90 %).' },
      { type: 'feat', text: 'Écran d\'expédition repensé : chemin vertical illustré, encart « Mon équipe » (vue 2 colonnes + onglet « Mes CT » pour apprendre des CT), bouton Légende.' },
      { type: 'feat', text: 'En rencontre, « échanger une attaque » est désormais un tirage au sort à accepter.' },
    ],
  },
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
