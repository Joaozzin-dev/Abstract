/**
 * Store global (Zustand).
 * Export nomeado:  import { useStore } from './store/useStore'
 *
 * Instale se precisar:
 *   npx expo install zustand
 */
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const useStore = create(
  persist(
    (set, get) => ({
      // ── navegação ──────────────────────────────────────────
      screen: 'jornada', // jornada | ranking | perfil | vale | fase1…fase4
      setScreen: (screen) => set({ screen }),

      // ── vale do silêncio ───────────────────────────────────
      valeId: 'vale1',
      setValeId: (valeId) => set({ valeId }),

      // ── progresso da jornada ───────────────────────────────
      // { fase1: { done, stars, mistakes }, vale1: { bestScore, bestTimeMs, runs }, ... }
      progress: {},
      setProgress: (progress) => set({ progress }),
      patchProgress: (partial) =>
        set({ progress: { ...get().progress, ...partial } }),

      /** Marca uma fase oficial como concluída (melhor resultado). */
      finishPhase: (faseId, { stars = 1, mistakes = 0 } = {}) => {
        const prev = get().progress[faseId]
        const next = { done: true, stars, mistakes, doneAt: new Date().toISOString() }
        const better =
          !prev ||
          stars > (prev.stars || 0) ||
          (stars === prev.stars && mistakes < (prev.mistakes || 99))
        set({
          progress: {
            ...get().progress,
            [faseId]: better ? next : { ...prev, done: true },
          },
        })
      },

      // ── perfil ─────────────────────────────────────────────
      displayName: 'Dev júnior',
      setDisplayName: (displayName) => set({ displayName }),

      avatarId: 'dev',
      setAvatarId: (avatarId) => set({ avatarId }),

      // ── som ────────────────────────────────────────────────
      soundEnabled: true,
      setSoundEnabled: (soundEnabled) => set({ soundEnabled: !!soundEnabled }),

      // ── auth opcional ──────────────────────────────────────
      user: null,
      setUser: (user) => set({ user }),
    }),
    {
      name: 'loja-tonho-store',
      storage: createJSONStorage(() => AsyncStorage),
      // não persistir funções — só dados
      partialize: (s) => ({
        screen: s.screen === 'vale' || String(s.screen).startsWith('fase') ? 'jornada' : s.screen,
        progress: s.progress,
        displayName: s.displayName,
        avatarId: s.avatarId,
        soundEnabled: s.soundEnabled,
        valeId: s.valeId,
      }),
    }
  )
)

export default useStore
