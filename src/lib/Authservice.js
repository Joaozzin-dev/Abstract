/**
 * authApi sobre Firebase Auth + Firestore.
 * Firebase Auth exige e-mail; o app usa @usuário, então o e-mail é sintético
 * (handle@users.poema.app) e NUNCA é mostrado ao usuário.
 *
 * Firestore:
 *   handles/{handle}          { uid }         → garante @ único (leitura pública só por get)
 *   users/{uid}               perfil + status ('active' | 'pending_guardian')
 */
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  deleteUser,
} from 'firebase/auth'
import { doc, getDoc, writeBatch, serverTimestamp } from 'firebase/firestore'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { auth, db } from './firebase' // ajuste o caminho se o firebase.js estiver em outro lugar

const CACHE_KEY = 'auth:accountCache'
const EMAIL_DOMAIN = 'users.poema.app'

// '.' não é seguro na parte local do e-mail; '-' não existe no regex de @, então não há colisão.
const emailFor = (handle) => `${handle.replace(/\./g, '-')}@${EMAIL_DOMAIN}`

const err = (code, cause) => Object.assign(new Error(code), { code, cause })

function mapAuthError(e) {
  switch (e?.code) {
    case 'auth/email-already-in-use':
      return err('HANDLE_TAKEN', e)
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-email':
      return err('INVALID_CREDENTIALS', e)
    case 'auth/too-many-requests':
      return err('TOO_MANY_REQUESTS', e)
    case 'auth/network-request-failed':
      return err('NETWORK', e)
    case 'auth/operation-not-allowed':
    case 'auth/configuration-not-found':
      return err('AUTH_DISABLED', e)
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
      return err('BAD_API_KEY', e)
    default:
      return e
  }
}

/** Só o que o app precisa. Nunca inclui e-mail do responsável. */
function toAccount(p) {
  return {
    uid: p.uid,
    name: p.name,
    handle: p.handle,
    institution: p.institution ?? null,
    stage: p.stage,
    ageBand: p.ageBand,
    profilePublic: !!p.profilePublic,
    status: p.status,
  }
}

async function loadProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? snap.data() : null
}

const waitFirstAuthState = () =>
  new Promise((resolve) => {
    const timer = setTimeout(() => resolve(auth.currentUser), 8000) // nunca trava o carregamento
    const off = onAuthStateChanged(auth, (u) => {
      clearTimeout(timer)
      off()
      resolve(u)
    })
  })

export const authApi = {
  async isHandleAvailable(handle) {
    const snap = await getDoc(doc(db, 'handles', handle))
    return !snap.exists()
  },

  async signUp(p) {
    let cred
    try {
      cred = await createUserWithEmailAndPassword(auth, emailFor(p.handle), p.password)
    } catch (e) {
      throw mapAuthError(e)
    }
    const uid = cred.user.uid
    const status = p.ageBand === 'under12' ? 'pending_guardian' : 'active'
    const profile = {
      uid,
      name: p.name,
      handle: p.handle,
      institution: p.institution,
      stage: p.stage,
      ageBand: p.ageBand,
      guardianEmail: p.guardianEmail,
      profilePublic: !!p.profilePublic,
      acceptedTerms: p.acceptedTerms,
      status,
      createdAt: serverTimestamp(),
    }
    try {
      // Atômico: se o @ já existe em handles/, nada é gravado.
      const batch = writeBatch(db)
      batch.set(doc(db, 'handles', p.handle), { uid })
      batch.set(doc(db, 'users', uid), profile)
      await batch.commit()
    } catch (e) {
      try { await deleteUser(cred.user) } catch (_) {}
      if (e?.code === 'permission-denied') {
        // Ou o @ já existe, ou as regras do Firestore não estão publicadas. Confere de verdade.
        try {
          const taken = (await getDoc(doc(db, 'handles', p.handle))).exists()
          throw err(taken ? 'HANDLE_TAKEN' : 'RULES', e)
        } catch (e2) {
          throw e2?.message === 'HANDLE_TAKEN' || e2?.message === 'RULES' ? e2 : err('RULES', e)
        }
      }
      throw e
    }

    if (status === 'pending_guardian') {
      await fbSignOut(auth) // conta só ativa após confirmação do responsável
      return { status, account: null }
    }
    const account = toAccount(profile)
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(account)).catch(() => {})
    return { status, account }
  },

  async signIn({ handle, password }) {
    let cred
    try {
      cred = await signInWithEmailAndPassword(auth, emailFor(handle), password)
    } catch (e) {
      throw mapAuthError(e)
    }
    const profile = await loadProfile(cred.user.uid)
    if (!profile) {
      await fbSignOut(auth)
      throw err('INVALID_CREDENTIALS')
    }
    if (profile.status !== 'active') {
      await fbSignOut(auth)
      return { status: 'pending_guardian', account: null }
    }
    const account = toAccount(profile)
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(account)).catch(() => {})
    return { status: 'active', account }
  },

  /** Chamado no carregamento: espera o Firebase restaurar a sessão salva. */
  async restoreSession() {
    const user = await waitFirstAuthState()
    if (!user) {
      AsyncStorage.removeItem(CACHE_KEY).catch(() => {})
      return null
    }
    try {
      const profile = await loadProfile(user.uid)
      if (!profile || profile.status !== 'active') {
        await fbSignOut(auth)
        return null
      }
      const account = toAccount(profile)
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(account)).catch(() => {})
      return account
    } catch (e) {
      // Offline: usa o último perfil conhecido deste mesmo usuário.
      try {
        const cached = JSON.parse((await AsyncStorage.getItem(CACHE_KEY)) || 'null')
        if (cached?.uid === user.uid) return cached
      } catch (_) {}
      throw e
    }
  },

  async signOut() {
    await AsyncStorage.removeItem(CACHE_KEY).catch(() => {})
    await fbSignOut(auth)
  },
}

/** Para o Root reagir a sessão expirada / usuário removido. */
export const onAuthChanged = (cb) => onAuthStateChanged(auth, cb)