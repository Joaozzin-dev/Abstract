import { useRef, useState, useEffect } from 'react'
import {
  StyleSheet,
  Animated,
  Easing,
  Platform,
  KeyboardAvoidingView,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { View, Text, TextInput, Pressable, ScrollView, Ionicons } from '../lib/themedRN'
import { C, PERSON_COLORS } from '../lib/colors'
import { sfx, music } from '../lib/sounds'
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
 * FASE 3 — A loja não pode parar!
 * Capítulo 3 · Condicionais, comparações e operadores lógicos
 *
 * 1 Investigar e montar a regra (Rafaela) · 2 Laboratório de testes (cliente com baixa visão)
 * 3 Simulador de checkout (Marcos)        · 4 Central de incidentes (Tonho)
 *
 * Uso:  <Fase3 onClose={() => ...} onFinish={({ mistakes, stars }) => ...} />
 * Arquivo autônomo: mesma paleta e mesmos componentes visuais da Fase 2.
 */
 
/* ------------------------------------------------------------------ */
/*  PALETA                                                             */
/* ------------------------------------------------------------------ */
const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace'
 
const tap = () => sfx?.tap?.()
const good = () => sfx?.deploy?.()
const bad = () => sfx?.fail?.()
 
const fmt = (n) => (typeof n === 'boolean' ? (n ? 'verdadeiro' : 'falso') : Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100))
const money = (n) => 'R$ ' + n.toFixed(2).replace('.', ',')
const same = (a, b) => typeof a === 'number' && Math.abs(a - b) < 1e-9
 
/* ------------------------------------------------------------------ */
/*  MINI-INTERPRETADOR (se/senao, comparações, e/ou/nao, escreval)     */
/* ------------------------------------------------------------------ */
function evalExpr(src, env) {
  const toks = src.match(/\d+(?:\.\d+)?|<>|>=|<=|==|!=|[A-Za-z_]\w*|[()+\-*/<>=]|\S/g) || []
  let p = 0
  const fail = (m) => {
    throw new Error(m)
  }
  const peek = () => (toks[p] || '').toLowerCase()
  function primary() {
    const t = toks[p++]
    if (t === undefined) fail('A expressão está incompleta: falta um valor no final.')
    if (/^\d/.test(t)) return parseFloat(t)
    if (/^[A-Za-z_]/.test(t)) {
      const k = t.toLowerCase()
      if (k === 'verdadeiro') return true
      if (k === 'falso') return false
      if (['e', 'ou', 'nao', 'entao', 'se'].includes(k)) fail(`"${t}" apareceu no lugar errado. Falta um valor ou uma comparação ao lado dele.`)
      if (!(k in env)) fail(`"${t}" não existe neste programa.`)
      return env[k]
    }
    if (t === '(') {
      const v = or()
      if (toks[p++] !== ')') fail('Faltou fechar o parêntese.')
      return v
    }
    if (t === '-') return -primary()
    return fail(`Não entendi o símbolo "${t}".`)
  }
  function mul() {
    let v = primary()
    while (peek() === '*' || peek() === '/') {
      const o = toks[p++]
      const r = primary()
      if (o === '/') {
        if (r === 0) fail('Divisão por zero.')
        v /= r
      } else v *= r
    }
    return v
  }
  function add() {
    let v = mul()
    while (peek() === '+' || peek() === '-') {
      const o = toks[p++]
      const r = mul()
      v = o === '+' ? v + r : v - r
    }
    return v
  }
  function cmp() {
    const v = add()
    const o = peek()
    if (['>', '<', '>=', '<=', '==', '=', '!=', '<>'].includes(o)) {
      p++
      const r = add()
      if (o === '>') return v > r
      if (o === '<') return v < r
      if (o === '>=') return v >= r
      if (o === '<=') return v <= r
      if (o === '==' || o === '=') return v === r
      return v !== r
    }
    return v
  }
  function not() {
    if (peek() === 'nao') {
      p++
      return !not()
    }
    return cmp()
  }
  function and() {
    let v = not()
    while (peek() === 'e') {
      p++
      const r = not()
      v = !!v && !!r
    }
    return v
  }
  function or() {
    let v = and()
    while (peek() === 'ou') {
      p++
      const r = and()
      v = !!v || !!r
    }
    return v
  }
  try {
    const v = or()
    if (p < toks.length) fail(`Sobrou "${toks[p]}" na expressão. Falta um operador (e, ou, +, -...) antes dele.`)
    return { value: v }
  } catch (e) {
    return { error: e.message }
  }
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
 
function parseProgram(lines) {
  let i = 0
  function block(stops) {
    const out = []
    while (i < lines.length) {
      const l = lines[i]
      const low = l.toLowerCase()
      if (stops.includes(low)) break
      if (low === 'senao' || low === 'fimse') throw new Error(`"${l}" apareceu sem um "se" correspondente.`)
      const m = l.match(/^se\s+(.+?)\s+entao$/i)
      if (m) {
        i++
        const then = block(['senao', 'fimse'])
        let els = []
        if (i < lines.length && lines[i].toLowerCase() === 'senao') {
          i++
          els = block(['fimse'])
        }
        if (i >= lines.length || lines[i].toLowerCase() !== 'fimse') throw new Error('Faltou "fimse" para fechar um "se".')
        i++
        out.push({ t: 'if', cond: m[1], then, els })
        continue
      }
      if (/^se\s/i.test(l)) throw new Error(`Faltou "entao" no fim da linha "${l}".`)
      out.push({ t: 'line', raw: l })
      i++
    }
    return out
  }
  return block([])
}
 
function execBlock(stmts, env, out, declared) {
  for (const st of stmts) {
    if (st.t === 'if') {
      const r = evalExpr(st.cond, env)
      if (r.error) throw new Error(`Em "se ${st.cond} entao": ${r.error}`)
      if (typeof r.value !== 'boolean') throw new Error(`A condição "${st.cond}" precisa ser uma comparação (como total > 200), não um valor solto.`)
      execBlock(r.value ? st.then : st.els, env, out, declared)
      continue
    }
    const raw = st.raw
    const asg = raw.match(/^([A-Za-z_]\w*)\s*<-\s*(.+)$/)
    if (asg) {
      const name = asg[1].toLowerCase()
      if (!declared.includes(name)) throw new Error(`"${asg[1]}" não existe neste programa.`)
      const r = evalExpr(asg[2], env)
      if (r.error) throw new Error(`Em "${raw}": ${r.error}`)
      env[name] = r.value
      continue
    }
    const m = raw.match(/^(escreval|escreva)\s*\((.*)\)\s*$/i)
    if (!m) throw new Error(`Não reconheci "${raw}". Use se/entao/senao/fimse, atribuição (<-) ou escreval(...).`)
    let line = ''
    for (const a of splitArgs(m[2])) {
      const t = a.trim()
      if (t === '') continue
      if (/^"[^"]*"$/.test(t)) line += t.slice(1, -1)
      else {
        const r = evalExpr(t, env)
        if (r.error) throw new Error(`Em "${raw}": ${r.error}`)
        line += fmt(r.value)
      }
    }
    out.push(line)
  }
}
 
/** Executa um trecho de programa com as variáveis iniciais de env0. */
function runProgram(body, env0) {
  const env = {}
  Object.keys(env0).forEach((k) => (env[k.toLowerCase()] = env0[k]))
  const declared = Object.keys(env)
  const lines = body.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('//'))
  if (!lines.length) return { error: 'Escreva as regras no editor antes de executar.' }
  const out = []
  try {
    execBlock(parseProgram(lines), env, out, declared)
    return { out, env }
  } catch (e) {
    return { error: e.message }
  }
}
 
/* ------------------------------------------------------------------ */
/*  COLORIZADOR DE CÓDIGO                                              */
/* ------------------------------------------------------------------ */
const KW = new Set(['algoritmo', 'var', 'inicio', 'fim', 'leia', 'escreval', 'escreva', 'se', 'entao', 'senao', 'fimse'])
const LOGIC = new Set(['e', 'ou', 'nao', 'verdadeiro', 'falso'])
const TYPES = new Set(['real', 'caractere', 'inteiro', 'logico'])
 
function tokens(text) {
  return text.match(/"[^"]*"|\/\/.*|<-|>=|<=|==|!=|<>|\w+|\s+|[^\w\s]/g) || []
}
function colorOf(t) {
  if (t.startsWith('"')) return C.synString
  if (t.startsWith('//')) return C.synComment
  if (t === '<-') return C.orange
  if (['>', '<', '>=', '<=', '==', '!=', '<>'].includes(t)) return C.synOperator
  const w = t.toLowerCase()
  if (KW.has(w)) return C.synKeyword
  if (LOGIC.has(w)) return C.synLogic
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
function ChunkyButton({ label, onPress, tone = 'green', icon, style, disabled }) {
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
    Animated.timing(v, { toValue: 1, duration: 360, delay, easing: Easing.out(Easing.back(1.3)), useNativeDriver: true }).start()
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
 
const PEOPLE = {
  chefe: { skin: PERSON_COLORS.chefe.skin, hair: PERSON_COLORS.chefe.hair, bg: C.orangeSoft, shirt: C.ink, tie: true },
  catia: { skin: PERSON_COLORS.catia.skin, hair: PERSON_COLORS.catia.hair, bg: C.violetSoft, shirt: C.violet, glasses: true },
  marcos: { skin: PERSON_COLORS.marcos.skin, hair: PERSON_COLORS.marcos.hair, bg: C.blueSoft, shirt: C.blue },
  ana: { skin: PERSON_COLORS.ana.skin, hair: PERSON_COLORS.ana.hair, bg: C.pinkSoft, shirt: C.pink },
  rafa: { skin: PERSON_COLORS.rafa.skin, hair: PERSON_COLORS.rafa.hair, bg: C.successSoft, shirt: C.successDark },
}
 
function Face({ who = 'chefe', size = 54 }) {
  const s = size
  const p = PEOPLE[who] || PEOPLE.chefe
  return (
    <View style={{ width: s, height: s, borderRadius: s * 0.32, backgroundColor: p.bg, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' }}>
      <View style={{ width: s * 0.78, height: s * 0.3, borderTopLeftRadius: s * 0.4, borderTopRightRadius: s * 0.4, backgroundColor: p.shirt, alignItems: 'center' }}>
        {p.tie && <View style={{ width: s * 0.1, height: s * 0.22, backgroundColor: C.error, borderRadius: 2 }} />}
      </View>
      <View style={{ position: 'absolute', top: s * 0.18, width: s * 0.5, height: s * 0.5, borderRadius: s * 0.25, backgroundColor: p.skin, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', top: -s * 0.02, width: s * 0.5, height: s * 0.2, borderTopLeftRadius: s * 0.25, borderTopRightRadius: s * 0.25, backgroundColor: p.hair }} />
        {p.glasses ? (
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
            backgroundColor: p.tie ? 'transparent' : PERSON_COLORS.tie,
            borderBottomWidth: p.tie ? 3 : 0,
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
      <View style={{ flex: 1, backgroundColor: C.card, borderRadius: 20, borderBottomLeftRadius: 4, padding: 12, borderWidth: 2, borderColor: tone }}>
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
      style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: t.bg, borderColor: t.bd, borderWidth: 2, borderRadius: 16, padding: 12, marginTop: 12 }}
    >
      <Ionicons name={t.icon} size={20} color={t.fg} />
      <Text style={{ flex: 1, color: t.fg, fontWeight: '700', fontSize: 13, lineHeight: 19 }}>{text}</Text>
    </View>
  )
}
 
function CodeCard({ title = 'programa.abc', children, style }) {
  return (
    <View style={[{ backgroundColor: C.code, borderRadius: 22, overflow: 'hidden', borderBottomWidth: 5, borderBottomColor: C.codeEdge }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.codeLine }}>
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
 
function CodeLines({ lines, size = 13, style }) {
  return lines.map((l, i) => <Colored key={i} text={l} size={size} style={[{ lineHeight: 22 }, style]} />)
}
 
/** Tela que acende conforme o jogador acerta. */
function Screen({ title = 'TELA DA LOJA DO TONHO', lines = [], lit, emptyText = 'Tela apagada…', tone }) {
  const edge = tone || C.success
  return (
    <View style={{ marginTop: 14, backgroundColor: lit ? C.screenOn : C.screenOff, borderRadius: 18, padding: 14, borderWidth: 3, borderColor: lit ? edge : C.codeLine, minHeight: 84 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Ionicons name="tv" size={14} color={lit ? edge : C.codeMuted} />
        <Text style={{ color: lit ? edge : C.codeMuted, fontWeight: '900', fontSize: 10, letterSpacing: 1 }}>{title}</Text>
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
 
function Chip({ label, onPress, selected, tone = 'ink', mono = true }) {
  const bg = selected ? (tone === 'orange' ? C.orangeSoft : C.blueSoft) : C.card
  const bd = selected ? (tone === 'orange' ? C.orange : C.blue) : C.line
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: !!selected }} style={[s.chip, { backgroundColor: bg, borderColor: bd }]}>
      <Text style={{ fontFamily: mono ? MONO : undefined, fontWeight: '800', fontSize: 15, color: C.ink }}>{label}</Text>
    </Pressable>
  )
}
 
function Slot({ value, placeholder, done }) {
  return (
    <View
      style={{
        minWidth: 90,
        minHeight: 30,
        paddingHorizontal: 8,
        borderRadius: 10,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: done ? C.success : C.orange,
        backgroundColor: done ? C.codeOk : C.codeRow,
        justifyContent: 'center',
      }}
    >
      {value ? <Colored text={value} size={13} /> : <Text style={{ color: C.codeMuted, fontSize: 11 }}>{placeholder}</Text>}
    </View>
  )
}
 
function ResultRow({ ok, title, body }) {
  return (
    <View style={{ backgroundColor: ok ? C.successSoft : C.errorSoft, borderRadius: 14, borderWidth: 2, borderColor: ok ? C.successLine : C.errorLine, padding: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name={ok ? 'checkmark-circle' : 'close-circle'} size={18} color={ok ? C.successDark : C.errorDark} />
        <Text style={{ fontWeight: '900', color: C.ink, fontSize: 13, flex: 1 }}>{title}</Text>
      </View>
      {body ? <Text style={{ fontFamily: MONO, fontSize: 12, color: C.inkSoft, marginTop: 4, lineHeight: 18 }}>{body}</Text> : null}
    </View>
  )
}
 
/* ------------------------------------------------------------------ */
/*  MISSÃO 1 — A PROMOÇÃO QUE ESCOLHE OS CLIENTES ERRADOS              */
/* ------------------------------------------------------------------ */
const PM_Q = [
  {
    q: 'Pedro gastou R$ 180. Ele deve receber o desconto?',
    opts: [
      ['Sim, qualquer compra recebe.', false, 'A promoção só vale para compras acima de R$ 200. Pedro ficou abaixo disso.'],
      ['Não, o valor não ultrapassou R$ 200.', true],
    ],
  },
]
const PM_COND = ['total > 200', 'total < 200']
const PM_ACT = ['total <- total - 30', 'total <- total + 30']
const PM_ORDERS = [
  { n: 'Pedro', v: 180, exp: 180 },
  { n: 'Luísa', v: 250, exp: 220 },
]
 
function Promocao({ onMistake, onSolved }) {
  const [qi, setQi] = useState(0)
  const [phase, setPhase] = useState('q')
  const [cond, setCond] = useState(null)
  const [act, setAct] = useState(null)
  const [results, setResults] = useState([])
  const [msg, setMsg] = useState(null)
  const [done, setDone] = useState(false)
  const [shake, runShake] = useShake()
 
  function answer(o) {
    tap()
    if (o[1]) {
      good()
      setMsg(null)
      if (qi + 1 >= PM_Q.length) setPhase('build')
      else setQi(qi + 1)
    } else {
      bad()
      runShake()
      setMsg(o[2])
      onMistake()
    }
  }
 
  function run() {
    tap()
    if (!cond || !act) {
      setMsg('Monte a regra inteira: escolha a condição e a ação antes de testar.')
      return
    }
    const body = `se ${cond} entao\n   ${act}\nfimse`
    const rs = PM_ORDERS.map((o) => {
      const r = runProgram(body, { total: o.v })
      return { ...o, got: r.error ? null : r.env.total, ok: !r.error && same(r.env.total, o.exp) }
    })
    setResults(rs)
    const badOne = rs.find((r) => !r.ok)
    if (badOne) {
      bad()
      runShake()
      setMsg(`Com essa regra, ${badOne.n} (R$ ${badOne.v}) pagaria R$ ${badOne.got}, mas o certo é R$ ${badOne.exp}.`)
      onMistake()
      return
    }
    setMsg(null)
    setDone(true)
    onSolved()
  }
 
  return (
    <Animated.View style={shake}>
      <Text style={s.eyebrow}>PAINEL DE INVESTIGAÇÃO · REGRA: R$ 30 DE DESCONTO ACIMA DE R$ 200</Text>
      <View style={[s.shopCard, { marginTop: 8 }]}>
        {PM_ORDERS.map((o, i) => (
          <View key={o.n} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
            <Text style={{ fontWeight: '800', color: C.ink }}>{o.n}</Text>
            <Text style={{ fontWeight: '800', color: C.inkSoft }}>comprou R$ {o.v}</Text>
          </View>
        ))}
      </View>
 
      {phase === 'q' && (
        <>
          <Text style={[s.eyebrow, { marginTop: 16 }]}>PERGUNTA {qi + 1} DE {PM_Q.length}</Text>
          <Text style={{ color: C.ink, fontWeight: '800', fontSize: 16, lineHeight: 23, marginTop: 6 }}>{PM_Q[qi].q}</Text>
          <View style={{ gap: 10, marginTop: 10 }}>
            {PM_Q[qi].opts.map((o) => (
              <Pressable key={o[0]} onPress={() => answer(o)} accessibilityRole="button" accessibilityLabel={o[0]} style={[s.choice, qi === 2 && { backgroundColor: C.code, borderColor: C.codeLine }]}>
                {qi === 2 ? <Colored text={o[0]} size={15} /> : <Text style={{ color: C.ink, fontWeight: '800', fontSize: 14 }}>{o[0]}</Text>}
              </Pressable>
            ))}
          </View>
        </>
      )}
 
      {phase === 'build' && (
        <>
          <Msg tone="green" text="Regra identificada! O total precisa ser maior que R$ 200. Agora traduza isso para uma estrutura se ... entao." />
          <CodeCard title="promocao.abc" style={{ marginTop: 14 }}>
            <View style={{ padding: 12, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <Colored text="se" size={13} />
                <Slot value={cond} placeholder="condição" done={done} />
                <Colored text="entao" size={13} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 18 }}>
                <Slot value={act} placeholder="ação" done={done} />
              </View>
              <Colored text="fimse" size={13} />
            </View>
          </CodeCard>
 
          {!done && (
            <>
              <Text style={[s.eyebrow, { marginTop: 16, marginBottom: 8 }]}>BLOCOS DE CONDIÇÃO</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {PM_COND.map((c) => (
                  <Chip key={c} label={c} selected={cond === c} onPress={() => { tap(); setCond(c); setMsg(null) }} />
                ))}
              </View>
              <Text style={[s.eyebrow, { marginTop: 14, marginBottom: 8 }]}>BLOCOS DE AÇÃO</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {PM_ACT.map((a) => (
                  <Chip key={a} label={a} tone="orange" selected={act === a} onPress={() => { tap(); setAct(a); setMsg(null) }} />
                ))}
              </View>
            </>
          )}
 
          {results.length > 0 && (
            <View style={{ gap: 8, marginTop: 14 }}>
              {results.map((r) => (
                <ResultRow key={r.n} ok={r.ok} title={`${r.n}: R$ ${r.v} → paga R$ ${r.got ?? '?'}`} body={r.ok ? null : `esperado: R$ ${r.exp}`} />
              ))}
            </View>
          )}
          {!done && <ChunkyButton label="TESTAR OS 3 PEDIDOS" icon="play" onPress={run} style={{ marginTop: 16 }} />}
        </>
      )}
 
      {msg ? <Msg tone={phase === 'q' ? 'orange' : 'red'} text={msg} /> : null}
      {done && <Msg tone="green" text="Os três pedidos agora têm o valor certo: só quem passou de R$ 200 ganhou desconto." />}
    </Animated.View>
  )
}
 
/* ------------------------------------------------------------------ */
/*  MISSÃO 2 — O PRODUTO QUE EXISTE E NÃO EXISTE (laboratório)         */
/* ------------------------------------------------------------------ */
const LAB_CASES = [
  { q: 5, ok: true },
  { q: 0, ok: false },
]
const LAB_OPS = ['>=', '>']
const MSG_OK = 'Produto disponível'
const MSG_NO = 'Produto indisponível'
 
function Laboratorio({ onMistake, onSolved }) {
  const [phase, setPhase] = useState('predict')
  const [ci, setCi] = useState(0)
  const [guess, setGuess] = useState([])
  const [op, setOp] = useState('>=')
  const [results, setResults] = useState([])
  const [msg, setMsg] = useState(null)
  const [done, setDone] = useState(false)
  const [shake, runShake] = useShake()
 
  function predict(isAvail) {
    tap()
    const c = LAB_CASES[ci]
    if (isAvail === c.ok) {
      good()
      setMsg(null)
      setGuess((g) => [...g, c.q])
      if (ci + 1 >= LAB_CASES.length) setPhase('debug')
      else setCi(ci + 1)
    } else {
      bad()
      runShake()
      setMsg(c.q === 0 ? 'Com 0 unidades não há nada para vender. O cliente precisa ouvir "indisponível".' : `Com ${c.q} ${c.q === 1 ? 'unidade' : 'unidades'} ainda dá para vender. A mensagem certa é "disponível".`)
      onMistake()
    }
  }
 
  function run() {
    tap()
    const body = `se estoque ${op} 0 entao\n   escreval("${MSG_OK}")\nsenao\n   escreval("${MSG_NO}")\nfimse`
    const rs = LAB_CASES.map((c) => {
      const r = runProgram(body, { estoque: c.q })
      const want = c.ok ? MSG_OK : MSG_NO
      return { q: c.q, got: r.error ? r.error : r.out[0], want, ok: !r.error && r.out[0] === want }
    })
    setResults(rs)
    const first = rs.find((r) => !r.ok)
    if (first) {
      bad()
      runShake()
      setMsg(`Com estoque ${first.q}, o programa disse "${first.got}", mas deveria dizer "${first.want}". Troque o operador da comparação e execute de novo.`)
      onMistake()
      return
    }
    setMsg(null)
    setDone(true)
    onSolved()
  }
 
  return (
    <Animated.View style={shake}>
      <Text style={s.eyebrow}>REGISTRO DO PRODUTO</Text>
      <View style={[s.shopCard, { marginTop: 8 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontWeight: '800', color: C.inkSoft }}>Quantidade disponível</Text>
          <Text style={{ fontWeight: '900', color: C.ink }}>0</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={{ fontWeight: '800', color: C.inkSoft }}>Mensagem da página</Text>
          <Text style={{ fontWeight: '900', color: C.errorDark }}>Disponível</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={{ fontWeight: '800', color: C.inkSoft }}>Mensagem ao finalizar</Text>
          <Text style={{ fontWeight: '900', color: C.ink }}>Indisponível</Text>
        </View>
      </View>
 
      {phase === 'predict' ? (
        <>
          <Text style={[s.eyebrow, { marginTop: 16 }]}>PREVEJA ANTES DE EXECUTAR · TESTE {ci + 1} DE {LAB_CASES.length}</Text>
          <Text style={{ color: C.ink, fontWeight: '800', fontSize: 16, lineHeight: 23, marginTop: 6 }}>
            Estoque = {LAB_CASES[ci].q}. Qual mensagem o cliente deve ouvir?
          </Text>
          <View style={{ gap: 10, marginTop: 10 }}>
            <Pressable onPress={() => predict(true)} accessibilityRole="button" accessibilityLabel={MSG_OK} style={s.choice}>
              <Text style={{ color: C.ink, fontWeight: '800', fontSize: 14 }}>{MSG_OK}</Text>
            </Pressable>
            <Pressable onPress={() => predict(false)} accessibilityRole="button" accessibilityLabel={MSG_NO} style={s.choice}>
              <Text style={{ color: C.ink, fontWeight: '800', fontSize: 14 }}>{MSG_NO}</Text>
            </Pressable>
          </View>
          {guess.length > 0 && (
            <Text style={{ color: C.successDark, fontWeight: '800', fontSize: 12, marginTop: 10 }}>
              Previsões certas: {guess.join(', ')}
            </Text>
          )}
        </>
      ) : (
        <>
          <Text style={[s.eyebrow, { marginTop: 16, marginBottom: 8 }]}>ABRA A LINHA E TROQUE O OPERADOR</Text>
          <CodeCard title="estoque.abc">
            <View style={{ padding: 12, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <Colored text="se estoque" size={13} />
                <View style={{ paddingHorizontal: 12, height: 30, borderRadius: 10, borderWidth: 2, borderStyle: 'dashed', borderColor: done ? C.success : C.orange, backgroundColor: done ? C.codeOk : C.codeRow, justifyContent: 'center' }}>
                  <Colored text={op} size={15} />
                </View>
                <Colored text="0 entao" size={13} />
              </View>
              <CodeLines lines={['   escreval("Produto disponível")', 'senao', '   escreval("Produto indisponível")', 'fimse']} />
            </View>
          </CodeCard>
          {!done && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
              {LAB_OPS.map((o) => (
                <Chip key={o} label={o} tone="orange" selected={op === o} onPress={() => { tap(); setOp(o); setMsg(null) }} />
              ))}
            </View>
          )}
          <Text style={[s.eyebrow, { marginTop: 16, marginBottom: 8 }]}>BATERIA DE TESTES</Text>
          <View style={{ gap: 8 }}>
            {LAB_CASES.map((c) => {
              const r = results.find((x) => x.q === c.q)
              return r ? (
                <ResultRow key={c.q} ok={r.ok} title={`Estoque ${c.q}`} body={`obtido: ${r.got}\nesperado: ${r.want}`} />
              ) : (
                <View key={c.q} style={{ backgroundColor: C.card, borderRadius: 14, borderWidth: 2, borderColor: C.line, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="ellipse-outline" size={18} color={C.muted} />
                  <Text style={{ fontWeight: '900', color: C.ink, fontSize: 13 }}>Estoque {c.q}</Text>
                </View>
              )
            })}
          </View>
          {!done && <ChunkyButton label="EXECUTAR TESTES" icon="play" onPress={run} style={{ marginTop: 16 }} />}
        </>
      )}
 
      {msg ? <Msg tone={phase === 'predict' ? 'orange' : 'red'} text={msg} /> : null}
      {done && <Msg tone="green" text="Os testes passaram. Quem lê a tela ampliada ou ouve a mensagem falada recebe a mesma informação em toda a loja." />}
    </Animated.View>
  )
}
 
/* ------------------------------------------------------------------ */
/*  MISSÃO 3 — O PAGAMENTO FOI APROVADO (simulador)                    */
/* ------------------------------------------------------------------ */
const SIM_COMBOS = [
  { e: true, p: true },
  { e: true, p: false },
  { e: false, p: true },
  { e: false, p: false },
]
const comboKey = (e, p) => `${e ? 1 : 0}${p ? 1 : 0}`
function decision(e, p) {
  if (e && p) return { tone: C.success, title: 'Compra liberada', body: 'Há estoque e o pagamento foi aprovado. As duas condições foram satisfeitas.' }
  if (!e && p) return { tone: C.orange, title: 'Compra bloqueada', body: 'O pagamento foi aprovado, mas não há estoque. Uma das condições falhou.' }
  if (e && !p) return { tone: C.orange, title: 'Compra bloqueada', body: 'Há estoque, mas o pagamento não foi aprovado. Uma das condições falhou.' }
  return { tone: C.error, title: 'Compra bloqueada', body: 'Não há estoque e o pagamento não foi aprovado. As duas condições falharam.' }
}
 
function Simulador({ onMistake, onSolved }) {
  const [e, setE] = useState(true)
  const [p, setP] = useState(true)
  const [seen, setSeen] = useState({ [comboKey(true, true)]: true })
  const [phase, setPhase] = useState('sim')
  const [lop, setLop] = useState('ou')
  const [results, setResults] = useState([])
  const [msg, setMsg] = useState(null)
  const [done, setDone] = useState(false)
  const [shake, runShake] = useShake()
  const d = decision(e, p)
 
  function toggle(which, val) {
    tap()
    const ne = which === 'e' ? val : e
    const np = which === 'p' ? val : p
    setE(ne)
    setP(np)
    const k = comboKey(ne, np)
    const next = { ...seen, [k]: true }
    setSeen(next)
    if (Object.keys(next).length >= 3 && phase === 'sim') {
      good()
      setPhase('fix')
    }
  }
 
  function run() {
    tap()
    const body = `se estoque > 0 ${lop} pagamento_aprovado entao\n   escreval("Compra liberada")\nsenao\n   escreval("Compra não pode ser concluída")\nfimse`
    const rs = SIM_COMBOS.map((c) => {
      const r = runProgram(body, { estoque: c.e ? 5 : 0, pagamento_aprovado: c.p })
      const want = c.e && c.p ? 'Compra liberada' : 'Compra não pode ser concluída'
      return { ...c, got: r.error ? r.error : r.out[0], want, ok: !r.error && r.out[0] === want }
    })
    setResults(rs)
    const first = rs.find((r) => !r.ok)
    if (first) {
      bad()
      runShake()
      const lbl = `${first.e ? 'com' : 'sem'} estoque e ${first.p ? 'com' : 'sem'} pagamento`
      setMsg(
        lop === 'nao'
          ? 'O "nao" inverte uma condição, mas não une duas. Aqui as duas verificações precisam ser combinadas.'
          : `Com ${lbl}, o sistema respondeu "${first.got}". Pense: a compra só pode sair quando AS DUAS condições forem verdadeiras.`
      )
      onMistake()
      return
    }
    setMsg(null)
    setDone(true)
    onSolved()
  }
 
  const Toggle = ({ label, sub, val, which }) => (
    <View style={{ marginTop: 12 }}>
      <Text style={{ color: C.ink, fontWeight: '900', fontSize: 14 }}>{label}</Text>
      <Text style={{ color: C.muted, fontWeight: '700', fontSize: 12, marginBottom: 6 }}>{sub}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[true, false].map((v) => (
          <Pressable
            key={String(v)}
            onPress={() => toggle(which, v)}
            accessibilityRole="button"
            accessibilityLabel={`${label} ${v ? 'Sim' : 'Não'}`}
            accessibilityState={{ selected: val === v }}
            style={{ flex: 1, minHeight: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderBottomWidth: 5, backgroundColor: val === v ? (v ? C.successSoft : C.errorSoft) : C.card, borderColor: val === v ? (v ? C.success : C.error) : C.line }}
          >
            <Text style={{ fontWeight: '900', color: val === v ? (v ? C.successDark : C.errorDark) : C.muted }}>{v ? 'Sim' : 'Não'}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
 
  return (
    <Animated.View style={shake}>
      <Text style={s.eyebrow}>SIMULADOR DE CHECKOUT</Text>
      <View style={[s.shopCard, { marginTop: 8 }]}>
        <Text style={{ color: C.inkSoft, fontWeight: '700', fontSize: 13 }}>Altere as condições para testar as regras da loja.</Text>
        <Toggle label="Há estoque?" sub="Produto disponível" val={e} which="e" />
        <Toggle label="Pagamento aprovado?" sub="Confirmação do banco" val={p} which="p" />
      </View>
 
      <View accessibilityLiveRegion="polite" style={{ marginTop: 14, backgroundColor: C.screenOn, borderRadius: 18, borderWidth: 3, borderColor: d.tone, padding: 14 }}>
        <Text style={{ color: d.tone, fontWeight: '900', fontSize: 10, letterSpacing: 1 }}>DECISÃO DO SISTEMA</Text>
        <Text style={{ color: C.white, fontWeight: '900', fontSize: 20, marginTop: 6 }}>{d.title}</Text>
        <Text style={{ color: C.codeIcon, fontWeight: '600', fontSize: 13, lineHeight: 19, marginTop: 4 }}>{d.body}</Text>
      </View>
 
      <Text style={{ color: C.muted, fontWeight: '800', fontSize: 12, marginTop: 10 }}>
        Teste pelo menos 3 combinações: {Math.min(Object.keys(seen).length, 3)} de 3
      </Text>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
        {SIM_COMBOS.map((c) => (
          <View key={comboKey(c.e, c.p)} style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: seen[comboKey(c.e, c.p)] ? C.success : C.bgDeep }} />
        ))}
      </View>
 
      {phase === 'fix' && (
        <>
          <Msg tone="orange" text="Você já viu o suficiente. A compra só sai quando as duas condições forem verdadeiras ao mesmo tempo. A regra do sistema usa o operador errado: corrija-o." />
          <CodeCard title="checkout.abc" style={{ marginTop: 14 }}>
            <View style={{ padding: 12, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <Colored text="se estoque > 0" size={13} />
                <View style={{ paddingHorizontal: 12, height: 30, borderRadius: 10, borderWidth: 2, borderStyle: 'dashed', borderColor: done ? C.success : C.orange, backgroundColor: done ? C.codeOk : C.codeRow, justifyContent: 'center' }}>
                  <Colored text={lop} size={15} />
                </View>
                <Colored text="pagamento_aprovado entao" size={13} />
              </View>
              <CodeLines lines={['   escreval("Compra liberada")', 'senao', '   escreval("Compra não pode ser concluída")', 'fimse']} />
            </View>
          </CodeCard>
          {!done && (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              {['e', 'ou'].map((o) => (
                <Chip key={o} label={o} tone="orange" selected={lop === o} onPress={() => { tap(); setLop(o); setMsg(null) }} />
              ))}
            </View>
          )}
          {results.length > 0 && (
            <View style={{ gap: 8, marginTop: 14 }}>
              {results.map((r) => (
                <ResultRow key={comboKey(r.e, r.p)} ok={r.ok} title={`${r.e ? 'Com' : 'Sem'} estoque · ${r.p ? 'pago' : 'não pago'}`} body={`obtido: ${r.got}`} />
              ))}
            </View>
          )}
          {!done && <ChunkyButton label="TESTAR AS 4 COMBINAÇÕES" icon="play" onPress={run} style={{ marginTop: 16 }} />}
        </>
      )}
 
      {msg ? <Msg tone="red" text={msg} /> : null}
      {done && <Msg tone="green" text="Agora a compra só é liberada com estoque e pagamento aprovado. Quem navega por leitor de tela recebe a mesma decisão." />}
    </Animated.View>
  )
}
 
/* ------------------------------------------------------------------ */
/*  CONSERTO GUIADO · um código, uma lacuna, poucas opções             */
/* ------------------------------------------------------------------ */
/** Roda cada caso no mini-interpretador. check(out, env, env0) devolve null (ok) ou o problema. */
function judge(cases) {
  return (code) => {
    const rows = cases.map((c) => {
      const r = runProgram(code, c.env)
      if (r.error) return { ok: false, title: c.name, body: r.error, problem: r.error }
      const problem = c.check(r.out, r.env, c.env)
      return { ok: !problem, title: c.name, body: problem || r.out.join('\n') || '(sem mensagem)', problem }
    })
    const first = rows.find((x) => !x.ok)
    return { rows, problem: first ? `${first.title}: ${first.problem}` : null }
  }
}

/**
 * <Fix lines={[...'{{}}'...]} options={[...]} run={judge([...])} />
 * Mostra o código com UMA lacuna, o jogador escolhe a peça e testa.
 * Uma opção pode ter várias linhas (separadas por \n).
 */
function Fix({ title = 'regra.abc', lines, options, run, label = 'TESTAR', okText, onMistake, onSolved }) {
  const [pick, setPick] = useState(null)
  const [rows, setRows] = useState([])
  const [msg, setMsg] = useState(null)
  const [msgTone, setMsgTone] = useState('red')
  const [done, setDone] = useState(false)
  const [shake, runShake] = useShake()

  const fill = (line) => {
    const at = line.indexOf('{{}}')
    if (at < 0) return line
    const indent = line.match(/^\s*/)[0]
    return line.slice(0, at) + (pick || '').split('\n').join('\n' + indent) + line.slice(at + 4)
  }

  function test() {
    tap()
    if (pick === null) {
      setMsgTone('orange')
      setMsg('Escolha uma peça para completar o código.')
      return
    }
    const r = run(lines.map(fill).join('\n'))
    setRows(r.rows || [])
    const problem = r.error || r.problem
    if (problem) {
      bad()
      runShake()
      setMsgTone('red')
      setMsg(problem)
      onMistake({ input: pick, tip: problem })
      return
    }
    setMsg(null)
    setDone(true)
    onSolved()
  }

  return (
    <Animated.View style={shake}>
      <CodeCard title={title} style={{ marginTop: 14 }}>
        <View style={{ padding: 12, gap: 4 }}>
          {lines.map((l, i) => {
            const at = l.indexOf('{{}}')
            if (at < 0) return <Colored key={i} text={l} size={13} style={{ lineHeight: 22 }} />
            const pre = l.slice(0, at)
            const post = l.slice(at + 4)
            return (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                {pre ? <Colored text={pre} size={13} /> : null}
                <View style={{ minWidth: 90, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 2, borderStyle: 'dashed', borderColor: done ? C.success : C.orange, backgroundColor: done ? C.codeOk : C.codeRow }}>
                  {pick ? (
                    pick.split('\n').map((x, k) => <Colored key={k} text={x} size={13} />)
                  ) : (
                    <Text style={{ color: C.codeMuted, fontSize: 11 }}>escolha abaixo</Text>
                  )}
                </View>
                {post ? <Colored text={post} size={13} /> : null}
              </View>
            )
          })}
        </View>
      </CodeCard>

      {!done && (
        <CoachTarget id="pieces">
          <View style={{ gap: 10, marginTop: 14 }}>
            {options.map((o) => {
              const on = pick === o
              return (
                <Pressable
                  key={o}
                  onPress={() => { tap(); setPick(o); setMsg(null) }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={o.replace(/\n/g, ', depois ')}
                  style={[s.choice, { borderColor: on ? C.blue : C.line, backgroundColor: on ? C.blueSoft : C.card }]}
                >
                  <Text style={{ fontFamily: MONO, fontWeight: '800', fontSize: 13, lineHeight: 20, color: C.ink }}>{o}</Text>
                </Pressable>
              )
            })}
          </View>
        </CoachTarget>
      )}

      {rows.length > 0 && (
        <View style={{ gap: 8, marginTop: 14 }}>
          {rows.map((r) => (
            <ResultRow key={r.title} ok={r.ok} title={r.title} body={r.body} />
          ))}
        </View>
      )}
      {msg ? <Msg tone={msgTone} text={msg} /> : null}
      {done && <Msg tone="green" text={okText || 'Passou em todos os testes!'} />}
      {!done && <ChunkyButton label={label} icon="play" onPress={test} target="action" style={{ marginTop: 16 }} />}
    </Animated.View>
  )
}

/* ------------------------------------------------------------------ */
/*  MISSÃO 4 — CENTRAL DE INCIDENTES (3 consertos curtos)              */
/* ------------------------------------------------------------------ */
const NEXT_STEP = /tente|escolha|use |verifique|confira|avis|outro|outra|contato|volte|aguarde|informe|dados|cart/i

const HUB_STEPS = [
  {
    id: 'B',
    title: 'Pagamento recusado, compra liberada',
    want: 'Liberar só com estoque E pagamento aprovado.',
    got: 'O sistema liberou uma compra sem pagamento.',
    tone: C.error,
    file: 'checkout.abc',
    lines: ['se estoque > 0 {{}} pagamento_aprovado entao', '   escreval("Compra liberada")', 'senao', '   escreval("Compra bloqueada")', 'fimse'],
    options: ['ou', 'e'],
    run: judge(
      [
        [5, true],
        [5, false],
        [0, true],
        [0, false],
      ].map(([est, pag]) => ({
        name: `${est ? 'Com' : 'Sem'} estoque · ${pag ? 'pago' : 'recusado'}`,
        env: { estoque: est, pagamento_aprovado: pag },
        check: (out) => {
          const liberou = /liberada/i.test(out.join(' '))
          if (liberou === (est > 0 && pag)) return null
          return liberou ? 'Liberou a compra, mas uma das condições falhou.' : 'Bloqueou a compra, mas as duas condições estavam certas.'
        },
      }))
    ),
    ok: 'A compra só sai quando as duas condições são verdadeiras.',
  },
  {
    id: 'C',
    title: 'Pagamento recusado, tela só diz "Erro"',
    want: 'Explicar o motivo e dizer o que fazer.',
    got: 'A tela mostrou apenas "Erro".',
    tone: C.violet,
    file: 'mensagem.abc',
    lines: ['se pagamento_aprovado == falso entao', '   {{}}', 'fimse'],
    options: ['escreval("Erro")', 'escreval("Pagamento não aprovado. Tente outro cartão.")'],
    run: judge([
      {
        name: 'Pagamento recusado',
        env: { pagamento_aprovado: false },
        check: (out) => {
          const t = out.join(' ')
          if (!t) return 'Nenhuma mensagem para o cliente.'
          if (/estoque|indispon/i.test(t)) return 'Essa mensagem fala de estoque, mas o problema é o pagamento.'
          if (!/pagamento/i.test(t)) return 'A mensagem não diz que o pagamento não foi aprovado.'
          if (!NEXT_STEP.test(t)) return 'Diz o motivo, mas não diz o que o cliente deve fazer agora.'
          return null
        },
      },
    ]),
    ok: 'Agora o cliente sabe o que houve e o que fazer.',
  },
]

function Central({ onMistake, onSolved }) {
  const [stage, setStage] = useState(0)
  const [stageDone, setStageDone] = useState(false)
  const st = HUB_STEPS[stage]
  const last = stage === HUB_STEPS.length - 1

  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {HUB_STEPS.map((x, i) => (
          <View key={x.id} style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: i < stage || (i === stage && stageDone) ? C.success : i === stage ? C.orange : C.bgDeep }} />
        ))}
      </View>

      <View style={{ marginTop: 12, backgroundColor: C.card, borderRadius: 16, borderWidth: 2, borderColor: st.tone, padding: 12 }}>
        <Text style={{ color: st.tone, fontWeight: '900', fontSize: 10, letterSpacing: 1 }}>
          DEFEITO {stage + 1} DE {HUB_STEPS.length}
        </Text>
        <Text style={{ color: C.ink, fontWeight: '900', fontSize: 15, marginTop: 2 }}>{st.title}</Text>
        <Text style={{ color: C.successDark, fontWeight: '700', fontSize: 13, marginTop: 6, lineHeight: 19 }}>Esperado: {st.want}</Text>
        <Text style={{ color: C.errorDark, fontWeight: '700', fontSize: 13, marginTop: 2, lineHeight: 19 }}>Ocorreu: {st.got}</Text>
      </View>

      <Fix
        key={st.id}
        title={st.file}
        lines={st.lines}
        options={st.options}
        run={st.run}
        okText={st.ok}
        onMistake={onMistake}
        onSolved={() => (last ? onSolved() : setStageDone(true))}
      />

      {stageDone && !last && (
        <ChunkyButton
          label="PRÓXIMO DEFEITO"
          icon="arrow-forward"
          tone="violet"
          onPress={() => { tap(); setStage((x) => x + 1); setStageDone(false) }}
          style={{ marginTop: 14 }}
        />
      )}
    </View>
  )
}


const MISSIONS = [
  {
    kind: 'promo',
    task: 'Descubra quem tem direito ao desconto e monte a regra certa.',
    coach: [
      {
        target: 'main',
        title: 'Olha essas contas...',
        text: 'Antes de sair distribuindo desconto, confere os pedidos. A loja não imprime dinheiro.'
      }
    ],
    mech: 'Investigação e montagem de regra',
    time: '14h15',
    title: 'O desconto tá de sacanagem',
    who: 'rafa',
    label: 'RAFAELA',
    tone: C.successDark,
    say: 'Pedro levou R$ 30 de desconto sem nem chegar a R$ 200. Eu fiz as contas três vezes. O programa passou vergonha nas três.',
    goals: [
      { icon: 'search', label: 'Achar a\nregra', color: C.success, bg: C.successSoft },
      { icon: 'git-compare', label: 'Comparar\ntotal', color: C.orange, bg: C.orangeSoft },
      { icon: 'pricetag', label: 'Desconto\nse > 200', color: C.violet, bg: C.violetSoft },
    ],
    steps: [
      { icon: 'people', title: 'Investigue os 3 pedidos' },
      { icon: 'git-compare', title: 'Quem passou de R$ 200?', code: 'total > 200' },
      { icon: 'code-slash', title: 'Monte a regra do desconto', code: 'se total > 200 entao' },
    ],
    hints: [
      'Passou de R$ 200? Ganha desconto. Não passou? O preço continua o mesmo. A matemática não negocia.',
      'A condição é total > 200. Se for verdadeira, subtraia R$ 30 do total.'
    ],
    learn: 'A comparação (>, <, ==) resulta em verdadeiro ou falso. O "se" só executa a ação quando a condição é verdadeira.',
    after: 'Pronto. Agora o desconto vai pra quem merece. Pedro vai ter que superar essa perda.'
  },
  {
    kind: 'lab',
    task: 'Preveja as mensagens com estoque 5 e 0. Depois corrija o operador.',
    coach: [
      {
        target: 'main',
        title: 'Confia no teste, não no programa',
        text: 'Com zero unidades no estoque, o cliente deveria ouvir o quê?'
      }
    ],
    mech: 'Laboratório de testes',
    time: '14h32',
    title: 'Schrödinger vende fone agora?',
    who: 'catia',
    label: 'CÁTIA · BAIXA VISÃO',
    tone: C.violet,
    say: 'Na página, o fone tá disponível. Na hora de comprar, ele desaparece. Eu queria um fone, não participar de um experimento científico.',
    goals: [
      { icon: 'cube', label: 'Estoque\n= 0?', color: C.violet, bg: C.violetSoft },
      { icon: 'swap-horizontal', label: 'se /\nsenao', color: C.blue, bg: C.blueSoft },
      { icon: 'flask', label: 'Testar\n5 e 0', color: C.orange, bg: C.orangeSoft },
    ],
    steps: [
      { icon: 'warning', title: 'Página e checkout discordam' },
      { icon: 'git-branch', title: 'Escolha entre dois caminhos', code: 'se ... entao / senao' },
      { icon: 'speedometer', title: 'Teste o limite zero', code: 'estoque > 0' },
    ],
    hints: [
      'Estoque zero significa zero fones. Nenhum. A matemática foi bem direta nessa parte.',
      'A condição precisa ser verdadeira quando existe pelo menos uma unidade: estoque > 0.'
    ],
    learn: 'O se/senao escolhe entre dois caminhos. Testar o limite zero ajuda a encontrar comparações erradas.',
    after: 'Agora a página e o checkout concordam. Não sei se isso é o mínimo ou um evento histórico.'
  },
  {
    kind: 'sim',
    task: 'Teste três combinações de estoque e pagamento. Depois corrija o operador.',
    coach: [
      {
        target: 'main',
        title: 'Vamos testar essa lógica',
        text: 'Mude o estoque e o pagamento. Descubra em quais situações a compra deveria ser aprovada.'
      }
    ],
    mech: 'Simulador de cenários',
    time: '14h51',
    title: 'O dinheiro entrou, mas o bom senso não',
    who: 'marcos',
    label: 'MARCOS · LEITOR DE TELA',
    tone: C.blue,
    say: 'Meu pagamento foi aprovado, tem produto no estoque e a loja recusou a compra. Quem escreveu esse código, o concorrente?',
    goals: [
      { icon: 'cube', label: 'Estoque', color: C.blue, bg: C.blueSoft },
      { icon: 'card', label: 'Pagamento', color: C.success, bg: C.successSoft },
      { icon: 'link', label: 'As duas\n(e)', color: C.violet, bg: C.violetSoft },
    ],
    steps: [
      { icon: 'grid', title: 'Teste três combinações' },
      { icon: 'git-merge', title: 'Só libera com "e"', code: 'estoque > 0 e pago' },
      {
        icon: 'ban',
        title: '"Ou" pode liberar compra errada',
        example: [
          { label: 'e', ok: true },
          { label: 'ou', ok: false }
        ]
      },
    ],
    hints: [
      'Pra liberar a compra, precisa ter estoque E pagamento aprovado. Se uma das duas falhar, não libera.',
      'Use "e": as duas condições precisam ser verdadeiras. Com "ou", basta uma delas ser verdadeira.'
    ],
    learn: 'O operador "e" exige que as duas condições sejam verdadeiras. O "ou" aceita apenas uma e pode liberar compras indevidas.',
    after: 'Compra aprovada! Finalmente uma máquina que entende o conceito de compra. Agora falta ensinar isso pro atendimento.'
  },
  {
    kind: 'hub',
    task: 'Conserte os dois defeitos, um de cada vez. E teste antes de comemorar.',
    coach: [
      {
        target: 'main',
        title: 'Respira e resolve',
        text: 'Leia o defeito, escolha a peça certa e toque em TESTAR. Sem magia, só lógica.'
      }
    ],
    mech: 'Central de incidentes',
    time: '15h18',
    title: 'Tonho abriu o chamado e perdeu a paciência',
    who: 'chefe',
    label: 'TONHO',
    tone: C.orange,
    say: 'Seguinte: o pagamento tá fazendo o que quer e as mensagens de erro parecem escritas por alguém que odeia clientes. Resolve um de cada vez, pelo amor da minha loja.',
    goals: [
      { icon: 'card', label: 'Pagamento', color: C.violet, bg: C.violetSoft },
      { icon: 'chatbubbles', label: 'Mensagem\nclara', color: C.success, bg: C.successSoft },
    ],
    steps: [
      { icon: 'git-merge', title: 'Use "e", não "ou"', code: 'e' },
      { icon: 'chatbox', title: 'Explique o erro e o próximo passo' },
    ],
    hints: [
      'No pagamento, as duas condições precisam ser verdadeiras. Na mensagem, explique o que aconteceu e como resolver.',
      'Não basta dizer "erro". Erro de quê? E a pessoa faz o quê agora? Cliente não tem obrigação de adivinhar.'
    ],
    learn: 'Você juntou comparações, se/senao, operadores lógicos e mensagens claras, testando cada situação.',
    after: 'Funcionou! Eu sabia que contratar alguém que entende de lógica era melhor do que continuar reiniciando o computador. Seu salário ainda está em análise.'
  },
];


/* ------------------------------------------------------------------ */
/*  TELA PRINCIPAL                                                     */
/* ------------------------------------------------------------------ */
export default function Fase3({ onClose, onFinish }) {
  const insets = useSafeAreaInsets()
  const [started, setStarted] = useState(false)
  const [idx, setIdx] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [solved, setSolved] = useState(false)
  const [hintOpen, setHintOpen] = useState(false)
  const [muted, setMuted] = useState(music.isMuted())
 
  useEffect(() => () => { music.stop() }, [])
 
  const finished = idx >= MISSIONS.length
  const m = MISSIONS[Math.min(idx, MISSIONS.length - 1)]
  const coachCtrl = useCoach(String(m.kind) + idx, m.coach)
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
 
  const phaseKey = 'fase3'
  useEffect(() => { if (started && !finished) startMissionTimer(phaseKey) }, [idx, started])

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
    music.stop()
    if (latest.current.done && onFinish) return report()
    onClose && onClose()
  }
  function toggleMute() {
    const nm = !muted
    setMuted(nm)
    music.setMuted(nm)
  }
  function start() {
    tap()
    setStarted(true)
    music.start()
  }
 
  const Body = { promo: Promocao, lab: Laboratorio, sim: Simulador, hub: Central }[m.kind]
 
  return (
    <KeyboardAvoidingView style={{ flex: 1, paddingTop: insets.top, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.topBar}>
        <Pressable onPress={close} style={s.iconBtn} accessibilityRole="button" accessibilityLabel="Fechar fase">
          <Ionicons name="close" size={24} color={C.muted} />
        </Pressable>
        <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
          {MISSIONS.map((_, i) => (
            <View key={i} style={{ flex: 1, height: 14, borderRadius: 8, backgroundColor: i < idx || (i === idx && solved) ? C.success : i === idx && started ? C.orange : C.bgDeep }} />
          ))}
        </View>
        <Pressable onPress={toggleMute} style={s.iconBtn} accessibilityRole="button" accessibilityLabel={muted ? 'Ligar o som' : 'Desligar o som'}>
          <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={22} color={C.muted} />
        </Pressable>
        <View style={s.mistakeChip}>
          <Ionicons name="bug" size={16} color={C.errorDark} />
          <Text style={{ color: C.errorDark, fontWeight: '900', fontSize: 14 }}>{mistakes}</Text>
        </View>
      </View>
 
      {!started ? (
        <Intro onStart={start} insets={insets} />
      ) : finished ? (
        <Result stars={stars} mistakes={mistakes} onDone={() => (onFinish ? report() : close())} insets={insets} />
      ) : (
        <>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: solved ? 20 : 40 }} keyboardShouldPersistTaps="handled" ref={coachCtrl.scrollRef} onScroll={coachCtrl.onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false}>
            <Pop key={`h${idx}`}>
              <View style={s.header}>
                <View style={s.headerBlob} />
                <View style={s.tag}>
                  <Text style={{ color: C.orangeDark, fontWeight: '900', fontSize: 11, letterSpacing: 0.6 }}>
                    FASE 3 · {idx + 1} DE {MISSIONS.length}
                  </Text>
                </View>
                <Text style={s.headerTitle}>{m.title}</Text>
                <Text style={{ color: C.codeIcon, fontWeight: '700', fontSize: 12, marginTop: 6 }}>
                  {m.time} · chamado · {m.mech}
                </Text>
              </View>
            </Pop>
 
            <Pop key={`b${idx}`} delay={120} style={{ marginTop: 16 }}>
              <Bubble who={m.who} label={m.label} tone={m.tone}>
                <Text style={{ color: C.ink, fontSize: 14, fontWeight: '600', lineHeight: 21 }}>{m.say}</Text>
              </Bubble>
            </Pop>
 
            
 
            <GuidePanel key={`g${idx}`} mission={m} onTutorial={coachCtrl.reopen} />

            <View style={{ marginTop: 16 }}>
              <CoachTarget id="main">
                <Body key={idx} onMistake={onMistake} onSolved={onSolved} />
              </CoachTarget>
            </View>
          </ScrollView>
 
          

          {solved && (
            <View style={[s.feedback, { paddingBottom: Math.max(insets.bottom, 12) }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="checkmark-circle" size={26} color={C.successDark} />
                <Text style={{ color: C.successDark, fontWeight: '900', fontSize: 18 }}>Muito bem!</Text>
              </View>
              <Text style={{ color: C.inkSoft, fontWeight: '600', fontSize: 14, lineHeight: 20, marginTop: 4 }}>{m.learn}</Text>
              <Text style={{ color: C.muted, fontWeight: '600', fontSize: 12, lineHeight: 18, marginTop: 6, fontStyle: 'italic' }}>{m.after}</Text>
              <ChunkyButton label={idx + 1 >= MISSIONS.length ? 'CONCLUIR FASE' : 'CONTINUAR'} onPress={next} style={{ marginTop: 12 }} />
            </View>
          )}
        </>
      )}
    
      <CoachOverlay ctrl={coachCtrl} enabled={started && !finished && !solved} />
</KeyboardAvoidingView>
  )
}
 
function Intro({ onStart, insets }) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: Math.max(insets.bottom, 12) + 16 }} showsVerticalScrollIndicator={false}>
      <Pop>
        <View style={s.header}>
          <View style={s.headerBlob} />
          <View style={s.tag}>
            <Text style={{ color: C.orangeDark, fontWeight: '900', fontSize: 11, letterSpacing: 0.6 }}>FASE 3</Text>
          </View>
          <Text style={s.headerTitle}>A loja não pode parar!</Text>
          <Text style={{ color: C.codeIcon, fontWeight: '700', fontSize: 12, marginTop: 6 }}>Decisões: comparar, se/senao, e/ou</Text>
        </View>
      </Pop>

      <Pop delay={120} style={{ marginTop: 16 }}>
        <Bubble who="rafa" label="RAFAELA · 14H07" tone={C.successDark}>
          <Text style={{ color: C.ink, fontSize: 14, fontWeight: '600', lineHeight: 21 }}>
            O sistema decide errado: dá desconto sem merecer, diz que tem produto quando acabou e recusa pagamento aprovado.
          </Text>
        </Bubble>
      </Pop>

      <Pop delay={240} style={{ marginTop: 12 }}>
        <Bubble who="chefe" label="TONHO" tone={C.orange}>
          <Text style={{ color: C.ink, fontSize: 14, fontWeight: '600', lineHeight: 21 }}>
            Antes você consertou as contas. Agora vamos consertar as decisões, testando caso a caso.
          </Text>
        </Bubble>
      </Pop>

      <Pop delay={320}>
        <View style={s.beat}>
          <Ionicons name="git-branch" size={18} color={C.violet} />
          <Text style={{ flex: 1, color: C.inkSoft, lineHeight: 20, fontSize: 13, fontWeight: '600' }}>
            Quatro chamados curtos. Em cada um você escolhe a peça certa e testa.
          </Text>
        </View>
      </Pop>

      <ChunkyButton label="ABRIR O PRIMEIRO CHAMADO" icon="rocket" onPress={onStart} style={{ marginTop: 20 }} />
    </ScrollView>
  )
}

function Result({ stars, mistakes, onDone, insets }) {
  useEffect(() => {
    music.stop()
    sfx?.win?.()
  }, [])
  const learned = [
    ['comparações · se/entao', C.violetSoft, C.violetDark],
    ['se/senao · testes de limite', C.blueSoft, C.blueDark],
    ['operadores lógicos · e', C.pinkSoft, C.pinkDark],
    ['mensagens que orientam', C.orangeSoft, C.orangeDark],
  ]
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: Math.max(insets.bottom, 12) + 16, justifyContent: 'center', flexGrow: 1 }} showsVerticalScrollIndicator={false}>
      <Pop>
        <View style={{ alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[1, 2, 3].map((n) => (
              <Ionicons key={n} name={n <= stars ? 'star' : 'star-outline'} size={n === 2 ? 64 : 48} color={n <= stars ? C.yellow : C.line} style={{ marginTop: n === 2 ? 0 : 14 }} />
            ))}
          </View>
          <Text style={{ fontSize: 28, fontWeight: '900', color: C.ink, marginTop: 14, textAlign: 'center' }}>Fase 3 concluída!</Text>
          <Text style={{ color: C.muted, fontWeight: '700', marginTop: 6, textAlign: 'center' }}>
            {mistakes === 0 ? 'Sem nenhum erro. Tonho está impressionado!' : `${mistakes} ${mistakes === 1 ? 'erro' : 'erros'} no caminho. Aprender é isso!`}
          </Text>
 
          <View style={{ marginTop: 18, alignSelf: 'stretch' }}>
            <Bubble who="chefe" label="TONHO" tone={C.orange}>
              <Text style={{ color: C.ink, fontSize: 14, fontWeight: '600', lineHeight: 21 }}>
                Agora entendi. Um programa não pode simplesmente tomar qualquer decisão. Ele precisa seguir regras que façam sentido para quem está usando.
              </Text>
            </Bubble>
          </View>
 
          <View style={{ marginTop: 18, gap: 8, alignSelf: 'stretch' }}>
            {learned.map(([t, bg, fg]) => (
              <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: bg, borderRadius: 14, padding: 12 }}>
                <Ionicons name="checkmark-circle" size={20} color={fg} />
                <Text style={{ color: fg, fontWeight: '900', fontFamily: MONO, fontSize: 13 }}>{t}</Text>
              </View>
            ))}
          </View>
 
          <View style={s.beat}>
            <Ionicons name="alert-circle" size={18} color={C.violet} />
            <Text style={{ flex: 1, color: C.inkSoft, lineHeight: 20, fontSize: 13, fontWeight: '600' }}>
              Próximo problema: formulários difíceis de preencher, mensagens de erro confusas e telas que não explicam como concluir uma tarefa.
            </Text>
          </View>
        </View>
      </Pop>
      <ChunkyButton label="CONTINUAR" onPress={onDone} style={{ marginTop: 22 }} />
    </ScrollView>
  )
}
 
/* ------------------------------------------------------------------ */
/*  ESTILOS                                                            */
/* ------------------------------------------------------------------ */
const s = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, gap: 8 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  mistakeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 34, borderRadius: 17, backgroundColor: C.errorSoft },
  header: { backgroundColor: C.banner, borderRadius: 26, padding: 18, overflow: 'hidden', borderBottomWidth: 5, borderBottomColor: C.bannerEdge },
  headerBlob: { position: 'absolute', right: -40, top: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: C.bannerBlob },
  tag: { alignSelf: 'flex-start', backgroundColor: C.orangeSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  headerTitle: { color: C.white, fontSize: 24, fontWeight: '900', marginTop: 10, lineHeight: 29, paddingRight: 40 },
  hintBtn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12, paddingHorizontal: 12, minHeight: 34, borderRadius: 12, backgroundColor: C.orangeSoft },
  eyebrow: { color: C.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  beat: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: C.violetSoft, borderRadius: 16, padding: 12, marginTop: 16, alignSelf: 'stretch' },
  chip: { paddingHorizontal: 16, height: 46, borderRadius: 14, justifyContent: 'center', backgroundColor: C.card, borderWidth: 2, borderBottomWidth: 5, borderColor: C.line },
  choice: { backgroundColor: C.card, borderRadius: 16, borderWidth: 2, borderBottomWidth: 5, borderColor: C.line, paddingHorizontal: 14, paddingVertical: 14, minHeight: 54, justifyContent: 'center' },
  shopCard: { marginTop: 16, backgroundColor: C.successSoft, borderRadius: 22, padding: 14, borderBottomWidth: 4, borderBottomColor: C.successLine },
  feedback: { paddingHorizontal: 16, paddingTop: 14, backgroundColor: C.successSoft, borderTopWidth: 2, borderTopColor: C.successLine },
})