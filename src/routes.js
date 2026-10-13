/**
 * Tabela única de rotas. Para criar uma tela nova: adicione uma linha aqui.
 *   tab        → aparece na barra inferior
 *   fullscreen → sem barra inferior
 *   phase      → recebe onClose/onFinish({ mistakes, stars }) e grava progresso
 *   guard      → 'phase' | 'vale': só abre se desbloqueada (senão volta pra Jornada)
 */
import JourneyScreen from './screens/JourneyScreen'
import RankingScreen from './screens/RankingScreen'
import ProfileScreen from './screens/ProfileScreen'
import ValeGate from './screens/ValeGate'
import Fase1 from './fases/fase1'
import Fase2 from './fases/fase2'
import Fase3 from './fases/fase3'
import Fase4 from './fases/fase4'
import { CHAPTERS, chapterStatus, isValeUnlocked } from './lib/unlocks'

export const ROUTES = {
  jornada: { Component: JourneyScreen, tab: { label: 'Jornada', icon: 'book' } },
  ranking: { Component: RankingScreen, tab: { label: 'Ranking', icon: 'trophy' } },
  perfil: { Component: ProfileScreen, tab: { label: 'Perfil', icon: 'person' }, needs: ['onSignOut'] },
  // ValeGate escolhe Plantão (vale1) ou Sem rede (vale2) pelo store.valeId
  vale: { Component: ValeGate, fullscreen: true, guard: 'vale' },
  fase1: { Component: Fase1, fullscreen: true, phase: true, guard: 'phase' },
  fase2: { Component: Fase2, fullscreen: true, phase: true, guard: 'phase' },
  fase3: { Component: Fase3, fullscreen: true, phase: true, guard: 'phase' },
  fase4: { Component: Fase4, fullscreen: true, phase: true, guard: 'phase' },
}

export const DEFAULT_ROUTE = 'jornada'
export const TABS = Object.entries(ROUTES)
  .filter(([, r]) => r.tab)
  .map(([id, r]) => ({ id, ...r.tab }))

export const isRoute = (id) => !!ROUTES[id]
export const isFullscreen = (id) => !!ROUTES[id]?.fullscreen || id === 'splash' || id === 'terms'

/** Regra de acesso da rota (progresso vem do store). */
export function canOpen(id, progress, valeId) {
  const g = ROUTES[id]?.guard
  const prog = progress || {}
  if (g === 'phase') return chapterStatus(id, prog) !== 'locked'
  if (g === 'vale') {
    if (!valeId) return true
    if (isValeUnlocked(valeId, prog)) return true
    // fallback: loja completa libera Plantão e Sem rede
    const allDone =
      Array.isArray(CHAPTERS) &&
      CHAPTERS.length > 0 &&
      CHAPTERS.every((c) => prog[c.id]?.done)
    return !!allDone
  }
  return true
}

/** Deep link: poema://fase2, exp://host/--/ranking, ... → id da rota (ou null). */
export function screenFromUrl(url) {
  const seg = String(url || '').split('?')[0].split('#')[0].split('/').filter(Boolean).pop()
  return ROUTES[seg] ? seg : null
}