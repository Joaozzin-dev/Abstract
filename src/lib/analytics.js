/**
 * Telemetria de uso no Firestore (tudo em users/{uid}/...):
 *   sessions/{sid}   uma por abertura do app: início, tempo ativo, último sinal, fim
 *   events/{id}      linha do tempo: screen_view (com durationMs), phase_start/finish/abandon,
 *                    progress_update, tab_press, app_foreground/background, login/logout, custom
 *   daily/{AAAA-MM-DD}  tempo ativo e nº de sessões por dia
 *   stats/summary    totais (tempo ativo total, sessões, último acesso)
 *
 * "Tempo ativo" só conta com o app em primeiro plano.
 * Eventos são agrupados e enviados a cada 15s, ao ir para segundo plano e ao sair.
 * Dentro de uma fase/tela, use:  track('question_answered', { fase: 'fase1', q: 3, correct: true, ms: 4200 })
 */
import { AppState, Platform } from 'react-native'
import { collection, doc, increment, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore'
import { db } from './firebase'
import { useStore } from '../store/useStore'

const clean = (o) => JSON.parse(JSON.stringify(o))
const now = () => Date.now()
const FLUSH_MS = 15000
const MAX_QUEUE = 1000

let S = null

function dayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const activeNow = () => S.activeMs + (S.fgSince ? now() - S.fgSince : 0)

function push(type, data, screen) {
  if (!S) return
  S.queue.push({ type, screen: screen ?? S.screen ?? undefined, data: data || undefined, clientTs: now() })
  if (S.queue.length > MAX_QUEUE) S.queue.splice(0, S.queue.length - MAX_QUEUE)
}

/** Fecha o trecho de tela atual registrando quanto tempo ficou nela. */
function closeSegment() {
  if (!S?.screen || S.screenSince == null) return
  push('screen_view', { durationMs: now() - S.screenSince }, S.screen)
  S.screenSince = null
}

export function trackScreen(name) {
  if (!S || S.screen === name) return
  closeSegment()
  S.screen = name
  S.screenSince = S.fgSince ? now() : null
}

export function track(type, data) {
  push(type, data)
}

/* ---- fases ---- */
export function phaseStart(id) {
  if (!S) return
  S.phases.set(id, now())
  push('phase_start', { id })
}
/** outcome: 'finish' | 'close' | 'left' */
export function phaseEnd(id, outcome, extra) {
  if (!S || !S.phases.has(id)) return 0
  const durationMs = now() - S.phases.get(id)
  S.phases.delete(id)
  const type = outcome === 'finish' ? 'phase_finish' : 'phase_abandon'
  push(type, { id, durationMs, outcome, ...(extra || {}) })
  return durationMs
}
export const phaseOpen = (id) => !!S?.phases.has(id)

/* ---- envio ---- */
async function flush(final = false) {
  if (!S || S.flushing) return
  const s = S
  const events = s.queue.splice(0, 300)
  const cur = activeNow()
  const delta = cur - s.flushedMs
  if (!events.length && delta < 1000 && !final) return
  s.flushing = true
  try {
    const uid = s.uid
    const batch = writeBatch(db)
    events.forEach((e) =>
      batch.set(doc(collection(db, 'users', uid, 'events')), { ...clean(e), sid: s.sid, ts: serverTimestamp() })
    )
    batch.set(
      doc(db, 'users', uid, 'sessions', s.sid),
      { activeMs: cur, lastActiveAt: serverTimestamp(), ...(final ? { endedAt: serverTimestamp() } : {}) },
      { merge: true }
    )
    if (delta > 0) {
      batch.set(doc(db, 'users', uid, 'daily', dayKey()), { date: dayKey(), activeMs: increment(delta), updatedAt: serverTimestamp() }, { merge: true })
      batch.set(doc(db, 'users', uid, 'stats', 'summary'), { totalActiveMs: increment(delta), lastSeenAt: serverTimestamp() }, { merge: true })
    }
    await batch.commit()
    s.flushedMs = cur
  } catch (e) {
    s.queue.unshift(...events)
    console.warn('[analytics] flush falhou:', e?.code || e)
  } finally {
    s.flushing = false
  }
}

function onAppState(state) {
  if (!S) return
  if (state === 'active') {
    if (!S.fgSince) S.fgSince = now()
    if (S.screen) S.screenSince = now()
    push('app_foreground')
  } else {
    closeSegment()
    if (S.fgSince) {
      S.activeMs += now() - S.fgSince
      S.fgSince = null
    }
    push('app_background')
    flush()
  }
}

/** Detecta mudanças de progresso (fases e Vale) sem precisar mexer nas telas deles. */
function watchProgress() {
  let prev = useStore.getState().progress || {}
  return useStore.subscribe(() => {
    const cur = useStore.getState().progress || {}
    if (cur === prev) return
    for (const id of Object.keys(cur)) {
      const a = prev[id] || {}
      const b = cur[id] || {}
      if (a.done !== b.done || a.stars !== b.stars || a.bestScore !== b.bestScore) {
        push('progress_update', { id, done: !!b.done, stars: b.stars || 0, ...(b.bestScore != null ? { bestScore: b.bestScore } : {}) })
      }
    }
    prev = cur
  })
}

export function startTracking(account) {
  stopTracking()
  const uid = account.uid
  const sid = `${now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
  S = {
    uid,
    sid,
    queue: [],
    activeMs: 0,
    fgSince: AppState.currentState === 'active' ? now() : null,
    flushedMs: 0,
    screen: null,
    screenSince: null,
    phases: new Map(),
    flushing: false,
  }
  push('login', { stage: account.stage, ageBand: account.ageBand })
  S.sub = AppState.addEventListener('change', onAppState)
  S.unwatch = watchProgress()
  S.timer = setInterval(() => flush(), FLUSH_MS)

  const batch = writeBatch(db)
  batch.set(doc(db, 'users', uid, 'sessions', sid), {
    startedAt: serverTimestamp(),
    platform: Platform.OS,
    osVersion: String(Platform.Version),
    activeMs: 0,
    lastActiveAt: serverTimestamp(),
  })
  batch.set(doc(db, 'users', uid, 'daily', dayKey()), { date: dayKey(), sessions: increment(1), updatedAt: serverTimestamp() }, { merge: true })
  batch.set(doc(db, 'users', uid, 'stats', 'summary'), { sessions: increment(1), lastSeenAt: serverTimestamp() }, { merge: true })
  batch.commit().catch((e) => console.warn('[analytics] start falhou:', e?.code || e))
}

/** Fecha tudo e faz o último envio (precisa ser ANTES do signOut do Firebase). */
export async function stopTracking(reason) {
  const s = S
  if (!s) return
  if (reason) push(reason)
  for (const id of [...s.phases.keys()]) phaseEnd(id, 'left')
  closeSegment()
  if (s.fgSince) {
    s.activeMs += now() - s.fgSince
    s.fgSince = null
  }
  clearInterval(s.timer)
  s.sub?.remove()
  s.unwatch?.()
  await flush(true).catch(() => {})
  if (S === s) S = null
}