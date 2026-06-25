import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const DEFAULT_SETTINGS = {
  sfxEnabled: true,
  reducedMotion: false,
  compactMode: false,
}

export const useSettingsStore = create(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setSetting(key, value) {
        set({ [key]: value })
      },

      resetSettings() {
        set(DEFAULT_SETTINGS)
      },
    }),
    {
      name: 'pokerift-settings',
      version: 1,
      partialize: (state) => ({
        sfxEnabled: state.sfxEnabled,
        reducedMotion: state.reducedMotion,
        compactMode: state.compactMode,
      }),
    }
  )
)
