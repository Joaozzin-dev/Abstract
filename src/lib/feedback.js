/**
 * Vibração (haptics) acoplada aos sons do app, sem mexer nas telas:
 * toda chamada de sfx.* (tap, deploy, fail, win...) passa a vibrar junto.
 *   tap → toque leve · deploy/acerto → sucesso · fail/erro → erro · win → sucesso duplo
 * Desligue com o campo `hapticsEnabled: false` no store (toggle no Perfil).
 * Requer:  npx expo install expo-haptics
 */
import * as Haptics from 'expo-haptics'
import { sfx } from './sounds'

let enabled = true
let installed = false
export const setHapticsEnabled = (v) => {
  enabled = v !== false
}

const safe = (p) => {
  try {
    p?.catch?.(() => {})
  } catch (_) {}
}

export const buzz = {
  tap: () => safe(Haptics.selectionAsync()),
  light: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  success: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  warning: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  win: () => {
    safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success))
    setTimeout(() => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)), 160)
  },
}

function kindFor(name) {
  const n = String(name).toLowerCase()
  if (n === 'win' || /level|victory|complete|finish/.test(n)) return 'win'
  if (/fail|bad|error|wrong|lose|lock/.test(n)) return 'error'
  if (/deploy|good|success|correct|ok|star|rank|done/.test(n)) return 'success'
  if (/warn/.test(n)) return 'warning'
  if (/tap|click|select|pick|press/.test(n)) return 'tap'
  return 'light'
}

/** Chamar uma vez na inicialização. */
export function installFeedback() {
  if (installed || !sfx) return
  installed = true
  for (const k of Object.keys(sfx)) {
    const fn = sfx[k]
    if (typeof fn !== 'function') continue
    try {
      sfx[k] = function patched(...a) {
        if (enabled) buzz[kindFor(k)]?.()
        return fn.apply(this, a)
      }
    } catch (_) {
      // sfx congelado: segue só com som
    }
  }
}

/** Som + vibração de "abri o ranking". Use sfx.ranking se existir; senão o de sucesso. */
export function playRankingOpen() {
  const f = sfx?.ranking || sfx?.deploy || sfx?.tap
  f?.call(sfx)
}