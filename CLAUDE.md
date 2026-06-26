# PokéRift — Guide développeur IA

Roguelite Pokémon en React/Zustand/Firebase. Ce fichier est le briefing complet pour tout assistant IA (Claude, Codex, GPT…).

## Stack technique

- **React 18** + **Vite 5** (pas de Next.js, pas de router — navigation via état Zustand)
- **Zustand 4** avec `persist` middleware (localStorage) pour l'état global
- **Firebase 12** : Auth (email/mdp + Google) + Firestore (sauvegarde cloud)
- **Tailwind CSS 3** — classes utilitaires uniquement, pas de CSS custom sauf `src/index.css`
- Entrée : `src/main.jsx` → `src/App.jsx`
- **Le dossier `js/` est l'ANCIENNE version vanilla — il est mort, ne pas y toucher**

## Architecture

```
src/
  App.jsx              Navigation via SCREENS[currentScreen]
  firebase.js          Auth + Firestore exports
  main.jsx             Point d'entrée React

  store/
    gameStore.js       État méta-jeu persisté (collection, économie, progression, achievements)
    runStore.js        État de la run active (équipe, vague, or, objets, reliques)
    authStore.js       Authentification Firebase (loginWithEmail, registerWithEmail, loginWithGoogle)

  engine/
    runEngine.js       Logique de vague (waveKind, buildEnemy, gainXp, makeRunMon…)
    combatEngine.js    Moteur de combat (buildMoveset, computeIntent, playCard, healWeakest…)
    comboBurst.js      Mécanique de combo
    battle.js          Helpers de combat supplémentaires
    rng.js             Générateur pseudo-aléatoire déterministe

  data/
    pokemon.js         Base de données Pokémon (makeInstance, recomputeStats, speciesById…)
    moves.js           Toutes les attaques
    types.js           Tableau de types + typeMatchups() + TYPE_ICON_ID + typeIconUrl()
    items.js           Objets consommables + Poké Balls (CONSUMABLE_BY_ID, DEFAULT_BALLS)
    relics.js          Reliques passives (aggregateRelics)
    traits.js          Traits passifs des Pokémon
    signatureTraits.js Traits signatures par espèce
    events.js          Événements de vague (EVENTS, eventForWave, EVENT_BY_ID)
    badges.js          8 badges Kanto (KANTO_BADGES, isBadgeEarned)
    biomes.js          Zones par vague (biomeForWave)
    achievements.js    Succès (ACHIEVEMENTS, ACHIEVEMENT_BY_ID)
    ascension.js       Paliers de difficulté (aggregateAscension, MAX_ASCENSION)
    patchNotes.js      Notes de version (PATCH_NOTES, LATEST_VERSION)
    enemyModifiers.js  Modificateurs ennemis aléatoires (rollModifiers, MODIFIER_DEF)
    evolutions.js      Table d'évolution (nextEvolution)
    trainers.js        Dresseurs (TRAINERS)
    gyms.js            Champions d'arène
    frenchNames.js     Noms FR des espèces (frName)
    cardModel.js       Modèle de carte (speciesRarity, isHoloEligible, buildMoveset)
    quests.js          Quêtes quotidiennes
    ranks.js           Système de rang
    genUnlocks.js      Déblocage générations
    ct.js              Capsules techniques

  screens/             Un composant = un écran
    HomeScreen.jsx     Accueil (hub)
    BattleScreen.jsx   Combat (FICHIER LE PLUS COMPLEXE — voir ci-dessous)
    RunScreen.jsx       Carte de run (sélection vague)
    RunSetupScreen.jsx  Setup de l'équipe de départ
    RewardScreen.jsx    Récompense post-combat
    RunShopScreen.jsx   Boutique de run
    RunEndScreen.jsx    Fin de run
    ShopScreen.jsx      Boutique méta (packs)
    CollectionScreen.jsx Collection de cartes
    TrainingScreen.jsx  Entraînement permanent
    PackOpeningScreen.jsx Ouverture de boosters
    EncounterScreen.jsx Rencontre Pokémon sauvage
    NewsScreen.jsx      Notes de patch
    ProgressionScreen.jsx Aventure Kanto + badges + succès
    BattleDexScreen.jsx Pokédex de combat (151 Pokémon)
    AchievementsScreen.jsx (legacy, remplacé par Progression dans la nav)
    MilestoneRewardScreen.jsx Récompenses de palier

  components/
    AuthGate.jsx       Mur d'authentification obligatoire
    BottomNav.jsx      Navigation du bas (hub screens uniquement)
    TypeBadge.jsx      Badge de type avec mode size="img" (vraie icône PokeAPI)
    StatBars.jsx       Barres de statistiques (réutilisée dans détail Pokémon)
    HPBar.jsx          Barre de PV
    PokemonCard.jsx    Carte Pokémon dans la collection
    ItemSprite.jsx     Icône d'objet

  lib/
    sfx.js             Sons Web Audio synthétisés (sfx('hit'), sfx('levelUp')…)
```

## Règles invariantes

### Nouvel état persisté
Tout champ ajouté à `gameStore` ou `runStore` DOIT :
1. Être dans `partialize()` (pour Zustand persist)
2. Être dans `resetGame()` avec sa valeur par défaut
3. Bumper `version` dans les options `persist` (actuellement 5 pour gameStore)
4. Ajouter `migrate` no-op si nécessaire (les défauts naturels suffisent en général)

### Navigation
`useGameStore().navigate('screen_name')` — pas de router. Les routes définies dans `App.jsx` :
`title, home, shop, opening, collection, training, runsetup, run, battle, reward, milestone, encounter, achievements, progression, battledex, news, runshop, runend`

### Style
- Font pixel : `font-game` (`Press Start 2P`)
- Fond app : `bg-game-bg` (défini dans Tailwind config)
- Bordures accent : rouge `#ef4444` / `border-red-500`
- Panneaux sombres : `bg-[#1a1a2e]` ou similaire

### Sprites Pokémon
```
https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{id}.png
https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/{id}.png
```

### Icônes de type (vrais visuels)
```javascript
// src/data/types.js
typeIconUrl(typeName) // → URL PokeAPI génération VIII sword-shield
```

### Icônes de badges Kanto
```
https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/badges/{1-8}.png
```

## BattleScreen.jsx — Points d'attention

C'est le fichier le plus complexe du projet (~1000+ lignes). Points clés :

- **État ennemi double** : `enemy` (toujours présent) + `enemy2` (optionnel, événement `double`). Ne pas refactoriser vers un tableau sans refonte complète.
- **`target`** : `1` ou `2`, détermine quel ennemi reçoit les attaques.
- **`allEnemiesDead(e1Hp, e2Hp)`** : condition de victoire quand les deux sont K.O.
- **`benchedUid`** : UID du Pokémon exclu pendant l'événement `handicap_bench`.
- **`eventRef.current`** : ref utilisée dans les setTimeout pour accéder à l'événement courant.
- **`drawableTeam()`** : exclut le Pokémon sur le banc (`benchedUid`).
- **`drain`** → lifesteal du lanceur uniquement (50% des dégâts réels).
- **`heal`** → soigne uniquement l'allié le plus faible (`healWeakest`).
- **Tracking Pokédex** : à l'apparition → `markSpeciesSeen(id)` ; à la victoire → `markSpeciesDefeated(id)`.
- **Sons** : `sfx('hit')`, `sfx('levelUp')`, `sfx('win')`, `sfx('faint')` via `src/lib/sfx.js`.

## Système d'événements de vague

```javascript
// src/data/events.js
eventForWave(wave, teamSize) // → event | null
// Se déclenche sur vagues paires sauvages ≥ 5
// Événements : healing_spring, golden, treasure, frenzy, handicap_bench, double

// L'événement est attaché dans RunScreen à pendingEnemy.event
// BattleScreen le lit dans son useEffect d'init
```

## Difficulté exponentielle

```javascript
// src/engine/runEngine.js — buildEnemy()
const expo = Math.pow(1.035, Math.max(0, wave - 20))
const bulk  = (1.05 + wave * 0.045) * hpFactor * expo
// + ramp dégâts dans combatEngine.js : 1 + Math.max(0, wave-25)*0.035
```

## Objets consommables

`src/data/items.js` — `CONSUMABLE_BY_ID`

Effets câblés dans `runStore.useItem(itemId, targetUid)` :
- `potion`, `super-potion`, `hyper-potion`, `full-restore` → soins
- `nugget`, `big-nugget` → or
- `hp-up`, `protein`, `iron`, `calcium`, `zinc`, `carbos` → boost stat permanent (`statBonus` + `recomputeStats`)
- `escape-rope` → skip vague non-boss
- `rare-candy` → +1 niveau

`startRun` démarre sans aucun consommable (`items: {}`), seulement des Poké Balls.

## Firebase & Auth

- **Fournisseurs actifs** : Email/Password + Google (Discord différé)
- **Connexion obligatoire** — pas de mode invité
- `authStore.registerWithEmail(pseudo, email, password)` :
  - Vérifie unicité du pseudo dans `usernames/{pseudoLower}`
  - Crée le compte Firebase Auth
  - Écrit `usernames/{pseudoLower} = { uid, email }`
- `authStore.loginWithEmail(identifier, password)` :
  - Si `@` dans identifier → email direct
  - Sinon → résolution pseudo→email via Firestore `usernames/`
- **Règles Firestore requises** : `usernames/*` lisible par tous ; `users/{uid}/*` par le propriétaire uniquement

## État gameStore — champs clés

```javascript
// Progression / Pokédex de combat
seenSpecies: []        // IDs rencontrés en combat
defeatedSpecies: []    // IDs vaincus en combat
markSpeciesSeen(id)
markSpeciesDefeated(id)

// Actualités
lastSeenVersion: null  // comparé à PATCH_NOTES[0].version
markNewsSeen()

// Économie
money, crystals, rubies

// Collection
collection: []         // instances de cartes (uid, id, level, xp, holo, shiny…)

// Achievements
unlockedAchievements: []
```

## Refonte v2 (attaques, économie, drops, UI) — systèmes clés

- **Attaques** : `buildMoveset(mon)` → **1 attaque offensive** par Pokémon (puissance scalée par palier via `rarityTier`), **2 pour les légendaires** (dont signature `SIGNATURE_BY_ID`). Plus de guard/heal/buff « gratuits » : ils viennent des **CT** ou des légendaires. `movesetSize(mon)` = longueur réelle du moveset (base + CT apprises).
- **CT** : `src/data/ct.js` ~100 CT (`CT_LIST`, `CT_BY_ID`, `canLearnCT(mon, ct)` = Normal pour tous, sinon type partagé, `rollRandomCT`). Bag de run `runStore.cts` + `runStore.addCT/learnCT(monUid, ctId)`. `mon.learnedCTs: []` (perdu si échangé). Méta (boosters) : `gameStore.ctInventory`. Carte issue d'une CT → `card.fromCT` (icône 💿).
- **Drops** : `src/data/drops.js` `rollDrop(wave)`. Proba de drop = `min(0.95, 0.05 × starterCost(espèce vaincue))`. Type : CT 10 %, balls/potions/pierres 30 % chacun. Poids de rareté interpolés vague 1→100. Appliqué dans `BattleScreen.win()`.
- **Économie** : `RunShopScreen` = **Centre Commercial** (déblocage progressif `unlockWave`/10, max 5 achats, prix expo, CT dès vague 100). `MilestoneRewardScreen` = **Centre Pokémon** (soin payant ciblé via `runStore.healAtCenter(uids, cost)`, 10 %/Pokémon + surcoût points, plafond 90 %).
- **Évolution par pierre** : `src/data/evolutions.js` `STONE_EVOLUTIONS` + `stoneEvolution(id, stone)` (dont Évoli → 3 formes). Pierres = objets `items.js` (kind `stone`), appliquées via objet ciblé.
- **Objets ciblés** : `runStore.useItem(id, targetUid)` (heal/revive/candy/fullrestore/stone ciblent 1 Pokémon). `itemNeedsTarget(id)`. Or/vitamines restent directs.
- **Capture à 6** : `runStore.catchEnemy` stocke `pendingCatch` si équipe pleine → `swapCaught(oldUid)` / `cancelCatchSwap()`.
- **UI** : `RunScreen` = chemin vertical illustré + bouton Légende + encart équipe (`components/TeamSheet.jsx` : vue 2 colonnes + onglet « Mes CT »). Combat : séparateur VS + nom/sprite dresseur (`trainers.js` `trainerSpriteUrl` → Pokémon Showdown, stocké via `setTrainerBattle(name, party, sprite)`). Cartes d'attaque : icône de type réelle + 💿 (CT). Rencontre « échanger une attaque » = tirage au sort (machine à sous), accept-only.
- **Persist** : `runStore` v4 (ajout `cts`, `learnedCTs`).

## Commandes utiles

```bash
npm run dev      # dev server (localhost:5173)
npm run build    # build prod (vérifie les erreurs TS/lint)
npm run preview  # preview du build
```

## Branche de travail

Branche principale de développement : `claude/blissful-knuth-es390g`

## Historique des lots livrés

| Lot | Contenu | Commit |
|-----|---------|--------|
| A | Auth email/mdp + Google obligatoire, suppression mode invité | `389c7a3` |
| B | Section Actualités / patch notes avec pastille "nouveau" | `389c7a3` |
| H | 9 nouveaux objets, pools de récompense élargis, départ sans objet | `a557a65` |
| C | Nerf soin (lifesteal lanceur, heal → plus faible), difficulté expo post-vague 20 | `a557a65` |
| I | Fin de combat: drops visuels, barres XP animées, sons Web Audio | `c5e94d8` |
| F | Cartes d'attaque (sprite centré, coloration dégâts), icônes type réelles, fiche centrée | `6be5e25` |
| G | Onglet Progression, Pokédex combat 3 états, 8 badges Kanto réels | `b43b91a` |
| D | Événements de vague (golden, healing spring, frenzy, handicap, double) | `f5d4093` |
| E | Vrai combat double (2 ennemis actifs, ciblage, victoire conjointe) | `3c1590e` |
| J | 1 attaque/Pokémon (2 légendaires), gros catalogue CT, équilibrage | `961d237` |
| K | Drops d'objets en combat (remplace achats de masse) | `d576548` |
| M | Évolutions par pierre | `803bb7d` |
| N | Objets de soin/pierre ciblés sur 1 Pokémon | `8be8242` |
| O | Fix capture à 6 Pokémon (échange) | `bd80f67` |
| L | Centre Commercial + Centre Pokémon | `5421a63` |
| P | UI : expédition verticale illustrée, encart équipe/CT, cartes, dresseur | `a688fb2`+`51e4041` |

## Ce qui n'existe pas encore (idées futures)

- Chat Discord intégré (différé — nécessite backend)
- Multijoueur / classement en ligne
- Génération 2+ (seule la Gen 1 est jouable, Gen 2+ débloquables mais non implémentées)
- Mode tournoi
