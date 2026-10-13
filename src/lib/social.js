/**
 * Camada social: perfil público, "ativos agora" e feed de conquistas automáticas.
 *
 *   publicProfiles/{uid}  cartão público (nome, @, estrelas, recordes, última atividade)
 *   feed/{postId}         conquistas: 'stars3' | 'record' | 'vale_record'
 *
 * Só entra no feed quem é ADULTO e ligou "perfil visível" (canPublish). A postagem é automática:
 * o watcher compara o progresso antes/depois e enfileira cada conquista (id determinístico).
 *
 * Tudo vem direto do Firebase e vai direto para o Firebase. Nada é guardado na memória do
 * aparelho por este arquivo (sem AsyncStorage, sem fila local, sem cache em disco):
 *  - Duplicata de conquista é checada no servidor (getDoc + id determinístico).
 *  - Perfil que deveria estar privado mas ainda existe no servidor é apagado ao abrir o app.
 *  - Ranking e "eu" do ranking são lidos do Firestore (users/{uid}/state/main), não do aparelho.
 *  - useFeed: paginação, polling pausado em segundo plano e sem corrida entre requisições.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'
import { useStore } from '../store/useStore'
import { CHAPTERS, totalStars } from './unlocks'
import { totalXp } from './xp'

export const ONLINE_MS = 5 * 60 * 1000 // "online agora" = visto nos últimos 5 min
export const ACTIVE_MS = 2 * 60 * 60 * 1000 // lista de ativos = vistos nas últimas 2 horas
export const FEED_PAGE = 20
export const FEED_MAX = 100
export const ACTIVE_LIMIT = 30
const HEARTBEAT_MS = 2 * 60 * 1000
const RECORD_GAIN = 0.9 // novo recorde = pelo menos 10% mais rápido que o seu melhor
const KINDS = new Set(['stars3', 'record', 'vale_record'])

const int = (n) => Math.max(0, Math.round(Number(n) || 0))
const codeOf = (e) => e?.code || e?.message || String(e)
const swallow = () => {}

/** Regra de privacidade: só adulto com perfil visível aparece/posta. (Espelha firestore.rules) */
export const canPublish = (acc) => !!acc?.uid && acc.profilePublic === true && acc.ageBand === '18plus'

/* ---------- perfil público ---------- */
/** Números públicos calculados do progresso (mesmas funções do Perfil, então batem com o que a pessoa vê). */
export function buildStats(p = {}) {
  return {
    stars: int(totalStars(p)),
    done: CHAPTERS.filter((c) => p?.[c.id]?.done).length,
    vale1Score: int(p.vale1?.bestScore),
    vale1TimeMs: int(p.vale1?.bestTimeMs),
    vale2Score: int(p.vale2?.bestScore),
    vale2TimeMs: int(p.vale2?.bestTimeMs),
    xp: int(totalXp(p)),
  }
}

/**
 * Publica/atualiza o cartão público.
 * - Sempre grava scores como número (mesmo 0), para o orderBy do ranking não excluir o doc.
 * - Usa merge: true para não apagar campos se a regra bloquear algum (ex.: xp em regras antigas).
 */
export async function publishProfile(progress) {
  const st = useStore.getState()
  const acc = st.account
  if (!canPublish(acc)) return
  const p = progress || st.progress || {}
  const stats = buildStats(p)
  const data = {
    uid: acc.uid,
    name: acc.name || '',
    handle: acc.handle || '',
    stage: acc.stage || '',
    institution: String(acc.institution || '').slice(0, 120),
    ...stats,
    lastSeenAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  if (st.avatarId != null) data.avatarId = String(st.avatarId)
  const ref = doc(db, 'publicProfiles', acc.uid)
  try {
    await setDoc(ref, data, { merge: true })
  } catch (e) {
    // regras antigas que não conhecem o campo `xp`: publica o resto
    if (e?.code === 'permission-denied') {
      const { xp, ...rest } = data
      try {
        await setDoc(ref, rest, { merge: true })
        return
      } catch (e2) {
        console.warn('[social] publishProfile (sem xp) falhou:', codeOf(e2))
        throw e2
      }
    }
    console.warn('[social] publishProfile falhou:', codeOf(e))
    throw e
  }
}

/** Ao deixar o perfil privado: some dos "ativos" e apaga as próprias postagens. Lança erro se algo ficou. */
export async function withdrawPublic(uid) {
  await deleteDoc(doc(db, 'publicProfiles', uid)) // erro sobe: o perfil ainda estaria público
  for (let round = 0; round < 10; round++) {
    const snap = await getDocs(query(collection(db, 'feed'), where('uid', '==', uid), limit(400)))
    if (snap.empty) break
    const batch = writeBatch(db)
    snap.docs.forEach((d) => batch.delete(d.ref))
    await batch.commit()
    if (snap.size < 400) break
  }
}

/* ---------- conquistas (gravadas direto no Firebase) ---------- */
const achId = (uid, a) => [uid, a.kind, a.itemId, a.kind === 'stars3' ? '3' : `${int(a.score)}_${int(a.timeMs)}`].join('_')

/* ids já confirmados no servidor nesta sessão (só memória do app): evita reler à toa */
const posted = new Set()

/** 'ok' | 'dup' (já existe) | 'drop' (não pode postar) | 'error' */
async function sendPost(a) {
  if (posted.has(a.id)) return 'dup'
  const st = useStore.getState()
  const acc = st.account
  if (!canPublish(acc) || acc.uid !== a.uid) return 'drop'
  const ref = doc(db, 'feed', a.id)
  try {
    if ((await getDoc(ref)).exists()) {
      posted.add(a.id)
      return 'dup'
    }
  } catch {
    /* leitura negada/sem rede: tenta gravar mesmo assim */
  }
  const data = {
    uid: acc.uid,
    name: acc.name,
    handle: acc.handle,
    kind: a.kind,
    itemId: a.itemId,
    createdAt: serverTimestamp(),
  }
  if (st.avatarId != null) data.avatarId = String(st.avatarId)
  if (acc.institution) data.institution = String(acc.institution).slice(0, 120)
  if (a.stars != null) data.stars = int(a.stars)
  if (a.score != null) data.score = int(a.score)
  if (a.timeMs) data.timeMs = int(a.timeMs)
  try {
    await setDoc(ref, data)
    posted.add(a.id)
    return 'ok'
  } catch (e) {
    // Não trate permission-denied como "já existe": pode ser regra real (menor/privado)
    if (e?.code === 'permission-denied') {
      console.warn('[feed] post negado (regra):', codeOf(e))
      return 'drop'
    }
    console.warn('[feed] post falhou:', codeOf(e))
    return 'error'
  }
}

function postAchievement(a) {
  const acc = useStore.getState().account
  if (!canPublish(acc)) return Promise.resolve('drop')
  return sendPost({ ...a, id: achId(acc.uid, a), uid: acc.uid })
}

/* ---------- detecção de conquistas ---------- */
/** Guarda o melhor tempo da fase (chamado pelo Root ao concluir). Menor é melhor. */
export function recordPhaseTime(id, ms) {
  if (!id || !ms) return
  useStore.setState((s) => {
    const cur = s.progress?.[id] || {}
    const best = cur.bestTimeMs ? Math.min(cur.bestTimeMs, ms) : ms
    return { progress: { ...(s.progress || {}), [id]: { ...cur, bestTimeMs: best } } }
  })
}

function detect(prev, cur) {
  const out = []
  for (const ch of CHAPTERS) {
    const a = prev?.[ch.id] || {}
    const b = cur?.[ch.id] || {}
    if ((b.stars || 0) >= 3 && (a.stars || 0) < 3) {
      out.push({ kind: 'stars3', itemId: ch.id, stars: 3, timeMs: b.bestTimeMs })
    } else if ((b.stars || 0) >= 2 && a.bestTimeMs && b.bestTimeMs && b.bestTimeMs <= a.bestTimeMs * RECORD_GAIN) {
      out.push({ kind: 'record', itemId: ch.id, stars: b.stars, timeMs: b.bestTimeMs })
    }
  }
  for (const id of ['vale1', 'vale2']) {
    const a = prev?.[id] || {}
    const b = cur?.[id] || {}
    if (!a.bestScore || !b.bestScore) continue // primeira partida não é "recorde"
    const more = b.bestScore > a.bestScore
    const faster = b.bestScore === a.bestScore && a.bestTimeMs && b.bestTimeMs && b.bestTimeMs < a.bestTimeMs
    if (more || faster) out.push({ kind: 'vale_record', itemId: id, score: b.bestScore, timeMs: b.bestTimeMs })
  }
  return out
}

/** Posta as conquistas que a pessoa JÁ tem (idempotente: o servidor ignora as que já existem). */
export async function backfillAchievements() {
  const p = useStore.getState().progress || {}
  let n = 0
  for (const ch of CHAPTERS) {
    if ((p[ch.id]?.stars || 0) >= 3) {
      await postAchievement({ kind: 'stars3', itemId: ch.id, stars: 3, timeMs: p[ch.id]?.bestTimeMs })
      n++
    }
  }
  return n
}

/** O servidor é a verdade: alinha o que o app mostra com users/{uid}. */
async function syncFlags() {
  const acc = useStore.getState().account
  if (!acc?.uid) return
  try {
    const d = (await getDoc(doc(db, 'users', acc.uid))).data()
    if (d && (d.profilePublic !== acc.profilePublic || d.ageBand !== acc.ageBand)) {
      useStore.setState({ account: { ...acc, profilePublic: !!d.profilePublic, ageBand: d.ageBand || acc.ageBand } })
    }
  } catch (e) {
    console.warn('[social] syncFlags falhou:', codeOf(e))
  }
}

/** Força uma sincronização completa (perfil + conquistas pendentes). */
export async function republishAll() {
  await syncFlags()
  if (!canPublish(useStore.getState().account)) return
  await publishProfile().catch(swallow)
  await backfillAchievements()
}

/* ---------- ciclo de vida ---------- */
let S = null
let gen = 0

export function stopSocial() {
  gen++
  posted.clear()
  if (!S) return
  clearTimeout(S.timer)
  clearInterval(S.hb)
  S.unsub?.()
  S.app?.remove()
  S = null
}

/** Chamar DEPOIS do pull do progresso (senão o que veio da nuvem viraria "conquista nova"). */
export function startSocial() {
  stopSocial()
  const me = gen
  const current = () => me === gen
  const snap = () => JSON.parse(JSON.stringify(useStore.getState().progress || {}))
  const s = { base: snap(), timer: null }
  S = s
  let lastRef = useStore.getState().progress

  s.unsub = useStore.subscribe(() => {
    const ref = useStore.getState().progress
    if (ref === lastRef) return // mudou só outra coisa (som, nome...)
    lastRef = ref
    clearTimeout(s.timer)
    s.timer = setTimeout(() => {
      const cur = snap()
      const found = detect(s.base, cur)
      s.base = cur
      if (canPublish(useStore.getState().account)) publishProfile(cur).catch(swallow) // estrelas/acertos em dia
      found.forEach(postAchievement)
      backfillAchievements().catch(swallow) // confere TODAS as fases com 3 estrelas, não só a diferença desta vez
    }, 600) // junta as várias atualizações de uma mesma conclusão
  })

  const beat = async () => {
    const acc = useStore.getState().account
    if (!current() || !canPublish(acc) || AppState.currentState !== 'active') return
    try {
      await updateDoc(doc(db, 'publicProfiles', acc.uid), { lastSeenAt: serverTimestamp() })
    } catch (e) {
      if (e?.code === 'not-found') await publishProfile().catch(swallow) // perfil foi apagado: recria
    }
  }

  ;(async () => {
    await syncFlags()
    if (!current()) return
    const acc = useStore.getState().account
    if (!acc?.uid) return
    if (!canPublish(acc)) {
      // privado/menor: se ainda sobrou perfil público no servidor, apaga (o servidor é a verdade)
      try {
        if ((await getDoc(doc(db, 'publicProfiles', acc.uid))).exists()) await withdrawPublic(acc.uid)
      } catch {
        /* sem rede: tenta na próxima abertura */
      }
      return
    }
    await publishProfile().catch(swallow)
    await backfillAchievements()
    beat()
  })()

  s.hb = setInterval(beat, HEARTBEAT_MS)
  s.app = AppState.addEventListener('change', (st) => st === 'active' && beat())
}

/* ---------- leitura (para o Ranking › Feed) ---------- */
const ms = (t) => (t?.toMillis ? t.toMillis() : Date.now())
const validPost = (p) => !!p.uid && KINDS.has(p.kind)

/* Perfil atual de cada autor (cache de 5 min): se a pessoa trocar de personagem, as postagens antigas acompanham. */
const profCache = new Map()
const PROF_TTL = 5 * 60 * 1000

/** Invalida o cache de um perfil (chamar ao abrir o modal de perfil). */
export function invalidateProfileCache(uid) {
  if (uid) profCache.delete(uid)
}

async function withFreshProfiles(items) {
  const now = Date.now()
  const need = [...new Set(items.map((p) => p.uid))].filter((uid) => !(profCache.get(uid) && now - profCache.get(uid).at < PROF_TTL))
  await Promise.all(
    need.map(async (uid) => {
      try {
        const d = await getDoc(doc(db, 'publicProfiles', uid))
        profCache.set(uid, { at: now, data: d.exists() ? d.data() : null })
      } catch {
        /* sem rede: fica com o que a postagem já tem */
      }
    })
  )
  return items.map((p) => {
    const c = profCache.get(p.uid)?.data
    return c
      ? {
          ...p,
          avatarId: c.avatarId ?? p.avatarId,
          name: c.name || p.name,
          handle: c.handle || p.handle,
          institution: c.institution ?? p.institution,
          // alinha estrelas/fases com o cartão público atual
          stars: c.stars != null ? int(c.stars) : p.stars,
          done: c.done != null ? int(c.done) : p.done,
        }
      : p
  })
}

/** Uma página do feed. `after` = cursor (último doc da página anterior). */
export async function fetchFeedPage(after = null, n = FEED_PAGE) {
  const base = [collection(db, 'feed'), orderBy('createdAt', 'desc')]
  const q = after ? query(...base, startAfter(after), limit(n)) : query(...base, limit(n))
  const snap = await getDocs(q)
  const raw = snap.docs.map((d) => ({ id: d.id, ...d.data(), createdMs: ms(d.data().createdAt) })).filter(validPost)
  const items = await withFreshProfiles(raw)
  return { items, cursor: snap.docs[snap.docs.length - 1] || null, hasMore: snap.docs.length === n }
}

export async function fetchFeed(n = FEED_PAGE) {
  return (await fetchFeedPage(null, n)).items
}

export async function fetchActive(n = ACTIVE_LIMIT) {
  const since = Timestamp.fromMillis(Date.now() - ACTIVE_MS)
  const snap = await getDocs(query(collection(db, 'publicProfiles'), where('lastSeenAt', '>', since), orderBy('lastSeenAt', 'desc'), limit(n)))
  snap.docs.forEach((d) => profCache.set(d.id, { at: Date.now(), data: d.data() }))
  return snap.docs
    .map((d) => {
      const data = d.data()
      return {
        id: d.id,
        ...data,
        uid: data.uid || d.id,
        seenMs: ms(data.lastSeenAt),
        stars: int(data.stars),
        done: int(data.done),
        vale1Score: int(data.vale1Score),
        vale2Score: int(data.vale2Score),
      }
    })
    .filter((p) => p.uid && p.name)
}

/* ---------- ranking por acertos ---------- */
/**
 * Melhores de cada Speed Run entre os perfis públicos (união dos dois rankings).
 * - Normaliza scores para number (evita divergência com o perfil).
 * - Se a query por score vier vazia/pobre, completa com quem esteve ativo recentemente
 *   (perfis públicos antigos sem vale1Score/vale2Score ainda aparecem).
 */
export async function fetchLeaderboard(n = 50) {
  const col = collection(db, 'publicProfiles')
  const map = new Map()

  const snaps = await Promise.all(
    ['vale1Score', 'vale2Score'].map((f) =>
      getDocs(query(col, orderBy(f, 'desc'), limit(n))).catch((e) => {
        console.warn('[social] fetchLeaderboard orderBy', f, codeOf(e))
        return null
      })
    )
  )
  snaps.forEach((sn) => {
    if (!sn) return
    sn.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() }))
  })

  // Se veio pouco, completa com ativos recentes (~1 dia)
  if (map.size < 10) {
    try {
      const since = Timestamp.fromMillis(Date.now() - ACTIVE_MS * 12)
      const extra = await getDocs(query(col, where('lastSeenAt', '>', since), orderBy('lastSeenAt', 'desc'), limit(n)))
      extra.docs.forEach((d) => {
        if (!map.has(d.id)) map.set(d.id, { id: d.id, ...d.data() })
      })
    } catch (e) {
      console.warn('[social] fetchLeaderboard fallback ativos:', codeOf(e))
    }
  }

  return [...map.values()]
    .map((p) => ({
      ...p,
      uid: p.uid || p.id,
      vale1Score: int(p.vale1Score),
      vale2Score: int(p.vale2Score),
      vale1TimeMs: int(p.vale1TimeMs),
      vale2TimeMs: int(p.vale2TimeMs),
      xp: int(p.xp),
      stars: int(p.stars),
      done: int(p.done),
    }))
    .filter((p) => p.uid && p.name)
}

/**
 * Ordena por ACERTOS (maior primeiro). XP só desempata; depois menor tempo.
 * mode: 'liga' (Plantão + Sem rede somados) | 'vale1' | 'vale2'.
 *
 * Só entra quem tem score > 0 (jogou a Speed Run). O "me" só aparece se
 * também tiver acertos — quem ainda não liberou/jogou o plantão não entra na lista.
 */
export function rankPlayers(players, me, mode = 'liga') {
  const score = (p) =>
    mode === 'vale1' ? int(p.vale1Score) : mode === 'vale2' ? int(p.vale2Score) : int(p.vale1Score) + int(p.vale2Score)
  const time = (p) => {
    const t = mode === 'vale1' ? p.vale1TimeMs : mode === 'vale2' ? p.vale2TimeMs : (p.vale1TimeMs || 0) + (p.vale2TimeMs || 0)
    return t > 0 ? t : Infinity
  }
  const list = players.filter((p) => !me || p.uid !== me.uid)
  // Só injeta "você" se já tiver acertos na modalidade (senão polui o ranking com 0)
  if (me && score(me) > 0) list.push({ ...me, me: true })
  return list
    .map((p) => ({ ...p, score: score(p), xp: int(p.xp), timeMs: time(p) }))
    .filter((p) => p.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.xp - a.xp ||
        (a.timeMs === b.timeMs ? 0 : a.timeMs < b.timeMs ? -1 : 1) ||
        String(a.name).localeCompare(String(b.name))
    )
}

/** Seus dados, lidos do Firebase (users/{uid}/state/main), nunca da memória do aparelho. */
export async function fetchMyCloud(uid) {
  const d = await getDoc(doc(db, 'users', uid, 'state', 'main'))
  const c = d.exists() ? d.data() : {}
  const progress = c.progress || {}
  return { progress, name: c.displayName, avatarId: c.avatarId, stats: buildStats(progress) }
}

/** Ranking real + você, tudo do Firebase, atualizado sozinho com o app aberto. */
export function useLeaderboard(uid, autoMs = 60000) {
  const [st, setSt] = useState({ players: [], mine: null, loading: true, error: null })
  const req = useRef(0)
  const alive = useRef(true)
  const reload = useCallback(async () => {
    const id = ++req.current
    try {
      const [players, mine] = await Promise.all([fetchLeaderboard(), uid ? fetchMyCloud(uid) : Promise.resolve(null)])
      if (alive.current && id === req.current) setSt({ players, mine, loading: false, error: null })
    } catch (error) {
      if (alive.current && id === req.current) setSt((p) => ({ ...p, loading: false, error }))
    }
  }, [uid])
  useEffect(() => {
    alive.current = true
    reload()
    const t = setInterval(() => AppState.currentState === 'active' && reload(), autoMs)
    const sub = AppState.addEventListener('change', (x) => x === 'active' && reload())
    return () => {
      alive.current = false
      clearInterval(t)
      sub.remove()
    }
  }, [reload, autoMs])
  return { ...st, reload }
}

/**
 * Feed + ativos. Atualiza sozinho (só com o app aberto), pagina ao rolar e nunca deixa uma
 * resposta antiga sobrescrever uma mais nova. Se uma atualização falha, mantém o que já tinha.
 */
export function useFeed(autoMs = 60000) {
  const init = { posts: [], active: [], loading: true, loadingMore: false, hasMore: false, error: null }
  const [st, setSt] = useState(init)
  const ref = useRef(init)
  const cursor = useRef(null)
  const req = useRef(0)
  const more = useRef(false)
  const alive = useRef(true)

  const commit = useCallback((next) => {
    ref.current = next
    if (alive.current) setSt(next)
  }, [])

  const reload = useCallback(async () => {
    const id = ++req.current
    try {
      const [page, active] = await Promise.all([fetchFeedPage(), fetchActive()])
      if (!alive.current || id !== req.current) return
      const prev = ref.current
      // a 1ª página é a verdade; páginas mais antigas que o usuário já carregou ficam
      const edge = page.items.length ? page.items[page.items.length - 1].createdMs : Infinity
      const older = page.hasMore ? prev.posts.filter((p) => p.createdMs < edge) : []
      if (older.length === 0) cursor.current = page.cursor
      const posts = [...page.items, ...older]
      commit({
        ...prev,
        posts,
        active,
        loading: false,
        error: null,
        hasMore: older.length ? prev.hasMore : page.hasMore && posts.length < FEED_MAX,
      })
    } catch (error) {
      if (!alive.current || id !== req.current) return
      commit({ ...ref.current, loading: false, error })
    }
  }, [commit])

  const loadMore = useCallback(async () => {
    const cur = ref.current
    if (more.current || cur.loading || !cur.hasMore || !cursor.current) return
    more.current = true
    commit({ ...cur, loadingMore: true })
    try {
      const page = await fetchFeedPage(cursor.current)
      if (!alive.current) return
      cursor.current = page.cursor || cursor.current
      const seen = new Set(ref.current.posts.map((p) => p.id))
      const posts = [...ref.current.posts, ...page.items.filter((p) => !seen.has(p.id))]
      commit({ ...ref.current, posts, loadingMore: false, hasMore: page.hasMore && posts.length < FEED_MAX })
    } catch {
      commit({ ...ref.current, loadingMore: false })
    } finally {
      more.current = false
    }
  }, [commit])

  useEffect(() => {
    alive.current = true
    reload()
    const id = setInterval(() => AppState.currentState === 'active' && reload(), autoMs)
    const sub = AppState.addEventListener('change', (s) => s === 'active' && reload())
    return () => {
      alive.current = false
      clearInterval(id)
      sub.remove()
    }
  }, [reload, autoMs])

  return { ...st, reload, loadMore }
}

export function usePublicProfile(uid) {
  const [st, setSt] = useState({ profile: null, loading: !!uid })
  useEffect(() => {
    if (!uid) {
      setSt({ profile: null, loading: false })
      return undefined
    }
    let alive = true
    setSt({ profile: null, loading: true })
    // sempre busca fresco ao abrir (evita divergência com lista de ativos)
    invalidateProfileCache(uid)
    getDoc(doc(db, 'publicProfiles', uid))
      .then((d) => {
        if (!alive) return
        if (!d.exists()) {
          setSt({ profile: null, loading: false })
          return
        }
        const data = d.data()
        setSt({
          profile: {
            id: d.id,
            ...data,
            uid: data.uid || d.id,
            seenMs: ms(data.lastSeenAt),
            stars: int(data.stars),
            done: int(data.done),
            vale1Score: int(data.vale1Score),
            vale2Score: int(data.vale2Score),
            xp: int(data.xp),
          },
          loading: false,
        })
      })
      .catch(() => alive && setSt({ profile: null, loading: false }))
    return () => {
      alive = false
    }
  }, [uid])
  return st
}
