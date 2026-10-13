/**
 * Persistência da memória de aprendizagem no Firebase (Firestore).
 * Usa o app Firebase já configurado no projeto, se existir.
 *
 * Caminho no Firestore:
 *   users/{uid}/learning/memory
 *   users/{uid}/learning/activity
 *   users/{uid}/learning/events  (log opcional de interações na revisão)
 *
 * Se não houver usuário logado ou Firebase, só grava no AsyncStorage local.
 */
import AsyncStorage from '@react-native-async-storage/async-storage'

const LOCAL_UID_KEY = 'learning:uid:v1'

let firestoreMod = null
let authMod = null
let resolved = false

async function resolveFirebase() {
  if (resolved) return { firestoreMod, authMod }
  resolved = true
  try {
    // React Native Firebase (mais comum em apps Expo/RN nativos)
    firestoreMod = require('@react-native-firebase/firestore').default
    try {
      authMod = require('@react-native-firebase/auth').default
    } catch (_) {}
  } catch (_) {
    try {
      // Firebase JS modular (web / Expo)
      const { getFirestore, doc, setDoc, getDoc, collection, addDoc, serverTimestamp } = require('firebase/firestore')
      const { getAuth } = require('firebase/auth')
      const { getApp } = require('firebase/app')
      firestoreMod = {
        __modular: true,
        getFirestore,
        doc,
        setDoc,
        getDoc,
        collection,
        addDoc,
        serverTimestamp,
        getAuth,
        getApp,
      }
      authMod = { __modular: true, getAuth, getApp }
    } catch (_) {
      firestoreMod = null
      authMod = null
    }
  }
  return { firestoreMod, authMod }
}

export async function getLearningUid(account) {
  if (account?.uid) return String(account.uid)
  if (account?.id) return String(account.id)
  if (account?.handle) return `handle_${account.handle}`
  try {
    const { authMod: am } = await resolveFirebase()
    if (am?.__modular) {
      const auth = am.getAuth(am.getApp())
      if (auth?.currentUser?.uid) return auth.currentUser.uid
    } else if (am) {
      const u = am().currentUser
      if (u?.uid) return u.uid
    }
  } catch (_) {}
  try {
    let local = await AsyncStorage.getItem(LOCAL_UID_KEY)
    if (!local) {
      local = `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
      await AsyncStorage.setItem(LOCAL_UID_KEY, local)
    }
    return local
  } catch (_) {
    return 'anonymous'
  }
}

async function fsSet(uid, pathParts, data) {
  const { firestoreMod: fs } = await resolveFirebase()
  if (!fs) return false
  try {
    if (fs.__modular) {
      const db = fs.getFirestore(fs.getApp())
      const ref = fs.doc(db, 'users', uid, ...pathParts)
      await fs.setDoc(ref, { ...data, updatedAt: fs.serverTimestamp?.() || new Date().toISOString() }, { merge: true })
    } else {
      await fs().collection('users').doc(uid).collection(pathParts[0]).doc(pathParts[1]).set(
        { ...data, updatedAt: fs.FieldValue?.serverTimestamp?.() || new Date().toISOString() },
        { merge: true },
      )
    }
    return true
  } catch (e) {
    console.warn('[firebaseLearning] set failed', e?.message || e)
    return false
  }
}

async function fsGet(uid, pathParts) {
  const { firestoreMod: fs } = await resolveFirebase()
  if (!fs) return null
  try {
    if (fs.__modular) {
      const db = fs.getFirestore(fs.getApp())
      const ref = fs.doc(db, 'users', uid, ...pathParts)
      const snap = await fs.getDoc(ref)
      return snap.exists() ? snap.data() : null
    }
    const snap = await fs().collection('users').doc(uid).collection(pathParts[0]).doc(pathParts[1]).get()
    return snap.exists ? snap.data() : null
  } catch (e) {
    console.warn('[firebaseLearning] get failed', e?.message || e)
    return null
  }
}

async function fsAddEvent(uid, event) {
  const { firestoreMod: fs } = await resolveFirebase()
  if (!fs) return false
  try {
    if (fs.__modular) {
      const db = fs.getFirestore(fs.getApp())
      const col = fs.collection(db, 'users', uid, 'learning_events')
      await fs.addDoc(col, { ...event, at: fs.serverTimestamp?.() || new Date().toISOString() })
    } else {
      await fs().collection('users').doc(uid).collection('learning_events').add({
        ...event,
        at: fs.FieldValue?.serverTimestamp?.() || new Date().toISOString(),
      })
    }
    return true
  } catch (e) {
    console.warn('[firebaseLearning] event failed', e?.message || e)
    return false
  }
}

/** Salva a memória completa (erros, stats, sequência) no Firebase. */
export async function cloudSaveMemory(account, memoryState) {
  const uid = await getLearningUid(account)
  return fsSet(uid, ['learning', 'memory'], {
    errors: memoryState.errors || [],
    consecutiveCorrect: memoryState.consecutiveCorrect || 0,
    lastPhase: memoryState.lastPhase || null,
    phaseStats: memoryState.phaseStats || {},
  })
}

/** Salva o calendário de atividade (dias ativos). */
export async function cloudSaveActivity(account, dateKeys) {
  const uid = await getLearningUid(account)
  return fsSet(uid, ['learning', 'activity'], {
    dates: Array.isArray(dateKeys) ? dateKeys : [...dateKeys],
  })
}

/** Carrega memória do Firebase (se existir). */
export async function cloudLoadMemory(account) {
  const uid = await getLearningUid(account)
  return fsGet(uid, ['learning', 'memory'])
}

/** Carrega atividade do Firebase. */
export async function cloudLoadActivity(account) {
  const uid = await getLearningUid(account)
  return fsGet(uid, ['learning', 'activity'])
}

/** Registra interação da revisão (passo, escolha, conclusão). */
export async function cloudLogReviewEvent(account, event) {
  const uid = await getLearningUid(account)
  return fsAddEvent(uid, { type: 'review', ...event })
}

/** Registra erro ou acerto de missão. */
export async function cloudLogMissionEvent(account, event) {
  const uid = await getLearningUid(account)
  return fsAddEvent(uid, { type: 'mission', ...event })
}
