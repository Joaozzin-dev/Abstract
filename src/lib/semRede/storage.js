import { emptyState } from './session.js'
/** One envelope for session + memory prevents partially persisted attempts.
 * Storage is injected to keep pure tests independent of React Native.
 */
export function createRepository(storage,userId) {
  if (!userId) throw new Error('Informe o identificador da conta autenticada.')
  const key = `abc:sem-rede:v1:${encodeURIComponent(userId)}`
  let queue = Promise.resolve()
  return {
    key,
    async load() {
      const raw = await storage.getItem(key)
      if (!raw) return emptyState()
      let parsed
      try { parsed = JSON.parse(raw) } catch { throw new Error('O treino salvo está corrompido. Exporte ou remova esse registro antes de reiniciar.') }
      if (parsed.version !== 1 || parsed.memory?.version !== 1 || !Array.isArray(parsed.memory.history) || !parsed.memory.concepts || !Number.isInteger(parsed.memory.sequence) || (parsed.session && (parsed.session.version !== 1 || !parsed.session.id || ![15,25,40].includes(parsed.session.goal) || !['active','finished'].includes(parsed.session.status)))) throw new Error('O formato do treino salvo não é compatível. Não foi sobrescrito.')
      return parsed
    },
    save(state) {
      const task = queue.catch(()=>{}).then(()=>storage.setItem(key,JSON.stringify(state)))
      queue = task; return task
    },
    async clear() { await queue.catch(()=>{}); await storage.removeItem(key) },
  }
}
