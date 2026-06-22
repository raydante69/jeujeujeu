import React, { useEffect } from 'react'
import { useGameStore } from './store/gameStore.js'
import { loadPokemonData } from './data/pokemon.js'
import TitleScreen from './screens/TitleScreen.jsx'
import ShopScreen from './screens/ShopScreen.jsx'
import PackOpeningScreen from './screens/PackOpeningScreen.jsx'
import CollectionScreen from './screens/CollectionScreen.jsx'
import TeamBuilderScreen from './screens/TeamBuilderScreen.jsx'
import MapScreen from './screens/MapScreen.jsx'
import CombatScreen from './screens/CombatScreen.jsx'
import RewardsScreen from './screens/RewardsScreen.jsx'
import BottomNav from './components/BottomNav.jsx'

const SCREENS = {
  title:      TitleScreen,
  shop:       ShopScreen,
  opening:    PackOpeningScreen,
  collection: CollectionScreen,
  team:       TeamBuilderScreen,
  map:        MapScreen,
  combat:     CombatScreen,
  rewards:    RewardsScreen,
}

const NO_NAV = ['title', 'opening', 'combat', 'rewards']

export default function App() {
  const { currentScreen } = useGameStore()
  const [dataLoaded, setDataLoaded] = React.useState(false)
  const [loadError, setLoadError] = React.useState(null)

  useEffect(() => {
    loadPokemonData()
      .then(() => setDataLoaded(true))
      .catch(e => setLoadError(e.message))
  }, [])

  if (loadError) {
    return (
      <div className="min-h-screen bg-game-bg flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-red-400 font-bold mb-2">Erreur de chargement</p>
          <p className="text-gray-500 text-sm">{loadError}</p>
        </div>
      </div>
    )
  }

  if (!dataLoaded) {
    return (
      <div className="min-h-screen bg-game-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin">⚡</div>
          <p className="font-game text-xs text-gray-400">Chargement…</p>
        </div>
      </div>
    )
  }

  const Screen = SCREENS[currentScreen] || TitleScreen
  const showNav = !NO_NAV.includes(currentScreen)

  return (
    <div className="min-h-screen bg-game-bg text-white">
      <div className={showNav ? 'pb-16' : ''}>
        <Screen />
      </div>
      {showNav && <BottomNav />}
    </div>
  )
}
