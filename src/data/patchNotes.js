// Patch notes / actualités — la plus récente en tête.
// Maintenu à la main à chaque mise à jour livrée.
// change.type ∈ 'feat' | 'fix' | 'balance' | 'content'

export const PATCH_NOTES = [
  {
    version: '0.6.3',
    date: '2026-06-26',
    title: 'Combat polish + Mes Pokémon + Diamants',
    highlight: true,
    changes: [
      { type: 'feat', text: 'Nouvel écran « Mes Pokémon » (4e bouton de nav 🐾) : tri Niveau/Puissance/Favoris, puissance color-codée, bouton ▲ Lvl direct ou via diamants.' },
      { type: 'feat', text: 'Échange Diamants : 3 paliers (40💎→100💰 / 80💎→220💰 / 155💎→450💰) depuis « Mes Pokémon ».' },
      { type: 'feat', text: 'Level-up diamants dans le Pokédex : plus besoin de 2 doublons — paye en 💎 pour monter un Pokémon de niveau.' },
      { type: 'feat', text: 'Les boss sont désormais capturable avec une Ball normale pendant ET après le combat.' },
      { type: 'balance', text: 'Les Pokémon de Dresseur sont plus costauds (niveau +2, PV ×1.4) et tapent plus fort (+15% de dégâts).' },
      { type: 'balance', text: 'Les élites et boss peuvent occasionnellement se soigner ou lever un bouclier.' },
      { type: 'feat', text: 'Intention ennemie redessinée : nom du mouvement, couleur du type, efficacité (⚡ si super efficace).' },
      { type: 'feat', text: 'Titre de combat au-dessus des sprites : « Dans les hautes herbes », « Dresseur », « Élite », « Boss », « Ligue ».' },
      { type: 'fix', text: 'Journal d\'action supprimé — l\'écran de combat est plus épuré.' },
      { type: 'feat', text: 'VS agrandi sans lignes décoratives.' },
      { type: 'feat', text: 'Fin de run : détail de l\'or (base + 10 % de l\'or de la run).' },
    ],
  },
  {
    version: '0.6.2',
    date: '2026-06-26',
    title: 'Carte d\'attaque détaillée & CT au Pokédex',
    highlight: true,
    changes: [
      { type: 'feat', text: 'Carte d\'attaque détaillée : description, dégâts/soin/bouclier, et efficacité de type (fort / faible / sans effet). Accessible en cliquant une attaque dans le détail d\'un Pokémon.' },
      { type: 'feat', text: 'Apprentissage des CT centralisé dans « 💿 Mes CT » : clique une CT, vois sa carte détaillée, puis « Apprendre » → choisis un Pokémon possédé compatible (même type, ou tous pour les CT Normal).' },
      { type: 'feat', text: 'La CT attachée à un Pokémon apparaît désormais comme une de ses attaques (badge 💿) dans le Pokédex.' },
      { type: 'balance', text: 'Le sélecteur d\'attache de CT a été retiré du détail Pokémon : on apprend/retire une CT uniquement depuis « Mes CT ».' },
    ],
  },
  {
    version: '0.6.1',
    date: '2026-06-26',
    title: 'Polissage & immersion',
    highlight: true,
    changes: [
      { type: 'feat', text: 'Apprendre une CT pendant le combat : onglet « 💿 Apprendre CT » dans l\'overlay Attaques.' },
      { type: 'feat', text: 'Fonds de biome illustrés (Pokémon Showdown gen6bgs) derrière le chemin d\'expédition.' },
      { type: 'feat', text: 'Nœuds de chemin enrichis : sprite dresseur Showdown pour les Dresseurs, Prof. Oak pour les Rencontres, Blue pour la Ligue.' },
      { type: 'feat', text: 'Chemin scrollable : l\'étape courante est positionnée au-dessus du bas ; bouton 🎯 Recentrer.' },
      { type: 'feat', text: 'Pokédex — bouton « 💿 Mes CT » : liste toutes les CT méta avec sprite du Pokémon détenteur.' },
      { type: 'feat', text: 'Pokédex — valeurs numériques des attaques (dégâts / soin / bouclier) dans le détail d\'un Pokémon.' },
      { type: 'feat', text: 'Booster — « ⚡ Tout dévoiler » : affiche les 5 cartes en grille côte à côte.' },
      { type: 'feat', text: 'Booster — « Carte suivante » révèle automatiquement la prochaine carte (plus besoin de cliquer).' },
      { type: 'balance', text: 'Échange d\'attaque (Rencontre) : pool = tout le catalogue CT filtré par type du Pokémon ciblé, 3 candidats tirés au sort ; la valeur numérique est affichée.' },
      { type: 'fix', text: 'Centre Commercial : texte « Tu as droit à 5 achats maximum » mieux placé et plus lisible ; icônes d\'articles plus grandes.' },
    ],
  },
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
