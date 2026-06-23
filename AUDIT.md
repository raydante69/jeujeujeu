# Audit PokéRift — Expert Game Designer × Joueur Pokémon

> Dernière mise à jour : juin 2026

> ## ✅ Déjà implémenté (cette itération)
> - **Nouveau combat « Draft de Coups »** : remplace le TypeBurst. Chaque tour tu piochent une main aléatoire de coups issus des movesets de ton équipe, tu dépenses une énergie pour en jouer, et l'ennemi **télégraphie sa prochaine attaque** (style Into the Breach). Boucliers, soins, drains, statuts (brûlure/poison/paralysie/gel) et buffs créent de vrais dilemmes. Le système de cartes/collection/capture reste intact.
> - **Refonte des boosters** : formats **1 / 2 / 3 cartes** (Sachet / Booster / Pack Premium) avec garanties de rareté croissantes, **prix par génération** (plus la gen est haute, plus c'est cher) et **prix progressifs** (chaque rachat du même format en session coûte +18%). Obtenir les bons Pokémon est volontairement plus dur.

---

---

## 🔴 CE QUI NE FONCTIONNE PAS (blockers critiques)

### 1. Pas de loop de rétention central
Le jeu n'a pas de réponse claire à : **"Pourquoi je reviens demain ?"**
Pokérogue répond : progresser en infini, débloquer des espèces, méta-progression permanente.
TCG Live répond : construire son deck, monter en rang, boosters quotidiens.
PokéRift : **aucun progrès persistant valorisant** — les cartes collectées n'ont aucun impact sur les runs. Le circuit est cassé.

### 2. Le combat TypeBurst est trop passif
Même avec énergie + boucliers, chaque tour : regarder les types → sélectionner les bons Pokémon → appuyer PLAY. **Zéro dilemme.** Dans Pokérogue, les moves, STAB, items, abilities, terrains créent des choix difficiles. Ici on sait toujours quoi jouer.

### 3. La collection est déconnectée du gameplay
Ouvrir des boosters, avoir 151 Pokémon, et ensuite... rien. On ne voit pas ses cartes collectées dans les runs (seulement 6 starters libres ou captures in-run). La collection **doit alimenter le run** directement.

### 4. L'économie est creuse
500₽ de départ, boosters à 100₽, cristaux. Pas de **tension économique**. L'argent ne sert à rien d'urgent. Les jeux addictifs ont une pression permanente sur les ressources (HP limités, items rares, shops en one-shot). Ici on ne ressent jamais qu'on manque de quelque chose de précieux.

---

## 🟡 CE QUI EST BIEN POSÉ (vrais atouts)

- **Architecture technique solide** : Zustand + persist, séparation engine/store/screens propre.
- **Système de raretés TCG à 11 tiers** avec pull rates authentiques et holo réactif — genuinement impressionnant pour un projet web solo.
- **Biomes + progression de vagues** donnent un sentiment de voyage.
- **Objets équipables avec sprites PokeAPI** — excellente base réaliste.
- **Boucliers type + status effects** — de la profondeur tactique réelle, sous-exploitée.

---

## ⚔️ REFONTE DU COMBAT — Système "Draft de Coups"

### Problème racine
Le TypeBurst est **déterministe sans friction** : tu vois les types ennemis, tu choisis les contre-types, tu gagnes. Il n'y a jamais de situation où tu dois sacrifier quelque chose. Le combat est résolu avant d'être joué.

### Solution recommandée : Draft de coups (Slay the Spire × Pokémon Showdown)

**Principe de base :**
- Chaque Pokémon possède **3 moves uniques** (pas juste son type — un move d'attaque, un de défense/soin, un spécial).
- Au début de chaque tour, **4 moves aléatoires** sont piochés parmi tous tes Pokémon actifs.
- Le joueur en joue **2** (ou 3 avec un item).
- Les moves coûtent de l'énergie variable (1-3 EP).
- L'ennemi **annonce son prochain coup** à l'avance (style *Into the Breach*) — tu dois choisir entre attaquer fort ou te défendre.

**Pourquoi ça marche :**
- Garde le côté "équipe de Pokémon" sans être un clone de la série principale.
- L'aléatoire de la pioche crée des situations inattendues sans être frustrantes.
- L'annonce ennemie crée des dilemmes réels : "est-ce que j'encaisse et j'attaque fort, ou je bloque et je joue safe ?"
- Chaque Pokémon devient unique grâce à ses 3 moves propres — Pikachu n'est plus juste "type électrik".

**Exemples de moves :**
| Pokémon | Move 1 | Move 2 | Move 3 (Spécial) |
|---------|--------|--------|-------------------|
| Pikachu | Éclair (2EP, Élec, 40 dégâts) | Vive-attaque (1EP, Normal, 20 dégâts) | Tonnerre (3EP, Élec, 80 dégâts, 30% paralysie) |
| Salamèche | Flammèche (1EP, Feu, 30 dégâts) | Griffe (1EP, Normal, 25 dégâts) | Lance-flammes (3EP, Feu, 90 dégâts) |
| Bulbizarre | Tranch'herbe (2EP, Plante, 35 dégâts) | Poudre Soin (2EP, +20 HP équipe) | Vampigraine (3EP, Plante, 50 dégâts + drain 25%) |

**Options de profondeur additionnelles :**
- **Combo chain** : jouer deux moves du même type dans le même tour = bonus dégâts +30%.
- **Rift Storm** : enchaîner une séquence de types circulaire (Feu→Plante→Eau→Feu) sur plusieurs tours déclenche un burst multiplicateur.
- **Mode Chrono** (optionnel, activable) : 15 secondes pour choisir tes 2 moves — la pression crée le fun pour les joueurs confirmés.

---

## 📦 REFONTE DES BOOSTERS

### Problème racine
Tous les boosters sont identiques (5 cartes, même pool), l'accès est trop facile (prix fixe, jamais de tension), et il n'y a aucune raison narrative de vouloir un booster spécifique plutôt qu'un autre.

### 1. Boosters par génération (débloqués progressivement)

| Génération | Pool | Condition de déblocage |
|-----------|------|----------------------|
| **Gen 1 — Kanto** | 151 Pokémon, Mewtwo/Mew en légendaires | Dès le départ |
| **Gen 2 — Johto** | 100 Pokémon, Lugia/Ho-Oh en légendaires | Vague 20 atteinte ou 5 badges |
| **Gen 3 — Hoenn** | 135 Pokémon, Rayquaza/Kyogre/Groudon | Vague 40 ou 8 badges |
| **Gen 4 — Sinnoh** | 107 Pokémon, Arceus/Dialga/Palkia | Vague 60 ou run parfait |
| **Spécial — Formes Alt** | Alola, Galar, Hisui | Payées en cristaux rares |

Chaque génération a ses propres visuels de pack, son ambiance musicale, et ses pools de raretés indépendants — les full art et rainbow sont propres à chaque gen.

### 2. Formats de boosters (1, 2, 3 Pokémons) — ✅ implémenté

| Format | Cartes | Prix de base (Gen 1) | Garantie rareté |
|--------|--------|----------------------|-----------------|
| **Sachet** | 1 | 90₽ | Peu Commune minimum |
| **Booster** | 2 | 220₽ | 1 Rare+ garantie |
| **Pack Premium** | 3 | 520₽ | 1 Holo+ garantie (slot médian Rare+) |

Moins de cartes par pack + prix élevés = les bons Pokémon sont rares et mérités. Le Sachet sert à compléter la collection à moindre coût ; le Pack Premium est l'achat « événement ».

### 3. Économie de l'accès — rendre les boosters méritants

**Prix progressif (comme les cartes dans Slay the Spire) — ✅ implémenté :**
- Le premier booster d'une session coûte le prix de base.
- Chaque achat du même format dans la même session augmente le prix de **+18%**.
- Les générations plus hautes coûtent **+15% par gen**.
- Reset au rechargement (le compteur de session n'est pas persisté).

**Cooldown entre achats :**
- Après l'achat d'un booster, 30 minutes avant de pouvoir racheter le même format (optionnel, activable).

**Skill-gate par génération :**
- Gen 2 ne se débloque pas à l'argent — il faut **mériter** l'accès (atteindre la vague 20 avec une équipe Gen 1 pure, par exemple).
- Ça transforme le déblocage en accomplissement, pas en achat.

**Booster gratuit quotidien :**
- 1 Sachet gratuit toutes les 4h (déjà en place, à renforcer visuellement avec un compte à rebours prominent).
- 1 Booster Standard gratuit une fois par jour (login reward).

---

## 🎮 RECOMMANDATIONS GAMEPLAY COMPLÉMENTAIRES

### PRIORITÉ 1 : Fermer la boucle Collection → Run
La collection doit directement alimenter les runs :
- **RunSetup** montre TOUTES tes cartes collectées comme vivier de choix.
- Chaque Pokémon a un **niveau de collection** (nombre de doublons) — plus tu en as, plus il démarre fort.
- Les cartes EX/Full Art démarrent à un niveau supérieur ou avec un bonus passif.

### PRIORITÉ 2 : Méta-progression permanente (comme Hades/Pokérogue)
Après chaque run, débloquer des "Vestiges" permanents :
- **Salle de dressage** : dépenser des cristaux pour augmenter le niveau de départ d'un Pokémon dans tous les futurs runs.
- **Laboratoire du Professeur** : débloquer formes régionales payées en doublons.
- **Archives du Rift** : débloquer nouveaux biomes, boss secrets, raretés de run.

### PRIORITÉ 3 : Traits uniques par Pokémon
Actuellement les 151 sont interchangeables (seul le type compte). Il faut des **identités uniques** :
- Pikachu : *"Si joué avec Raichu, charge électrique ×2 au tour suivant"*
- Évoli : *"Si c'est le seul Pokémon joué, gagne l'effet d'un type aléatoire de ses évolutions"*
- Dracolosse : *"Après 5 ennemis battus de suite, dégâts Dragon ×3"*

### PRIORITÉ 4 : Modes de jeu alternatifs
- **Mode Arènes** : 8 leaders de gym thématiques (type imposé côté ennemi, boucliers adaptés) — structure narrative.
- **Mode Défi** : contraintes spéciales (mono-type, sans items, HP partagés) — pour vétérans.
- **Mode Tournoi** : bracket de 8, run condensé, leaderboard — social/compétitif.

---

## 🎨 GRAPHISMES / VISUELS

### Manques identifiés
1. **Pas d'identité visuelle unifiée** : pas de palette définie, pas de font signature.
2. **Animations de victoire quasi inexistantes** : un panel vert statique. Les jeux addictifs ont des explosions, XP qui volent, sons.
3. **Backgrounds de biome = gradients CSS** : même quelques backgrounds pixel art simples changeraient complètement l'immersion.
4. **Écran titre inexistant** : splash screen + légendaire animé + musique de titre = première impression cruciale.

### Quick wins visuels
- **HP bar avec flash dégâts** : clignoter rouge puis réduire avec un tween fluide — actuellement c'est instantané.
- **Particules sur les bursts** : éclairs/flammes qui jaillissent à chaque coup (Canvas overlay ou CSS keyframes).
- **Theming chromatique par biome** : Volcan = oranges/rouges, Cité = néons bleus — actuellement tous les biomes partagent le même dark purple.
- **Frames TCG sur les cartes rares** : EX/Full Art/Rainbow devraient avoir des bordures distinctives, pas seulement une couleur.
- **Visuel de pack unique par génération** : le pack Kanto a un look rétro Gameboy, le pack Johto est plus chaud/doré, etc.

---

## 📱 UX / UI

### Critiques
1. **Pas d'onboarding** : aucun flow guidé pour un nouveau joueur.
2. **Le sac est caché** : quand un Pokémon est à <25% HP, le jeu devrait **suggérer activement** d'utiliser une potion.
3. **Aucun feedback de progression** : pas de "Tu as découvert 3 nouvelles espèces !" ou "Record battu !". Ces micro-victoires sont le carburant de l'addiction.
4. **Pas de stats joueur** : win rate, espèce la plus capturée, run le plus long, total de dégâts.

### Quick wins UX
- **Bouton "Rejouer"** sur l'écran de fin — une touche, même config, relance immédiate.
- **TypeBadge complet** sur les Pokémon dans le sélecteur — les petits points de couleur actuels sont trop discrets.
- **Long press = tooltip** sur tout item équipé.
- **Sélecteur de génération** dans le shop avec visuels distincts par gen.

---

## 🚀 LES 5 FEATURES QUI CRÉENT L'ADDICTION

**1. Quêtes journalières**
"Capture 3 Pokémon Feu" / "Survive 20 vagues" / "Ouvre 5 boosters" → chaque quête = super bonbons, cristaux, ou carte garantie.

**2. Pokédex vivant avec silhouettes "???"**
Afficher les silhouettes des Pokémon non encore vus → déclenche l'instinct de complétion. Le "???" de la Game Boy était addictif par design pur.

**3. Alt Art jouables en run**
Les Rainbow Rare et Gold devraient avoir des **bonus spéciaux en run** — pas juste cosmétiques. Tirer un Dracolosse Rainbow = démarre au niveau max dans ce run.

**4. Système de Streak**
Enchaîner des runs sans perdre → multiplicateur de cristaux et XP. Perdu ? Streak reset. Crée une tension émotionnelle réelle.

**5. Fusion de cartes**
3 cartes communes identiques = 1 uncommon. 3 uncommon = 1 rare. → donne une raison de garder les doublons et de continuer à ouvrir des boosters même quand on a "tout vu".

---

## 🗺️ ROADMAP RECOMMANDÉE

| Phase | Feature | Addiction | Difficulté |
|-------|---------|-----------|------------|
| ✅ **Fait** | Système Draft de coups (combat) | 🔥🔥🔥 | Moyen |
| ✅ **Fait** | Boosters par gen + formats 1/2/3 + prix progressifs | 🔥🔥🔥 | Moyen |
| **Immédiat** | Collection → vivier de run | 🔥🔥🔥 | Facile |
| **Immédiat** | Pokédex vivant (silhouettes ???) | 🔥🔥 | Facile |
| **Court terme** | Économie progressive (prix montant) | 🔥🔥 | Facile |
| **Court terme** | Quêtes journalières | 🔥🔥🔥 | Moyen |
| **Court terme** | Méta-progression (Salle de dressage) | 🔥🔥🔥 | Moyen |
| **Court terme** | Animations victoire + XP volant | 🔥🔥 | Facile |
| **Moyen terme** | Traits uniques par Pokémon (moves) | 🔥🔥🔥 | Long |
| **Moyen terme** | Mode Arènes + boss légendaires | 🔥🔥 | Moyen |
| **Moyen terme** | Annonce du coup ennemi (Into the Breach) | 🔥🔥 | Moyen |
| **Long terme** | Fusion de cartes | 🔥🔥 | Moyen |
| **Long terme** | Mode Tournoi / Leaderboard | 🔥🔥🔥 | Long |

---

## 🎯 Verdict honnête

**L'ambition est là, les fondations techniques sont saines, mais le jeu en l'état est un prototype de mécaniques sans circuit émotionnel.** Les jeux les plus addictifs (Pokérogue, Balatro, Vampire Survivors) ont tous un "one more run" qui vient du sentiment que **le prochain essai sera différent grâce à ce que j'ai appris ou débloqué**. PokéRift n'a pas encore cette promesse.

Les deux priorités absolues, dans l'ordre :
1. **Le nouveau système de combat Draft** — il transforme chaque tour en décision meaningful.
2. **Les boosters par génération + formats variables** — il transforme chaque ouverture en événement.

Ensemble, ils donnent au jeu son identité propre : pas un clone de Pokérogue, pas un clone de TCG Live — quelque chose d'unique entre les deux.
