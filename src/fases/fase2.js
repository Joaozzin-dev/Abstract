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
import { sfx } from '../lib/sounds'
import { CoachOverlay, useCoach } from '../components/CoachMarks'
import {
  recordError,
  markFixed,
  recordCorrect,
  markActivityToday,
  pickSupport,
  startMissionTimer,
} from './learningMemory'
 
/**
 * FASE 2 — A loja está virando um caos!
 * Capítulo 2 · Variáveis, operações e informações acessíveis
 *
 * 1 Investigar a interface (Cláudia) · 2 Montar a expressão (Marcos)
 * 3 Depurar passo a passo (Ana)       · 4 Programação livre (Tonho)
 *
 * Uso:  <Fase2 onClose={() => ...} onFinish={({ mistakes, stars }) => ...} />
 * Arquivo autônomo: mesma paleta e mesmos componentes visuais da Fase 1.
 */
 
/* ------------------------------------------------------------------ */
/*  PALETA                                                             */
/* ------------------------------------------------------------------ */
const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace'
 
const tap = () => sfx?.tap?.()
const good = () => sfx?.deploy?.()
const bad = () => sfx?.fail?.()
 
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100))
const money = (n) => 'R$ ' + n.toFixed(2).replace('.', ',')
const same = (a, b) => Math.abs(a - b) < 1e-9
 
/* ------------------------------------------------------------------ */
/*  MINI-INTERPRETADOR (expressões e escreval)                         */
/* ------------------------------------------------------------------ */
function evalExpr(src, env) {
  const toks = src.match(/\d+(?:\.\d+)?|[A-Za-z_]\w*|[()+\-*/]|\S/g) || []
  let p = 0
  const fail = (m) => {
    throw new Error(m)
  }
  const peek = () => toks[p]
  function primary() {
    const t = toks[p++]
    if (t === undefined) fail('A expressão está incompleta: falta um valor no final.')
    if (/^\d/.test(t)) return parseFloat(t)
    if (/^[A-Za-z_]/.test(t)) {
      const k = t.toLowerCase()
      if (!(k in env)) fail(`"${t}" não existe neste programa.`)
      if (env[k] === null) fail(`"${t}" ainda não recebeu nenhum valor.`)
      return env[k]
    }
    if (t === '(') {
      const v = add()
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
  try {
    const v = add()
    if (p < toks.length) fail('Faltou um operador (+, -, * ou /) entre os valores.')
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
 
const DECLARED = ['preco', 'quantidade', 'total']
 
/** Executa o corpo do programa da missão 4 para uma quantidade. */
function interpret(body, quantidade) {
  const env = { preco: 299, quantidade, total: null }
  const out = []
  const shown = []
  const lines = body.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('//'))
  if (lines.length === 0) return { error: 'Escreva o programa entre "preco <- 299" e "fim".' }
  for (const raw of lines) {
    const low = raw.toLowerCase()
    const asg = raw.match(/^([A-Za-z_]\w*)\s*<-\s*(.+)$/)
    if (asg) {
      const name = asg[1].toLowerCase()
      if (!DECLARED.includes(name)) return { error: `"${asg[1]}" não foi declarada na área var.` }
      const r = evalExpr(asg[2], env)
      if (r.error) return { error: `Em "${raw}": ${r.error}` }
      env[name] = r.value
      continue
    }
    if (low.startsWith('leia')) {
      return { error: 'Aqui a quantidade já chega pronta do pedido do cliente. Não precisa de leia.' }
    }
    const m = low.match(/^(escreval|escreva)\s*\((.*)\)\s*$/)
    if (!m) return { error: `Não reconheci "${raw}". Use atribuição (<-) ou escreval(...).` }
    const args = splitArgs(raw.slice(raw.indexOf('(') + 1, raw.lastIndexOf(')')))
    let line = ''
    for (const a of args) {
      const t = a.trim()
      if (t === '') continue
      if (/^"[^"]*"$/.test(t)) line += t.slice(1, -1)
      else {
        const r = evalExpr(t, env)
        if (r.error) return { error: `Em "${raw}": ${r.error}` }
        shown.push(r.value)
        line += fmt(r.value)
      }
    }
    out.push(line)
  }
  return { out, shown }
}
 
/* ------------------------------------------------------------------ */
/*  COLORIZADOR DE CÓDIGO                                              */
/* ------------------------------------------------------------------ */
const KW = new Set(['algoritmo', 'var', 'inicio', 'fim', 'leia', 'escreval', 'escreva'])
const TYPES = new Set(['real', 'caractere', 'inteiro'])
 
function tokens(text) {
  return text.match(/"[^"]*"|\/\/.*|<-|\w+|\s+|[^\w\s]/g) || []
}
function colorOf(t) {
  if (t.startsWith('"')) return C.synString
  if (t.startsWith('//')) return C.synComment
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
 
const PEOPLE = {
  chefe: { skin: PERSON_COLORS.chefe.skin, hair: PERSON_COLORS.chefe.hair, bg: C.orangeSoft, shirt: C.ink, tie: true },
  catia: { skin: PERSON_COLORS.catia.skin, hair: PERSON_COLORS.catia.hair, bg: C.violetSoft, shirt: C.violet, glasses: true },
  sarue: { skin: PERSON_COLORS.sarue.skin, hair: PERSON_COLORS.sarue.hair, bg: C.successSoft, shirt: C.success, ears: true },
  marcos: { skin: PERSON_COLORS.marcos.skin, hair: PERSON_COLORS.marcos.hair, bg: C.blueSoft, shirt: C.blue },
  ana: { skin: PERSON_COLORS.ana.skin, hair: PERSON_COLORS.ana.hair, bg: C.pinkSoft, shirt: C.pink },
}
 
function Face({ who = 'chefe', size = 54 }) {
  const s = size
  const p = PEOPLE[who] || PEOPLE.chefe
  return (
    <View
      style={{
        width: s,
        height: s,
        borderRadius: s * 0.32,
        backgroundColor: p.bg,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'flex-end',
      }}
    >
      {p.ears && (
        <>
          <View style={{ position: 'absolute', top: s * 0.06, left: s * 0.12, width: s * 0.24, height: s * 0.24, borderRadius: s * 0.12, backgroundColor: p.hair }} />
          <View style={{ position: 'absolute', top: s * 0.06, right: s * 0.12, width: s * 0.24, height: s * 0.24, borderRadius: s * 0.12, backgroundColor: p.hair }} />
        </>
      )}
      <View
        style={{
          width: s * 0.78,
          height: s * 0.3,
          borderTopLeftRadius: s * 0.4,
          borderTopRightRadius: s * 0.4,
          backgroundColor: p.shirt,
          alignItems: 'center',
        }}
      >
        {p.tie && <View style={{ width: s * 0.1, height: s * 0.22, backgroundColor: C.error, borderRadius: 2 }} />}
      </View>
      <View
        style={{
          position: 'absolute',
          top: s * 0.18,
          width: s * 0.5,
          height: s * 0.5,
          borderRadius: s * 0.25,
          backgroundColor: p.skin,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
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
 
function CodeCard({ title = 'programa.abc', children, style }) {
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
 
/** Tela que acende conforme o jogador acerta. */
function Screen({ title = 'TELA DA LOJA DO TONHO', lines = [], lit, emptyText = 'Tela apagada…', tone }) {
  const edge = tone || C.success
  return (
    <View
      style={{
        marginTop: 14,
        backgroundColor: lit ? C.screenOn : C.screenOff,
        borderRadius: 18,
        padding: 14,
        borderWidth: 3,
        borderColor: lit ? edge : C.codeLine,
        minHeight: 84,
      }}
    >
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
 
function CodeLines({ lines, size = 13, style }) {
  return lines.map((l, i) => <Colored key={i} text={l} size={size} style={[{ lineHeight: 22 }, style]} />)
}
 
/* ------------------------------------------------------------------ */
/*  MISSÃO 1 — A ETIQUETA QUE MUDA DE LUGAR (investigar a interface)   */
/* ------------------------------------------------------------------ */
const ET_TARGETS = [
  { key: 'nome', label: 'Fone Bluetooth', bold: true },
  { key: 'preco', label: 'R$ 299,90', bold: false },
]
const ET_VARS = ['nome', 'preco', 'estoque']
const ET_WHY = {
  nome: {
    preco: 'preco guarda um número. "Fone Bluetooth" é texto.',
    estoque: 'estoque conta quantas unidades existem. Aqui aparece o nome do produto.',
  },
  preco: {
    nome: 'nome guarda o texto do produto. Esse valor é um número com vírgula.',
    estoque: 'estoque conta unidades em prateleira. O valor em reais é outro dado.',
  },
}
const ET_OUT = [
  {
    code: 'escreval(nome)\nescreval(preco)',
    lines: ['Fone Bluetooth', '299.9'],
    ok: false,
    why: 'Nome e preço saem em linhas separadas, e o 299.9 aparece sozinho, sem dizer que é preço. Com a tela ampliada, um sai da vista quando o outro entra. Junte tudo numa linha só.',
  },
  {
    code: 'escreval(nome, ": R$ ", preco)',
    lines: ['Fone Bluetooth: R$ 299.9'],
    ok: true,
  },
  {
    code: 'escreval("nome", ": R$ ", "preco")',
    lines: ['nome: R$ preco'],
    ok: false,
    why: 'Com aspas o programa escreve as palavras, não os valores guardados. Para mostrar o conteúdo da variável, tire as aspas.',
  },
  {
    code: 'escreval(preco, nome)',
    lines: ['299.9Fone Bluetooth'],
    ok: false,
    why: 'O preço aparece grudado no nome, sem separação e sem dizer o que é cada coisa. Falta um texto no meio para ligar um ao outro.',
  },
]
 
function Etiqueta({ onMistake, onSolved }) {
  const [matched, setMatched] = useState({ nome: false, preco: false })
  const [sel, setSel] = useState('nome')
  const [chosen, setChosen] = useState(null)
  const [msg, setMsg] = useState(null)
  const [done, setDone] = useState(false)
  const [shake, runShake] = useShake()
  const mapped = matched.nome && matched.preco
 
  function pickVar(v) {
    tap()
    const key = sel && !matched[sel] ? sel : ET_TARGETS.find((t) => !matched[t.key])?.key
    if (!key) return
    if (key === v) {
      good()
      const next = { ...matched, [key]: true }
      setMatched(next)
      setMsg(null)
      const nextKey = ET_TARGETS.find((t) => !next[t.key])?.key
      setSel(nextKey || null)
    } else {
      bad()
      runShake()
      setMsg(ET_WHY[key]?.[v] || 'Esse dado não vem dessa variável.')
      onMistake()
    }
  }
 
  function pickOut(i) {
    if (done) return
    tap()
    const o = ET_OUT[i]
    setChosen(i)
    if (o.ok) {
      setMsg(null)
      setDone(true)
      onSolved()
    } else {
      bad()
      runShake()
      setMsg(o.why)
      onMistake()
    }
  }
 
  const codeLines = [
    'algoritmo "etiqueta"',
    'var',
    '   nome: caractere',
    '   preco: real',
    '   estoque: inteiro',
    'inicio',
    '   nome <- "Fone Bluetooth"',
    '   preco <- 299.9',
    '   estoque <- 12',
  ]
  const shownOut = chosen !== null ? ET_OUT[chosen].code.split('\n').map((l) => '   ' + l) : ['   ?']
 
  return (
    <Animated.View style={shake}>
      <Text style={[s.eyebrow, { marginBottom: 8 }]}>A PRATELEIRA, COMO A CLIENTE VÊ</Text>
      <View style={s.shopCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Headphones size={64} />
          <View style={{ flex: 1, gap: 8 }}>
            {ET_TARGETS.map((t) => {
              const ok = matched[t.key]
              const active = sel === t.key && !ok
              return (
                <Pressable
                  key={t.key}
                  onPress={() => {
                    tap()
                    if (!ok) setSel(t.key)
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${t.label}. ${ok ? 'Ligado à variável ' + t.key : 'Toque para descobrir de onde vem'}`}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderStyle: ok ? 'solid' : 'dashed',
                    borderColor: ok ? C.success : active ? C.blue : C.orange,
                    backgroundColor: ok ? C.card : active ? C.blueSoft : C.glassFill,
                  }}
                >
                  <Text style={{ fontWeight: t.bold ? '900' : '800', color: t.bold ? C.ink : C.successDark, fontSize: t.bold ? 15 : 17 }}>
                    {t.label}
                  </Text>
                  <Text style={{ fontFamily: MONO, fontSize: 11, fontWeight: '800', color: ok ? C.successDark : C.muted, marginTop: 2 }}>
                    {ok ? `← ${t.key}` : 'de onde vem isso?'}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>
      </View>
 
      {!mapped && (
        <>
          <Text style={[s.eyebrow, { marginTop: 16, marginBottom: 8 }]}>LIGUE O CAMPO À VARIÁVEL DO PROGRAMA</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {ET_VARS.map((v) => (
              <Pressable key={v} onPress={() => pickVar(v)} accessibilityRole="button" accessibilityLabel={`Variável ${v}`} style={s.chip}>
                <Text style={{ fontFamily: MONO, fontWeight: '800', fontSize: 15, color: C.ink }}>{v}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
 
      {mapped && (
        <>
          <Msg tone="green" text="Os dados estão certos no painel. O problema é como a saída monta a informação. Escolha o comando que deixa nome e preço juntos e claros." />
          <Text style={[s.eyebrow, { marginTop: 16, marginBottom: 8 }]}>ESCOLHA O COMANDO DE SAÍDA</Text>
          <View style={{ gap: 10 }}>
            {ET_OUT.map((o, i) => (
              <Pressable
                key={i}
                onPress={() => pickOut(i)}
                disabled={done}
                accessibilityRole="button"
                accessibilityLabel={`Opção: ${o.code.replace('\n', ' e depois ')}`}
                style={{
                  backgroundColor: C.code,
                  borderRadius: 14,
                  padding: 12,
                  borderWidth: 2,
                  borderColor: chosen === i ? (o.ok ? C.success : C.error) : C.codeLine,
                  borderBottomWidth: 4,
                }}
              >
                {o.code.split('\n').map((l, k) => (
                  <Colored key={k} text={l} size={13} />
                ))}
              </Pressable>
            ))}
          </View>
        </>
      )}
 
      <CodeCard title="etiqueta.abc" style={{ marginTop: 16 }}>
        <View style={{ padding: 12 }}>
          <CodeLines lines={[...codeLines, ...(mapped ? shownOut : ['   ...']), 'fim']} />
        </View>
      </CodeCard>
 
      <Screen
        title="TELA DO CLIENTE (AMPLIADA)"
        lit={mapped && chosen !== null}
        lines={chosen !== null ? ET_OUT[chosen].lines : []}
        emptyText={mapped ? 'Toque numa opção para ver a prévia.' : 'Ligue os dois campos às variáveis.'}
        tone={chosen !== null && !ET_OUT[chosen].ok ? C.error : C.success}
      />
 
      {msg ? <Msg tone={mapped ? 'red' : 'red'} text={msg} /> : null}
    </Animated.View>
  )
}
 
/* ------------------------------------------------------------------ */
/*  MISSÃO 2 — TRÊS FONES, UMA CONTA ERRADA (quebra-cabeça)            */
/* ------------------------------------------------------------------ */
const CART_ENV = { preco: 299, quantidade: 3 }
const CART_PIECES = ['preco', 'quantidade', '3', '299', '*', '+', '-', '/']
 
function Carrinho({ onMistake, onSolved }) {
  const [toks, setToks] = useState([])
  const [msg, setMsg] = useState(null)
  const [done, setDone] = useState(false)
  const [shake, runShake] = useShake()
 
  const isOp = (t) => ['*', '+', '-', '/'].includes(t)
 
  function add(t) {
    if (done) return
    tap()
    setMsg(null)
    setToks((x) => [...x, t])
  }
 
  function check() {
    if (toks.length === 0) {
      setMsg('Monte a expressão com as peças do balcão antes de calcular.')
      return
    }
    const r = evalExpr(toks.join(' '), CART_ENV)
    const shown = toks.map((t) => (CART_ENV[t] !== undefined ? CART_ENV[t] : t)).join(' ')
    let err = null
    if (r.error) err = `${r.error} Seu cálculo: ${shown}`
    else if (!same(r.value, 897)) err = `Seu cálculo: ${shown} = ${fmt(r.value)}. Não é o total de três fones. O que une preço e quantidade?`
    else if (!(toks.includes('preco') && toks.includes('quantidade'))) {
      err = 'Deu 897, mas só para estas três unidades. Use as variáveis preco e quantidade para o cálculo valer em qualquer pedido.'
    }
    if (err) {
      bad()
      runShake()
      setMsg(err)
      onMistake()
      return
    }
    setMsg(null)
    setDone(true)
    onSolved()
  }
 
  return (
    <Animated.View style={shake}>
      <CodeCard title="carrinho.abc">
        <View style={{ padding: 12 }}>
          <CodeLines
            lines={[
              'algoritmo "carrinho"',
              'var',
              '   preco: real',
              '   quantidade: inteiro',
              '   total: real',
              'inicio',
              '   preco <- 299',
              '   quantidade <- 3',
            ]}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginVertical: 2 }}>
            <Colored text="   total <- " size={13} />
            <View
              style={{
                minWidth: 120,
                minHeight: 32,
                paddingHorizontal: 10,
                borderRadius: 10,
                borderWidth: 2,
                borderStyle: 'dashed',
                borderColor: done ? C.success : C.orange,
                backgroundColor: done ? C.codeOk : C.codeRow,
                justifyContent: 'center',
              }}
            >
              {toks.length ? <Colored text={toks.join(' ')} size={14} /> : <Text style={{ color: C.codeMuted, fontSize: 12 }}>monte aqui</Text>}
            </View>
          </View>
          <CodeLines lines={['   escreval(quantidade, " fones: R$ ", total)', 'fim']} />
        </View>
      </CodeCard>
 
      {!done && (
        <>
          <Text style={[s.eyebrow, { marginTop: 16, marginBottom: 8 }]}>BALCÃO VIRTUAL · TOQUE NAS PEÇAS</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {CART_PIECES.map((p) => (
              <Pressable
                key={p}
                onPress={() => add(p)}
                accessibilityRole="button"
                accessibilityLabel={`Peça ${p}`}
                style={[s.chip, isOp(p) && { backgroundColor: C.orangeSoft, borderColor: C.orangeLine }]}
              >
                <Text style={{ fontFamily: MONO, fontWeight: '800', fontSize: 16, color: isOp(p) ? C.orangeDark : C.ink }}>{p}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <Pressable
              onPress={() => {
                tap()
                setToks((x) => x.slice(0, -1))
              }}
              accessibilityRole="button"
              accessibilityLabel="Apagar última peça"
              style={s.smallBtn}
            >
              <Ionicons name="backspace" size={16} color={C.muted} />
              <Text style={{ fontWeight: '800', color: C.muted }}>apagar</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                tap()
                setToks([])
                setMsg(null)
              }}
              accessibilityRole="button"
              accessibilityLabel="Limpar expressão"
              style={[s.smallBtn, { backgroundColor: C.errorSoft }]}
            >
              <Text style={{ fontWeight: '800', color: C.errorDark }}>limpar</Text>
            </Pressable>
          </View>
        </>
      )}
 
      <View style={s.shopCard}>
        <Text style={s.eyebrow}>RESUMO DA COMPRA (LEITOR DE TELA)</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 }}>
          <Headphones size={56} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '900', color: C.ink, fontSize: 15 }}>Fone Bluetooth</Text>
            <Text style={{ fontWeight: '800', color: done ? C.successDark : C.errorDark, fontSize: 17, marginTop: 4 }}>
              {done ? '3 unidades · ' + money(897) : money(299) + ' (só o preço de um)'}
            </Text>
          </View>
        </View>
      </View>
 
      {msg ? <Msg tone="red" text={msg} /> : null}
      {!done && <ChunkyButton label="CALCULAR" icon="calculator" onPress={check} style={{ marginTop: 16 }} />}
    </Animated.View>
  )
}
 
/* ------------------------------------------------------------------ */
/*  MISSÃO 3 — O DESCONTO FANTASMA (depuração passo a passo)           */
/* ------------------------------------------------------------------ */
const DBG_LINES = [
  { id: 1, text: 'algoritmo "desconto"', why: 'Só dá nome ao programa. Aqui nenhum valor existe ainda.' },
  { id: 2, text: 'var', why: 'Só abre a área das variáveis.' },
  { id: 3, text: '   preco, desconto, total: real', why: 'Cria as caixinhas, ainda vazias. O erro não nasce aqui.' },
  { id: 4, text: 'inicio', why: 'Marca o começo. Nada acontece com os valores.' },
  { id: 5, text: '   preco <- 250', why: 'Guarda 250 em preco. Está certo: é o preço original.' },
  { id: 6, text: '   desconto <- 30', why: 'Guarda o desconto de 30. Também está certo.' },
  { id: 7, text: '   total <- preco - desconto', why: 'Esse cálculo está certo: total vale 220. Olhe quem usa esse valor depois.' },
  { id: 8, text: '   escreval("Resumo: R$ ", preco)', culprit: true },
  { id: 9, text: '   escreval("Comprovante: R$ ", total)', why: 'Mostra total (220), igual ao comprovante. Este lado está certo.' },
  { id: 10, text: 'fim', why: 'Só encerra o programa.' },
]
const DBG_EXEC = [5, 6, 7, 8, 9]
const DBG_FIX = [
  { code: 'escreval("Resumo: R$ ", total)', ok: true },
  { code: 'escreval("Resumo: R$ ", 220)', why: 'Funciona só neste pedido. Com outro desconto, o resumo erra de novo. Use a variável que guarda o valor atualizado.' },
  { code: 'escreval("Resumo: R$ ", desconto)', why: 'Isso mostraria 30, que é o desconto, não o valor a pagar.' },
  { code: 'escreval("Resumo: R$ ", preco)', why: 'É exatamente o que está lá agora, e o que mostra 250.' },
]
 
function Depurar({ onMistake, onSolved }) {
  const [step, setStep] = useState(0)
  const [phase, setPhase] = useState('trace') // trace | find | fix | done
  const [msg, setMsg] = useState(null)
  const [wrongId, setWrongId] = useState(null)
  const [fixed, setFixed] = useState(false)
  const [shake, runShake] = useShake()
 
  const vals = {
    preco: step >= 1 ? 250 : null,
    desconto: step >= 2 ? 30 : null,
    total: step >= 3 ? 220 : null,
  }
  const out = []
  if (step >= 4) out.push('Resumo: R$ ' + (fixed ? 220 : 250))
  if (step >= 5) out.push('Comprovante: R$ 220')
  const lastRan = step > 0 ? DBG_EXEC[step - 1] : null
  const nextId = step < DBG_EXEC.length ? DBG_EXEC[step] : null
 
  function advance() {
    tap()
    const n = step + 1
    setStep(n)
    if (n >= DBG_EXEC.length) setPhase('find')
  }
 
  function pressLine(l) {
    if (phase !== 'find') return
    tap()
    if (l.culprit) {
      good()
      setPhase('fix')
      setMsg(null)
      setWrongId(null)
    } else {
      bad()
      runShake()
      setWrongId(l.id)
      setMsg(l.why)
      onMistake()
    }
  }
 
  function pickFix(o) {
    tap()
    if (o.ok) {
      setFixed(true)
      setPhase('done')
      setMsg(null)
      onSolved()
    } else {
      bad()
      runShake()
      setMsg(o.why)
      onMistake()
    }
  }
 
  return (
    <Animated.View style={shake}>
      <Text style={[s.eyebrow, { marginBottom: 8 }]}>O QUE ANA VIU</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={[s.receipt, { borderColor: C.errorLine }]}>
          <Text style={s.eyebrow}>RESUMO</Text>
          <Text style={{ fontSize: 22, fontWeight: '900', color: fixed ? C.successDark : C.errorDark, marginTop: 4 }}>
            R$ {fixed ? '220,00' : '250,00'}
          </Text>
        </View>
        <View style={[s.receipt, { borderColor: C.successLine }]}>
          <Text style={s.eyebrow}>COMPROVANTE</Text>
          <Text style={{ fontSize: 22, fontWeight: '900', color: C.successDark, marginTop: 4 }}>R$ 220,00</Text>
        </View>
      </View>
 
      <Text style={[s.eyebrow, { marginTop: 16, marginBottom: 8 }]}>
        {phase === 'trace' ? 'EXECUTE O PROGRAMA UMA LINHA POR VEZ' : phase === 'find' ? 'TOQUE NA LINHA QUE FAZ O RESUMO ERRAR' : phase === 'fix' ? 'ESCOLHA A CORREÇÃO DA LINHA 8' : 'PROGRAMA CORRIGIDO'}
      </Text>
      <CodeCard title="desconto.abc">
        <View style={{ paddingVertical: 8 }}>
          {DBG_LINES.map((l) => {
            const isNext = nextId === l.id && phase === 'trace'
            const isRan = lastRan === l.id && phase === 'trace'
            const isCulprit = l.culprit && phase === 'fix'
            const isOkFix = l.culprit && phase === 'done'
            const isWrong = wrongId === l.id && phase === 'find'
            const text = l.culprit && fixed ? '   escreval("Resumo: R$ ", total)' : l.text
            return (
              <Pressable
                key={l.id}
                onPress={() => pressLine(l)}
                disabled={phase !== 'find'}
                accessibilityRole="button"
                accessibilityLabel={`Linha ${l.id}: ${text.trim()}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  minHeight: 38,
                  marginHorizontal: 8,
                  paddingHorizontal: 8,
                  borderRadius: 10,
                  backgroundColor: isOkFix ? C.codeOk : isCulprit || isWrong ? C.codeBad : isRan ? C.codeRan : 'transparent',
                  borderWidth: isOkFix || isCulprit || isWrong || isNext || isRan ? 2 : 0,
                  borderColor: isOkFix ? C.success : isCulprit || isWrong ? C.error : isNext ? C.orange : C.blue,
                }}
              >
                <Text style={{ width: 22, color: C.codeDim, fontFamily: MONO, fontSize: 11 }}>{l.id}</Text>
                <View style={{ flex: 1 }}>
                  <Colored text={text} size={13} />
                </View>
                {isNext ? <Ionicons name="play" size={14} color={C.orange} /> : null}
              </Pressable>
            )
          })}
        </View>
      </CodeCard>
 
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        {['preco', 'desconto', 'total'].map((k) => (
          <View key={k} style={s.varBox}>
            <Text style={{ fontFamily: MONO, fontSize: 11, fontWeight: '800', color: C.muted }}>{k}</Text>
            <Text style={{ fontFamily: MONO, fontSize: 18, fontWeight: '900', color: vals[k] === null ? C.line : C.ink, marginTop: 2 }}>
              {vals[k] === null ? '—' : vals[k]}
            </Text>
          </View>
        ))}
      </View>
 
      <Screen title="SAÍDA DO PROGRAMA" lit={out.length > 0} lines={out} emptyText="Execute as linhas para ver a saída." tone={fixed ? C.success : C.orange} />
 
      {phase === 'trace' && (
        <ChunkyButton label="EXECUTAR PRÓXIMA LINHA" icon="play-skip-forward" tone="violet" onPress={advance} style={{ marginTop: 16 }} />
      )}
 
      {phase === 'fix' && (
        <View style={{ marginTop: 14, gap: 10 }}>
          {DBG_FIX.map((o) => (
            <Pressable
              key={o.code}
              onPress={() => pickFix(o)}
              accessibilityRole="button"
              accessibilityLabel={`Trocar por ${o.code}`}
              style={{ backgroundColor: C.code, borderRadius: 14, padding: 12, borderWidth: 2, borderBottomWidth: 4, borderColor: C.codeLine }}
            >
              <Colored text={o.code} size={13} />
            </Pressable>
          ))}
        </View>
      )}
 
      {msg ? <Msg tone="orange" text={msg} /> : null}
      {phase === 'find' && !msg && (
        <Msg tone="orange" text="Compare: o comprovante está certo (220) e o resumo mostra 250. Qual linha escreve o resumo?" />
      )}
      {phase === 'done' && <Msg tone="green" text="Agora resumo e comprovante mostram R$ 220. O erro era mostrar preco, que nunca muda, em vez de total." />}
    </Animated.View>
  )
}
 
/* ------------------------------------------------------------------ */
/*  MISSÃO 4 — A LOJA NÃO PODE FECHAR ASSIM (programação livre)        */
/* ------------------------------------------------------------------ */
const FREE_CASES = [1, 3, 5]
const FREE_START = '   total <- preco + quantidade\n   escreval("Preço: R$ ", preco)\n   escreval("Total: R$ ", total)'
 
function Livre({ onMistake, onSolved }) {
  const [body, setBody] = useState(FREE_START)
  const [msg, setMsg] = useState(null)
  const [results, setResults] = useState([])
  const [done, setDone] = useState(false)
  const [shake, runShake] = useShake()
 
  function run() {
    tap()
    const rs = []
    let err = null
    for (const q of FREE_CASES) {
      const r = interpret(body, q)
      if (r.error) {
        err = r.error
        break
      }
      const exp = 299 * q
      let problem = null
      if (!r.shown.some((v) => same(v, q))) problem = `Com ${q} ${q === 1 ? 'fone' : 'fones'}, o cliente precisa ouvir a quantidade, e seu programa não a mostrou.`
      else if (!r.shown.some((v) => same(v, 299))) problem = 'Falta mostrar o preço de cada fone.'
      else if (!r.shown.some((v) => same(v, exp))) problem = `Com ${q} ${q === 1 ? 'fone' : 'fones'}, o total certo seria ${exp}, mas o programa não mostrou esse valor.`
      rs.push({ q, out: r.out, ok: !problem })
      if (problem) {
        err = problem
        break
      }
    }
    setResults(rs)
    if (err) {
      bad()
      runShake()
      setMsg(err)
      onMistake()
      return
    }
    setMsg(null)
    setDone(true)
    onSolved()
  }
 
  return (
    <Animated.View style={shake}>
      <CodeCard title="resumo.abc">
        <View style={{ padding: 12 }}>
          <CodeLines
            lines={[
              'algoritmo "resumo"',
              'var',
              '   preco: real',
              '   quantidade: inteiro',
              '   total: real',
              'inicio',
              '   preco <- 299',
              '   // quantidade vem do pedido do cliente',
            ]}
          />
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
              value={body}
              onChangeText={(t) => {
                setBody(t)
                setMsg(null)
              }}
              editable={!done}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Editor do programa"
              selectionColor={C.success}
              style={{ fontFamily: MONO, fontSize: 14, color: C.codeText, minHeight: 110, paddingHorizontal: 12, paddingVertical: 10, textAlignVertical: 'top' }}
            />
          </View>
          <Colored text="fim" size={13} style={{ lineHeight: 22 }} />
        </View>
      </CodeCard>
 
      <Text style={[s.eyebrow, { marginTop: 14, marginBottom: 8 }]}>TESTES COM 1, 3 E 5 FONES</Text>
      <View style={{ gap: 8 }}>
        {FREE_CASES.map((q) => {
          const r = results.find((x) => x.q === q)
          return (
            <View
              key={q}
              style={{
                backgroundColor: r ? (r.ok ? C.successSoft : C.errorSoft) : C.card,
                borderRadius: 14,
                borderWidth: 2,
                borderColor: r ? (r.ok ? C.successLine : C.errorLine) : C.line,
                padding: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons
                  name={r ? (r.ok ? 'checkmark-circle' : 'close-circle') : 'ellipse-outline'}
                  size={18}
                  color={r ? (r.ok ? C.successDark : C.errorDark) : C.muted}
                />
                <Text style={{ fontWeight: '900', color: C.ink, fontSize: 13 }}>
                  {q} {q === 1 ? 'fone' : 'fones'}
                </Text>
              </View>
              {r ? (
                <Text style={{ fontFamily: MONO, fontSize: 12, color: C.inkSoft, marginTop: 4, lineHeight: 18 }}>{r.out.join('\n') || '(sem saída)'}</Text>
              ) : null}
            </View>
          )
        })}
      </View>
 
      {msg ? <Msg tone="red" text={msg} /> : null}
      {done && <Msg tone="green" text="Passou nos três testes. Quantidade, preço e total saem juntos, com qualquer número de fones." />}
      {!done && <ChunkyButton label="EXECUTAR TESTES" icon="play" onPress={run} style={{ marginTop: 16 }} />}
    </Animated.View>
  )
}
 

const MISSIONS = [
  {
    kind: 'label',

    coach: [
      { title: 'Descubra de onde vêm o nome e o preço', cx: 0.5, cy: 0.42, size: 90 },
      { title: 'Junte tudo numa frase só', cx: 0.5, cy: 0.58, size: 90 }
    ],
    mech: 'Investigação da interface',
    time: '14h41',
    title: 'O nome foi pra um lado, o preço pro outro',
    who: 'catia',
    label: 'CLÁUDIA',
    tone: C.violet,
    say: 'Ampliei a tela pra conseguir ler o produto. O nome ficou aqui e o preço foi passear em outro canto. Eu comprei um fone ou uma caça ao tesouro?',
    hint: 'O nome e o preço já estão guardados em variáveis. Descubra como mostrar os dois juntos, na mesma frase, sem obrigar Cláudia a procurar o resto da informação pela tela.',

    goals: [
      { icon: 'pricetag', label: 'Nome +\npreço', color: C.violet, bg: C.violetSoft },
      { icon: 'link', label: 'Uma\nlinha', color: C.blue, bg: C.blueSoft },
      { icon: 'eye', label: 'Leitura\nmais fácil', color: C.success, bg: C.successSoft }
    ],
    steps: [
      { icon: 'cube', title: 'As informações já existem', code: 'nome  preco' },
      { icon: 'chatbubble', title: 'Junte tudo na saída', code: 'escreval(nome, " — ", preco)' },
      { icon: 'resize', title: 'Teste com a tela ampliada', code: null }
    ],
    learn: 'Variáveis guardam dados, como nome e preço. A saída pode combinar texto e variáveis numa frase clara, facilitando a leitura e a navegação.',
    after: 'Cláudia finalmente encontrou o preço sem precisar fazer uma expedição pela tela. Agora ela quer saber quanto vai pagar de verdade antes de fechar o pedido.'
  },
  {
    kind: 'cart',

    coach: [
      { title: 'Multiplique o preço pela quantidade', cx: 0.5, cy: 0.5, size: 90 },
      { title: 'Mostre quanto vai custar tudo', cx: 0.5, cy: 0.7, size: 80 }
    ],
    mech: 'Quebra-cabeça de programação',
    time: '15h03',
    title: 'Três fones e uma calculadora chorando',
    who: 'marcos',
    label: 'MARCOS',
    tone: C.blue,
    say: 'O leitor anunciou R$ 299. Beleza. Só que eu pedi três fones, não um. A loja acha que os outros dois vêm de brinde?',
    hint: 'Você já tem o preço de uma unidade e a quantidade comprada. Multiplique os dois valores, guarde o resultado e mostre o total no resumo.',

    goals: [
      { icon: 'calculator', label: 'Preço ×\nquantidade', color: C.blue, bg: C.blueSoft },
      { icon: 'save', label: 'Guardar\no total', color: C.orange, bg: C.orangeSoft },
      { icon: 'volume-high', label: 'Anunciar\no total', color: C.violet, bg: C.violetSoft }
    ],
    steps: [
      {
        icon: 'close',
        title: 'O preço de um não paga três',
        example: [
          { label: 'R$ 299', ok: false },
          { label: 'R$ 897', ok: true }
        ]
      },
      { icon: 'calculator', title: 'Faça a conta completa', code: 'total <- preco * quantidade' },
      { icon: 'megaphone', title: 'Mostre o resultado no resumo', code: 'escreval(total)' }
    ],
    learn: 'A atribuição guarda o resultado de uma expressão em uma variável. Operadores aritméticos, como +, -, * e /, permitem calcular valores a partir dos dados.',
    after: 'Marcos conferiu a conta e, por milagre, ela bateu. Só tem um detalhe: em alguns pedidos, a tela mostra um valor e o leitor de tela anuncia outro. A promoção ganhou vida própria.'
  },
  {
    kind: 'debug',

    coach: [
      { title: 'Siga o valor linha por linha', cx: 0.5, cy: 0.48, size: 100 }
    ],
    mech: 'Investigação e depuração',
    time: '15h26',
    title: 'O desconto entrou, mas o total nem viu',
    who: 'ana',
    label: 'ANA',
    tone: C.pinkDark,
    say: 'Meu pedido deu R$ 250. Ganhei R$ 30 de desconto. O comprovante diz R$ 220, mas o resumo insiste nos R$ 250. Qual dos dois eu pago? Porque pagar a mais eu não vou.',
    hint: 'Acompanhe os valores depois de cada linha. O desconto foi calculado, mas alguma variável continuou guardando o valor antigo.',

    goals: [
      { icon: 'list', label: 'Seguir\nas linhas', color: C.pink, bg: C.pinkSoft },
      { icon: 'cube', label: 'Observar\nos valores', color: C.violet, bg: C.violetSoft },
      { icon: 'create', label: 'Corrigir\no total', color: C.orange, bg: C.orangeSoft }
    ],
    steps: [
      { icon: 'play-forward', title: 'Execute o código passo a passo' },
      { icon: 'eye', title: 'Encontre a variável que ficou desatualizada' },
      { icon: 'create', title: 'Atualize o total após o desconto', code: 'total <- total - desconto' }
    ],
    learn: 'Depurar é acompanhar a execução e observar como os valores mudam. Uma variável só recebe um novo valor quando o programa faz outra atribuição.',
    after: 'Agora o resumo e o comprovante concordam. Ana paga o valor certo e Tonho descobre que "mas aqui funcionou" não é exatamente um plano de testes.'
  },
  {
    kind: 'free',

    coach: [
      { title: 'Resolva tudo no editor', cx: 0.5, cy: 0.45, size: 100 },
      { title: 'Teste três quantidades diferentes', cx: 0.5, cy: 0.8, size: 80 }
    ],
    mech: 'Programação livre',
    time: '16h12',
    title: 'Se eu abrir a loja assim, dá processo',
    who: 'chefe',
    label: 'TONHO',
    tone: C.orange,
    say: 'Preciso do resumo completo: quantidade, preço por unidade e total. O cliente tem que conseguir conferir o pedido sozinho. Não vou contratar alguém só pra ficar fazendo conta no balcão.',
    hint: 'Tem dois problemas: a conta não considera corretamente a quantidade e falta informação na saída. Corrija os dois e teste com quantidades diferentes.',

    goals: [
      { icon: 'calculator', label: 'Conta\ncorreta', color: C.blue, bg: C.blueSoft },
      { icon: 'tv', label: 'Resumo\ncompleto', color: C.violet, bg: C.violetSoft },
      { icon: 'checkmark-done', label: '3 testes', color: C.success, bg: C.successSoft }
    ],
    steps: [
      { icon: 'bug', title: 'Encontre o erro na conta e na saída' },
      { icon: 'calculator', title: 'Calcule o total pela quantidade', code: 'total <- preco * quantidade' },
      { icon: 'tv', title: 'Mostre quantidade, preço e total' }
    ],
    learn: 'Você combinou variáveis, operações, atribuição e saída de dados. Testar diferentes quantidades ajuda a encontrar erros que passam despercebidos quando só um exemplo é usado.',
    after: 'O resumo funciona, os valores batem e o cliente consegue conferir tudo sem pedir socorro no balcão. Tonho chama isso de milagre. Você pode chamar de programação.'
  },
];

/* ------------------------------------------------------------------ */
/*  TELA PRINCIPAL                                                     */
/* ------------------------------------------------------------------ */
export default function Fase2({ onClose, onFinish }) {
  const insets = useSafeAreaInsets()
  const [started, setStarted] = useState(false)
  const [idx, setIdx] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [solved, setSolved] = useState(false)
  const [hintOpen, setHintOpen] = useState(false)
 
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
 
  const phaseKey = 'fase2'
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
    if (latest.current.done && onFinish) return report()
    onClose && onClose()
  }
 
  const Body = { label: Etiqueta, cart: Carrinho, debug: Depurar, free: Livre }[m.kind]
 
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, paddingTop: insets.top, backgroundColor: C.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
                backgroundColor: i < idx || (i === idx && solved) ? C.success : i === idx && started ? C.orange : C.bgDeep,
              }}
            />
          ))}
        </View>
        <View style={s.mistakeChip}>
          <Ionicons name="bug" size={16} color={C.errorDark} />
          <Text style={{ color: C.errorDark, fontWeight: '900', fontSize: 14 }}>{mistakes}</Text>
        </View>
      </View>
 
      {!started ? (
        <Intro onStart={() => { tap(); setStarted(true) }} insets={insets} />
      ) : finished ? (
        <Result stars={stars} mistakes={mistakes} onDone={() => (onFinish ? report() : close())} insets={insets} />
      ) : (
        <>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: solved ? 20 : 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Pop key={`h${idx}`}>
              <View style={s.header}>
                <View style={s.headerBlob} />
                <View style={s.tag}>
                  <Text style={{ color: C.orangeDark, fontWeight: '900', fontSize: 11, letterSpacing: 0.6 }}>
                    FASE 2 · {idx + 1} DE {MISSIONS.length}
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
 
            
 
            <View style={{ marginTop: 16 }}>
              <Body key={idx} onMistake={onMistake} onSolved={onSolved} />
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
              <ChunkyButton
                label={idx + 1 >= MISSIONS.length ? 'CONCLUIR FASE' : 'CONTINUAR'}
                onPress={next}
                style={{ marginTop: 12 }}
              />
            </View>
          )}
        </>
      )}
    
      {!solved && (
        <CoachOverlay
          visible={coachCtrl.visible && idx < 2}
          marks={coachCtrl.marks}
          onSkip={coachCtrl.skip}
          onDone={coachCtrl.done}
        />
      )}
</KeyboardAvoidingView>
  )
}
 
function Intro({ onStart, insets }) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: Math.max(insets.bottom, 12) + 16 }}
      showsVerticalScrollIndicator={false}
    >
      <Pop>
        <View style={s.header}>
          <View style={s.headerBlob} />
          <View style={s.tag}>
            <Text style={{ color: C.orangeDark, fontWeight: '900', fontSize: 11, letterSpacing: 0.6 }}>FASE 2</Text>
          </View>
          <Text style={s.headerTitle}>A loja está virando um caos!</Text>
          <Text style={{ color: C.codeIcon, fontWeight: '700', fontSize: 12, marginTop: 6 }}>
            Variáveis, operações e informações acessíveis
          </Text>
        </View>
      </Pop>
 
      <Pop delay={120} style={{ marginTop: 16 }}>
        <View style={{ backgroundColor: C.card, borderRadius: 20, padding: 14, borderWidth: 2, borderColor: C.line }}>
          <Text style={{ color: C.ink, fontSize: 14, fontWeight: '600', lineHeight: 22 }}>
            Tonho começou a confiar em você. Agora ele lançou uma promoção de fones de ouvido e aceita pedidos pelo celular. As vendas subiram... e, na primeira tarde, os problemas apareceram.
          </Text>
          <Text style={{ color: C.inkSoft, fontSize: 14, fontWeight: '600', lineHeight: 22, marginTop: 10 }}>
            Tem cliente que não consegue ler o preço com a tela ampliada, quem não consegue conferir o total pelo leitor de tela, e pedidos com valores diferentes no resumo e no comprovante.
          </Text>
        </View>
      </Pop>
 
      <Pop delay={240} style={{ marginTop: 16 }}>
        <Bubble who="chefe" label="TONHO · 14H32" tone={C.orange}>
          <Text style={{ color: C.ink, fontSize: 14, fontWeight: '600', lineHeight: 21 }}>
            Rapaz, a promoção mal começou e o atendimento já tá lotado. Tem gente que não consegue conferir o pedido, e eu nem sei se os valores estão certos. Investiga isso, mas tenta entender o que tá acontecendo antes de sair mexendo em tudo.
          </Text>
        </Bubble>
      </Pop>
 
      <Pop delay={340}>
        <View style={s.beat}>
          <Ionicons name="call" size={18} color={C.violet} />
          <Text style={{ flex: 1, color: C.inkSoft, lineHeight: 20, fontSize: 13, fontWeight: '600' }}>
            Daqui em diante você recebe chamados reais do atendimento. Cada solução revela uma parte do problema maior.
          </Text>
        </View>
      </Pop>
 
      <ChunkyButton label="ABRIR O PRIMEIRO CHAMADO" icon="rocket" onPress={onStart} style={{ marginTop: 20 }} />
    </ScrollView>
  )
}
 
function Result({ stars, mistakes, onDone, insets }) {
  const learned = [
    ['variáveis · saída', C.violetSoft, C.violetDark],
    ['atribuição · operadores', C.blueSoft, C.blueDark],
    ['depuração passo a passo', C.pinkSoft, C.pinkDark],
    ['tudo junto, com testes', C.orangeSoft, C.orangeDark],
  ]
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: Math.max(insets.bottom, 12) + 16, justifyContent: 'center', flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <Pop>
        <View style={{ alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[1, 2, 3].map((n) => (
              <Ionicons key={n} name={n <= stars ? 'star' : 'star-outline'} size={n === 2 ? 64 : 48} color={n <= stars ? C.yellow : C.line} style={{ marginTop: n === 2 ? 0 : 14 }} />
            ))}
          </View>
          <Text style={{ fontSize: 28, fontWeight: '900', color: C.ink, marginTop: 14, textAlign: 'center' }}>Fase 2 concluída!</Text>
          <Text style={{ color: C.muted, fontWeight: '700', marginTop: 6, textAlign: 'center' }}>
            {mistakes === 0 ? 'Sem nenhum erro. Tonho está impressionado!' : `${mistakes} ${mistakes === 1 ? 'erro' : 'erros'} no caminho. Aprender é isso!`}
          </Text>
 
          <View style={{ marginTop: 18, alignSelf: 'stretch' }}>
            <Bubble who="chefe" label="TONHO" tone={C.orange}>
              <Text style={{ color: C.ink, fontSize: 14, fontWeight: '600', lineHeight: 21 }}>
                Hoje a gente não vendeu só fone, não. A gente consertou um problema que tava impedindo gente de comprar. Amanhã vai aparecer outra coisa, mas pelo menos agora você sabe investigar.
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
              Próximo problema: algumas compras estão sendo recusadas mesmo com os dados certos. Hora de ensinar o sistema a tomar decisões.
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
  beat: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: C.violetSoft,
    borderRadius: 16,
    padding: 12,
    marginTop: 16,
    alignSelf: 'stretch',
  },
  chip: {
    paddingHorizontal: 16,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    backgroundColor: C.card,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: C.line,
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.bgDeep,
  },
  shopCard: {
    marginTop: 16,
    backgroundColor: C.successSoft,
    borderRadius: 22,
    padding: 14,
    borderBottomWidth: 4,
    borderBottomColor: C.successLine,
  },
  receipt: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 2,
    borderBottomWidth: 4,
  },
  varBox: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 10,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: C.line,
    alignItems: 'center',
  },
  feedback: {
    paddingHorizontal: 16,
    paddingTop: 14,
    backgroundColor: C.successSoft,
    borderTopWidth: 2,
    borderTopColor: C.successLine,
  },
})