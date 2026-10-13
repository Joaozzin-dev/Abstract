/**
 * Coach ancorado nos elementos reais da tela.
 *
 * Como usar:
 *  - Envolva o trecho que quer destacar com <CoachTarget id="main">...</CoachTarget>
 *    (ou use a prop target="main" em CodeCard / ChunkyButton).
 *  - Cada missão declara coach: [{ target: 'main', title, text }]
 *  - const coach = useCoach(chave, marks)  →  <ScrollView ref={coach.scrollRef} onScroll={coach.onScroll} />
 *  - <CoachOverlay ctrl={coach} enabled={...} />
 *
 * Comportamento:
 *  - mede o alvo de verdade (measureInWindow), então funciona em qualquer tela/scroll
 *  - rola até o alvo se ele estiver fora da área visível
 *  - pula passos cujo alvo não existe na etapa atual
 *  - aparece uma vez por missão; coach.reopen() chama de novo (botão "?")
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet, Animated, Easing, Modal, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { C } from '../lib/colors'
import { useTheme } from '../screens/ProfileScreen'

const registry = new Map()
const seen = new Set()

export function CoachTarget({ id, children, style }) {
  const ref = useRef(null)
  useEffect(() => {
    registry.set(id, ref)
    return () => {
      if (registry.get(id) === ref) registry.delete(id)
    }
  }, [id])
  return (
    <View ref={ref} collapsable={false} style={style}>
      {children}
    </View>
  )
}

function measure(id) {
  return new Promise((resolve) => {
    const node = registry.get(id)?.current
    if (!node || !node.measureInWindow) return resolve(null)
    node.measureInWindow((x, y, w, h) => resolve(w > 0 && h > 0 ? { x, y, w, h } : null))
  })
}

export function useCoach(key, marks) {
  const list = marks || []
  const [show, setShow] = useState(list.length > 0 && !seen.has(key))
  const scrollRef = useRef(null)
  const scrollY = useRef(0)

  useEffect(() => {
    setShow(list.length > 0 && !seen.has(key))
  }, [key])

  const close = () => {
    seen.add(key)
    setShow(false)
  }

  return {
    visible: show,
    marks: list,
    hasMarks: list.length > 0,
    skip: close,
    done: close,
    reopen: () => setShow(true),
    scrollRef,
    scrollY,
    onScroll: (e) => {
      scrollY.current = e.nativeEvent.contentOffset.y
    },
  }
}

export function CoachOverlay({ ctrl, enabled = true }) {
  const insets = useSafeAreaInsets()
  const { c } = useTheme()
  const s = useMemo(() => makeStyles(c), [c])
  const { width: W, height: H } = useWindowDimensions()
  const [active, setActive] = useState([])
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState(undefined) // undefined = medindo · null = não achou
  const bob = useRef(new Animated.Value(0)).current
  const glow = useRef(new Animated.Value(0)).current
  const visible = !!ctrl && ctrl.visible && enabled

  // 1) ao abrir: espera o layout assentar e fica só com os passos que existem agora
  useEffect(() => {
    if (!visible) {
      setActive([])
      return
    }
    setStep(0)
    setRect(undefined)
    const t = setTimeout(() => {
      const a = ctrl.marks.filter((m) => !m.target || registry.has(m.target))
      if (!a.length) ctrl.done()
      else setActive(a)
    }, 600)
    return () => clearTimeout(t)
  }, [visible, ctrl && ctrl.marks])

  // 2) a cada passo: mede o alvo e rola até ele se precisar
  useEffect(() => {
    const m = active[step]
    if (!visible || !m) return
    let alive = true
    setRect(undefined)
    ;(async () => {
      let r = m.target ? await measure(m.target) : null
      if (!alive) return
      const top = insets.top + 70
      const bottom = H - 250
      const sc = ctrl.scrollRef && ctrl.scrollRef.current
      if (r && sc && sc.scrollTo && (r.y < top || r.y + Math.min(r.h, 160) > bottom)) {
        sc.scrollTo({ y: Math.max(0, ctrl.scrollY.current + r.y - H * 0.2), animated: true })
        await new Promise((res) => setTimeout(res, 500))
        if (!alive) return
        r = await measure(m.target)
        if (!alive) return
      }
      setRect(r)
    })()
    return () => {
      alive = false
    }
  }, [visible, active, step])

  // animações
  useEffect(() => {
    if (!visible) return
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 420, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 420, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    )
    const g = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    )
    a.start()
    g.start()
    return () => {
      a.stop()
      g.stop()
    }
  }, [visible])

  if (!visible || !active.length || step >= active.length) return null

  const m = active[step]
  const last = step >= active.length - 1
  const measuring = rect === undefined
  const onScreen = !!rect && rect.y < H - 20 && rect.y + rect.h > insets.top + 10
  const wantsTarget = !!m.target

  const pad = 8
  let hole = null
  if (onScreen) {
    const top = Math.max(insets.top + 4, rect.y - pad)
    const bottom = Math.min(H - 4, rect.y + rect.h + pad)
    const left = Math.max(4, rect.x - pad)
    const right = Math.min(W - 4, rect.x + rect.w + pad)
    hole = { top, bottom, left, right, w: right - left, h: bottom - top, cx: (left + right) / 2 }
  }

  const footerH = 84 + Math.max(insets.bottom, 16)
  let below = true
  if (hole) {
    const spaceBelow = H - hole.bottom - footerH
    const spaceAbove = hole.top - insets.top
    below = spaceBelow >= 160 || spaceBelow >= spaceAbove
  }

  const tipPos = !hole
    ? { top: H * 0.3 }
    : below
      ? { top: Math.min(hole.bottom + 22, H - footerH - 140) }
      : { bottom: H - hole.top + 22 }

  const tall = hole && hole.h > 260
  const fingerTop = hole ? (below ? hole.top - 46 : hole.bottom + 4) : 0
  const showFinger = hole && !tall && fingerTop > insets.top
  const fingerY = bob.interpolate({ inputRange: [0, 1], outputRange: below ? [0, 10] : [0, -10] })
  const ringScale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] })
  const ringOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.95, 0.5] })
  const caretLeft = hole ? Math.min(Math.max(hole.cx - 20 - 10, 16), W - 40 - 36) : 0

  function next() {
    if (last) ctrl.done()
    else setStep((x) => x + 1)
  }

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent onRequestClose={ctrl.skip}>
      <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
        {hole ? (
          <>
            <View style={[s.shade, { top: 0, left: 0, right: 0, height: hole.top }]} />
            <View style={[s.shade, { top: hole.bottom, left: 0, right: 0, bottom: 0 }]} />
            <View style={[s.shade, { top: hole.top, left: 0, width: hole.left, height: hole.h }]} />
            <View style={[s.shade, { top: hole.top, left: hole.right, right: 0, height: hole.h }]} />
            <Animated.View
              pointerEvents="none"
              style={[s.ring, { left: hole.left, top: hole.top, width: hole.w, height: hole.h, opacity: ringOpacity, transform: [{ scale: ringScale }] }]}
            />
          </>
        ) : (
          <View style={[StyleSheet.absoluteFill, s.shade]} />
        )}

        {showFinger && (
          <Animated.View pointerEvents="none" style={[s.finger, { left: hole.cx - 22, top: fingerTop, transform: [{ translateY: fingerY }] }]}>
            <Text style={s.fingerTxt}>{below ? '👇' : '👆'}</Text>
          </Animated.View>
        )}

        {!measuring && (
          <View style={[s.tip, tipPos]} accessibilityLiveRegion="polite">
            {hole ? <View style={[s.caret, below ? s.caretUp : s.caretDown, { left: caretLeft }]} /> : null}
            <Text style={s.tipCount}>
              DICA {step + 1} DE {active.length}
            </Text>
            <Text style={s.tipTitle}>{m.title}</Text>
            {m.text ? <Text style={s.tipText}>{m.text}</Text> : null}
            {wantsTarget && !hole ? <Text style={s.tipNote}>Role a tela para ver esse trecho.</Text> : null}
            <View style={s.progress}>
              {active.map((_, k) => (
                <View key={k} style={[s.pip, k === step && s.pipOn]} />
              ))}
            </View>
          </View>
        )}

        <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Pressable onPress={ctrl.skip} hitSlop={12} accessibilityRole="button" accessibilityLabel="Pular o tutorial" style={s.skipBtn}>
            <Text style={s.skip}>Pular</Text>
          </Pressable>
          <Pressable onPress={next} accessibilityRole="button" accessibilityLabel={last ? 'Entendi' : 'Próxima dica'} style={s.cta}>
            <Text style={s.ctaText}>{last ? 'ENTENDI' : 'PRÓXIMO'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const makeStyles = (c) =>
  StyleSheet.create({
    shade: { position: 'absolute', backgroundColor: C.shade },
    ring: { position: 'absolute', borderWidth: 3, borderColor: c.progress, borderRadius: 18, backgroundColor: 'transparent' },
    finger: { position: 'absolute', width: 44, alignItems: 'center' },
    fingerTxt: { fontSize: 34 },
    tip: {
      position: 'absolute',
      left: 20,
      right: 20,
      backgroundColor: c.card,
      borderRadius: 18,
      paddingVertical: 16,
      paddingHorizontal: 18,
      shadowColor: C.shadow,
      shadowOpacity: 0.18,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 10,
    },
    caret: { position: 'absolute', width: 0, height: 0, borderLeftWidth: 10, borderRightWidth: 10, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
    caretUp: { top: -10, borderBottomWidth: 10, borderBottomColor: c.card },
    caretDown: { bottom: -10, borderTopWidth: 10, borderTopColor: c.card },
    tipCount: { color: c.violetInk, fontSize: 10, fontWeight: '900', letterSpacing: 1, textAlign: 'center' },
    tipTitle: { color: c.ink, fontSize: 18, fontWeight: '800', lineHeight: 25, textAlign: 'center', marginTop: 4 },
    tipText: { color: c.muted, fontSize: 14, fontWeight: '600', lineHeight: 21, textAlign: 'center', marginTop: 6 },
    tipNote: { color: c.orangeInk, fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 8 },
    progress: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 14 },
    pip: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.line },
    pipOn: { width: 22, backgroundColor: c.progress },
    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 22,
      paddingTop: 12,
    },
    skipBtn: { minHeight: 48, minWidth: 64, justifyContent: 'center' },
    skip: { color: C.white, fontSize: 16, fontWeight: '700' },
    cta: {
      backgroundColor: c.primary,
      minHeight: 50,
      paddingHorizontal: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderBottomWidth: 5,
      borderBottomColor: c.primaryDark,
    },
    ctaText: { color: c.onPrimary, fontSize: 16, fontWeight: '900', letterSpacing: 0.6 },
  })