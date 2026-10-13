/**
 * "Reduzir movimento" do Perfil valendo para o app inteiro: com a opção ligada, animações
 * viram instantâneas e loops (pulinho do mascote etc.) ficam parados.
 */
import { Animated } from 'react-native'

const orig = { timing: Animated.timing, spring: Animated.spring, loop: Animated.loop }
let on = false

export function setReduceMotion(value) {
  const v = !!value
  if (v === on) return
  on = v
  try {
    if (v) {
      Animated.timing = (val, cfg) => orig.timing(val, { ...cfg, duration: 0, delay: 0 })
      Animated.spring = (val, cfg) => orig.timing(val, { toValue: cfg?.toValue ?? 0, duration: 0, useNativeDriver: cfg?.useNativeDriver })
      Animated.loop = () => ({
        start: (cb) => cb && cb({ finished: true }),
        stop() {},
        reset() {},
      })
    } else {
      Animated.timing = orig.timing
      Animated.spring = orig.spring
      Animated.loop = orig.loop
    }
  } catch (e) {
    console.warn('[motion] não deu para ajustar animações:', e?.message || e)
  }
}