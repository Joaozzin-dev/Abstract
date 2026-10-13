/**
 * Sincronização do app com o Firestore.
 *
 *   users/{uid}/state/main   progresso + preferências (privado, só o dono)
 *   publicProfiles/{uid}     perfil público (ver social.js; só adultos com perfil visível)
 *
 * - startCloudSync(account): baixa, MESCLA (progresso só cresce: vale o melhor de cada fase,
 *   nunca perde estrela/fase) e passa a salvar automaticamente (debounce) sempre que
 *   progress/avatar/som/nome mudam. Dados de OUTRA conta no aparelho são descartados.
 *   Ranking e Feed leem direto do Firebase (ver social.js).
 * - Produção: gravações serializadas, nova tentativa com espera crescente quando falha
 *   (offline), e uma sessão antiga nunca continua gravando depois de trocar de conta.
 * - setProfilePublic(): chamar no Perfil ao alternar "perfil visível".
 */
import { AppState } from 'react-native'
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
import { useStore } from '../store/useStore'
import { publishProfile, withdrawPublic, backfillAchievements, stopSocial } from './social'

const clean = (o) => JSON.parse(JSON.stringify(o)) // Firestore rejeita undefined
const PAIRED = new Set(['vale1', 'vale2']) // nestes, pontuação e tempo são da MESMA partida

/** Une dois mapas de progresso mantendo o melhor de cada fase. */
export function mergeProgress(a = {}, b = {}) {
  const out = {}
  for (const id of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) {
    const x = a?.[id]
    const y = b?.[id]
    if (!x || !y) {
      out[id] = x || y
      continue
    }
    const m = { ...y, ...x, done: !!(x.done || y.done), stars: Math.max(x.stars || 0, y.stars || 0) }
    if (PAIRED.has(id) && (x.bestScore || y.bestScore)) {
      // vence quem acertou mais; empate → menor tempo. Pontuação e tempo vêm juntos.
      const xs = x.bestScore || 0
      const ys = y.bestScore || 0
      let win = xs > ys ? x : ys > xs ? y : null
      if (!win) win = x.bestTimeMs && y.bestTimeMs ? (x.bestTimeMs <= y.bestTimeMs ? x : y) : x.bestTimeMs ? x : y
      m.bestScore = win.bestScore
      if (win.bestTimeMs) m.bestTimeMs = win.bestTimeMs
    } else {
      if (x.bestScore || y.bestScore) m.bestScore = Math.max(x.bestScore || 0, y.bestScore || 0)
      if (x.bestTimeMs && y.bestTimeMs) m.bestTimeMs = Math.min(x.bestTimeMs, y.bestTimeMs)
      else if (x.bestTimeMs || y.bestTimeMs) m.bestTimeMs = x.bestTimeMs || y.bestTimeMs
    }
    out[id] = m
  }
  return out
}

const pick = (s) => JSON.stringify([s.progress, s.avatarId, s.soundEnabled, s.displayName])

let active = null
let gen = 0

export async function flushCloudSync() {
  await active?.flush()
}

export function stopCloudSync() {
  gen++
  active?.stop()
  active = null
}

export async function startCloudSync(account) {
  stopCloudSync()
  const me = gen
  const current = () => me === gen
  const uid = account.uid
  const ref = doc(db, 'users', uid, 'state', 'main')
  let loaded = false
  let dirty = false
  let timer = null
  let last = ''
  let inflight = null
  let again = false
  let failures = 0

  async function pull() {
    const snap = await getDoc(ref)
    if (!current()) return
    const cloud = snap.exists() ? snap.data() : {}
    const st = useStore.getState()
    // Se o aparelho tinha dados de OUTRO usuário, descarta; se não sabemos, mescla.
    const sameOwner = !st.cloudUid || st.cloudUid === uid
    const patch = {
      cloudUid: uid,
      progress: mergeProgress(sameOwner ? st.progress : {}, cloud.progress),
      displayName: cloud.displayName || account.name,
    }
    if (cloud.avatarId != null) patch.avatarId = cloud.avatarId
    if (cloud.soundEnabled != null) patch.soundEnabled = cloud.soundEnabled
    useStore.setState(patch)
    loaded = true
  }

  /** Grava (uma por vez). Chamadas durante uma gravação viram uma nova rodada ao final. */
  function save() {
    if (inflight) {
      again = true
      return inflight
    }
    inflight = (async () => {
      do {
        again = false
        dirty = false
        try {
          if (!loaded) await pull() // nunca sobrescreve a nuvem sem ter lido antes
          if (!current()) return
          const s = useStore.getState()
          await setDoc(
            ref,
            {
              ...clean({ progress: s.progress, avatarId: s.avatarId, soundEnabled: s.soundEnabled, displayName: s.displayName }),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          )
          failures = 0
          // falha ao publicar o perfil não invalida o salvamento; o próximo save tenta de novo
          await publishProfile(s.progress).catch((e) => console.warn('[cloud] publicar perfil falhou:', e?.code || e))
        } catch (e) {
          dirty = true
          failures++
          console.warn('[cloud] save falhou:', e?.code || e)
          schedule(Math.min(60000, 2000 * 2 ** Math.min(failures, 5))) // 4s, 8s, 16s... até 60s
          return
        }
      } while (again && current())
    })().finally(() => {
      inflight = null
    })
    return inflight
  }

  function schedule(ms = 1500) {
    if (!current()) return
    dirty = true
    clearTimeout(timer)
    timer = setTimeout(save, ms)
  }

  try {
    await pull()
  } catch (e) {
    console.warn('[cloud] pull falhou (offline?):', e?.code || e)
  }
  if (!current()) return stopCloudSync // outra sessão assumiu enquanto baixávamos

  last = pick(useStore.getState())
  schedule(500) // grava o resultado da mesclagem uma vez

  const unsub = useStore.subscribe(() => {
    const k = pick(useStore.getState())
    if (k === last) return
    last = k
    schedule()
  })
  const appSub = AppState.addEventListener('change', (st) => {
    if (st !== 'active') active?.flush().catch(() => {})
    else if (dirty) schedule(300) // voltou ao app com algo pendente
  })

  active = {
    async flush() {
      clearTimeout(timer)
      if (dirty || inflight) await save()
    },
    stop() {
      clearTimeout(timer)
      unsub()
      appSub.remove()
    },
  }
  return stopCloudSync
}

/** Limpa dados locais do usuário anterior (chamar depois do signOut). */
export function clearLocalUserData() {
  stopCloudSync()
  stopSocial()
  useStore.setState({ account: null, progress: {}, displayName: '', avatarId: undefined, cloudUid: null })
}

/**
 * Perfil → "deixar meu perfil visível". Só adultos aparecem no ranking/feed.
 * Lança erro se não der certo e deixa tudo consistente (nunca fica "visível pela metade").
 */
export async function setProfilePublic(value) {
  const st = useStore.getState()
  const acc = st.account
  if (!acc?.uid) return false
  const next = acc.ageBand === '18plus' ? !!value : false
  const userRef = doc(db, 'users', acc.uid)
  const setLocal = (v) => useStore.setState({ account: { ...useStore.getState().account, profilePublic: v } })

  if (next) {
    await updateDoc(userRef, { profilePublic: true })
    setLocal(true)
    try {
      await publishProfile(st.progress)
      await backfillAchievements()
    } catch (e) {
      await updateDoc(userRef, { profilePublic: false }).catch(() => {}) // desfaz
      setLocal(false)
      throw e
    }
    return true
  }

  // privado: primeiro fecha a porta (regras barram novas postagens), depois apaga o que já existe
  await updateDoc(userRef, { profilePublic: false })
  setLocal(false)
  await withdrawPublic(acc.uid) // se falhar, social.js tenta de novo na próxima abertura
  return false
}