/**
 * XP, nível e cargo do perfil + liga semanal.
 *
 * O XP só sobe na Speed Run (Vale do Silêncio). Fica guardado em
 * progress.vale1 / progress.vale2 (campos: xp, weekId, weekXp, runs, bestCombo),
 * o mesmo lugar do bestScore, então persiste pelo mesmo caminho de sempre.
 *
 * Para o perfil:
 *   const { xp, level, cargo } = useXp()
 *   cargo.name, cargo.icon, cargo.color, level.level, level.pct ...
 */
import { useStore } from '../store/useStore'
import { CARGO_COLORS } from './colors'

export const VALE_KEYS = ['vale1', 'vale2']

/* ------------------------------ CARGOS ------------------------------ */
export const CARGOS = [
  { id: 'estagiario', name: 'Estagiário(a)', min: 0, icon: 'cafe', color: CARGO_COLORS.estagiario },
  { id: 'junior', name: 'Dev Júnior', min: 300, icon: 'code-slash', color: CARGO_COLORS.junior },
  { id: 'pleno', name: 'Dev Pleno', min: 1000, icon: 'rocket', color: CARGO_COLORS.pleno },
  { id: 'senior', name: 'Dev Sênior', min: 2500, icon: 'shield-checkmark', color: CARGO_COLORS.senior },
  { id: 'lead', name: 'Tech Lead', min: 5000, icon: 'flash', color: CARGO_COLORS.lead },
  { id: 'arquiteto', name: 'Arquiteto(a)', min: 9000, icon: 'diamond', color: CARGO_COLORS.arquiteto },
  { id: 'cto', name: 'CTO', min: 15000, icon: 'trophy', color: CARGO_COLORS.cto },
]

export function cargoFor(xp) {
  const v = Math.max(0, xp || 0)
  let index = 0
  CARGOS.forEach((c, i) => {
    if (v >= c.min) index = i
  })
  const cargo = CARGOS[index]
  const next = CARGOS[index + 1] || null
  return { ...cargo, index, next, toNext: next ? next.min - v : 0 }
}

/* ------------------------------ NÍVEL ------------------------------- */
const LEVEL_K = 150 // nível n começa em 150 * (n-1)^2 XP

export function levelInfo(xp) {
  const v = Math.max(0, xp || 0)
  const level = Math.floor(Math.sqrt(v / LEVEL_K)) + 1
  const start = LEVEL_K * (level - 1) * (level - 1)
  const nextAt = LEVEL_K * level * level
  const span = nextAt - start
  const into = v - start
  return { level, start, nextAt, span, into, pct: span ? Math.min(1, into / span) : 0, toNext: nextAt - v }
}

/* ------------------------------ TOTAIS ------------------------------ */
export function totalXp(progress) {
  const p = progress || {}
  return VALE_KEYS.reduce((sum, k) => sum + ((p[k] && p[k].xp) || 0), 0)
}

const DAY = 86400000
const WEEK = 7 * DAY
// semana começa na segunda (UTC)
export const currentWeekId = (now = Date.now()) => Math.floor((now + 3 * DAY) / WEEK)
const weekStart = (id) => id * WEEK - 3 * DAY

export function weekXpOf(progress, now = Date.now()) {
  const p = progress || {}
  const wk = currentWeekId(now)
  return VALE_KEYS.reduce((sum, k) => sum + (p[k] && p[k].weekId === wk ? p[k].weekXp || 0 : 0), 0)
}

export function daysLeftInWeek(now = Date.now()) {
  const end = weekStart(currentWeekId(now) + 1)
  return Math.max(1, Math.ceil((end - now) / DAY))
}

export function useXp() {
  const progress = useStore((s) => s.progress) || {}
  const xp = totalXp(progress)
  return { xp, weekXp: weekXpOf(progress), level: levelInfo(xp), cargo: cargoFor(xp) }
}

/* ------------------------- GRAVAR UMA PARTIDA ----------------------- */
/**
 * Grava XP + recorde de uma partida. Devolve { newBest, xpBefore, xpAfter }.
 */
export function commitRun({ key, score, timeMs, xp, combo }) {
  const k = key === 'vale2' ? 'vale2' : 'vale1'
  try {
    const st = useStore.getState()
    const progress = st.progress || {}
    const prev = progress[k] || {}
    const xpBefore = totalXp(progress)
    const wk = currentWeekId()

    const newBest =
      score > 0 &&
      (prev.bestScore == null ||
        score > prev.bestScore ||
        (score === prev.bestScore && (prev.bestTimeMs == null || timeMs < prev.bestTimeMs)))

    const entry = {
      ...prev,
      done: prev.done || score > 0,
      xp: (prev.xp || 0) + xp,
      weekId: wk,
      weekXp: (prev.weekId === wk ? prev.weekXp || 0 : 0) + xp,
      runs: (prev.runs || 0) + 1,
      bestCombo: Math.max(prev.bestCombo || 0, combo || 0),
    }
    if (newBest) {
      entry.bestScore = score
      entry.bestTimeMs = timeMs
    }

    const next = { ...progress, [k]: entry }
    if (typeof st.setProgress === 'function') st.setProgress(next)
    else if (typeof st.saveProgress === 'function') st.saveProgress(next)
    else if (typeof st.updateProgress === 'function') st.updateProgress(k, entry)
    else useStore.setState({ progress: next })

    return { newBest, xpBefore, xpAfter: xpBefore + xp }
  } catch (_) {
    return { newBest: false, xpBefore: 0, xpAfter: 0 }
  }
}

/* ------------------------------ LIGA -------------------------------- */
/**
 * Monta a liga da semana SÓ com jogadores reais.
 * `real` = [{ id, displayName, xp, avatarId }] (XP da semana, vindo do Firestore via useLeague).
 * Sem dados de outros jogadores, a liga mostra apenas você.
 */
export function buildLeague(progress, displayName, real, myUid, myAvatarId) {
  const me = { id: 'me', displayName, xp: weekXpOf(progress), me: true, avatarId: myAvatarId }
  const others = (Array.isArray(real) ? real : [])
    .filter((r) => r && r.id !== 'me' && r.id !== myUid && (r.xp || 0) > 0)
    .map((r) => ({ id: r.id, displayName: r.displayName || 'Jogador', xp: r.xp || 0, avatarId: r.avatarId }))
  const rows = [me, ...others].sort((a, b) => b.xp - a.xp || String(a.displayName).localeCompare(String(b.displayName)))
  const size = rows.length
  const zone = Math.min(3, Math.floor(size / 3))
  return {
    rows,
    myIndex: rows.findIndex((r) => r.me),
    promote: zone,
    demoteFrom: size - zone,
    daysLeft: daysLeftInWeek(),
    alone: size === 1,
  }
}