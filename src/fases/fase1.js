import { useRef, useState, useEffect } from 'react'
import {
  StyleSheet,
  Animated,
  Easing,
  PanResponder,
  Platform,
  KeyboardAvoidingView,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { View, Text, TextInput, Pressable, ScrollView, Ionicons } from '../lib/themedRN'
import { C, PERSON_COLORS } from '../lib/colors'
import { sfx } from '../lib/sounds'
import { CoachOverlay, CoachTarget, useCoach } from '../components/CoachMarks'
import GuidePanel from '../components/GuidePanel'
import {
  recordError,
  markFixed,
  recordCorrect,
  markActivityToday,
  pickSupport,
  startMissionTimer,
} from './learningMemory'

/**
 * FASE 1 — Conhecendo a linguagem
 * 1 Arrastar e organizar · 2 Completar lacunas · 3 Investigar e tocar · 4 Escrever
 *
 * Uso:  <Fase1 onClose={() => ...} onFinish={({ mistakes, stars }) => ...} />
 * Arquivo autônomo: não depende de DuoButton, themes, Illustrations, CharacterArt nem SarueMascot.
 */

/* ------------------------------------------------------------------ */
/*  PALETA                                                             */
/* ------------------------------------------------------------------ */
const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace'

const tap = () => sfx?.tap?.()
const good = () => sfx?.deploy?.()
const bad = () => sfx?.fail?.()

/* ------------------------------------------------------------------ */
/*  COLORIZADOR DE CÓDIGO                                              */
/* ------------------------------------------------------------------ */
const KW = new Set(['algoritmo', 'var', 'inicio', 'fim', 'leia', 'escreval', 'escreva'])
const TYPES = new Set(['real', 'caractere', 'inteiro'])

function tokens(text) {
  return text.match(/"[^"]*"|<-|\w+|\s+|[^\w\s]/g) || []
}
function colorOf(t) {
  if (t.startsWith('"')) return C.synString
  if (t === '<-') return C.orange
  const w = t.toLowerCase()
  if (KW.has(w)) return C.synKeyword
  if (TYPES.has(w)) return C.synType
  if (/^\d/.test(t)) return C.synNumber
  return C.codeText
}
function Colored({ text, size = 14, style }) {
  return (
    <Text style={[{ fontFamily: MONO, fontSize: size, color: C.codeText }, style]}>
      {tokens(text).map((t, i) => (
        <Text key={i} style={{ color: colorOf(t) }}>
          {t}
        </Text>
      ))}
    </Text>
  )
}

/* ------------------------------------------------------------------ */
/*  PEÇAS VISUAIS                                                      */
/* ------------------------------------------------------------------ */
function ChunkyButton({ target, ...rest }) {
  return target ? (
    <CoachTarget id={target}>
      <ChunkyButtonBase {...rest} />
    </CoachTarget>
  ) : (
    <ChunkyButtonBase {...rest} />
  )
}

function ChunkyButtonBase({ label, onPress, tone = 'green', icon, style, disabled }) {
  const tones = {
    green: { face: C.primary, base: C.primaryDark, text: C.onPrimary },
    violet: { face: C.violet, base: C.violetDark, text: C.white },
    orange: { face: C.orange, base: C.orangeDark, text: C.white },
    ghost: { face: C.card, base: C.line, text: C.ink },
  }
  const t = tones[tone]
  const [down, setDown] = useState(false)
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[{ opacity: disabled ? 0.5 : 1 }, style]}
    >
      <View
        style={{
          backgroundColor: t.face,
          borderRadius: 18,
          minHeight: 54,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          borderBottomWidth: down ? 1 : 5,
          borderBottomColor: t.base,
          borderWidth: tone === 'ghost' ? 2 : 0,
          borderColor: t.base,
          marginTop: down ? 4 : 0,
          marginBottom: down ? 0 : 4,
        }}
      >
        {icon ? <Ionicons name={icon} size={20} color={t.text} /> : null}
        <Text style={{ color: t.text, fontWeight: '900', fontSize: 15, letterSpacing: 0.8 }}>{label}</Text>
      </View>
    </Pressable>
  )
}

function Pop({ children, delay = 0, style }) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    v.setValue(0)
    Animated.timing(v, {
      toValue: 1,
      duration: 360,
      delay,
      easing: Easing.out(Easing.back(1.3)),
      useNativeDriver: true,
    }).start()
  }, [])
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v,
          transform: [
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
            { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  )
}

function useShake() {
  const v = useRef(new Animated.Value(0)).current
  const run = () => {
    v.setValue(0)
    Animated.sequence([
      Animated.timing(v, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(v, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(v, { toValue: 5, duration: 50, useNativeDriver: true }),
      Animated.timing(v, { toValue: -5, duration: 50, useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start()
  }
  return [{ transform: [{ translateX: v }] }, run]
}

function Face({ who = 'chefe', size = 54 }) {
  const s = size
  const skin = PERSON_COLORS[who]?.skin || PERSON_COLORS.chefe.skin
  const hair = PERSON_COLORS[who]?.hair || PERSON_COLORS.chefe.hair
  const bg = who === 'catia' ? C.violetSoft : who === 'sarue' ? C.successSoft : C.orangeSoft
  return (
    <View
      style={{
        width: s,
        height: s,
        borderRadius: s * 0.32,
        backgroundColor: bg,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'flex-end',
      }}
    >
      {who === 'sarue' && (
        <>
          <View style={{ position: 'absolute', top: s * 0.06, left: s * 0.12, width: s * 0.24, height: s * 0.24, borderRadius: s * 0.12, backgroundColor: hair }} />
          <View style={{ position: 'absolute', top: s * 0.06, right: s * 0.12, width: s * 0.24, height: s * 0.24, borderRadius: s * 0.12, backgroundColor: hair }} />
        </>
      )}
      <View
        style={{
          width: s * 0.78,
          height: s * 0.3,
          borderTopLeftRadius: s * 0.4,
          borderTopRightRadius: s * 0.4,
          backgroundColor: who === 'catia' ? C.violet : who === 'sarue' ? C.success : C.banner,
          alignItems: 'center',
        }}
      >
        {who === 'chefe' && <View style={{ width: s * 0.1, height: s * 0.22, backgroundColor: C.error, borderRadius: 2 }} />}
      </View>
      <View
        style={{
          position: 'absolute',
          top: s * 0.18,
          width: s * 0.5,
          height: s * 0.5,
          borderRadius: s * 0.25,
          backgroundColor: skin,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={{ position: 'absolute', top: -s * 0.02, width: s * 0.5, height: s * 0.2, borderTopLeftRadius: s * 0.25, borderTopRightRadius: s * 0.25, backgroundColor: hair }} />
        {who === 'catia' ? (
          <View style={{ flexDirection: 'row', gap: s * 0.04, marginTop: s * 0.04 }}>
            <View style={{ width: s * 0.17, height: s * 0.13, borderRadius: s * 0.05, borderWidth: 2, borderColor: C.ink, backgroundColor: C.glassHair }} />
            <View style={{ width: s * 0.17, height: s * 0.13, borderRadius: s * 0.05, borderWidth: 2, borderColor: C.ink, backgroundColor: C.glassHair }} />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: s * 0.14, marginTop: s * 0.04 }}>
            <View style={{ width: s * 0.06, height: s * 0.06, borderRadius: s * 0.03, backgroundColor: C.banner }} />
            <View style={{ width: s * 0.06, height: s * 0.06, borderRadius: s * 0.03, backgroundColor: C.banner }} />
          </View>
        )}
        <View
          style={{
            width: s * 0.16,
            height: s * 0.07,
            marginTop: s * 0.05,
            borderBottomLeftRadius: s * 0.1,
            borderBottomRightRadius: s * 0.1,
            backgroundColor: who === 'chefe' ? 'transparent' : PERSON_COLORS.tie,
            borderBottomWidth: who === 'chefe' ? 3 : 0,
            borderColor: PERSON_COLORS.tie,
          }}
        />
      </View>
    </View>
  )
}

function Bubble({ who, label, tone, children }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
      <Face who={who} />
      <View
        style={{
          flex: 1,
          backgroundColor: C.card,
          borderRadius: 20,
          borderBottomLeftRadius: 4,
          padding: 12,
          borderWidth: 2,
          borderColor: tone,
        }}
      >
        <Text style={{ color: tone, fontWeight: '900', fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>{label}</Text>
        {children}
      </View>
    </View>
  )
}

function Msg({ tone = 'red', text }) {
  const map = {
    red: { bg: C.errorSoft, bd: C.errorLine, fg: C.errorDark, icon: 'close-circle' },
    green: { bg: C.successSoft, bd: C.successLine, fg: C.successDark, icon: 'checkmark-circle' },
    orange: { bg: C.orangeSoft, bd: C.orangeLine, fg: C.orangeDark, icon: 'information-circle' },
  }
  const t = map[tone]
  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: 'row',
        gap: 8,
        alignItems: 'flex-start',
        backgroundColor: t.bg,
        borderColor: t.bd,
        borderWidth: 2,
        borderRadius: 16,
        padding: 12,
        marginTop: 12,
      }}
    >
      <Ionicons name={t.icon} size={20} color={t.fg} />
      <Text style={{ flex: 1, color: t.fg, fontWeight: '700', fontSize: 13, lineHeight: 19 }}>{text}</Text>
    </View>
  )
}

function CodeCard({ target, ...rest }) {
  return target ? (
    <CoachTarget id={target}>
      <CodeCardBase {...rest} />
    </CoachTarget>
  ) : (
    <CodeCardBase {...rest} />
  )
}

function CodeCardBase({ title = 'programa.abc', children, style }) {
  return (
    <View style={[{ backgroundColor: C.code, borderRadius: 22, overflow: 'hidden', borderBottomWidth: 5, borderBottomColor: C.codeEdge }, style]}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: C.codeLine,
        }}
      >
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <View style={[s.dot, { backgroundColor: C.error }]} />
          <View style={[s.dot, { backgroundColor: C.orange }]} />
          <View style={[s.dot, { backgroundColor: C.success }]} />
        </View>
        <Text style={{ color: C.synNumber, fontFamily: MONO, fontSize: 12, fontWeight: '700' }}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>
      {children}
    </View>
  )
}

function Headphones({ size = 56 }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', backgroundColor: C.blueSoft, borderRadius: size * 0.28 }}>
      <View
        style={{
          width: size * 0.6,
          height: size * 0.5,
          borderTopLeftRadius: size * 0.3,
          borderTopRightRadius: size * 0.3,
          borderWidth: size * 0.07,
          borderBottomWidth: 0,
          borderColor: C.ink,
        }}
      />
      <View style={{ position: 'absolute', bottom: size * 0.2, left: size * 0.12, width: size * 0.2, height: size * 0.3, borderRadius: size * 0.08, backgroundColor: C.violet }} />
      <View style={{ position: 'absolute', bottom: size * 0.2, right: size * 0.12, width: size * 0.2, height: size * 0.3, borderRadius: size * 0.08, backgroundColor: C.violet }} />
    </View>
  )
}

/** Tela da loja: acende conforme o jogador acerta. */
function StoreScreen({ lines = [], lit, emptyText = 'Tela apagada…' }) {
  return (
    <View
      style={{
        marginTop: 14,
        backgroundColor: lit ? C.screenOn : C.screenOff,
        borderRadius: 18,
        padding: 14,
        borderWidth: 3,
        borderColor: lit ? C.success : C.codeLine,
        minHeight: 84,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Ionicons name="tv" size={14} color={lit ? C.success : C.codeMuted} />
        <Text style={{ color: lit ? C.success : C.codeMuted, fontWeight: '900', fontSize: 10, letterSpacing: 1 }}>
          TELA DA LOJA DO TONHO
        </Text>
      </View>
      {lit && lines.length > 0 ? (
        lines.map((l, i) => (
          <Text key={i} style={{ color: C.codeText, fontFamily: MONO, fontSize: 13, lineHeight: 20 }}>
            {l}
          </Text>
        ))
      ) : (
        <Text style={{ color: C.codeMuted, fontFamily: MONO, fontSize: 13 }}>{emptyText}</Text>
      )}
    </View>
  )
}

/* ------------------------------------------------------------------ */
/*  MISSÃO 1 — ARRASTAR E ORGANIZAR                                    */
/* ------------------------------------------------------------------ */
const ROW_H = 50
const STEP = ROW_H + 8

const ORDER_ITEMS = {
  alg: { text: 'algoritmo "loja_do_tonho"' },
  ini: { text: 'inicio' },
  e1: { text: '   escreval("Bem-vindo à loja!")' },
  e2: { text: '   escreval("Fone Bluetooth: R$ 299,00")' },
  fim: { text: 'fim' },
}

function DragRow({ id, top, dragging, h, disabled, ok, onUp, onDown, canUp, canDown }) {
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => h.current.start(id),
      onPanResponderMove: (_, g) => h.current.move(id, g.dy),
      onPanResponderRelease: () => h.current.end(id),
      onPanResponderTerminate: () => h.current.end(id),
    })
  ).current

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top,
        height: ROW_H,
        zIndex: dragging ? 10 : 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: ok ? C.codeOk : dragging ? C.codeSel : C.codeRow,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: ok ? C.success : dragging ? C.blue : C.codeLine,
        borderBottomWidth: dragging ? 2 : 4,
        transform: [{ scale: dragging ? 1.03 : 1 }],
        shadowColor: C.shadow,
        shadowOpacity: dragging ? 0.35 : 0,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: dragging ? 8 : 0,
      }}
    >
      <View
        {...(disabled ? {} : pan.panHandlers)}
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', height: ROW_H, paddingLeft: 10 }}
        accessibilityLabel={`Linha ${ORDER_ITEMS[id].text.trim()}. Arraste para mudar a ordem.`}
      >
        <Ionicons name="reorder-three" size={22} color={C.codeMuted} />
        <View style={{ marginLeft: 8, flex: 1 }}>
          <Colored text={ORDER_ITEMS[id].text} size={13} />
        </View>
      </View>
      {!disabled && (
        <View style={{ flexDirection: 'row', paddingRight: 6 }}>
          <Pressable onPress={onUp} disabled={!canUp} style={s.arrow} accessibilityLabel="Mover para cima" accessibilityRole="button">
            <Ionicons name="chevron-up" size={18} color={canUp ? C.codeIcon : C.codeIconOff} />
          </Pressable>
          <Pressable onPress={onDown} disabled={!canDown} style={s.arrow} accessibilityLabel="Mover para baixo" accessibilityRole="button">
            <Ionicons name="chevron-down" size={18} color={canDown ? C.codeIcon : C.codeIconOff} />
          </Pressable>
        </View>
      )}
    </View>
  )
}

function DragOrder({ onMistake, onSolved, lock }) {
  const [order, setOrder] = useState(['e2', 'fim', 'ini', 'e1', 'alg'])
  const [drag, setDrag] = useState(null)
  const [msg, setMsg] = useState(null)
  const [done, setDone] = useState(false)
  const [shake, runShake] = useShake()
  const dragRef = useRef(null)
  const h = useRef({})
  const n = order.length

  const hoverOf = (d) => Math.max(0, Math.min(n - 1, Math.round(d.from + d.dy / STEP)))

  h.current = {
    start: (id) => {
      if (done) return
      lock(true)
      dragRef.current = { id, from: order.indexOf(id), dy: 0 }
      setDrag({ ...dragRef.current })
      setMsg(null)
    },
    move: (id, dy) => {
      if (!dragRef.current || dragRef.current.id !== id) return
      dragRef.current.dy = dy
      setDrag({ ...dragRef.current })
    },
    end: () => {
      lock(false)
      const d = dragRef.current
      dragRef.current = null
      if (d) {
        const rest = order.filter((x) => x !== d.id)
        rest.splice(hoverOf(d), 0, d.id)
        setOrder(rest)
        tap()
      }
      setDrag(null)
    },
  }

  function shift(id, dir) {
    if (done) return
    const i = order.indexOf(id)
    const j = i + dir
    if (j < 0 || j >= n) return
    const next = [...order]
    ;[next[i], next[j]] = [next[j], next[i]]
    setOrder(next)
    setMsg(null)
    tap()
  }

  let list = order
  if (drag) {
    const rest = order.filter((x) => x !== drag.id)
    rest.splice(hoverOf(drag), 0, drag.id)
    list = rest
  }
  const topOf = (id) => {
    if (drag && id === drag.id) {
      return Math.max(0, Math.min((n - 1) * STEP, drag.from * STEP + drag.dy))
    }
    return list.indexOf(id) * STEP
  }

  function check() {
    let err = null
    if (order[0] !== 'alg') err = 'Todo programa começa pelo nome: a linha algoritmo vem primeiro.'
    else if (order[1] !== 'ini') err = 'Depois do nome, o programa avisa onde começa: inicio.'
    else if (order[n - 1] !== 'fim') err = 'A última linha fecha o programa com fim. Sem ela, o computador não sabe onde parar.'
    if (err) {
      bad()
      runShake()
      setMsg(err)
      onMistake()
      return
    }
    setDone(true)
    setMsg(null)
    onSolved()
  }

  const outLines = order.filter((id) => id === 'e1' || id === 'e2').map((id) => (id === 'e1' ? 'Bem-vindo à loja!' : 'Fone Bluetooth: R$ 299,00'))

  return (
    <Animated.View style={shake}>
      <Text style={{ color: C.muted, fontWeight: '800', fontSize: 12, marginBottom: 8, letterSpacing: 0.4 }}>ARRASTE AS LINHAS · ORDEM DO PROGRAMA</Text>
      <CodeCard title="loja.abc" target="main">
        <View style={{ padding: 12 }}>
          <View style={{ height: n * STEP - 8 }}>
            {order.map((id) => (
              <DragRow
                key={id}
                id={id}
                top={topOf(id)}
                dragging={!!drag && drag.id === id}
                h={h}
                disabled={done}
                ok={done}
                canUp={order.indexOf(id) > 0}
                canDown={order.indexOf(id) < n - 1}
                onUp={() => shift(id, -1)}
                onDown={() => shift(id, 1)}
              />
            ))}
          </View>
        </View>
      </CodeCard>

      <StoreScreen lit={done} lines={outLines} emptyText="Monte o programa para ligar a tela." />

      {msg ? <Msg tone="red" text={msg} /> : null}
      {!done && <ChunkyButton label="VERIFICAR" icon="checkmark" onPress={check} target="action" style={{ marginTop: 16 }} />}
    </Animated.View>
  )
}

/* ------------------------------------------------------------------ */
/*  MISSÃO 2 — COMPLETAR LACUNAS                                       */
/* ------------------------------------------------------------------ */
const FILL_LINES = [
  [{ t: 'algoritmo "preco_do_fone"' }],
  [{ t: 'var' }],
  [{ t: '   produto: ' }, { b: 'b1' }],
  [{ t: '   preco: ' }, { b: 'b2' }],
  [{ t: 'inicio' }],
  [{ t: '   produto <- "Fone Bluetooth"' }],
  [{ t: '   preco <- 299.9' }],
  [{ t: '   ' }, { b: 'b3' }, { t: '("Preço: ", preco)' }],
  [{ t: 'fim' }],
]
const FILL_ANSWER = { b1: 'caractere', b2: 'real', b3: 'escreval' }
const FILL_OPTIONS = ['real', 'caractere', 'leia', 'escreval']
const FILL_WHY = {
  b1: {
    real: 'real guarda números. "Fone Bluetooth" é texto — pense num tipo de texto.',
    leia: 'leia é um comando, não um tipo. Aqui precisa do tipo de dado da variável.',
    escreval: 'escreval é um comando, não um tipo. Aqui precisa do tipo de dado da variável.',
  },
  b2: {
    caractere: 'caractere guarda texto. O preço é um número com vírgula.',
    leia: 'leia é um comando, não um tipo. Aqui precisa do tipo de dado da variável.',
    escreval: 'escreval é um comando, não um tipo. Aqui precisa do tipo de dado da variável.',
  },
  b3: {
    real: 'real é um tipo de dado. Aqui precisa de um comando que mostre algo na tela.',
    caractere: 'caractere é um tipo de dado. Aqui precisa de um comando que mostre algo na tela.',
    leia: 'leia espera o cliente digitar. Nós queremos mostrar o preço, não pedir nada.',
  },
}

function FillBlanks({ onMistake, onSolved }) {
  const [filled, setFilled] = useState({ b1: null, b2: null, b3: null })
  const [sel, setSel] = useState('b1')
  const [msg, setMsg] = useState(null)
  const [shake, runShake] = useShake()
  const all = Object.keys(FILL_ANSWER)

  function pick(opt) {
    tap()
    const key = sel && !filled[sel] ? sel : all.find((k) => !filled[k])
    if (!key) return
    if (FILL_ANSWER[key] === opt) {
      good()
      const next = { ...filled, [key]: opt }
      setFilled(next)
      setMsg(null)
      const nextEmpty = all.find((k) => !next[k])
      setSel(nextEmpty || null)
      if (!nextEmpty) onSolved()
    } else {
      bad()
      runShake()
      setMsg(FILL_WHY[key]?.[opt] || 'Essa peça não encaixa aqui. Tente outra!')
      onMistake()
    }
  }

  return (
    <Animated.View style={shake}>
      <Text style={{ color: C.muted, fontWeight: '800', fontSize: 12, marginBottom: 8, letterSpacing: 0.4 }}>TOQUE NO ESPAÇO VAZIO · ESCOLHA A PEÇA</Text>
      <CodeCard title="preco_do_fone.abc" target="main">
        <View style={{ paddingVertical: 10 }}>
          {FILL_LINES.map((line, li) => (
            <View key={li} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 34, paddingHorizontal: 12 }}>
              <Text style={{ width: 22, color: C.codeDim, fontFamily: MONO, fontSize: 11 }}>{li + 1}</Text>
              {line.map((seg, si) =>
                seg.b ? (
                  <Pressable
                    key={si}
                    onPress={() => {
                      tap()
                      if (!filled[seg.b]) setSel(seg.b)
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={filled[seg.b] ? `Lacuna preenchida com ${filled[seg.b]}` : 'Lacuna vazia'}
                    style={{
                      minWidth: 84,
                      height: 28,
                      paddingHorizontal: 8,
                      borderRadius: 9,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: filled[seg.b] ? C.codeOk : sel === seg.b ? C.codeSel : 'transparent',
                      borderWidth: 2,
                      borderStyle: filled[seg.b] ? 'solid' : 'dashed',
                      borderColor: filled[seg.b] ? C.success : sel === seg.b ? C.blue : C.orange,
                    }}
                  >
                    {filled[seg.b] ? <Colored text={filled[seg.b]} size={13} /> : <Text style={{ color: C.codeMuted, fontSize: 12 }}>?</Text>}
                  </Pressable>
                ) : (
                  <Colored key={si} text={seg.t} size={13} />
                )
              )}
            </View>
          ))}
        </View>
      </CodeCard>

      <Text style={[s.eyebrow, { marginTop: 16, marginBottom: 8 }]}>ESCOLHA A PEÇA CERTA</Text>
      <CoachTarget id="pieces"><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {FILL_OPTIONS.map((o) => (
          <Pressable
            key={o}
            onPress={() => pick(o)}
            accessibilityRole="button"
            accessibilityLabel={`Peça ${o}`}
            style={{
              paddingHorizontal: 16,
              height: 46,
              borderRadius: 14,
              justifyContent: 'center',
              backgroundColor: C.card,
              borderWidth: 2,
              borderBottomWidth: 5,
              borderColor: C.line,
            }}
          >
            <Text style={{ fontFamily: MONO, fontWeight: '800', fontSize: 15, color: C.ink }}>{o}</Text>
          </Pressable>
        ))}
      </View></CoachTarget>

      {msg ? <Msg tone="red" text={msg} /> : null}

      {/* A loja se atualiza a cada acerto */}
      <View style={s.shopCard}>
        <Text style={s.eyebrow}>A LOJA ATUALIZA A CADA ACERTO</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 }}>
          <Headphones size={64} />
          <View style={{ flex: 1 }}>
            {filled.b1 ? (
              <Text style={{ fontWeight: '900', color: C.ink, fontSize: 15 }}>Fone Bluetooth</Text>
            ) : (
              <View style={s.skel} />
            )}
            {filled.b2 ? (
              <Text style={{ fontWeight: '800', color: C.successDark, fontSize: 18, marginTop: 4 }}>R$ 299,90</Text>
            ) : (
              <View style={[s.skel, { width: '40%', marginTop: 8 }]} />
            )}
          </View>
        </View>
        <View style={[s.shopOut, filled.b3 && { backgroundColor: C.screenOn }]}>
          <Text style={{ fontFamily: MONO, fontSize: 13, color: filled.b3 ? C.codeText : C.codeMuted }}>
            {filled.b3 ? 'Preço: 299.9' : 'Aguardando o escreval…'}
          </Text>
        </View>
      </View>
    </Animated.View>
  )
}

/* ------------------------------------------------------------------ */
/*  MISSÃO 3 — INVESTIGAR E TOCAR                                      */
/* ------------------------------------------------------------------ */
const INV_LINES = [
  { id: 1, text: 'algoritmo "pedido"', why: 'Só dá nome ao programa. Não mexe na resposta da cliente.' },
  { id: 2, text: 'var', why: 'Só abre a área das variáveis. A resposta da cliente não passa por aqui.' },
  { id: 3, text: '   quantidade: inteiro', why: 'Aqui a caixinha "quantidade" é criada, mas ainda está vazia. Quem vai preenchê-la?' },
  { id: 4, text: 'inicio', why: 'Marca o começo. Nada acontece com a resposta aqui.' },
  { id: 5, text: '   escreval("Quantos produtos?")', why: 'Esse escreval só mostra a pergunta na tela, e faz isso muito bem.' },
  { id: 6, text: '   escreval(quantidade)', culprit: true },
  { id: 7, text: '   escreval("Pedido recebido!")', why: 'Mostra a confirmação na tela. Está certo, o problema é antes dele.' },
  { id: 8, text: 'fim', why: 'Só encerra o programa.' },
]

function Investigate({ onMistake, onSolved }) {
  const [msg, setMsg] = useState(null)
  const [found, setFound] = useState(false)
  const [wrongId, setWrongId] = useState(null)
  const [shake, runShake] = useShake()

  function press(l) {
    if (found) return
    tap()
    if (l.culprit) {
      good()
      setFound(true)
      setMsg(null)
      setWrongId(null)
      onSolved()
    } else {
      bad()
      runShake()
      setWrongId(l.id)
      setMsg(l.why)
      onMistake()
    }
  }

  return (
    <Animated.View style={shake}>
      <Text style={[s.eyebrow, { marginBottom: 8 }]}>O QUE A CLÁUDIA VIU NA TELA</Text>
      <View style={{ backgroundColor: C.screenOn, borderRadius: 16, padding: 12, marginBottom: 14 }}>
        <Text style={s.term}>Quantos produtos?</Text>
        <Text style={[s.term, { color: C.orange }]}>(o sistema não esperou ela digitar)</Text>
        <Text style={s.term}>Pedido recebido!</Text>
      </View>

      <Text style={[s.eyebrow, { marginBottom: 8 }]}>TOQUE NA LINHA QUE ESTÁ CAUSANDO O PROBLEMA</Text>
      <Text style={{ color: C.muted, fontWeight: '800', fontSize: 12, marginBottom: 8, letterSpacing: 0.4 }}>TOQUE NA LINHA QUE ESTÁ ERRADA</Text>
      <CodeCard title="pedido.abc" target="main">
        <View style={{ paddingVertical: 8 }}>
          {INV_LINES.map((l) => {
            const isFixed = found && l.culprit
            const isWrong = wrongId === l.id && !found
            return (
              <Pressable
                key={l.id}
                onPress={() => press(l)}
                accessibilityRole="button"
                accessibilityLabel={`Linha ${l.id}: ${l.text.trim()}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  minHeight: 40,
                  marginHorizontal: 8,
                  paddingHorizontal: 8,
                  borderRadius: 10,
                  backgroundColor: isFixed ? C.codeOk : isWrong ? C.codeBad : 'transparent',
                  borderWidth: isFixed || isWrong ? 2 : 0,
                  borderColor: isFixed ? C.success : C.error,
                }}
              >
                <Text style={{ width: 22, color: C.codeDim, fontFamily: MONO, fontSize: 11 }}>{l.id}</Text>
                <Colored text={isFixed ? '   leia(quantidade)' : l.text} size={13} />
              </Pressable>
            )
          })}
        </View>
      </CodeCard>

      {msg ? <Msg tone="orange" text={msg} /> : null}
      {found && (
        <Msg
          tone="green"
          text="Achou! escreval só MOSTRA informação na tela. Para a cliente digitar e o valor ir para a variável, o comando é leia(quantidade)."
        />
      )}
    </Animated.View>
  )
}

/* ------------------------------------------------------------------ */
/*  MISSÃO 4 — ESCREVER                                                */
/* ------------------------------------------------------------------ */
const WRITE_VALUES = { nome: 'Fone Bluetooth', preco: '299.9' }

function evalWrite(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return { error: 'Digite o comando que falta. Ele precisa mostrar algo na tela.' }
  const out = []
  const used = new Set()
  for (const raw of lines) {
    const low = raw.toLowerCase()
    const m = low.match(/^(escreval|escreva)\s*\((.*)\)\s*$/)
    if (!m) {
      if (low.startsWith('leia')) return { error: 'leia recebe dados de quem digita. Para mostrar na tela, o comando é escreval.' }
      if (low.startsWith('escreva') || low.startsWith('escreval')) {
        return { error: 'Faltou abrir e fechar os parênteses: escreval( ... ).' }
      }
      return { error: `Não reconheci "${raw}". Dica: o comando que mostra algo na tela é escreval.` }
    }
    const rawArgs = raw.slice(raw.indexOf('(') + 1, raw.lastIndexOf(')'))
    const parts = splitArgs(rawArgs)
    let line = ''
    for (const p of parts) {
      const t = p.trim()
      if (/^"[^"]*"$/.test(t)) line += t.slice(1, -1)
      else if (WRITE_VALUES[t.toLowerCase()] !== undefined) {
        used.add(t.toLowerCase())
        line += WRITE_VALUES[t.toLowerCase()]
      } else if (t === '') continue
      else return { error: `"${t}" não é uma variável deste programa. Use nome e preco (sem aspas).` }
    }
    out.push(line)
  }
  if (!used.has('nome') && !used.has('preco')) return { error: 'Faltou mostrar as variáveis nome e preco (sem aspas, para exibir o valor guardado).' }
  if (!used.has('nome')) return { error: 'Quase! Ainda falta mostrar o nome do produto.' }
  if (!used.has('preco')) return { error: 'Quase! Ainda falta mostrar o preço do produto.' }
  return { out }
}

function splitArgs(str) {
  const parts = []
  let cur = ''
  let inStr = false
  for (const ch of str) {
    if (ch === '"') inStr = !inStr
    if (ch === ',' && !inStr) {
      parts.push(cur)
      cur = ''
    } else cur += ch
  }
  parts.push(cur)
  return parts
}

function WriteCode({ onMistake, onSolved }) {
  const [text, setText] = useState('')
  const [msg, setMsg] = useState(null)
  const [out, setOut] = useState(null)
  const [done, setDone] = useState(false)
  const [shake, runShake] = useShake()

  function add(str) {
    tap()
    setText((t) => t + str)
  }

  function check() {
    const r = evalWrite(text)
    if (r.error) {
      bad()
      runShake()
      setMsg(r.error)
      setOut(null)
      onMistake()
      return
    }
    setMsg(null)
    setOut(r.out)
    setDone(true)
    onSolved()
  }

  return (
    <Animated.View style={shake}>
      <Text style={{ color: C.muted, fontWeight: '800', fontSize: 12, marginBottom: 8, letterSpacing: 0.4 }}>COMPLETE A LINHA · DEPOIS VERIFICAR</Text>
      <CodeCard title="vitrine.abc" target="main">
        <View style={{ padding: 12 }}>
          {[
            'algoritmo "vitrine"',
            'var',
            '   nome: caractere',
            '   preco: real',
            'inicio',
            '   nome <- "Fone Bluetooth"',
            '   preco <- 299.9',
          ].map((l, i) => (
            <Colored key={i} text={l} size={13} style={{ lineHeight: 22 }} />
          ))}
          <View
            style={{
              marginVertical: 6,
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: done ? C.success : C.orange,
              borderRadius: 12,
              backgroundColor: done ? C.codeOk : C.codeRow,
            }}
          >
            <TextInput
              value={text}
              onChangeText={(t) => {
                setText(t)
                setDone(false)
              }}
              editable={!done}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="escreva o comando aqui"
              placeholderTextColor={C.codeMuted}
              accessibilityLabel="Campo para digitar o comando que falta"
              selectionColor={C.success}
              style={{ fontFamily: MONO, fontSize: 14, color: C.codeText, minHeight: 56, paddingHorizontal: 12, paddingVertical: 10 }}
            />
          </View>
          <Colored text="fim" size={13} style={{ lineHeight: 22 }} />
        </View>
      </CodeCard>

      {!done && (
        <>
          <Text style={[s.eyebrow, { marginTop: 14, marginBottom: 8 }]}>ATALHOS (OPCIONAL)</Text>
          <CoachTarget id="pieces"><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {['escreval(', 'nome', 'preco', ', ', ')'].map((c) => (
              <Pressable
                key={c}
                onPress={() => add(c)}
                accessibilityRole="button"
                accessibilityLabel={`Inserir ${c.trim()}`}
                style={{
                  paddingHorizontal: 12,
                  height: 38,
                  justifyContent: 'center',
                  borderRadius: 12,
                  backgroundColor: C.card,
                  borderWidth: 2,
                  borderBottomWidth: 4,
                  borderColor: C.line,
                }}
              >
                <Text style={{ fontFamily: MONO, fontWeight: '800', color: C.ink }}>{c === ', ' ? ',' : c}</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => {
                tap()
                setText('')
              }}
              accessibilityRole="button"
              accessibilityLabel="Limpar"
              style={{ paddingHorizontal: 12, height: 38, justifyContent: 'center', borderRadius: 12, backgroundColor: C.errorSoft }}
            >
              <Text style={{ fontWeight: '800', color: C.errorDark }}>limpar</Text>
            </Pressable>
          </View></CoachTarget>
        </>
      )}

      <StoreScreen lit={!!out} lines={out || []} emptyText="Envie o comando para ver o resultado." />
      {msg ? <Msg tone="red" text={msg} /> : null}
      {!done && <ChunkyButton label="VERIFICAR" icon="checkmark" onPress={check} target="action" style={{ marginTop: 16 }} />}
    </Animated.View>
  )
}

/* ------------------------------------------------------------------ */
/*  ROTEIRO DA FASE                                                    */
/* ------------------------------------------------------------------ */

const MISSIONS = [
  {
    kind: 'order',

    task: 'Organize as linhas do programa e aperte VERIFICAR. Vamos descobrir se ele ainda tem salvação.',
    coach: [
      {
        target: 'main',
        title: 'Bota cada linha no seu lugar',
        text: 'Segure o ícone ☰ e arraste. Se preferir, use as setas. O programa não vai se organizar sozinho.'
      },
      {
        target: 'action',
        title: 'Agora verifica',
        text: 'Se a ordem estiver certa, a loja volta a funcionar. Se não, a gente descobre onde foi que desandou.'
      }
    ],
    mech: 'Arrastar e organizar',
    title: 'Quem foi que bagunçou esse código?',
    who: 'chefe',
    label: 'TONHO',
    tone: C.orange,
    say: 'Eu saí por cinco minutos e alguém transformou meu programa num saco de roupa suja. Organiza isso pra mim?',
    goals: [
      { icon: 'bookmark', label: 'Nome do\nprograma', color: C.violet, bg: C.violetSoft },
      { icon: 'play', label: 'Começa\nem inicio', color: C.success, bg: C.successSoft },
      { icon: 'stop', label: 'Termina\nem fim', color: C.error, bg: C.errorSoft },
    ],
    steps: [
      { icon: 'list', title: 'Organize as linhas pelo ícone ☰', code: null },
      { icon: 'bookmark', title: 'Primeiro: dê um nome ao programa', code: 'algoritmo "loja..."' },
      { icon: 'play', title: 'Depois: diga onde começa', code: 'inicio' },
      { icon: 'chatbubbles', title: 'No meio: mostre as mensagens', code: 'escreval("...")' },
      { icon: 'stop', title: 'Por último: encerre o programa', code: 'fim' },
    ],
    learn: 'Todo programa tem uma estrutura: algoritmo identifica o programa, inicio marca o começo da execução e fim encerra.',
  },
  {
    kind: 'fill',

    task: 'Toque em cada buraco e escolha a peça que está faltando. Sem chute no escuro: pense no que cada comando faz.',
    coach: [
      {
        target: 'main',
        title: 'Achou um buraco?',
        text: 'Toque no espaço vazio. Ele vai ficar azul, mostrando onde a próxima peça entra.'
      },
      {
        target: 'pieces',
        title: 'Escolha a peça certa',
        text: 'Se errar, calma. Até o programa precisa de alguém que saiba explicar as coisas.'
      }
    ],
    mech: 'Completar lacunas',
    title: 'O preço sumiu da vitrine',
    who: 'sarue',
    label: 'CLIENTE',
    tone: C.success,
    say: 'Eu queria ver o preço do produto. A vitrine mostrou um espaço vazio. Se era uma promoção invisível, esqueceram de me explicar.',
    goals: [
      { icon: 'text', label: 'Texto →\ncaractere', color: C.blue, bg: C.blueSoft },
      { icon: 'calculator', label: 'Preço →\nreal', color: C.orange, bg: C.orangeSoft },
      { icon: 'tv', label: 'Mostrar →\nescreval', color: C.violet, bg: C.violetSoft },
    ],
    steps: [
      {
        icon: 'text',
        title: 'Nome de produto é texto',
        code: 'nome: caractere',
        example: [
          { label: 'caractere', ok: true },
          { label: 'real', ok: false }
        ]
      },
      {
        icon: 'calculator',
        title: 'Preço é um número',
        code: 'preco: real',
        example: [
          { label: 'real', ok: true },
          { label: 'caractere', ok: false }
        ]
      },
      {
        icon: 'tv',
        title: 'Mostre o nome na tela',
        code: 'escreval(nome)',
        example: [
          { label: 'escreval', ok: true },
          { label: 'leia', ok: false }
        ]
      },
    ],
    learn: 'caractere guarda textos, real guarda números que podem ter casas decimais e escreval mostra informações na tela.',
  },
  {
    kind: 'investigate',

    task: 'Encontre a linha que impede o programa de guardar a resposta da cliente.',
    coach: [
      {
        target: 'main',
        title: 'Investigue antes de trocar',
        text: 'A cliente digitou a quantidade, mas o programa não guardou nada. Qual comando recebe o que ela escreveu?'
      }
    ],
    mech: 'Investigar e tocar',
    title: 'Ela respondeu. O programa ignorou.',
    who: 'catia',
    label: 'CLÁUDIA',
    tone: C.violet,
    say: 'Eu digitei a quantidade, esperei, digitei de novo... Daqui a pouco vou ter que escrever uma carta pro computador.',
    goals: [
      { icon: 'search', label: 'Achar a\nlinha errada', color: C.violet, bg: C.violetSoft },
      { icon: 'create', label: 'Trocar por\nleia', color: C.orange, bg: C.orangeSoft },
      { icon: 'checkmark-circle', label: 'Testar', color: C.success, bg: C.successSoft },
    ],
    steps: [
      {
        icon: 'eye',
        title: 'escreval só mostra informações',
        code: 'escreval(quantidade)',
        example: [
          { label: 'mostra', ok: true },
          { label: 'recebe entrada', ok: false }
        ]
      },
      {
        icon: 'keypad',
        title: 'leia recebe o que a pessoa digita',
        code: 'leia(quantidade)',
        example: [
          { label: 'recebe entrada', ok: true }
        ]
      },
      { icon: 'hand-left', title: 'Toque na linha errada e corrija', code: null },
    ],
    learn: 'leia recebe dados digitados pela pessoa. escreval exibe informações. Cada comando tem sua função.',
  },
  {
    kind: 'write',

    task: 'Escreva o comando que mostra o nome e o preço do produto na tela.',
    coach: [
      {
        target: 'main',
        title: 'Hora de escrever código',
        text: 'Use o comando que mostra informações na tela. As variáveis vão sem aspas. Se travar, consulte "Como fazer".'
      },
      {
        target: 'pieces',
        title: 'Prefere montar a linha?',
        text: 'Use os atalhos para montar o comando peça por peça.'
      },
      {
        target: 'action',
        title: 'Vamos ver se funciona',
        text: 'Aperte VERIFICAR e confira o resultado na vitrine.'
      }
    ],
    mech: 'Escrever',
    title: 'Tonho quer ver resultado, não desculpa',
    who: 'chefe',
    label: 'TONHO',
    tone: C.orange,
    say: 'Nome e preço na tela. É só isso que eu pedi! Não precisa escrever uma tese, só fazer o programa funcionar.',
    goals: [
      { icon: 'code-slash', label: 'Comando\nescreval', color: C.violet, bg: C.violetSoft },
      { icon: 'pricetag', label: 'Variáveis\nsem aspas', color: C.orange, bg: C.orangeSoft },
      { icon: 'tv', label: 'Mostrar na\nvitrine', color: C.success, bg: C.successSoft },
    ],
    steps: [
      { icon: 'code-slash', title: 'Mostre as duas variáveis', code: 'escreval(nome, preco)' },
      {
        icon: 'close-circle',
        title: 'Não coloque aspas nas variáveis',
        example: [
          { label: 'nome', ok: true },
          { label: '"nome"', ok: false }
        ]
      },
      { icon: 'play', title: 'Verifique e confira a vitrine', code: null },
    ],
    learn: 'escreval(nome, preco) mostra os valores armazenados nas variáveis. Sem aspas, o programa acessa os dados; com aspas, interpreta o conteúdo como texto literal.',
  },
];

/* ------------------------------------------------------------------ */
/*  TELA PRINCIPAL                                                     */
/* ------------------------------------------------------------------ */
export default function Fase1({ onClose, onFinish }) {
  const insets = useSafeAreaInsets()
  const [idx, setIdx] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [solved, setSolved] = useState(false)
  const [lockScroll, setLockScroll] = useState(false)
  const [hintOpen, setHintOpen] = useState(false)

  const finished = idx >= MISSIONS.length
  const m = MISSIONS[Math.min(idx, MISSIONS.length - 1)]
  const coachCtrl = useCoach(m.kind + idx, m.coach)
  const stars = mistakes === 0 ? 3 : mistakes <= 3 ? 2 : 1

  // Conclusão garantida: o app é avisado mesmo se a pessoa sair pelo X, pelo voltar do
  // aparelho ou no epílogo. Antes só o botão final da tela de resultado registrava a fase.
  const reported = useRef(false)
  const latest = useRef({})
  latest.current = { done: finished, mistakes, stars, onFinish }
  const report = () => {
    if (reported.current) return
    reported.current = true
    const l = latest.current
    if (l.onFinish) l.onFinish({ mistakes: l.mistakes, stars: l.stars })
  }
  useEffect(() => () => { if (latest.current.done && !reported.current) report() }, [])

  const phaseKey = 'fase1'
  useEffect(() => { if (!finished) startMissionTimer(phaseKey) }, [idx])

  const onMistake = (detail = {}) => {
    setMistakes((x) => x + 1)
    recordError({
      phase: phaseKey,
      mission: m?.title || String(idx + 1),
      concept: m?.mech || m?.kind || phaseKey,
      studentInput: detail.input,
      expected: detail.expected,
      got: detail.got,
      tip: detail.tip || pickSupport(phaseKey, 'wrong'),
    })
  }
  const onSolved = () => {
    good()
    markActivityToday()
    markFixed({ phase: phaseKey, mission: m?.title })
    recordCorrect(phaseKey)
    setSolved(true)
  }
  function next() {
    tap()
    setSolved(false)
    setHintOpen(false)
    setIdx((i) => i + 1)
  }
  function close() {
    tap()
    if (latest.current.done && onFinish) return report()
    onClose && onClose()
  }

  const Body = {
    order: DragOrder,
    fill: FillBlanks,
    investigate: Investigate,
    write: WriteCode,
  }[m.kind]

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, paddingTop: insets.top, backgroundColor: C.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* topo */}
      <View style={s.topBar}>
        <Pressable onPress={close} style={s.iconBtn} accessibilityRole="button" accessibilityLabel="Fechar fase">
          <Ionicons name="close" size={24} color={C.muted} />
        </Pressable>
        <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
          {MISSIONS.map((_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 14,
                borderRadius: 8,
                backgroundColor: i < idx || (i === idx && solved) ? C.success : i === idx ? C.orange : C.bgDeep,
              }}
            />
          ))}
        </View>
        <View style={s.mistakeChip}>
          <Ionicons name="bug" size={16} color={C.errorDark} />
          <Text style={{ color: C.errorDark, fontWeight: '900', fontSize: 14 }}>{mistakes}</Text>
        </View>
      </View>

      {finished ? (
        <Result stars={stars} mistakes={mistakes} onDone={() => (onFinish ? report() : close())} insets={insets} />
      ) : (
        <>
          <ScrollView
            scrollEnabled={!lockScroll}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: solved ? 20 : 40 }}
            keyboardShouldPersistTaps="handled"
            ref={coachCtrl.scrollRef}
            onScroll={coachCtrl.onScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          >
            <Pop key={`h${idx}`}>
              <View style={s.header}>
                <View style={s.headerBlob} />
                <View style={s.tag}>
                  <Text style={{ color: C.orangeDark, fontWeight: '900', fontSize: 11, letterSpacing: 0.6 }}>
                    FASE 1 · {idx + 1} DE {MISSIONS.length}
                  </Text>
                </View>
                <Text style={s.headerTitle}>{m.title}</Text>
                <Text style={{ color: C.synNumber, fontWeight: '800', fontSize: 13, marginTop: 8 }}>👉 {m.mech}</Text>
              </View>
            </Pop>

            <Pop key={`b${idx}`} delay={120} style={{ marginTop: 16 }}>
              <Bubble who={m.who} label={m.label} tone={m.tone}>
                <Text style={{ color: C.ink, fontSize: 14, fontWeight: '600', lineHeight: 21 }}>{m.say}</Text>
              </Bubble>
            </Pop>

            {/* Objetivos visuais — sem parágrafo */}
            <GuidePanel key={`g${idx}`} mission={m} onTutorial={coachCtrl.reopen} />
            <View style={{ marginTop: 12 }}>
              <Body key={idx} onMistake={onMistake} onSolved={onSolved} lock={setLockScroll} />
            </View>
          </ScrollView>

          {/* FAB ? — guia visual durante a resolução */}
          

          {solved && (
            <View style={[s.feedback, { paddingBottom: Math.max(insets.bottom, 12) }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="checkmark-circle" size={26} color={C.successDark} />
                <Text style={{ color: C.successDark, fontWeight: '900', fontSize: 18 }}>Muito bem!</Text>
              </View>
              <Text style={{ color: C.inkSoft, fontWeight: '600', fontSize: 14, lineHeight: 20, marginTop: 4 }}>{m.learn}</Text>
              <ChunkyButton
                label={idx + 1 >= MISSIONS.length ? 'CONCLUIR FASE' : 'CONTINUAR'}
                onPress={next}
                style={{ marginTop: 12 }}
              />
            </View>
          )}
        </>
      )}
      <CoachOverlay ctrl={coachCtrl} enabled={!solved} />
    </KeyboardAvoidingView>
  )
}


function Result({ stars, mistakes, onDone, insets }) {
  const learned = [
    ['algoritmo · inicio · fim', C.orangeSoft, C.orangeDark],
    ['caractere · real', C.blueSoft, C.blueDark],
    ['leia × escreval', C.violetSoft, C.violetDark],
  ]
  return (
    <View style={{ flex: 1, paddingHorizontal: 18, justifyContent: 'center' }}>
      <Pop>
        <View style={{ alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[1, 2, 3].map((n) => (
              <Ionicons key={n} name={n <= stars ? 'star' : 'star-outline'} size={n === 2 ? 64 : 48} color={n <= stars ? C.yellow : C.line} style={{ marginTop: n === 2 ? 0 : 14 }} />
            ))}
          </View>
          <Text style={{ fontSize: 28, fontWeight: '900', color: C.ink, marginTop: 14, textAlign: 'center' }}>Fase 1 concluída!</Text>
          <Text style={{ color: C.muted, fontWeight: '700', marginTop: 6, textAlign: 'center' }}>
            {mistakes === 0 ? 'Sem nenhum erro. Tonho está impressionado!' : `${mistakes} ${mistakes === 1 ? 'erro' : 'erros'} no caminho. Aprender é isso!`}
          </Text>
          <View style={{ marginTop: 20, gap: 8, alignSelf: 'stretch' }}>
            {learned.map(([t, bg, fg]) => (
              <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: bg, borderRadius: 14, padding: 12 }}>
                <Ionicons name="checkmark-circle" size={20} color={fg} />
                <Text style={{ color: fg, fontWeight: '900', fontFamily: MONO, fontSize: 13 }}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      </Pop>
      <ChunkyButton label="CONTINUAR" onPress={onDone} style={{ marginTop: 26, marginBottom: Math.max(insets.bottom, 12) }} />
    </View>
  )
}

/* ------------------------------------------------------------------ */
/*  ESTILOS                                                            */
/* ------------------------------------------------------------------ */
const s = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, gap: 10 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  mistakeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.errorSoft,
  },
  header: {
    backgroundColor: C.banner,
    borderRadius: 26,
    padding: 18,
    overflow: 'hidden',
    borderBottomWidth: 5,
    borderBottomColor: C.bannerEdge,
  },
  headerBlob: { position: 'absolute', right: -40, top: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: C.bannerBlob },
  tag: { alignSelf: 'flex-start', backgroundColor: C.orangeSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  headerTitle: { color: C.white, fontSize: 24, fontWeight: '900', marginTop: 10, lineHeight: 29, paddingRight: 40 },
  hintBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    paddingHorizontal: 12,
    minHeight: 34,
    borderRadius: 12,
    backgroundColor: C.orangeSoft,
  },
  eyebrow: { color: C.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  arrow: { width: 32, height: 36, alignItems: 'center', justifyContent: 'center' },
  term: { color: C.codeText, fontFamily: MONO, fontSize: 13, lineHeight: 20 },
  shopCard: {
    marginTop: 16,
    backgroundColor: C.successSoft,
    borderRadius: 22,
    padding: 14,
    borderBottomWidth: 4,
    borderBottomColor: C.successLine,
  },
  skel: { height: 14, width: '70%', borderRadius: 7, backgroundColor: C.successLine },
  shopOut: { marginTop: 12, backgroundColor: C.successLine, borderRadius: 12, padding: 12 },
  feedback: {
    paddingHorizontal: 16,
    paddingTop: 14,
    backgroundColor: C.successSoft,
    borderTopWidth: 2,
    borderTopColor: C.successLine,
  },
})