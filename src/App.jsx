import React, { useEffect } from 'react'
import { useGameStore } from './store/gameStore.js'
import { useRunStore } from './store/runStore.js'
import { loadPokemonData, ensureUidAbove } from './data/pokemon.js'
import HomeScreen from './screens/HomeScreen.jsx'
import ShopScreen from './screens/ShopScreen.jsx'
import PackOpeningScreen from './screens/PackOpeningScreen.jsx'
import CollectionScreen from './screens/CollectionScreen.jsx'
import RunSetupScreen from './screens/RunSetupScreen.jsx'
import RunScreen from './screens/RunScreen.jsx'
import BattleScreen from './screens/BattleScreen.jsx'
import RewardScreen from './screens/RewardScreen.jsx'
import RunShopScreen from './screens/RunShopScreen.jsx'
import RunEndScreen from './screens/RunEndScreen.jsx'
import TrainingScreen from './screens/TrainingScreen.jsx'
import BottomNav from './components/BottomNav.jsx'

const SCREENS = {
  title:      HomeScreen,
  home:       HomeScreen,
  shop:       ShopScreen,
  opening:    PackOpeningScreen,
  collection: CollectionScreen,
  training:   TrainingScreen,
  runsetup:   RunSetupScreen,
  run:        RunScreen,
  battle:     BattleScreen,
  reward:     RewardScreen,
  runshop:    RunShopScreen,
  runend:     RunEndScreen,
}

// Only the meta hub screens show the bottom navigation.
const NAV_SCREENS = ['title', 'home', 'shop', 'collection', 'training']

export default function App() {
  const { currentScreen } = useGameStore()
  const [dataLoaded, setDataLoaded] = React.useState(false)
  const [loadError, setLoadError] = React.useState(null)

  useEffect(() => {
    loadPokemonData()
      .then(() => {
        // Avoid UID collisions after a reload: instance UIDs restart at 1,
        // but persisted collection/run team hold higher ones.
        const uids = [
          ...useGameStore.getState().collection.map(c => c.uid),
          ...useRunStore.getState().team.map(m => m.uid),
        ].filter(Boolean)
        if (uids.length) ensureUidAbove(Math.max(...uids))
        setDataLoaded(true)
      })
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

  const Screen = SCREENS[currentScreen] || HomeScreen
  const showNav = NAV_SCREENS.includes(currentScreen)

  return (
    <div className="min-h-screen bg-game-bg text-white">
      <div className={showNav ? 'pb-16' : ''}>
        <Screen />
      </div>
      {showNav && <BottomNav />}
    </div>
  )
}
