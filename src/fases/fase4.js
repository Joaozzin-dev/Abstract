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
import * as Speech from 'expo-speech'
// expo-audio é opcional: se o módulo nativo não existir no app, usa a voz do aparelho
let useAudioPlayer = null
let useAudioPlayerStatus = null
try {
  const ea = require('expo-audio')
  useAudioPlayer = ea.useAudioPlayer
  useAudioPlayerStatus = ea.useAudioPlayerStatus
} catch (e) {}
import VOZES from '../assets/voz'
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
 * FASE 4 — A inauguração da Loja do Tonho  (CAPÍTULO FINAL)
 * Capítulo 4 · Eventos, estados, entradas, saídas, variáveis, depuração e testes
 *
 * 1 O pedido fantasma (Cláudia)          · 2 O microfone confuso (Júlia)
 * 3 Pedido confirmado, ninguém sabe      · 4 A promoção que quebra a tela
 * 5 A inauguração está nas suas mãos     · Epílogo: a loja como ela ficou + a moral
 *
 * Uso:  <Fase4 onClose={() => ...} onFinish={({ mistakes, stars }) => ...} />
 * Arquivo autônomo: mesma paleta e mesmos componentes visuais das Fases 2 e 3.
 */

/* ------------------------------------------------------------------ */
/*  PALETA                                                             */
/* ------------------------------------------------------------------ */
const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace'

const tap = () => sfx?.tap?.()
const good = () => sfx?.deploy?.()
const bad = () => sfx?.fail?.()

/*@@LOGIC-START@@*/
/* ------------------------------------------------------------------ */
/*  MOTOR: MINI-INTERPRETADOR + TESTES DE CADA MISSÃO                  */
/*  (se/senao, comparações, e/ou/nao, textos, escreval)                */
/* ------------------------------------------------------------------ */
const fmt = (n) =>
  typeof n === 'boolean'
    ? n
      ? 'verdadeiro'
      : 'falso'
    : typeof n === 'string'
      ? n
      : Number.isInteger(n)
        ? String(n)
        : String(Math.round(n * 100) / 100)
const same = (a, b) => typeof a === 'number' && Math.abs(a - b) < 1e-9

function evalExpr(src, env) {
  const toks = src.match(/"[^"]*"|\d+(?:\.\d+)?|<>|>=|<=|==|!=|[A-Za-z_]\w*|[()+\-*/<>=]|\S/g) || []
  let p = 0
  const fail = (m) => {
    throw new Error(m)
  }
  const peek = () => (toks[p] || '').toLowerCase()
  function primary() {
    const t = toks[p++]
    if (t === undefined) fail('A expressão está incompleta: falta um valor no final.')
    if (t[0] === '"') return t.slice(1, -1)
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
      if (typeof r.value !== 'boolean') throw new Error(`A condição "${st.cond}" precisa ser uma comparação (como total > 200) ou um valor verdadeiro/falso.`)
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
  const lines = body
    .replace(/[“”]/g, '"')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('//'))
  if (!lines.length) return { error: 'Escreva as regras no editor antes de executar.' }
  const out = []
  try {
    execBlock(parseProgram(lines), env, out, declared)
    return { out, env }
  } catch (e) {
    return { error: e.message }
  }
}

/** Roda vários casos de teste. check(out, env) devolve null (ok) ou o problema. */
function runCases(code, cases, base = {}) {
  return cases.map((c) => {
    const env0 = { ...base, ...c.env }
    const r = runProgram(code, env0)
    if (r.error) return { name: c.name, ok: false, out: [], problem: r.error }
    const problem = c.check(r.out, env0)
    return { name: c.name, ok: !problem, out: r.out, problem }
  })
}

/* ---------- MISSÃO 1 · repetir a sessão do carrinho ---------- */
const AGUARDE = /aguarde|processando|adicionando/i

function runReplay(code) {
  const rows = []
  let env = { processando: false, quantidade: 0 }
  const steps = [
    ['toque', '0,0 s', '1º toque'],
    ['toque', '0,4 s', '2º toque'],
    ['resposta', '1,8 s', 'Resposta do servidor'],
  ]
  for (const [kind, at, title] of steps) {
    if (kind === 'resposta') {
      env = { ...env, processando: false }
      rows.push({ at, title, out: ['(o app volta a aceitar toques)'], qty: env.quantidade })
      continue
    }
    const r = runProgram(code, env)
    if (r.error) return { error: r.error }
    env = r.env
    rows.push({ at, title, out: r.out, qty: env.quantidade })
  }
  return { rows, qty: env.quantidade }
}

function judgeReplay(code) {
  const r = runReplay(code)
  if (r.error) return { error: r.error }
  const rows = r.rows.map((x, i) => ({
    ...x,
    ok: i === 0 ? x.out.length > 0 && x.qty === 1 : i === 1 ? x.qty === 1 && AGUARDE.test(x.out.join(' ')) : x.qty === 1,
  }))
  let problem = null
  if (!rows[0].out.length) problem = 'O primeiro toque não mostrou nenhuma confirmação. Escreva uma mensagem para a cliente.'
  else if (r.qty !== 1) problem = `Cláudia terminou com ${r.qty} unidades: o segundo toque ainda foi aceito.`
  else if (!rows[1].ok) problem = 'O segundo toque foi ignorado em silêncio. Quem toca de novo por causa da demora precisa de uma resposta.'
  return { rows, problem }
}

/* ---------- MISSÃO 2 · voz ---------- */

const VOZ_CASES = [
  {
    name: '"ver meu pedido"',
    env: { ver: true, pedido: true, produtos: false, cancelar: false },
    check: (out) => {
      const o = out.join(' ')
      return /abrindo/i.test(o) && /pedido/i.test(o) && !/produtos/i.test(o) ? null : 'Deveria abrir "Meu pedido", e não outra tela.'
    },
  },
  {
    name: '"ver produtos"',
    env: { ver: true, pedido: false, produtos: true, cancelar: false },
    check: (out) => {
      const o = out.join(' ')
      return /abrindo/i.test(o) && /produtos/i.test(o) && !/pedido/i.test(o) ? null : 'Deveria abrir os produtos.'
    },
  },
  {
    name: '"ver" (sozinho)',
    env: { ver: true, pedido: false, produtos: false, cancelar: false },
    check: (out) => {
      const o = out.join(' ')
      if (!/\?/.test(o) || !/pedido/i.test(o) || !/produtos/i.test(o)) return 'Com uma frase ambígua o sistema deve perguntar "pedido ou produtos?" em vez de adivinhar.'
      if (!/toque|bot[aã]o/i.test(o)) return 'A pergunta existe, mas falta oferecer outro caminho: tocar em um botão.'
      return null
    },
  },
  {
    name: '"cancelar pedido"',
    env: { ver: false, pedido: true, produtos: false, cancelar: true },
    check: (out) => {
      const o = out.join(' ')
      if (/cancelado|cancelando/i.test(o)) return 'Perigoso: o pedido seria cancelado só por uma frase captada pelo microfone.'
      if (!/\?/.test(o) || !/confirm|toque|bot[aã]o/i.test(o)) return 'Antes de uma ação perigosa o sistema deve pedir confirmação e oferecer o botão na tela.'
      return null
    },
  },
  {
    name: '"bom dia" (sem comando)',
    env: { ver: false, pedido: false, produtos: false, cancelar: false },
    check: (out) => {
      const o = out.join(' ')
      if (!out.length) return 'O sistema ficou calado. A pessoa precisa saber que não foi entendida.'
      if (/abrindo|cancelad/i.test(o)) return 'Executou uma ação sem ter entendido nenhum comando.'
      if (!/toque|bot[aã]o/i.test(o)) return 'Sem entender, o sistema deve oferecer outro caminho: tocar em um botão.'
      return null
    },
  },
]

/* ---------- MISSÃO 3 · avisos do pedido ---------- */

function chkNotify(out, e) {
  const tela = out.filter((l) => l.startsWith('tela:'))
  const leit = out.filter((l) => l.startsWith('leitor:'))
  if (!tela.some((l) => l.includes(e.estado))) return 'Sem aviso escrito na tela, quem não ouve o som fica sem saber o que aconteceu com o pedido.'
  if (!e.leitor && leit.length) return 'O leitor de tela falou mesmo sem estar em uso.'
  if (e.leitor && leit.length === 0) return 'O leitor de tela não anunciou o estado do pedido.'
  if (e.leitor && leit.length > 1) return `O leitor de tela repetiu o aviso ${leit.length} vezes. Isso vira ruído, não informação.`
  if (e.leitor && !leit[0].includes(e.estado)) return 'O leitor de tela anunciou algo diferente do estado atual.'
  return null
}
const NOTIFY_CASES = [
  { name: 'Beatriz · áudio desligado', env: { audio: false, leitor: false, estado: 'recebido' } },
  { name: 'Beatriz · áudio ligado', env: { audio: true, leitor: false, estado: 'recebido' } },
  { name: 'Marcos · estado "recebido"', env: { audio: false, leitor: true, estado: 'recebido' } },
  { name: 'Marcos · estado "enviado"', env: { audio: false, leitor: true, estado: 'enviado' } },
].map((c) => ({ ...c, check: (out, e) => chkNotify(out, e) }))

/* ---------- MISSÃO 4 · oficina visual ---------- */
const SCREENS = [
  { id: 'p', short: 'Pequeno', name: 'Celular pequeno', w: 320, h: 110, scale: 1 },
  { id: 'm', short: 'Médio', name: 'Celular médio', w: 360, h: 150, scale: 1 },
  { id: 'z', short: 'Pequeno +30%', name: 'Celular pequeno, fonte ampliada em 130%', w: 320, h: 110, scale: 1.3 },
]
const COLORS = [
  ['claro', C.swatchLight],
  ['médio', C.swatchMid],
  ['escuro', C.swatchDark],
]
const VIS_START = { t: 48, esp: 8, btn: 32, cor: 2 }
function lum(hex) {
  const n = parseInt(hex.slice(1), 16)
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
function ratio(a, b) {
  const l1 = lum(a)
  const l2 = lum(b)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}
function visTests(v) {
  const r = ratio(COLORS[v.cor][1], C.white)
  const out = SCREENS.map((sc) => {
    const ts = v.t * sc.scale
    const cut = 9 * 0.55 * ts > sc.w - 32
    const over = 8 + ts * 1.2 + v.esp > sc.h - 8 - v.btn
    return { name: sc.name, ok: !cut && !over, msg: cut ? 'O preço aparece cortado.' : over ? 'O preço cobre o botão Comprar.' : '' }
  })
  out.push({ name: 'Leitura com baixa visão', ok: v.t >= 18 && r >= 4.5, msg: 'O preço continua difícil de ler.' })
  out.push({ name: 'Toque no botão', ok: v.btn >= 44, msg: 'O botão é pequeno demais para tocar com precisão.' })
  return out
}

/*@@LOGIC-END@@*/

/* ------------------------------------------------------------------ */
/*  COLORIZADOR DE CÓDIGO                                              */
/* ------------------------------------------------------------------ */
const KW = new Set(['algoritmo', 'var', 'inicio', 'fim', 'leia', 'escreval', 'escreva', 'se', 'entao', 'senao', 'fimse'])
const LOGIC = new Set(['e', 'ou', 'nao', 'verdadeiro', 'falso'])

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
      accessibilityState={{ disabled: !!disabled }}
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
        <Text style={{ color: t.text, fontWeight: '900', fontSize: 15, letterSpacing: 0.8, textAlign: 'center' }}>{label}</Text>
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
  rafa: { skin: PERSON_COLORS.rafa.skin, hair: PERSON_COLORS.rafa.hair, bg: C.successSoft, shirt: C.successDark },
  ana: { skin: PERSON_COLORS.ana.skin, hair: PERSON_COLORS.ana.hair, bg: C.pinkSoft, shirt: C.pink },
  claudia: { skin: PERSON_COLORS.claudia.skin, hair: PERSON_COLORS.claudia.hair, bg: C.pinkSoft, shirt: C.pinkDark },
  julia: { skin: PERSON_COLORS.julia.skin, hair: PERSON_COLORS.julia.hair, bg: C.violetSoft, shirt: C.violetDark },
  beatriz: { skin: PERSON_COLORS.beatriz.skin, hair: PERSON_COLORS.beatriz.hair, bg: C.orangeSoft, shirt: C.orangeDark, aid: true },
  pedro: { skin: PERSON_COLORS.pedro.skin, hair: PERSON_COLORS.pedro.hair, bg: C.blueSoft, shirt: C.blueDark },
  sarue: { skin: PERSON_COLORS.sarue.skin, hair: PERSON_COLORS.sarue.hair, bg: C.successSoft, shirt: C.success, ears: true },
}

function Face({ who = 'chefe', size = 54 }) {
  const s = size
  const p = PEOPLE[who] || PEOPLE.chefe
  return (
    <View style={{ width: s, height: s, borderRadius: s * 0.32, backgroundColor: p.bg, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' }}>
      {p.ears && (
        <>
          <View style={{ position: 'absolute', top: s * 0.06, left: s * 0.12, width: s * 0.24, height: s * 0.24, borderRadius: s * 0.12, backgroundColor: p.hair }} />
          <View style={{ position: 'absolute', top: s * 0.06, right: s * 0.12, width: s * 0.24, height: s * 0.24, borderRadius: s * 0.12, backgroundColor: p.hair }} />
        </>
      )}
      <View style={{ width: s * 0.78, height: s * 0.3, borderTopLeftRadius: s * 0.4, borderTopRightRadius: s * 0.4, backgroundColor: p.shirt, alignItems: 'center' }}>
        {p.tie && <View style={{ width: s * 0.1, height: s * 0.22, backgroundColor: C.error, borderRadius: 2 }} />}
      </View>
      <View style={{ position: 'absolute', top: s * 0.18, width: s * 0.5, height: s * 0.5, borderRadius: s * 0.25, backgroundColor: p.skin, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', top: -s * 0.02, width: s * 0.5, height: s * 0.2, borderTopLeftRadius: s * 0.25, borderTopRightRadius: s * 0.25, backgroundColor: p.hair }} />
        {p.aid && <View style={{ position: 'absolute', left: -s * 0.03, top: s * 0.2, width: s * 0.08, height: s * 0.1, borderRadius: s * 0.04, backgroundColor: C.blue }} />}
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

function Say({ children }) {
  return <Text style={s.say}>{children}</Text>
}

function Msg({ tone = 'red', text }) {
  const map = {
    red: { bg: C.errorSoft, bd: C.errorLine, fg: C.errorDark, icon: 'close-circle' },
    green: { bg: C.successSoft, bd: C.successLine, fg: C.successDark, icon: 'checkmark-circle' },
    orange: { bg: C.orangeSoft, bd: C.orangeLine, fg: C.orangeDark, icon: 'information-circle' },
  }
  const t = map[tone]
  return (
    <View accessibilityRole="alert" style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: t.bg, borderColor: t.bd, borderWidth: 2, borderRadius: 16, padding: 12, marginTop: 12 }}>
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

function Editor({ title, value, onChange, locked, minHeight = 200 }) {
  return (
    <CodeCard title={title} style={{ marginTop: 14 }}>
      <View style={{ padding: 12 }}>
        <View style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: locked ? C.success : C.orange, borderRadius: 12, backgroundColor: locked ? C.codeOk : C.codeRow }}>
          <TextInput
            value={value}
            onChangeText={onChange}
            editable={!locked}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel={`Editor de código ${title}`}
            selectionColor={C.success}
            style={{ fontFamily: MONO, fontSize: 13, color: C.codeText, minHeight, paddingHorizontal: 12, paddingVertical: 10, textAlignVertical: 'top' }}
          />
        </View>
      </View>
    </CodeCard>
  )
}

function Screen({ title = 'TELA', lines = [], tone, lit = true }) {
  const edge = tone || C.success
  return (
    <View style={{ marginTop: 12, backgroundColor: lit ? C.screenOn : C.screenOff, borderRadius: 18, padding: 14, borderWidth: 3, borderColor: lit ? edge : C.codeLine }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Ionicons name="tv" size={14} color={edge} />
        <Text style={{ color: edge, fontWeight: '900', fontSize: 10, letterSpacing: 1 }}>{title}</Text>
      </View>
      {lines.map((l, i) => (
        <Text key={i} style={{ color: C.codeText, fontFamily: MONO, fontSize: 12, lineHeight: 19 }}>
          {l}
        </Text>
      ))}
    </View>
  )
}

function Chip({ label, onPress, selected, tone = 'blue', mono = true }) {
  const bg = selected ? (tone === 'orange' ? C.orangeSoft : C.blueSoft) : C.card
  const bd = selected ? (tone === 'orange' ? C.orange : C.blue) : C.line
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: !!selected }} style={[s.chip, { backgroundColor: bg, borderColor: bd }]}>
      <Text style={{ fontFamily: mono ? MONO : undefined, fontWeight: '800', fontSize: 14, color: C.ink }}>{label}</Text>
    </Pressable>
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

function PendingRow({ title }) {
  return (
    <View style={{ backgroundColor: C.card, borderRadius: 14, borderWidth: 2, borderColor: C.line, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Ionicons name="ellipse-outline" size={18} color={C.muted} />
      <Text style={{ fontWeight: '900', color: C.ink, fontSize: 13, flex: 1 }}>{title}</Text>
    </View>
  )
}

/* ------------------------------------------------------------------ */
/*  ÁUDIO                                                              */
/*  1) Se existir gravação em assets/voz (VOZES[id]), toca o arquivo.   */
/*  2) Senão, usa a voz do aparelho, escolhendo a melhor voz pt-BR e    */
/*     falando frase por frase (soa bem menos robótico).                */
/* ------------------------------------------------------------------ */

/** Quebra o texto em frases para o ritmo ficar natural. */
const sentences = (t) => (t.match(/[^.!?…]+[.!?…]*/g) || [t]).map((x) => x.trim()).filter(Boolean)

let voiceCache
async function bestVoice() {
  if (voiceCache !== undefined) return voiceCache
  try {
    const all = await Speech.getAvailableVoicesAsync()
    const score = (v) =>
      (v.quality === 'Enhanced' ? 4 : 0) +
      (/network|neural|premium|enhanced/i.test(`${v.name} ${v.identifier}`) ? 2 : 0) +
      (/luciana|francisca|google|natural/i.test(`${v.name} ${v.identifier}`) ? 3 : 0) -
      (/compact|espeak/i.test(v.identifier || '') ? 2 : 0)
    const pt = all.filter((v) => /^pt[-_]br/i.test(v.language || '')).sort((a, b) => score(b) - score(a))
    voiceCache = pt[0] ? pt[0].identifier : null
  } catch (e) {
    voiceCache = null
  }
  return voiceCache
}

/** Abaixa a música de fundo enquanto a voz toca. */
function useDuck(active) {
  const was = useRef(null)
  useEffect(() => {
    if (active && was.current === null) {
      was.current = music.isMuted()
      if (!was.current) music.setMuted(true)
    }
    if (!active && was.current !== null) {
      if (was.current === false) music.setMuted(false)
      was.current = null
    }
  }, [active])
  useEffect(
    () => () => {
      if (was.current === false) music.setMuted(false)
    },
    []
  )
}

function PlayerCard({ playing, onToggle, who, tone, text }) {
  const wave = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (!playing) {
      wave.setValue(0)
      return
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(wave, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(wave, { toValue: 0, duration: 420, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [playing])

  const heights = [14, 26, 18, 32, 20, 28, 12, 24]
  return (
    <View style={{ marginTop: 12, backgroundColor: C.card, borderRadius: 18, borderWidth: 2, borderColor: tone, padding: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityLabel={playing ? `Parar o áudio de ${who}` : `Ouvir o áudio de ${who}`}
          style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: tone, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4, borderBottomColor: C.ink }}
        >
          <Ionicons name={playing ? 'stop' : 'play'} size={24} color={C.white} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: tone, fontWeight: '900', fontSize: 10, letterSpacing: 1 }}>
            {who} · {playing ? 'TOCANDO…' : 'TOQUE PARA OUVIR'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 34, marginTop: 4 }}>
            {heights.map((h, i) => (
              <Animated.View
                key={i}
                style={{
                  width: 5,
                  height: h,
                  borderRadius: 3,
                  backgroundColor: playing ? tone : C.line,
                  transform: [{ scaleY: wave.interpolate({ inputRange: [0, 1], outputRange: i % 2 ? [1, 0.45] : [0.45, 1] }) }],
                }}
              />
            ))}
          </View>
        </View>
      </View>
      <Text style={{ color: C.muted, fontWeight: '900', fontSize: 10, letterSpacing: 1, marginTop: 10 }}>TRANSCRIÇÃO COMPLETA</Text>
      <Text style={{ color: C.ink, fontWeight: '600', fontSize: 14, lineHeight: 21, marginTop: 4 }}>“{text}”</Text>
    </View>
  )
}

/** Toca o arquivo gravado (expo-audio). */
function FilePlayer({ source, text, who, tone }) {
  const player = useAudioPlayer(source)
  const status = useAudioPlayerStatus(player)
  const playing = !!status.playing
  useDuck(playing)

  function toggle() {
    tap()
    if (playing) {
      player.pause()
      player.seekTo(0)
    } else {
      player.seekTo(0)
      player.play()
    }
  }
  return <PlayerCard playing={playing} onToggle={toggle} who={who} tone={tone} text={text} />
}

/** Reserva: voz do aparelho, frase por frase. */
function TtsPlayer({ text, who, tone, rate }) {
  const [playing, setPlaying] = useState(false)
  const token = useRef(0)
  useDuck(playing)

  useEffect(
    () => () => {
      token.current++
      Speech.stop()
    },
    []
  )

  function stop() {
    token.current++
    Speech.stop()
    setPlaying(false)
  }

  async function play() {
    const mine = ++token.current
    setPlaying(true)
    const voice = await bestVoice()
    const parts = sentences(text)
    const next = (i) => {
      if (token.current !== mine) return
      if (i >= parts.length) return setPlaying(false)
      Speech.speak(parts[i], {
        language: 'pt-BR',
        voice: voice || undefined,
        rate,
        pitch: 1,
        onDone: () => setTimeout(() => next(i + 1), 450),
        onError: () => setPlaying(false),
      })
    }
    next(0)
  }

  function toggle() {
    tap()
    if (playing) stop()
    else play()
  }
  return <PlayerCard playing={playing} onToggle={toggle} who={who} tone={tone} text={text} />
}

/**
 * <AudioPlayer id="julia_1" text="..." who="JÚLIA" tone={C.violetDark} />
 * robo: true = leitor de tela (a voz do aparelho aqui é a realista, então fica assim mesmo).
 */
function AudioPlayer({ id, text, who = 'ÁUDIO', tone = C.blue, robo = false, rate = 0.88 }) {
  const file = !robo && id && useAudioPlayer ? VOZES[id] : null
  return file ? <FilePlayer source={file} text={text} who={who} tone={tone} /> : <TtsPlayer text={text} who={who} tone={tone} rate={robo ? 1.1 : rate} />
}

/** Perguntas de múltipla escolha usadas como fase de investigação. */
function Quiz({ items, eyebrow = 'PERGUNTA', onMistake, onDone }) {
  const [i, setI] = useState(0)
  const [msg, setMsg] = useState(null)
  const [shake, runShake] = useShake()
  const it = items[i]
  function pick(o) {
    tap()
    if (o[1]) {
      good()
      setMsg(null)
      if (i + 1 >= items.length) onDone()
      else setI(i + 1)
    } else {
      bad()
      runShake()
      setMsg(o[2] || 'Não é essa. Releia o que aconteceu e tente outra opção.')
      onMistake()
    }
  }
  return (
    <Animated.View style={shake}>
      <Text style={[s.eyebrow, { marginTop: 16 }]}>
        {eyebrow} {i + 1} DE {items.length}
      </Text>
      {it.audio ? (
        <CoachTarget id="main">
          <AudioPlayer {...it.audio} />
        </CoachTarget>
      ) : null}
      {it.ctx ? <Screen title={it.ctxTitle || 'REGISTRO'} lines={it.ctx} tone={C.blue} /> : null}
      <Text style={{ color: C.ink, fontWeight: '800', fontSize: 16, lineHeight: 23, marginTop: 12 }}>{it.q}</Text>
      <CoachTarget id="pieces"><View style={{ gap: 10, marginTop: 10 }}>
        {it.opts.map((o) => (
          <Pressable key={o[0]} onPress={() => pick(o)} accessibilityRole="button" accessibilityLabel={o[0]} style={s.choice}>
            <Text style={{ color: C.ink, fontWeight: '800', fontSize: 14, lineHeight: 20 }}>{o[0]}</Text>
          </Pressable>
        ))}
      </View></CoachTarget>
      {msg ? <Msg tone="orange" text={msg} /> : null}
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
/*  MISSÃO 1 — O PEDIDO FANTASMA                                       */
/*  ver a sessão → diagnóstico (1 pergunta) → escolher a linha certa   */
/* ------------------------------------------------------------------ */
const REPLAY = [
  { at: '0,0 s', title: 'Cláudia toca em "Adicionar ao carrinho"', log: 'toque ACEITO', qty: 1, server: 'processando o 1º toque…', screen: 'Nada muda na tela. O botão parece parado.' },
  { at: '0,4 s', title: 'Cláudia toca de novo, porque a tela não respondeu', log: 'toque ACEITO', qty: 2, server: 'ainda processando o 1º toque…', screen: 'Nada muda na tela.' },
  { at: '1,8 s', title: 'O servidor responde', log: 'resposta recebida', qty: 2, server: 'concluído', screen: 'Carrinho: 2 unidades de Fone Bluetooth.' },
]
const REPLAY_QUIZ = [
  {
    ctx: REPLAY.map((e) => `${e.at}  ${e.log}  · carrinho: ${e.qty}`),
    ctxTitle: 'RESUMO DA SESSÃO',
    q: 'O que explica as duas unidades no carrinho?',
    opts: [
      ['Cláudia errou: tocou duas vezes sem necessidade.', false, 'Ela tocou de novo porque a tela não respondeu. Quem repete um toque por causa da demora não deve ser penalizado.'],
      ['O app aceitou o 2º toque enquanto o 1º ainda era processado.', true],
      ['O servidor duplicou o pedido sozinho.', false, 'O registro mostra dois toques ACEITOS pelo aplicativo. A duplicação começou antes de o servidor responder.'],
    ],
  },
]


const REPLAY_LINES = [
  'se processando == falso entao',
  '   {{}}',
  '   quantidade <- quantidade + 1',
  '   escreval("Fone adicionado ao carrinho")',
  'senao',
  '   escreval("Aguarde, adicionando o fone")',
  'fimse',
]
const REPLAY_OPTIONS = ['processando <- falso', 'processando <- verdadeiro']

function runReplayFix(code) {
  const r = judgeReplay(code)
  if (r.error) return { error: r.error }
  return {
    problem: r.problem,
    rows: r.rows.map((x) => ({
      ok: x.ok,
      title: `${x.at} · ${x.title}`,
      body: `${x.out.join('\n') || '(sem mensagem)'}\ncarrinho: ${x.qty} ${x.qty === 1 ? 'unidade' : 'unidades'}`,
    })),
  }
}

function Replay({ onMistake, onSolved }) {
  const [phase, setPhase] = useState('watch')
  const [ev, setEv] = useState(0)
  const [seen, setSeen] = useState({ 0: true })
  const e = REPLAY[ev]
  const allSeen = Object.keys(seen).length >= 2

  function go(i) {
    tap()
    setEv(i)
    setSeen((x) => ({ ...x, [i]: true }))
  }

  return (
    <View>
      <Text style={s.eyebrow}>SESSÃO GRAVADA · CLÁUDIA × FONE BLUETOOTH</Text>
      <CoachTarget id="main">
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          {REPLAY.map((x, i) => (
            <Chip key={x.at} label={x.at} selected={ev === i} onPress={() => go(i)} />
          ))}
        </View>
      </CoachTarget>
      <Screen
        title={`PAUSADO EM ${e.at}`}
        tone={C.blue}
        lines={[`evento: ${e.title}`, `carrinho: ${e.qty} ${e.qty === 1 ? 'unidade' : 'unidades'}`, `tela: ${e.screen}`]}
      />
      <Text style={{ color: C.muted, fontWeight: '800', fontSize: 12, marginTop: 8 }}>
        Momentos vistos: {Math.min(Object.keys(seen).length, 2)} de 2
      </Text>

      {phase === 'watch' && !allSeen && <Msg tone="orange" text="Toque em 2 momentos para continuar." />}
      {phase === 'watch' && allSeen && <Quiz items={REPLAY_QUIZ} eyebrow="DIAGNÓSTICO" onMistake={onMistake} onDone={() => setPhase('code')} />}

      {phase === 'code' && (
        <>
          <Msg tone="green" text="Diagnóstico certo! Falta o app lembrar que já está ocupado. Escolha a linha que faz isso." />
          <Fix
            title="carrinho.abc"
            lines={REPLAY_LINES}
            options={REPLAY_OPTIONS}
            run={runReplayFix}
            label="REPETIR A SESSÃO"
            okText="Cláudia termina com 1 unidade. O segundo toque recebeu uma resposta clara."
            onMistake={onMistake}
            onSolved={onSolved}
          />
        </>
      )}
    </View>
  )
}

/* ------------------------------------------------------------------ */
/*  MISSÃO 2 — O MICROFONE CONFUSO                                     */
/*  4 gravações (áudio) → 2 consertos de resposta                      */
/* ------------------------------------------------------------------ */
const VOZ_OPTS = ['Abrir "Meu pedido"', 'Abrir "Produtos"', 'Pedir esclarecimento', 'Pedir confirmação']
const VOZ_QUIZ = [
  {
    ctxTitle: 'GRAVAÇÃO 1 · JÚLIA',
    audio: { id: 'julia_1', text: 'Oi, loja. Eu queria ver meu pedido, por favor.', who: 'JÚLIA', tone: C.violetDark },
    ctx: ['palavras reconhecidas: ver, pedido'],
    q: 'O que o sistema deve fazer?',
    opts: [
      [VOZ_OPTS[1], false, 'Esse é o erro de hoje: a palavra "ver" sozinha abriu os produtos. Aqui a Júlia também disse "pedido", e isso decide.'],
      [VOZ_OPTS[0], true],
      [VOZ_OPTS[2], false, 'A frase tem informação suficiente. Perguntar de novo cansaria quem já tem dificuldade para usar a tela.'],
      [VOZ_OPTS[3], false, 'Ver um pedido não é uma ação perigosa. Confirmar tudo só atrasa a Júlia.'],
    ],
  },
  {
    ctxTitle: 'GRAVAÇÃO 2 · JÚLIA',
    audio: { id: 'julia_3', text: 'Hum... ver.', who: 'JÚLIA', tone: C.violetDark },
    ctx: ['palavras reconhecidas: ver'],
    q: 'Duas ações são possíveis e o sistema não sabe qual. O que fazer?',
    opts: [
      [VOZ_OPTS[1], false, 'Adivinhar abriu a tela errada hoje. Só "ver" não diz o quê.'],
      [VOZ_OPTS[2], true],
      [VOZ_OPTS[3], false, 'Confirmação é para ações perigosas. Aqui falta saber o que a Júlia quer ver.'],
    ],
  },
]


const VOZ_FIXES = [
  {
    id: 'cancelar',
    title: 'Frase perigosa: "cancelar pedido"',
    file: 'cancelar.abc',
    lines: ['se cancelar entao', '   {{}}', 'fimse'],
    options: ['escreval("Pedido cancelado")', 'escreval("Cancelar o pedido? Toque no botão para confirmar")'],
    run: judge([{ name: '"cancelar pedido"', env: { cancelar: true }, check: (out) => VOZ_CASES[3].check(out) }]),
    ok: 'Antes de cancelar, o sistema pergunta e oferece o botão na tela.',
  },
]

function Voz({ onMistake, onSolved }) {
  const [phase, setPhase] = useState('lab')
  const [stage, setStage] = useState(0)
  const [stageDone, setStageDone] = useState(false)
  const st = VOZ_FIXES[stage]
  const last = stage === VOZ_FIXES.length - 1

  return (
    <View>
      <Text style={s.eyebrow}>LABORATÓRIO DE VOZ</Text>
      {phase === 'lab' && (
        <>
          <Text style={{ color: C.muted, fontWeight: '700', fontSize: 12, marginTop: 4 }}>Ouça cada gravação e escolha o que o sistema deve fazer.</Text>
          <Quiz items={VOZ_QUIZ} eyebrow="GRAVAÇÃO" onMistake={onMistake} onDone={() => setPhase('fix')} />
        </>
      )}
      {phase === 'fix' && (
        <>
          <Msg tone="green" text="Você entendeu as intenções. Agora conserte a resposta para uma ação perigosa." />
          <Text style={[s.eyebrow, { marginTop: 14 }]}>
            CONSERTO {stage + 1} DE {VOZ_FIXES.length} · {st.title.toUpperCase()}
          </Text>
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
            <ChunkyButton label="PRÓXIMO CONSERTO" icon="arrow-forward" tone="violet" onPress={() => { tap(); setStage((x) => x + 1); setStageDone(false) }} style={{ marginTop: 14 }} />
          )}
        </>
      )}
    </View>
  )
}

/* ------------------------------------------------------------------ */
/*  MISSÃO 3 — O PEDIDO FOI CONFIRMADO, MAS NINGUÉM SABE               */
/*  3 perguntas → 1 conserto (a fala do leitor de tela)                */
/* ------------------------------------------------------------------ */
const AV_QUIZ = [
  {
    ctxTitle: 'ESTADO: RECEBIDO · BEATRIZ (SURDA)',
    ctx: ['mudança de estado: pedido recebido', 'aviso atual: som de notificação'],
    q: 'Qual aviso funciona para a Beatriz?',
    opts: [
      ['Um som de notificação mais alto.', false, 'Beatriz é surda. O som nunca pode ser o único aviso.'],
      ['Texto na tela: "Pedido recebido".', true],
      ['Um texto genérico: "Pedido atualizado".', false, 'Genérico demais: não diz o que mudou. O aviso precisa dizer o estado.'],
    ],
  },
  {
    ctxTitle: 'ESTADO: RECEBIDO · MARCOS (LEITOR DE TELA)',
    audio: { robo: true, text: 'Pedido recebido. Pedido recebido.', who: 'LEITOR DE TELA DO MARCOS', tone: C.blueDark },
    ctx: ['leitor de tela ativo', 'o aviso foi anunciado 2 vezes'],
    q: 'O que Marcos precisa ouvir?',
    opts: [
      ['O aviso duas vezes, para garantir.', false, 'Repetir confunde: ele não sabe se são dois pedidos ou um erro. Excesso de informação também atrapalha.'],
      ['Nada: a tela muda sozinha.', false, 'Uma mudança visual não é lida automaticamente pelo leitor de tela. Ele precisa de um anúncio.'],
      ['O aviso uma única vez: "Pedido recebido".', true],
    ],
  },
]

const AV_LINES = [
  'escreval("tela: Pedido ", estado)',
  'se audio entao',
  '   escreval("som: ding")',
  'fimse',
  'se leitor entao',
  '   {{}}',
  'fimse',
]
const AV_OPTIONS = ['escreval("leitor: Pedido ", estado)\nescreval("leitor: Pedido ", estado)', 'escreval("leitor: Pedido ", estado)']
const runAvisos = (code) => {
  const rs = runCases(code, NOTIFY_CASES)
  const first = rs.find((r) => !r.ok)
  return {
    problem: first ? `${first.name}: ${first.problem}` : null,
    rows: rs.map((r) => ({ ok: r.ok, title: r.name, body: r.ok ? r.out.join('\n') || '(nada)' : r.problem })),
  }
}

function Avisos({ onMistake, onSolved }) {
  const [phase, setPhase] = useState('map')
  return (
    <View>
      <Text style={s.eyebrow}>AVISOS DO PEDIDO · CADA PESSOA USA UM CANAL</Text>
      {phase === 'map' && <Quiz items={AV_QUIZ} eyebrow="ESTADO" onMistake={onMistake} onDone={() => setPhase('fix')} />}
      {phase === 'fix' && (
        <>
          <Msg tone="green" text="Texto na tela para todos, som como extra e o leitor falando uma vez. Falta só a fala do leitor." />
          <Fix
            title="avisos.abc"
            lines={AV_LINES}
            options={AV_OPTIONS}
            run={runAvisos}
            label="TESTAR OS 4 CENÁRIOS"
            okText="Beatriz vê o aviso escrito, quem ouve ganha o som e Marcos ouve o estado uma vez só."
            onMistake={onMistake}
            onSolved={onSolved}
          />
        </>
      )}
    </View>
  )
}

/* ------------------------------------------------------------------ */
/*  MISSÃO 4 — A PROMOÇÃO QUE QUEBRA A TELA                            */
/*  3 escolhas com o celular mudando na hora                           */
/* ------------------------------------------------------------------ */
function PhonePreview({ v, sc }) {
  const k = 0.8
  const ts = v.t * sc.scale
  return (
    <View style={{ width: sc.w * k, height: sc.h * k, alignSelf: 'center', backgroundColor: C.card, borderRadius: 16, overflow: 'hidden', borderWidth: 3, borderColor: C.ink }}>
      <View style={{ position: 'absolute', left: 16 * k, right: 16 * k, top: 8 * k, paddingBottom: v.esp * k, backgroundColor: C.mockBar, zIndex: 2 }}>
        <Text numberOfLines={1} style={{ fontSize: ts * k, lineHeight: ts * 1.2 * k, fontWeight: '800', color: COLORS[v.cor][1] }}>
          R$ 299,00
        </Text>
      </View>
      <View style={{ position: 'absolute', left: 16 * k, right: 16 * k, bottom: 8 * k, height: v.btn * k, borderRadius: 10, backgroundColor: C.success, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.white, fontWeight: '900', fontSize: 13 }}>COMPRAR</Text>
      </View>
    </View>
  )
}

const VIS_GROUPS = [
  { key: 't', name: 'tamanho_preco', opts: [14, 24, 48], show: (x) => String(x) },
  { key: 'btn', name: 'altura_botao', opts: [32, 48, 64], show: (x) => String(x) },
]

function Oficina({ onMistake, onSolved }) {
  const [v, setV] = useState(VIS_START)
  const [scr, setScr] = useState(0)
  const [results, setResults] = useState([])
  const [msg, setMsg] = useState(null)
  const [msgTone, setMsgTone] = useState('red')
  const [done, setDone] = useState(false)
  const [shake, runShake] = useShake()
  const set = (k, val) => {
    tap()
    setV((x) => ({ ...x, [k]: val }))
    setMsg(null)
  }
  const r = ratio(COLORS[v.cor][1], C.white)

  function run() {
    tap()
    const prev = results.length ? results.filter((x) => !x.ok).length : null
    const rs = visTests(v)
    setResults(rs)
    const fails = rs.filter((x) => !x.ok).length
    if (!fails) {
      setMsg(null)
      setDone(true)
      onSolved(v)
      return
    }
    bad()
    runShake()
    if (prev !== null && fails >= prev) {
      setMsgTone('red')
      setMsg(`Ainda falham ${fails}. Mude um item de cada vez e veja o celular antes de testar.`)
      onMistake()
    } else {
      setMsgTone('orange')
      setMsg(`${fails} ${fails === 1 ? 'teste falhou' : 'testes falharam'}. Olhe o celular e troque um item.`)
    }
  }

  return (
    <Animated.View style={shake}>
      <Text style={s.eyebrow}>OFICINA · PREÇO DA PROMOÇÃO</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {SCREENS.map((sc, i) => (
          <Chip key={sc.id} label={sc.short} mono={false} selected={scr === i} onPress={() => { tap(); setScr(i) }} />
        ))}
      </View>
      <View style={{ marginTop: 12 }}>
        <CoachTarget id="main">
          <PhonePreview v={v} sc={SCREENS[scr]} />
        </CoachTarget>
      </View>
      <Text style={{ color: C.muted, fontWeight: '700', fontSize: 12, textAlign: 'center', marginTop: 6 }}>{SCREENS[scr].name}</Text>

      {!done && (
        <CoachTarget id="pieces">
          <View style={{ gap: 14, marginTop: 14 }}>
            {VIS_GROUPS.map((g) => (
              <View key={g.key}>
                <Text style={{ fontFamily: MONO, color: C.ink, fontWeight: '800', fontSize: 13 }}>
                  {g.name} <Text style={{ color: C.orangeDark }}>{'<-'}</Text>
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                  {g.opts.map((o) => (
                    <Chip key={o} label={g.show(o)} tone="orange" selected={v[g.key] === o} onPress={() => set(g.key, o)} />
                  ))}
                </View>
              </View>
            ))}
            <Text style={{ color: C.muted, fontFamily: MONO, fontSize: 12 }}>contraste da cor: {r.toFixed(1).replace('.', ',')}:1</Text>
          </View>
        </CoachTarget>
      )}

      <Text style={[s.eyebrow, { marginTop: 16, marginBottom: 8 }]}>TESTES</Text>
      <View style={{ gap: 8 }}>
        {visTests(VIS_START).map((t, i) => {
          const res = results[i]
          return res ? <ResultRow key={t.name} ok={res.ok} title={res.name} body={res.ok ? null : res.msg} /> : <PendingRow key={t.name} title={t.name} />
        })}
      </View>
      {msg ? <Msg tone={msgTone} text={msg} /> : null}
      {done && <Msg tone="green" text="O preço cabe em todas as telas, continua legível e o botão está no lugar. Nada foi escondido." />}
      {!done && <ChunkyButton label="EXECUTAR OS TESTES" icon="play" onPress={run} target="action" style={{ marginTop: 16 }} />}
    </Animated.View>
  )
}

/* ------------------------------------------------------------------ */
/*  MISSÃO 5 — A INAUGURAÇÃO ESTÁ NAS SUAS MÃOS                        */
/*  escolher 4 relatos → escolher o conserto de cada um → liberar      */
/* ------------------------------------------------------------------ */
const REPORTS = [
  { id: 't1', who: 'claudia', name: 'Cláudia', text: 'Toquei duas vezes porque travou e ganhei dois fones.', ess: true },
  { id: 't2', who: 'julia', name: 'Júlia', text: 'Disse "cancelar" sem querer e o pedido foi embora.', ess: true },
  { id: 't3', who: 'beatriz', name: 'Beatriz e Marcos', text: 'Sem som eu não sei se o pedido foi aceito. E o leitor repete tudo.', ess: true },
  { id: 't4', who: 'catia', name: 'Cátia', text: 'Com a fonte ampliada o preço some ou fica ilegível.', ess: true },
  { id: 'x1', who: 'ana', name: 'Ana', text: 'Vocês podiam mudar a cor do logo para rosa.', ess: false, why: 'Pode ser bom, mas não impede ninguém de comprar. Priorize o que bloqueia pessoas.' },
]

const FIXES = [
  {
    id: 'cart',
    icon: 'cart',
    title: 'Carrinho · toque duplo',
    opts: [
      ['Ignorar o 2º toque, sem avisar', false, 'Ignorar em silêncio deixa a cliente sem resposta.'],
      ['Marcar "processando" e avisar "Aguarde"', true],
    ],
  },
  {
    id: 'voz',
    icon: 'mic',
    title: 'Voz · "cancelar" sem querer',
    opts: [
      ['Perguntar e oferecer o botão', true],
      ['Cancelar na hora', false, 'Uma frase captada sem querer não pode apagar o pedido.'],
    ],
  },
  {
    id: 'aviso',
    icon: 'notifications',
    title: 'Avisos · som e leitor',
    opts: [
      ['Texto na tela e leitor falando 2 vezes', false, 'Repetir vira ruído: Marcos não sabe se são dois pedidos.'],
      ['Texto na tela e leitor falando 1 vez', true],
    ],
  },
  {
    id: 'preco',
    icon: 'pricetag',
    title: 'Preço · fonte ampliada',
    opts: [
      ['Fonte 48: bem destacado', false, 'Cobre o botão em celulares pequenos.'],
      ['Fonte 24: legível e cabe', true],
    ],
  },
]

function Final({ onMistake, onSolved }) {
  const [step, setStep] = useState('triage')
  const [picked, setPicked] = useState([])
  const [choice, setChoice] = useState({})
  const [results, setResults] = useState(null)
  const [msg, setMsg] = useState(null)
  const [msgTone, setMsgTone] = useState('red')
  const [done, setDone] = useState(false)
  const [shake, runShake] = useShake()

  function pickReport(r) {
    tap()
    if (!r.ess) {
      bad()
      runShake()
      onMistake()
      setMsgTone('orange')
      setMsg(r.why)
      return
    }
    setMsg(null)
    setPicked((p) => (p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id]))
  }

  function runAll() {
    tap()
    if (FIXES.some((f) => choice[f.id] === undefined)) {
      setMsgTone('orange')
      setMsg('Escolha um conserto para cada um dos 4 problemas.')
      return
    }
    const prev = results ? results.filter((x) => !x.ok).length : null
    const rs = FIXES.map((f) => {
      const o = f.opts[choice[f.id]]
      return { id: f.id, ok: !!o[1], why: o[2] }
    })
    setResults(rs)
    const fails = rs.filter((x) => !x.ok).length
    if (!fails) {
      good()
      setMsg(null)
      setStep('release')
      return
    }
    bad()
    runShake()
    if (prev === null) {
      setMsgTone('orange')
      setMsg(`${fails} ${fails === 1 ? 'conserto não resolve' : 'consertos não resolvem'} o problema. Leia o motivo e troque.`)
    } else if (fails >= prev) {
      setMsgTone('red')
      setMsg(`Ainda faltam ${fails}. Leia o motivo de cada um antes de trocar.`)
      onMistake()
    } else {
      setMsgTone('orange')
      setMsg(`Melhorou: faltam ${fails}.`)
    }
  }

  const stepNo = { triage: 1, work: 2, regress: 3, release: 3 }[step]

  return (
    <Animated.View style={shake}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.banner, borderRadius: 14, paddingHorizontal: 12, minHeight: 40 }}>
        <Ionicons name="radio" size={16} color={C.error} />
        <Text style={{ color: C.white, fontWeight: '900', fontSize: 12, flex: 1 }}>TRANSMISSÃO AO VIVO EM 5 MINUTOS</Text>
        <Text style={{ color: C.synNumber, fontWeight: '800', fontSize: 11 }}>{stepNo}/3</Text>
      </View>

      {step === 'triage' && (
        <>
          <Text style={[s.eyebrow, { marginTop: 16 }]}>1 · ESCOLHA OS RELATOS QUE BLOQUEIAM PESSOAS ({picked.length} DE 4)</Text>
          <CoachTarget id="main">
            <View style={{ gap: 10, marginTop: 10 }}>
              {REPORTS.map((r) => {
                const on = picked.includes(r.id)
                return (
                  <Pressable key={r.id} onPress={() => pickReport(r)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${r.name}: ${r.text}`} style={[s.choice, { flexDirection: 'row', alignItems: 'center', gap: 10, borderColor: on ? C.success : C.line, backgroundColor: on ? C.successSoft : C.card }]}>
                    <Face who={r.who} size={42} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.muted, fontWeight: '900', fontSize: 10, letterSpacing: 0.8 }}>{r.name.toUpperCase()}</Text>
                      <Text style={{ color: C.ink, fontWeight: '700', fontSize: 13, lineHeight: 19 }}>{r.text}</Text>
                    </View>
                    <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={on ? C.successDark : C.muted} />
                  </Pressable>
                )
              })}
            </View>
          </CoachTarget>
          {picked.length >= 4 && <ChunkyButton label="ABRIR OS CONSERTOS" icon="build" onPress={() => { tap(); setMsg(null); setStep('work') }} target="action" style={{ marginTop: 16 }} />}
        </>
      )}

      {step === 'work' && (
        <>
          <Text style={[s.eyebrow, { marginTop: 16 }]}>2 · ESCOLHA O CONSERTO DE CADA PROBLEMA</Text>
          {FIXES.map((f) => {
            const res = results ? results.find((x) => x.id === f.id) : null
            return (
              <View key={f.id} style={{ marginTop: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name={f.icon} size={18} color={C.inkSoft} />
                  <Text style={{ color: C.ink, fontWeight: '900', fontSize: 14 }}>{f.title}</Text>
                </View>
                <View style={{ gap: 8, marginTop: 8 }}>
                  {f.opts.map((o, i) => {
                    const on = choice[f.id] === i
                    return (
                      <Pressable key={o[0]} onPress={() => { tap(); setChoice((c) => ({ ...c, [f.id]: i })); setMsg(null) }} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={o[0]} style={[s.choice, { minHeight: 48, paddingVertical: 10, borderColor: on ? C.blue : C.line, backgroundColor: on ? C.blueSoft : C.card }]}>
                        <Text style={{ color: C.ink, fontWeight: '800', fontSize: 13, lineHeight: 19 }}>{o[0]}</Text>
                      </Pressable>
                    )
                  })}
                </View>
                {res && !res.ok ? <Msg tone="red" text={res.why} /> : null}
              </View>
            )
          })}
          <ChunkyButton label="EXECUTAR OS TESTES" icon="play" onPress={runAll} target="action" style={{ marginTop: 16 }} />
        </>
      )}

      {(step === 'regress' || step === 'release') && (
        <>
          <Msg tone="green" text="Os 4 consertos funcionam e já foram testados juntos. Pode liberar!" />
          {step === 'regress' ? (
            <ChunkyButton label="RODAR OS 4 TESTES DE NOVO" icon="repeat" onPress={() => { tap(); good(); setStep('release') }} target="action" style={{ marginTop: 16 }} />
          ) : (
            <>
              <View style={[s.shopCard, { marginTop: 14 }]}>
                {['Toque repetido não duplica o carrinho', 'Voz pergunta antes de ações perigosas', 'Avisos por texto e leitor, sem repetir', 'Preço legível e botão no lugar'].map((t) => (
                  <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 }}>
                    <Ionicons name="checkmark-circle" size={18} color={C.successDark} />
                    <Text style={{ color: C.ink, fontWeight: '800', fontSize: 13, flex: 1 }}>{t}</Text>
                  </View>
                ))}
              </View>
              {!done && <ChunkyButton label="LIBERAR A INAUGURAÇÃO" icon="rocket" onPress={() => { tap(); setDone(true); onSolved() }} style={{ marginTop: 14 }} />}
            </>
          )}
        </>
      )}

      {msg ? <Msg tone={msgTone} text={msg} /> : null}
      {done && <Msg tone="green" text="Atualização publicada. A loja abriu funcionando para todo mundo." />}
    </Animated.View>
  )
}

/* ------------------------------------------------------------------ */
/*  EPÍLOGO — A LOJA DO TONHO COMO ELA FICOU + DIÁLOGO FINAL           */
/* ------------------------------------------------------------------ */
const PINS = [
  {
    k: 'carrinho',
    label: 'Carrinho',
    who: 'claudia',
    name: 'CLÁUDIA',
    tone: C.pinkDark,
    say: 'Toquei de novo porque demorou, e a loja me avisou que já estava adicionando. Ninguém me culpou.',
    tech: 'Um estado (processando) e uma condição fazem o app esperar em vez de duplicar.',
  },
  {
    k: 'voz',
    label: 'Voz',
    who: 'julia',
    name: 'JÚLIA',
    tone: C.violetDark,
    say: 'Falei "cancelar" e a loja perguntou antes. Quando ela não entende, eu simplesmente toco no botão.',
    tech: 'Comparações e tratamento de dúvida: ação perigosa pede confirmação, e a voz nunca é o único caminho.',
  },
  {
    k: 'aviso',
    label: 'Aviso',
    who: 'beatriz',
    name: 'BEATRIZ',
    tone: C.orangeDark,
    say: 'Vi "Pedido recebido" escrito na tela e tive certeza. O som é bônus, nunca o único aviso.',
    tech: 'Cada mudança de estado vira uma saída por canal: texto para todos, som opcional, uma fala para o leitor.',
  },
  {
    k: 'preco',
    label: 'Preço',
    who: 'catia',
    name: 'CÁTIA',
    tone: C.violet,
    say: 'Tenho baixa visão e hoje li o preço com a fonte ampliada. O botão não sumiu e nada foi escondido.',
    tech: 'Variáveis de tamanho, contraste e espaço testadas em várias telas, em vez de um valor "que funciona no meu celular".',
  },
]

function Headset({ size = 56 }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', backgroundColor: C.blueSoft, borderRadius: size * 0.28 }}>
      <Ionicons name="headset" size={size * 0.55} color={C.ink} />
    </View>
  )
}

function ShopPhone({ vis, hl }) {
  const ring = (k) => ({ borderWidth: 3, borderColor: hl === k ? C.orange : 'transparent', borderRadius: 14 })
  return (
    <View style={{ alignSelf: 'center', width: '100%', maxWidth: 330, backgroundColor: C.banner, borderRadius: 34, padding: 10 }}>
      <View style={{ backgroundColor: C.bg, borderRadius: 26, padding: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="storefront" size={22} color={C.orangeDark} />
          <Text style={{ color: C.ink, fontWeight: '900', fontSize: 16, flex: 1 }}>Loja do Tonho</Text>
          <View style={{ backgroundColor: C.successSoft, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ color: C.successDark, fontWeight: '900', fontSize: 10 }}>ABERTA</Text>
          </View>
        </View>

        <View style={[ring('aviso'), { marginTop: 10 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.successSoft, borderRadius: 12, padding: 10 }}>
            <Ionicons name="checkmark-circle" size={20} color={C.successDark} />
            <Text style={{ color: C.successDark, fontWeight: '800', fontSize: 13, flex: 1 }}>Pedido recebido</Text>
            <Ionicons name="volume-medium" size={16} color={C.muted} />
          </View>
        </View>

        <View style={{ marginTop: 10, backgroundColor: C.card, borderRadius: 16, padding: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Headset size={54} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.ink, fontWeight: '800', fontSize: 13 }}>Fone Bluetooth</Text>
              <View style={[ring('preco'), { alignSelf: 'flex-start', marginTop: 2 }]}>
                <Text style={{ fontSize: vis.t, fontWeight: '800', color: COLORS[vis.cor][1] }}>R$ 299,00</Text>
              </View>
            </View>
          </View>
          <View style={[ring('carrinho'), { marginTop: vis.esp }]}>
            <View style={{ minHeight: vis.btn, backgroundColor: C.success, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: C.white, fontWeight: '900', fontSize: 14 }}>ADICIONAR AO CARRINHO</Text>
            </View>
          </View>
        </View>

        <View style={[ring('voz'), { marginTop: 10 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.violetSoft, borderRadius: 12, padding: 10 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.violet, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="mic" size={20} color={C.white} />
            </View>
            <Text style={{ color: C.violetDark, fontWeight: '700', fontSize: 12, flex: 1, lineHeight: 17 }}>Diga "ver meu pedido" ou toque nos botões. Os dois caminhos funcionam.</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

const FINAL_TALK = [
  { who: 'chefe', label: 'TONHO', tone: C.orange, text: 'Quando a Rafaela pediu ajuda, achei que acessibilidade era uma lista de bugs pra riscar e pronto. Aí vi gente tentando comprar na minha loja e percebi que o problema não era o cliente. Era a loja mesmo.' },
  { who: 'claudia', label: 'CLÁUDIA', tone: C.pinkDark, text: 'Eu só queria comprar um fone, não participar de uma prova de paciência. Mas foi bom ver o app me esperar, em vez de agir como se eu tivesse apertado o botão errado de propósito.' },
  { who: 'julia', label: 'JÚLIA', tone: C.violetDark, text: 'Eu falei errado, a loja perguntou de novo e ninguém fez drama. A voz ajuda bastante, mas o botão continuar ali também faz diferença. Nem tudo precisa ser resolvido falando com um celular.' },
  { who: 'beatriz', label: 'BEATRIZ', tone: C.orangeDark, text: 'O pedido apareceu escrito na tela. Pronto, eu sabia que tinha dado certo. Se tiver som, beleza, mas aviso que só funciona pelo ouvido não avisa todo mundo, né?' },
  { who: 'marcos', label: 'MARCOS', tone: C.blueDark, text: 'E o leitor de tela anunciou a informação uma vez, sem ficar repetindo tudo. Parece detalhe, mas ninguém merece ouvir o mesmo aviso até decorar a loja inteira.' },
  { who: 'catia', label: 'CÁTIA', tone: C.violet, text: 'Arrumaram o botão, mas quase esconderam o preço no processo. Aí corrigiram o preço e outra coisa parou de funcionar. É impressionante como um probleminha chama os amigos.' },
  { who: 'rafa', label: 'RAFAELA', tone: C.successDark, text: 'Foi por isso que testar tudo junto fez diferença. O botão podia funcionar sozinho, o preço aparecer sozinho e, mesmo assim, a compra dar errado. Código aprovado em pedaços não é sistema funcionando.' },
  { who: 'chefe', label: 'TONHO', tone: C.orange, text: 'Tá, entendi. Acessibilidade não é aquele negócio que a gente deixa pra depois, quando sobra tempo e dinheiro. É fazer a loja funcionar pra quem chega nela. Vou escrever isso na porta. Com letra grande, de preferência.' },
  { who: 'sarue', label: 'SARUÊ', tone: C.successDark, text: 'Boa! Todo mundo conseguiu comprar, ninguém precisou brigar com o botão e o Tonho aprendeu alguma coisa. Agora sim: pode fechar a loja. Eu já estava de olho no estoque de castanhas.' },
];

const CATIA_VOICE =
  'Oi, aqui é a Cátia. Vi você investigar o problema antes de sair mexendo no código e testar mais de uma situação. Isso evita trocar um bug por três novos, uma especialidade que a gente não quer no currículo. ' +
  'A partir de amanhã, você assume tickets inteiros, como dev pleno. ' +
  'E guarda essa: código funcionando no seu teste não significa que funciona pra todo mundo. Na dúvida, teste com as pessoas. Boa sorte!';

function Epilogo({ vis, onDone, insets }) {
  const [part, setPart] = useState('loja')
  const [pin, setPin] = useState(null)
  const [seen, setSeen] = useState({})
  const [n, setN] = useState(1)
  const ref = useRef(null)
  const count = Object.keys(seen).length
  const p = pin !== null ? PINS[pin] : null

  function openPin(i) {
    tap()
    setPin(i)
    setSeen((x) => ({ ...x, [i]: true }))
  }

  if (part === 'loja') {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: Math.max(insets.bottom, 12) + 16 }} showsVerticalScrollIndicator={false}>
        <Pop>
          <View style={s.header}>
            <View style={s.headerBlob} />
            <View style={s.tag}>
              <Text style={{ color: C.orangeDark, fontWeight: '900', fontSize: 11, letterSpacing: 0.6 }}>EPÍLOGO</Text>
            </View>
            <Text style={s.headerTitle}>A loja do Tonho, como ela ficou</Text>
            <Text style={{ color: C.codeIcon, fontWeight: '700', fontSize: 12, marginTop: 6 }}>Toque nas quatro mudanças para ouvir quem testou.</Text>
          </View>
        </Pop>
        <Pop delay={120} style={{ marginTop: 16 }}>
          <ShopPhone vis={vis} hl={p ? p.k : null} />
        </Pop>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14, justifyContent: 'center' }}>
          {PINS.map((x, i) => (
            <Chip key={x.k} mono={false} label={`${i + 1} · ${x.label}`} selected={pin === i} onPress={() => openPin(i)} />
          ))}
        </View>
        {p && (
          <Pop key={p.k} style={{ marginTop: 14 }}>
            <Bubble who={p.who} label={p.name} tone={p.tone}>
              <Say>{p.say}</Say>
            </Bubble>
            <View style={s.beat}>
              <Ionicons name="code-slash" size={18} color={C.violet} />
              <Text style={{ flex: 1, color: C.inkSoft, lineHeight: 20, fontSize: 13, fontWeight: '600' }}>{p.tech}</Text>
            </View>
          </Pop>
        )}
        <ChunkyButton label={count >= PINS.length ? 'OUVIR A CONVERSA FINAL' : `MUDANÇAS CONHECIDAS: ${count} DE ${PINS.length}`} icon="chatbubbles" disabled={count < PINS.length} onPress={() => { tap(); setPart('fala') }} style={{ marginTop: 18 }} />
      </ScrollView>
    )
  }

  if (part === 'voz') {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: Math.max(insets.bottom, 12) + 16 }} showsVerticalScrollIndicator={false}>
        <Text style={[s.eyebrow, { marginTop: 8, marginBottom: 12 }]}>MENSAGEM DE VOZ · DEPOIS DA INAUGURAÇÃO</Text>
        <Pop>
          <Bubble who="catia" label="CÁTIA · DEV SÊNIOR" tone={C.violet}>
            <Say>Gravei um áudio para você. Dá play para ouvir, e a transcrição completa está logo abaixo.</Say>
          </Bubble>
        </Pop>
        <Pop delay={150}>
          <AudioPlayer id="catia_final" text={CATIA_VOICE} who="CÁTIA · DEV SÊNIOR" tone={C.violet} />
        </Pop>
        <View style={s.beat}>
          <Ionicons name="trending-up" size={18} color={C.violet} />
          <Text style={{ flex: 1, color: C.inkSoft, lineHeight: 20, fontSize: 13, fontWeight: '600' }}>Novo nível: você passa a assumir tickets inteiros, como dev pleno.</Text>
        </View>
        <ChunkyButton label="VER A MORAL DA HISTÓRIA" icon="sparkles" onPress={() => { tap(); Speech.stop(); onDone() }} style={{ marginTop: 18 }} />
      </ScrollView>
    )
  }

  return (
    <ScrollView ref={ref} onContentSizeChange={() => ref.current?.scrollToEnd({ animated: true })} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: Math.max(insets.bottom, 12) + 16 }} showsVerticalScrollIndicator={false}>
      <Text style={[s.eyebrow, { marginTop: 8, marginBottom: 12 }]}>NA PORTA DA LOJA · DEPOIS DA TRANSMISSÃO</Text>
      <View style={{ gap: 12 }}>
        {FINAL_TALK.slice(0, n).map((t, i) => (
          <Pop key={i}>
            <Bubble who={t.who} label={t.label} tone={t.tone}>
              <Say>{t.text}</Say>
            </Bubble>
          </Pop>
        ))}
      </View>
      {n < FINAL_TALK.length ? (
        <ChunkyButton label="PRÓXIMA FALA" icon="arrow-forward" tone="violet" onPress={() => { tap(); setN((x) => x + 1) }} style={{ marginTop: 18 }} />
      ) : (
        <ChunkyButton label="OUVIR A MENSAGEM DA CÁTIA" icon="mic" onPress={() => { tap(); setPart('voz') }} style={{ marginTop: 18 }} />
      )}
    </ScrollView>
  )
}

/* ------------------------------------------------------------------ */
/*  ROTEIRO DA FASE                                                    */
/* ------------------------------------------------------------------ */

const MISSIONS = [
  {
    kind: 'replay',
    task: 'Revise a gravação, descubra quem causou o pedido duplicado e impeça o aplicativo de aceitar dois toques.',
    coach: [
      {
        target: 'main',
        title: 'Volta a fita',
        text: 'Olhe o que aconteceu em 0,0 s, 0,4 s e 1,8 s. O aplicativo tem memória curta, mas a gravação não.'
      }
    ],
    mech: 'Investigação de sessão gravada',
    time: '16h02',
    title: 'Compre um, leve dois. Sem querer.',
    talk: [
      {
        who: 'claudia',
        label: 'CLÁUDIA · CLIENTE',
        tone: C.pinkDark,
        text: 'Toquei em "Adicionar ao carrinho". Nada aconteceu. Toquei de novo e agora tenho dois fones. Se era promoção, esqueceram de me avisar.'
      },
      {
        who: 'chefe',
        label: 'TONHO',
        tone: C.orange,
        text: 'Dois fones? Mas ela tocou duas vezes! ...Tá, pensando bem, se o botão tivesse respondido, ela não precisava ter tocado de novo.'
      }
    ],
    goals: [
      { icon: 'play-forward', label: 'Ver a\nsessão', color: C.pink, bg: C.pinkSoft },
      { icon: 'git-branch', label: 'Livre ou\nocupado?', color: C.violet, bg: C.violetSoft },
      { icon: 'shield', label: 'Só 1\npedido', color: C.success, bg: C.successSoft }
    ],
    steps: [
      { icon: 'film', title: 'Investigue os 3 instantes' },
      { icon: 'checkmark', title: 'Primeiro toque: marque como ocupado', code: 'processando <- verdadeiro' },
      { icon: 'hand-left', title: 'Segundo toque: avise que está processando', code: 'escreval("Aguarde...")' }
    ],
    hints: [
      'O segundo toque chegou antes de o aplicativo terminar. Ele aceitou os dois porque não se lembrou do primeiro.',
      'A variável processando precisa virar verdadeiro assim que o primeiro toque for aceito.'
    ],
    learn: 'Eventos mudam estados, e condições decidem como responder. Quando o aplicativo demora, a pessoa pode tentar novamente. Cabe ao sistema evitar ações duplicadas e dar um retorno claro.',
    reply: {
      who: 'chefe',
      label: 'TONHO',
      tone: C.orange,
      text: 'O registro mostrou que quem aceitou os dois toques foi o meu aplicativo. Desculpa, Cláudia. Vou parar de culpar o cliente e começar a testar meus botões.'
    },
    after: 'Um fone a menos no carrinho e uma desculpa a mais pro Tonho. Agora a Júlia quer navegar pela loja usando a voz. O microfone anda ouvindo até o que ninguém disse.'
  },
  {
    kind: 'voz',
    task: 'Ouça duas gravações, descubra quando o sistema entendeu errado e corrija uma resposta.',
    coach: [
      {
        target: 'main',
        title: 'Ouça antes de sair respondendo',
        text: 'Toque em ▶ para ouvir a gravação. A transcrição está logo abaixo. Sim, desta vez é o microfone que precisa prestar atenção.'
      },
      {
        target: 'pieces',
        title: 'Ensine o sistema a perguntar',
        text: 'Escolha o que fazer quando a frase estiver confusa ou a ação puder causar um problema.'
      }
    ],
    mech: 'Laboratório de experimentação por voz',
    time: '16h19',
    title: 'O microfone ouviu o que quis',
    talk: [
      {
        who: 'julia',
        label: 'JÚLIA · NAVEGA POR VOZ',
        tone: C.violetDark,
        text: 'Eu digo "ver meu pedido" e a loja abre os produtos. Meus movimentos são limitados, então uso a voz para navegar. Não queria ter que negociar com o microfone a cada compra.'
      },
      {
        who: 'chefe',
        label: 'TONHO',
        tone: C.orange,
        text: 'Minha ideia era cadastrar cinquenta comandos novos. Mas, se duas frases parecerem iguais, o sistema vai escolher uma no cara ou coroa?'
      }
    ],
    goals: [
      { icon: 'mic', label: 'Ouvir', color: C.violet, bg: C.violetSoft },
      { icon: 'help-circle', label: 'Perguntar\nse houver dúvida', color: C.orange, bg: C.orangeSoft },
      { icon: 'tablet-portrait', label: 'Botão\nna tela', color: C.blue, bg: C.blueSoft }
    ],
    steps: [
      { icon: 'mic', title: 'Descubra o que cada frase significa' },
      { icon: 'warning', title: 'Ação arriscada? Peça confirmação', code: 'Cancelar? Confirme a ação.' },
      { icon: 'tablet-portrait', title: 'Ofereça outra forma de agir' }
    ],
    hints: [
      'Se a frase estiver ambígua, pergunte o que a pessoa quis dizer. Se a ação tiver consequências, confirme antes de executar.',
      'A voz pode ajudar, mas não deve ser o único caminho. Disponibilize também um botão na tela.'
    ],
    learn: 'Reconhecer palavras não é o mesmo que entender a intenção. Quando houver dúvida, o sistema deve perguntar; quando houver risco, deve confirmar. A voz precisa ser uma opção acessível, não uma obrigação.',
    reply: {
      who: 'julia',
      label: 'JÚLIA',
      tone: C.violetDark,
      text: 'Agora, quando a loja não entende, ela pergunta em vez de inventar. Parece pouco, mas já economizei umas boas discussões com o microfone.'
    },
    after: 'A voz aprendeu a perguntar antes de fazer besteira. Só falta avisar quando as coisas dão certo. Beatriz e Marcos compraram, mas cada um recebeu uma experiência diferente.'
  },
  {
    kind: 'avisos',
    task: 'Associe cada aviso à pessoa certa e corrija a mensagem duplicada do leitor de tela.',
    coach: [
      {
        target: 'pieces',
        title: 'Avisar não é só fazer barulho',
        text: 'Cada pessoa pode perceber a informação de um jeito. Escolha avisos que funcionem sem depender de um único sentido.'
      }
    ],
    mech: 'Central de incidentes com cenários simultâneos',
    time: '16h40',
    title: 'A compra foi. O aviso, nem tanto.',
    talk: [
      {
        who: 'beatriz',
        label: 'BEATRIZ · SURDA',
        tone: C.orangeDark,
        text: 'Terminei a compra, o aplicativo fez um barulhinho e ficou por isso mesmo. Que bom que o som recebeu meu pedido, porque a tela claramente não recebeu.'
      },
      {
        who: 'marcos',
        label: 'MARCOS · LEITOR DE TELA',
        tone: C.blueDark,
        text: 'O leitor anunciou a confirmação duas vezes. Na primeira eu entendi. Na segunda, achei que tinha comprado de novo. O aplicativo está tentando me vender outro fone?'
      }
    ],
    goals: [
      { icon: 'volume-high', label: 'Som', color: C.orange, bg: C.orangeSoft },
      { icon: 'phone-portrait', label: 'Aviso\nna tela', color: C.blue, bg: C.blueSoft },
      { icon: 'ear', label: 'Leitor\numa vez', color: C.violet, bg: C.violetSoft }
    ],
    steps: [
      { icon: 'phone-portrait', title: 'Mostre a confirmação na tela', code: 'tela: Pedido confirmado' },
      { icon: 'ear', title: 'Anuncie o estado uma vez só' },
      { icon: 'volume-mute', title: 'Não dependa apenas do som' }
    ],
    hints: [
      'O texto na tela informa o resultado visualmente. O som pode complementar, mas não substituir essa informação.',
      'O leitor de tela precisa anunciar a confirmação uma única vez, sem repetir o mesmo aviso.'
    ],
    learn: 'Uma informação importante precisa chegar à pessoa por meios acessíveis. Sons não podem ser o único aviso, e anúncios repetidos podem confundir. O objetivo é comunicar o estado com clareza, sem excesso nem falta.',
    reply: {
      who: 'marcos',
      label: 'MARCOS',
      tone: C.blueDark,
      text: 'Uma confirmação, no momento certo. Agora sei que a compra foi concluída sem precisar investigar se comprei dois fones de novo.'
    },
    after: 'Os avisos finalmente fazem sentido. Aí Tonho resolve dar destaque à promoção e aumenta tanto o preço que o botão de comprar pede demissão.'
  },
  {
    kind: 'visual',
    task: 'Ajuste tamanho, contraste e botão até a tela passar nos testes sem esconder informações.',
    coach: [
      {
        target: 'main',
        title: 'Hora do teste de resistência',
        text: 'Alterne entre as opções de tamanho e veja o que acontece com o preço e o botão. Nem todo celular tem o tamanho da tela do seu.'
      },
      {
        target: 'pieces',
        title: 'Uma mudança por vez',
        text: 'Se você mexer em tudo ao mesmo tempo, depois não vai saber quem salvou a tela e quem acabou com ela.'
      },
      {
        target: 'action',
        title: 'Agora teste de verdade'
      }
    ],
    mech: 'Oficina de código com resultado visual imediato',
    time: '17h05',
    title: 'O preço ficou famoso. O botão sumiu.',
    talk: [
      {
        who: 'chefe',
        label: 'TONHO',
        tone: C.orange,
        text: 'Aumentei o preço pra chamar atenção na inauguração. Funcionou! Agora ninguém consegue apertar o botão de comprar. Divulgação impecável, vendas inexistentes.'
      },
      {
        who: 'catia',
        label: 'CÁTIA · BAIXA VISÃO',
        tone: C.violet,
        text: 'Aí você diminuiu tudo para caber na tela. O botão voltou, mas eu mal consigo ler o preço. Acessibilidade não é trocar um problema por outro.'
      }
    ],
    goals: [
      { icon: 'text', label: 'Texto\nlegível', color: C.blue, bg: C.blueSoft },
      { icon: 'contrast', label: 'Contraste', color: C.violet, bg: C.violetSoft },
      { icon: 'finger-print', label: 'Botão\n≥ 44', color: C.success, bg: C.successSoft }
    ],
    steps: [
      { icon: 'phone-portrait', title: 'Teste três tamanhos de tela' },
      { icon: 'text', title: 'Mantenha o preço legível', code: 'tamanho >= 18' },
      { icon: 'resize', title: 'Garanta espaço para o botão', code: 'botao >= 44' }
    ],
    hints: [
      'Altere um valor por vez e observe o resultado em cada tamanho de tela.',
      'Use texto legível, contraste adequado e um botão com área de toque suficiente. Tudo precisa continuar visível e utilizável.'
    ],
    learn: 'Depurar é alterar uma variável por vez e testar diferentes situações. Uma mudança que resolve uma barreira pode criar outra. Por isso, a interface precisa continuar legível, perceptível e utilizável em diferentes telas.',
    reply: {
      who: 'catia',
      label: 'CÁTIA',
      tone: C.violet,
      text: 'Consigo ler o preço, ampliar a tela e encontrar o botão. E o melhor: você não precisou esconder metade da loja para fazer tudo caber.'
    },
    after: 'A tela sobreviveu aos testes. A transmissão começa em cinco minutos e ainda há relatos de problemas. Tonho olha para você, para os relatórios e para o relógio. Péssima combinação.'
  },
  {
    kind: 'final',
    task: 'Analise os cinco relatos, escolha quatro problemas prioritários e aplique os consertos corretos antes de liberar a loja.',
    coach: [
      {
        target: 'main',
        title: 'Cinco relatos. Quatro vagas.',
        text: 'Escolha os quatro problemas que mais impedem as pessoas de usar a loja. Não adianta marcar tudo como resolvido e torcer para ninguém perceber.'
      }
    ],
    mech: 'Missão integrada com consequências',
    time: '17h25',
    title: 'Cinco minutos para não passar vergonha',
    talk: [
      {
        who: 'rafa',
        label: 'RAFAELA',
        tone: C.successDark,
        text: 'A atualização juntou versões antigas e novas. Temos cinco relatos envolvendo pedidos, voz, avisos e interface. Quatro precisam ser resolvidos agora.'
      },
      {
        who: 'chefe',
        label: 'TONHO',
        tone: C.orange,
        text: 'A transmissão começa em cinco minutos. Não quero um botão verde escrito "TUDO OK" escondendo quinze problemas. Priorize, corrija e teste. Nessa ordem, por favor.'
      }
    ],
    goals: [
      { icon: 'checkbox', label: 'Priorizar\nrelatos', color: C.orange, bg: C.orangeSoft },
      { icon: 'bug', label: 'Corrigir\n4 problemas', color: C.error, bg: C.errorSoft },
      { icon: 'rocket', label: 'Testar e\nliberar', color: C.success, bg: C.successSoft }
    ],
    steps: [
      { icon: 'list', title: 'Priorize as barreiras mais graves' },
      { icon: 'build', title: 'Escolha o conserto adequado para cada relato' },
      { icon: 'repeat', title: 'Teste novamente antes de liberar' }
    ],
    hints: [
      'Priorize os problemas que impedem alguém de concluir uma compra ou entender o que aconteceu.',
      'Escolha soluções que resolvam o problema sem criar uma nova barreira. Depois, teste os cenários afetados.'
    ],
    learn: 'Você integrou eventos, estados, condições, operadores lógicos, depuração e testes. Um programa não está pronto só porque executa: ele precisa funcionar para as pessoas que dependem dele.',
    reply: {
      who: 'rafa',
      label: 'RAFAELA',
      tone: C.successDark,
      text: 'Os cenários essenciais passaram, inclusive os testes das correções antigas. Pode transmitir. E, Tonho, pelo amor de tudo, não atualiza nada durante a live.'
    },
    after: 'A transmissão começa e a loja abre para todo mundo. Tonho finalmente respira. O saruê já está olhando o próximo relatório. Ninguém teve coragem de contar que existe uma fase 5.'
  }
];


/* ------------------------------------------------------------------ */
/*  TELA PRINCIPAL                                                     */
/* ------------------------------------------------------------------ */
export default function Fase4({ onClose, onFinish }) {
  const insets = useSafeAreaInsets()
  const [stage, setStage] = useState('intro') // intro | play | epilogo | result
  const [idx, setIdx] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [solved, setSolved] = useState(false)
  const [hintLvl, setHintLvl] = useState(0)
  const [muted, setMuted] = useState(music.isMuted())
  const [vis, setVis] = useState({ t: 22, esp: 8, btn: 48, cor: 2 })

  useEffect(() => () => { music.stop() }, [])

  const m = MISSIONS[Math.min(idx, MISSIONS.length - 1)]
  const coachCtrl = useCoach(String(m.kind) + idx, m.coach)
  const stars = mistakes === 0 ? 3 : mistakes <= 4 ? 2 : 1
  const playing = stage === 'play'
  const allDone = stage === 'epilogo' || stage === 'result'

  // Conclusão garantida: o app é avisado mesmo se a pessoa sair pelo X, pelo voltar do
  // aparelho ou no epílogo. Antes só o botão final da tela de resultado registrava a fase.
  const reported = useRef(false)
  const latest = useRef({})
  latest.current = { done: allDone, mistakes, stars, onFinish }
  const report = () => {
    if (reported.current) return
    reported.current = true
    const l = latest.current
    if (l.onFinish) l.onFinish({ mistakes: l.mistakes, stars: l.stars })
  }
  useEffect(() => () => { if (latest.current.done && !reported.current) report() }, [])

  const phaseKey = 'fase4'
  useEffect(() => { if (playing) startMissionTimer(phaseKey) }, [idx, playing])

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
  const onSolved = (data) => {
    good()
    markActivityToday()
    markFixed({ phase: phaseKey, mission: m?.title })
    recordCorrect(phaseKey)
    if (m.kind === 'visual' && data) setVis(data)
    setSolved(true)
  }
  function next() {
    tap()
    setSolved(false)
    setHintLvl(0)
    if (idx + 1 >= MISSIONS.length) setStage('epilogo')
    else setIdx((i) => i + 1)
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
    setStage('play')
    music.start()
  }

  const Body = { replay: Replay, voz: Voz, avisos: Avisos, visual: Oficina, final: Final }[m.kind]

  return (
    <KeyboardAvoidingView style={{ flex: 1, paddingTop: insets.top, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.topBar}>
        <Pressable onPress={close} style={s.iconBtn} accessibilityRole="button" accessibilityLabel="Fechar fase">
          <Ionicons name="close" size={24} color={C.muted} />
        </Pressable>
        <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
          {MISSIONS.map((_, i) => (
            <View key={i} style={{ flex: 1, height: 14, borderRadius: 8, backgroundColor: allDone || i < idx || (i === idx && solved) ? C.success : i === idx && playing ? C.orange : C.bgDeep }} />
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

      {stage === 'intro' && <Intro onStart={start} insets={insets} />}
      {stage === 'epilogo' && <Epilogo vis={vis} onDone={() => setStage('result')} insets={insets} />}
      {stage === 'result' && <Result stars={stars} mistakes={mistakes} onDone={() => (onFinish ? report() : close())} insets={insets} />}

      {playing && (
        <>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled"
            ref={coachCtrl.scrollRef}
            onScroll={coachCtrl.onScroll}
            scrollEventThrottle={16} showsVerticalScrollIndicator={false}>
            <Pop key={`h${idx}`}>
              <View style={s.header}>
                <View style={s.headerBlob} />
                <View style={s.tag}>
                  <Text style={{ color: C.orangeDark, fontWeight: '900', fontSize: 11, letterSpacing: 0.6 }}>
                    FASE 4 · {idx + 1} DE {MISSIONS.length}
                  </Text>
                </View>
                <Text style={s.headerTitle}>{m.title}</Text>
                <Text style={{ color: C.codeIcon, fontWeight: '700', fontSize: 12, marginTop: 6 }}>
                  {m.time} · {m.mech}
                </Text>
              </View>
            </Pop>

            <Pop key={`b${idx}`} delay={120} style={{ marginTop: 16, gap: 12 }}>
              {m.talk.map((t, i) => (
                <Bubble key={i} who={t.who} label={t.label} tone={t.tone}>
                  <Say>{t.text}</Say>
                </Bubble>
              ))}
            </Pop>

            

            <GuidePanel key={`g${idx}`} mission={m} onTutorial={coachCtrl.reopen} />
            <View style={{ marginTop: 16 }}>
              <Body key={idx} onMistake={onMistake} onSolved={onSolved} />
            </View>

            {solved && (
              <Pop key={`r${idx}`} style={{ marginTop: 16 }}>
                <Bubble who={m.reply.who} label={m.reply.label} tone={m.reply.tone}>
                  <Say>{m.reply.text}</Say>
                </Bubble>
              </Pop>
            )}
          </ScrollView>

          

          {solved && (
            <View accessibilityLiveRegion="polite" style={[s.feedback, { paddingBottom: Math.max(insets.bottom, 12) }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="checkmark-circle" size={26} color={C.successDark} />
                <Text style={{ color: C.successDark, fontWeight: '900', fontSize: 18 }}>Muito bem!</Text>
              </View>
              <Text style={{ color: C.inkSoft, fontWeight: '600', fontSize: 14, lineHeight: 20, marginTop: 4 }}>{m.learn}</Text>
              <Text style={{ color: C.muted, fontWeight: '600', fontSize: 12, lineHeight: 18, marginTop: 6, fontStyle: 'italic' }}>{m.after}</Text>
              <ChunkyButton label={idx + 1 >= MISSIONS.length ? 'VER A LOJA DO TONHO' : 'CONTINUAR'} onPress={next} style={{ marginTop: 12 }} />
            </View>
          )}
        </>
      )}
    
      <CoachOverlay ctrl={coachCtrl} enabled={playing && !solved} />
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
            <Text style={{ color: C.orangeDark, fontWeight: '900', fontSize: 11, letterSpacing: 0.6 }}>FASE 4 · CAPÍTULO FINAL</Text>
          </View>
          <Text style={s.headerTitle}>A inauguração da Loja do Tonho</Text>
          <Text style={{ color: C.codeIcon, fontWeight: '700', fontSize: 12, marginTop: 6 }}>Eventos, avisos e testes</Text>
        </View>
      </Pop>

      <Pop delay={120} style={{ marginTop: 16 }}>
        <Bubble who="rafa" label="RAFAELA · 15H58" tone={C.successDark}>
          <Say>A associação chegou! Tem gente que usa leitor de tela, gente que navega por voz, gente com baixa visão. Eles vão testar a loja de verdade.</Say>
        </Bubble>
      </Pop>

      <Pop delay={240} style={{ marginTop: 12 }}>
        <Bubble who="sarue" label="SARUÊ" tone={C.successDark}>
          <Say>Sem pressa. Em cada chamado você investiga, escolhe e testa. Eu e a Cátia estamos com você.</Say>
        </Bubble>
      </Pop>

      <Pop delay={320}>
        <View style={s.beat}>
          <Ionicons name="git-branch" size={18} color={C.violet} />
          <Text style={{ flex: 1, color: C.inkSoft, lineHeight: 20, fontSize: 13, fontWeight: '600' }}>
            Cinco chamados: investigar, ouvir, avisar, ajustar e liberar.
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
  const chapters = [
    ['Fase 1', 'Botão que ninguém vê não existe: contraste, tamanho e toque.', C.violetSoft, C.violetDark],
    ['Fase 2', 'Um número errado vira um problema real para alguém.', C.blueSoft, C.blueDark],
    ['Fase 3', 'Uma decisão do programa precisa explicar o que aconteceu.', C.pinkSoft, C.pinkDark],
    ['Fase 4', 'Corrigir cada parte não basta: é preciso testar a experiência inteira.', C.orangeSoft, C.orangeDark],
  ]
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: Math.max(insets.bottom, 12) + 16, flexGrow: 1 }} showsVerticalScrollIndicator={false}>
      <Pop>
        <View style={{ alignItems: 'center', marginTop: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[1, 2, 3].map((n) => (
              <Ionicons key={n} name={n <= stars ? 'star' : 'star-outline'} size={n === 2 ? 64 : 48} color={n <= stars ? C.yellow : C.line} style={{ marginTop: n === 2 ? 0 : 14 }} />
            ))}
          </View>
<Text style={{ fontSize: 28, fontWeight: '900', color: C.ink, marginTop: 14, textAlign: 'center' }}>
  A loja do Tonho está aberta!
</Text>
<Text style={{ color: C.muted, fontWeight: '700', marginTop: 6, textAlign: 'center' }}>
  {mistakes === 0
    ? 'Nenhum erro no caminho. Tonho já está contando vantagem!'
    : `${mistakes} ${mistakes === 1 ? 'erro' : 'erros'} depois, a loja finalmente funciona pra todo mundo.`}
</Text>
</View>

<View style={{ marginTop: 20, backgroundColor: C.banner, borderRadius: 26, padding: 18, borderBottomWidth: 5, borderBottomColor: C.bannerEdge }}>
  <Text style={{ color: C.synNumber, fontWeight: '900', fontSize: 11, letterSpacing: 1 }}>
    O QUE FICOU DESSA HISTÓRIA
  </Text>
  <Text style={{ color: C.white, fontWeight: '900', fontSize: 20, lineHeight: 28, marginTop: 8 }}>
    Código sem erro não significa loja sem barreira.
  </Text>
  <Text style={{ color: C.codeIcon, fontWeight: '600', fontSize: 14, lineHeight: 22, marginTop: 10 }}>
    Um botão, uma frase, um aviso, o tamanho de uma letra. Parece pouca coisa, até alguém não conseguir comprar por causa disso. Cada decisão no código pode abrir uma porta ou deixar alguém do lado de fora.
  </Text>
  <Text style={{ color: C.codeIcon, fontWeight: '600', fontSize: 14, lineHeight: 22, marginTop: 10 }}>
    Por isso, a gente testa com as pessoas, não tenta adivinhar por elas. E testa tudo junto: às vezes você conserta uma coisa e quebra outra sem nem perceber.
  </Text>
</View>

<View style={{ marginTop: 18 }}>
  <Bubble who="chefe" label="TONHO · NA PORTA DA LOJA" tone={C.orange}>
    <Say>"Aqui, ninguém precisa se virar pra conseguir comprar. A loja é que tem que funcionar pra todo mundo." Pronto, vou mandar fazer uma placa. Dessa vez, vou até testar antes de instalar.</Say>
  </Bubble>
</View>

<View style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.violetSoft, borderRadius: 18, padding: 14, borderWidth: 2, borderColor: C.violet }}>
  <Ionicons name="ribbon" size={30} color={C.violetDark} />
  <View style={{ flex: 1 }}>
    <Text style={{ color: C.violetDark, fontWeight: '900', fontSize: 11, letterSpacing: 1 }}>
      NOVO NÍVEL DESBLOQUEADO
    </Text>
    <Text style={{ color: C.ink, fontWeight: '800', fontSize: 15, lineHeight: 21 }}>
      Dev pleno: a Cátia confia em você pra encarar problemas de verdade.
    </Text>
  </View>
</View>

<Text style={[s.eyebrow, { marginTop: 20, marginBottom: 8 }]}>
  O CAMINHO ATÉ AQUI
</Text>
<View style={{ gap: 8 }}>
          {chapters.map(([t, d, bg, fg]) => (
            <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: bg, borderRadius: 14, padding: 12 }}>
              <Ionicons name="checkmark-circle" size={20} color={fg} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: fg, fontWeight: '900', fontSize: 12, letterSpacing: 0.6 }}>{t.toUpperCase()}</Text>
                <Text style={{ color: C.ink, fontWeight: '700', fontSize: 13, lineHeight: 19 }}>{d}</Text>
              </View>
            </View>
          ))}
        </View>
      </Pop>
      <ChunkyButton label="CONCLUIR A JORNADA" icon="trophy" onPress={onDone} style={{ marginTop: 22 }} />
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
  say: { color: C.ink, fontSize: 14, fontWeight: '600', lineHeight: 21 },
  hintBtn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12, paddingHorizontal: 12, minHeight: 34, borderRadius: 12, backgroundColor: C.orangeSoft },
  eyebrow: { color: C.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  beat: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: C.violetSoft, borderRadius: 16, padding: 12, marginTop: 16, alignSelf: 'stretch' },
  chip: { paddingHorizontal: 14, minHeight: 46, paddingVertical: 8, borderRadius: 14, justifyContent: 'center', backgroundColor: C.card, borderWidth: 2, borderBottomWidth: 5, borderColor: C.line },
  choice: { backgroundColor: C.card, borderRadius: 16, borderWidth: 2, borderBottomWidth: 5, borderColor: C.line, paddingHorizontal: 14, paddingVertical: 14, minHeight: 54, justifyContent: 'center' },
  shopCard: { marginTop: 16, backgroundColor: C.successSoft, borderRadius: 22, padding: 14, borderBottomWidth: 4, borderBottomColor: C.successLine },
  step: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.codeLine, alignItems: 'center', justifyContent: 'center' },
  feedback: { paddingHorizontal: 16, paddingTop: 14, backgroundColor: C.successSoft, borderTopWidth: 2, borderTopColor: C.successLine },
})