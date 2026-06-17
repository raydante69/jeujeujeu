// Minimal i18n: a flat EN/FR dictionary plus helpers that translate elements
// tagged with data-i18n (textContent) and data-i18n-attr (attributes).
import { state, setSetting } from './state.js';

const STRINGS = {
  en: {
    'title.subtitle': 'Pokémon Roguelike',
    'title.story': 'Story', 'title.playStory': 'Play Story',
    'title.battleTower': 'Battle Tower', 'title.enterTower': 'Enter Tower',
    'title.challenges': 'Challenges', 'title.takeChallenge': 'Take Challenge',
    'title.resumeStory': 'Resume Story', 'title.resumeTower': 'Resume Tower',
    'title.resumeChallenge': 'Resume Challenge',
    'title.privacy': 'Privacy Policy', 'title.joinDiscord': 'Join Discord',
    'title.disclaimer': 'Fan-made project. Not affiliated with, endorsed by, or sponsored by Nintendo, Game Freak, or The Pokémon Company. All Pokémon names and sprites are property of their respective owners.',
    'trainer.who': 'Who are you?', 'trainer.boy': 'BOY', 'trainer.girl': 'GIRL',
    'starter.choose': 'Choose Your Starter!',
    'menu.home': 'Home', 'menu.pokedex': 'Pokédex', 'menu.achievements': 'Achievements',
    'menu.hallOfFame': 'Hall of Fame', 'menu.resetRun': 'Reset Run', 'menu.patchNotes': 'Patch Notes',
    'menu.settings': 'Settings', 'menu.credits': 'Credits', 'menu.menu': 'Menu',
    'menu.map': 'Map', 'menu.pokemart': 'Poké Mart', 'menu.fullscreen': 'Fullscreen',
    'menu.mainMenu': 'Main Menu',
    'battle.yourTeam': 'Your Team', 'battle.enemy': 'Enemy', 'battle.wild': 'Wild Battle!',
    'catch.title': 'Wild Pokémon Appeared!', 'catch.desc': 'Choose one Pokémon to add to your team',
    'catch.skipFlee': 'Skip (flee)',
    'item.found': 'Item Found!', 'item.chooseOne': 'Choose one item to keep',
    'item.passiveTitle': 'Passive Item!', 'item.pickOne': 'Pick one — it stays in your bag',
    'team.full': 'Team Full!', 'team.keepAsIs': 'Keep team as-is',
    'trade.offer': 'Trade Offer', 'trade.decline': 'Decline',
    'badge.title': 'Badge Earned!', 'map.nextMap': 'Next Map →',
    'elite.chooseOrder': 'Choose Your Order',
    'elite.hint': 'Drag your Pokémon to reorder · hover for stats',
    'elite.bag': 'Bag', 'elite.fight': 'FIGHT!', 'elite.opponent': 'Opponent',
    'common.skip': 'Skip', 'common.continue': 'Continue', 'common.playAgain': 'Play Again',
    'win.congrats': 'Congratulations! You defeated the Elite Four!',
    'win.share': '📤 Share', 'win.climbTower': '🗼 Climb the Tower',
    'gameover.title': 'GAME OVER',
  },
  fr: {
    'title.subtitle': 'Roguelike Pokémon',
    'title.story': 'Aventure', 'title.playStory': 'Jouer',
    'title.battleTower': 'Tour de Combat', 'title.enterTower': 'Entrer',
    'title.challenges': 'Défis', 'title.takeChallenge': 'Relever',
    'title.resumeStory': 'Reprendre l\'aventure', 'title.resumeTower': 'Reprendre la Tour',
    'title.resumeChallenge': 'Reprendre le défi',
    'title.privacy': 'Confidentialité', 'title.joinDiscord': 'Rejoindre Discord',
    'title.disclaimer': 'Projet de fans. Sans aucune affiliation, approbation ni parrainage de Nintendo, Game Freak ou The Pokémon Company. Tous les noms et sprites Pokémon appartiennent à leurs propriétaires respectifs.',
    'trainer.who': 'Qui es-tu ?', 'trainer.boy': 'GARÇON', 'trainer.girl': 'FILLE',
    'starter.choose': 'Choisis ton starter !',
    'menu.home': 'Accueil', 'menu.pokedex': 'Pokédex', 'menu.achievements': 'Succès',
    'menu.hallOfFame': 'Panthéon', 'menu.resetRun': 'Recommencer', 'menu.patchNotes': 'Notes de version',
    'menu.settings': 'Réglages', 'menu.credits': 'Crédits', 'menu.menu': 'Menu',
    'menu.map': 'Carte', 'menu.pokemart': 'Boutique', 'menu.fullscreen': 'Plein écran',
    'menu.mainMenu': 'Menu principal',
    'battle.yourTeam': 'Ton équipe', 'battle.enemy': 'Ennemi', 'battle.wild': 'Combat sauvage !',
    'catch.title': 'Un Pokémon sauvage apparaît !', 'catch.desc': 'Choisis un Pokémon à ajouter à ton équipe',
    'catch.skipFlee': 'Passer (fuir)',
    'item.found': 'Objet trouvé !', 'item.chooseOne': 'Choisis un objet à garder',
    'item.passiveTitle': 'Objet passif !', 'item.pickOne': 'Choisis-en un — il reste dans ton sac',
    'team.full': 'Équipe pleine !', 'team.keepAsIs': 'Garder telle quelle',
    'trade.offer': 'Proposition d\'échange', 'trade.decline': 'Refuser',
    'badge.title': 'Badge obtenu !', 'map.nextMap': 'Carte suivante →',
    'elite.chooseOrder': 'Choisis ton ordre',
    'elite.hint': 'Glisse tes Pokémon pour réordonner · survole pour les stats',
    'elite.bag': 'Sac', 'elite.fight': 'COMBAT !', 'elite.opponent': 'Adversaire',
    'common.skip': 'Passer', 'common.continue': 'Continuer', 'common.playAgain': 'Rejouer',
    'win.congrats': 'Félicitations ! Tu as battu le Conseil 4 !',
    'win.share': '📤 Partager', 'win.climbTower': '🗼 Gravir la Tour',
    'gameover.title': 'PARTIE TERMINÉE',
  },
};

export function currentLang() {
  return state.meta.settings.lang || 'en';
}

export function t(key) {
  const lang = currentLang();
  return (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key;
}

export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  root.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    // format: "data-tip:menu.pokedex;aria-label:menu.pokedex"
    el.getAttribute('data-i18n-attr').split(';').forEach((pair) => {
      const [attr, key] = pair.split(':');
      if (attr && key) el.setAttribute(attr.trim(), t(key.trim()));
    });
  });
}

export function setLang(lang) {
  setSetting('lang', lang);
  document.documentElement.lang = lang;
  applyI18n();
}
