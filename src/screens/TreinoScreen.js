/**
 * Treino sem rede — Vale do Silêncio (vale2).
 *
 * Sem tempo e sem fim: sessões de 10 questões, quantas quiser. O que conta é a QUANTIDADE
 * de questões feitas (ranking da semana) e cada acerto vale XP. Meta diária de 20 questões.
 * Trilha de 19 degraus, do zero até árvores; subir de degrau = acertar 8 de 10 no degrau atual.
 * Nunca "termina": depois do último degrau vira mistura geral com questões geradas na hora.
 *
 * 9 mecânicas: escolha, V/F, digitar número, completar, montar a linha, ordenar,
 * achar o erro, ligar pares e tocar na posição do vetor. Música igual à das fases (music).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useStore } from '../store/useStore'
import { sfx, music } from '../lib/sounds'
import { useTheme } from './ProfileScreen'
import { STAGES, SESSION, pickSession } from './treinoQuestions'
import { commitTreino, treinoState, cargoFor, levelInfo, totalXp } from '../lib/xp'
import { flushCloudSync } from '../lib/cloud'

const PASS = 0.8 // acerto mínimo para liberar o próximo degrau
const MAX_RETRY = 3 // erradas que voltam no fim da sessão
const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace'
const MEM_KEY = 'treino:mem:v1'
const CHEERS = ['Boa!', 'Isso aí!', 'Mandou bem!', 'Certo!', 'Perfeito!']

const shuffle = (a) => {
  const o = a.slice()
  for (let i = o.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[o[i], o[j]] = [o[j], o[i]]
  }
  return o
}
const isCode = (s) => /[;{}()=<>\[\]]/.test(s)

/** XP por acerto: cresce com a dificuldade; mecânicas de montar valem um pouco mais. */
function xpFor(q, combo) {
  const base = 3 + 2 * (q.d || 1) + (['build', 'order', 'match', 'fill'].includes(q.t) ? 2 : 0)
  return q.retry ? 2 : base + Math.min(combo - 1, 5)
}

function answerText(q) {
  switch (q.t) {
    case 'tf':
      return q.a ? 'Verdadeiro' : 'Falso'
    case 'fill':
      return q.a.join('   ')
    case 'build':
      return q.tokens.join(' ')
    case 'order':
      return q.lines.join('\n')
    case 'bug':
      return `Linha ${q.a + 1}: ${q.code[q.a].trim()}`
    case 'match':
      return q.pairs.map((x) => `${x[0]} → ${x[1]}`).join('\n')
    case 'cells':
      return `Posição ${q.a} (valor ${q.cells[q.a]})`
    default:
      return String(q.a)
  }
}

/* ------------------------------ tema ------------------------------ */
function makePalette(t) {
  const c = t.c
  const d = t.dark
  return {
    bg: c.bg,
    paper: c.card,
    ink: c.ink,
    inkSoft: c.inkSoft,
    muted: c.muted,
    line: c.line,
    green: c.green,
    greenDark: c.greenDark,
    greenSoft: c.greenSoft,
    onGreen: d ? c.onGreen : '#FFFFFF',
    orange: c.orange,
    orangeSoft: d ? '#3D2E16' : '#FFE8C4',
    violet: c.violet,
    violetSoft: d ? '#2A2650' : '#EFEAFF',
    violetEdge: d ? '#4B3F8F' : '#D9CFFF',
    red: d ? '#FF7A7A' : '#E03C3C',
    redSoft: d ? '#3F1F24' : '#FFE1E1',
    yellow: c.yellow,
    code: d ? '#0E1427' : '#18203A',
    overlay: c.overlay || '#0008',
  }
}

function makeStyles(p, f) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: p.bg },
    top: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
    iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    bar: { flex: 1, height: 14, borderRadius: 8, backgroundColor: p.line, overflow: 'hidden' },
    barFill: { height: 14, borderRadius: 8, backgroundColor: p.green },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 34, borderRadius: 17 },
    chipText: { fontWeight: '900', fontSize: f(14) },
    card: { backgroundColor: p.paper, borderRadius: 20, borderWidth: 2, borderBottomWidth: 5, borderColor: p.line, padding: 16 },
    tag: { color: p.violet, fontWeight: '900', fontSize: f(10), letterSpacing: 1 },
    qText: { color: p.ink, fontWeight: '900', fontSize: f(20), lineHeight: f(27), marginTop: 6 },
    code: { backgroundColor: p.code, borderRadius: 16, padding: 14, marginTop: 12, gap: 2 },
    codeNum: { color: '#5B6896', fontFamily: MONO, fontSize: f(12), width: 22, lineHeight: f(20) },
    codeText: { color: '#E8ECFF', fontFamily: MONO, fontSize: f(14), lineHeight: f(20), flex: 1 },
    blank: { color: '#FFC800', fontWeight: '900', backgroundColor: '#2B3560' },
    opt: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 16, borderWidth: 2, borderBottomWidth: 5, borderColor: p.line, backgroundColor: p.paper, paddingHorizontal: 14, paddingVertical: 14, minHeight: 58 },
    optOk: { backgroundColor: p.greenSoft, borderColor: p.green },
    optBad: { backgroundColor: p.redSoft, borderColor: p.red },
    optSel: { backgroundColor: p.violetSoft, borderColor: p.violet },
    optText: { color: p.ink, fontWeight: '800', fontSize: f(15), lineHeight: f(21), flex: 1 },
    chipBtn: { borderRadius: 12, borderWidth: 2, borderBottomWidth: 4, borderColor: p.line, backgroundColor: p.paper, paddingHorizontal: 12, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    chipBtnText: { color: p.ink, fontWeight: '800', fontSize: f(14), fontFamily: MONO },
    numBox: { minHeight: 64, borderRadius: 16, borderWidth: 2, borderColor: p.violetEdge, backgroundColor: p.violetSoft, alignItems: 'center', justifyContent: 'center' },
    numText: { color: p.ink, fontWeight: '900', fontSize: f(30), fontFamily: MONO },
    pad: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    key: { width: '31.5%', minHeight: 52, borderRadius: 14, borderWidth: 2, borderBottomWidth: 4, borderColor: p.line, backgroundColor: p.paper, alignItems: 'center', justifyContent: 'center' },
    keyText: { color: p.ink, fontWeight: '900', fontSize: f(20) },
    btn: { minHeight: 54, borderRadius: 16, borderBottomWidth: 5, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
    btnText: { fontWeight: '900', fontSize: f(15), letterSpacing: 0.8 },
    sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 14, borderTopWidth: 3 },
    h1: { color: p.ink, fontWeight: '900', fontSize: f(26) },
    sub: { color: p.inkSoft, fontWeight: '600', fontSize: f(14), lineHeight: f(20), marginTop: 4 },
    h2: { color: p.muted, fontWeight: '900', fontSize: f(11), letterSpacing: 1.2, marginBottom: 8 },
    small: { color: p.muted, fontWeight: '700', fontSize: f(12), lineHeight: f(17) },
  })
}

/* ------------------------------ memória local (o que já viu/errou) ------------------------------ */
async function loadMem() {
  try {
    const m = JSON.parse((await AsyncStorage.getItem(MEM_KEY)) || '{}')
    return { seen: m.seen || {}, wrong: m.wrong || {}, lessons: m.lessons || {} }
  } catch (_) {
    return { seen: {}, wrong: {}, lessons: {} }
  }
}
const saveMem = (m) => AsyncStorage.setItem(MEM_KEY, JSON.stringify(m)).catch(() => {})

/* ------------------------------ peças ------------------------------ */
function Btn({ label, onPress, disabled, tone = 'green', icon, p, st, style }) {
  const g = tone === 'green'
  const ghost = tone === 'ghost'
  const face = disabled ? p.line : g ? p.green : ghost ? p.paper : p.violet
  const edge = disabled ? p.line : g ? p.greenDark : ghost ? p.line : p.violetEdge
  const ink = disabled ? p.muted : g ? p.onGreen : ghost ? p.ink : '#fff'
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={[st.btn, { backgroundColor: face, borderBottomColor: edge, borderWidth: ghost ? 2 : 0, borderColor: p.line }, style]}
    >
      {icon ? <Ionicons name={icon} size={20} color={ink} /> : null}
      <Text style={[st.btnText, { color: ink }]}>{label}</Text>
    </Pressable>
  )
}

function Chip({ icon, text, bg, fg, st }) {
  return (
    <View style={[st.chip, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={15} color={fg} />
      <Text style={[st.chipText, { color: fg }]}>{text}</Text>
    </View>
  )
}

/** Bloco de código. `fills` preenche os ____; `mark(i)` devolve 'ok'|'bad'|null; `onBlank(i)` desfaz. */
function CodeBox({ lines, st, p, fills, mark, onBlank }) {
  let b = -1
  return (
    <View style={st.code}>
      {lines.map((ln, i) => {
        const parts = String(ln).split('____')
        return (
          <View key={i} style={{ flexDirection: 'row' }}>
            <Text style={st.codeNum}>{i + 1}</Text>
            <Text style={st.codeText}>
              {parts.map((part, k) => {
                const has = k < parts.length - 1
                if (has) b += 1
                const bi = b
                const m = mark ? mark(bi) : null
                return (
                  <Text key={k}>
                    {part}
                    {has ? (
                      <Text
                        onPress={onBlank ? () => onBlank(bi) : undefined}
                        style={[st.blank, m === 'ok' && { color: '#9BE564' }, m === 'bad' && { color: '#FF8A8A' }]}
                      >
                        {` ${fills && fills[bi] != null ? fills[bi] : '____'} `}
                      </Text>
                    ) : null}
                  </Text>
                )
              })}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

/* ------------------------------ mecânicas ------------------------------ */
function ChoiceQ({ q, p, st, done, onResolve }) {
  const isTf = q.t === 'tf'
  const opts = useMemo(() => (isTf ? ['Verdadeiro', 'Falso'] : shuffle([q.a, ...q.w])), [q, isTf])
  const right = isTf ? (q.a ? 'Verdadeiro' : 'Falso') : q.a
  const [picked, setPicked] = useState(null)
  const pick = (o) => {
    if (done || picked !== null) return
    setPicked(o)
    onResolve(o === right)
  }
  return (
    <View style={{ flexDirection: isTf ? 'row' : 'column', gap: 10, marginTop: 14 }}>
      {opts.map((o) => {
        const isRight = o === right
        const show = picked !== null
        return (
          <Pressable
            key={o}
            onPress={() => pick(o)}
            accessibilityRole="button"
            accessibilityLabel={o}
            style={[st.opt, isTf && { flex: 1, minHeight: 76, justifyContent: 'center' }, show && isRight && st.optOk, show && picked === o && !isRight && st.optBad]}
          >
            <Text style={[st.optText, isTf && { textAlign: 'center', fontSize: 17 }, isCode(o) && { fontFamily: MONO }]}>{o}</Text>
            {show && isRight && !isTf ? <Ionicons name="checkmark-circle" size={22} color={p.greenDark} /> : null}
            {show && picked === o && !isRight && !isTf ? <Ionicons name="close-circle" size={22} color={p.red} /> : null}
          </Pressable>
        )
      })}
    </View>
  )
}

function NumQ({ q, p, st, done, onResolve }) {
  const [v, setV] = useState('')
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '±', '0', '⌫']
  const press = (k) => {
    if (done) return
    sfx?.tap?.()
    if (k === '⌫') setV((x) => x.slice(0, -1))
    else if (k === '±') setV((x) => (x.startsWith('-') ? x.slice(1) : '-' + x))
    else setV((x) => (x.replace('-', '').length >= 5 ? x : x + k))
  }
  const valid = v !== '' && v !== '-'
  const state = done ? (v === q.a ? 'ok' : 'bad') : null
  return (
    <View style={{ marginTop: 14 }}>
      <View style={[st.numBox, state === 'ok' && st.optOk, state === 'bad' && st.optBad]} accessibilityLabel={`Resposta: ${v || 'vazia'}`}>
        <Text style={st.numText}>{v || '?'}</Text>
      </View>
      <View style={st.pad}>
        {keys.map((k) => (
          <Pressable key={k} onPress={() => press(k)} accessibilityRole="button" accessibilityLabel={k === '⌫' ? 'Apagar' : k === '±' ? 'Trocar sinal' : k} style={st.key}>
            <Text style={st.keyText}>{k}</Text>
          </Pressable>
        ))}
      </View>
      <Btn label="CONFERIR" disabled={!valid || done} onPress={() => onResolve(v === q.a)} p={p} st={st} style={{ marginTop: 12 }} />
    </View>
  )
}

function BugQ({ q, p, st, done, onResolve }) {
  const [picked, setPicked] = useState(null)
  const pick = (i) => {
    if (done || picked !== null) return
    setPicked(i)
    onResolve(i === q.a)
  }
  return (
    <View style={[st.code, { paddingVertical: 8 }]}>
      {q.code.map((ln, i) => {
        const right = picked !== null && i === q.a
        const bad = picked === i && i !== q.a
        return (
          <Pressable
            key={i}
            onPress={() => pick(i)}
            accessibilityRole="button"
            accessibilityLabel={`Linha ${i + 1}: ${ln}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 9, borderRadius: 10, minHeight: 44, backgroundColor: right ? '#1F4D1A' : bad ? '#5A1F1F' : 'transparent' }}
          >
            <Text style={st.codeNum}>{i + 1}</Text>
            <Text style={st.codeText}>{ln}</Text>
            {right ? <Ionicons name="checkmark-circle" size={18} color="#9BE564" /> : null}
            {bad ? <Ionicons name="close-circle" size={18} color="#FF8A8A" /> : null}
          </Pressable>
        )
      })}
    </View>
  )
}

function CellsQ({ q, p, st, done, onResolve }) {
  const [picked, setPicked] = useState(null)
  const pick = (i) => {
    if (done || picked !== null) return
    setPicked(i)
    onResolve(i === q.a)
  }
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14, justifyContent: 'center' }}>
      {q.cells.map((c, i) => {
        const show = picked !== null
        const right = show && i === q.a
        const bad = show && picked === i && i !== q.a
        return (
          <Pressable key={i} onPress={() => pick(i)} accessibilityRole="button" accessibilityLabel={`Posição ${i}, valor ${c}`} style={{ alignItems: 'center' }}>
            <View style={[st.opt, { minHeight: 64, minWidth: 58, paddingHorizontal: 10, justifyContent: 'center' }, right && st.optOk, bad && st.optBad]}>
              <Text style={[st.optText, { flex: 0, fontFamily: MONO, fontSize: 18 }]}>{c}</Text>
            </View>
            <Text style={[st.small, { marginTop: 4, fontFamily: MONO }]}>{i}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function OrderQ({ q, p, st, done, onResolve }) {
  const items = useMemo(() => {
    const base = q.lines.map((text, i) => ({ text, i }))
    let m = shuffle(base)
    for (let k = 0; k < 6 && m.every((it, idx) => it.i === idx); k++) m = shuffle(base)
    return m
  }, [q])
  const seqRef = useRef([])
  const [seq, setSeq] = useState([])
  const [bad, setBad] = useState(null)
  const tap = (it) => {
    const cur = seqRef.current
    if (done || bad !== null || cur.includes(it.i)) return
    if (it.i !== cur.length) {
      setBad(it.i)
      onResolve(false)
      return
    }
    const n = [...cur, it.i]
    seqRef.current = n
    setSeq(n)
    if (n.length === q.lines.length) onResolve(true)
    else sfx?.tap?.()
  }
  return (
    <View style={{ gap: 10, marginTop: 14 }}>
      {items.map((it) => {
        const pos = seq.indexOf(it.i)
        const ok = pos >= 0
        const should = bad !== null && it.i === seq.length
        return (
          <Pressable key={it.i} onPress={() => tap(it)} accessibilityRole="button" accessibilityLabel={it.text} style={[st.opt, ok && st.optOk, bad === it.i && st.optBad, should && st.optOk]}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: ok ? p.green : p.line, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: ok ? p.onGreen : p.muted, fontWeight: '900', fontSize: 13 }}>{ok ? pos + 1 : '·'}</Text>
            </View>
            <Text style={[st.optText, isCode(it.text) && { fontFamily: MONO, fontSize: 13 }]}>{it.text}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function FillQ({ q, p, st, done, onResolve }) {
  const bank = useMemo(() => shuffle([...q.a, ...(q.bank || [])]), [q])
  const [fills, setFills] = useState(() => q.a.map(() => null))
  const used = new Set(fills.filter((x) => x !== null))
  const texts = fills.map((ci) => (ci === null ? null : bank[ci]))
  const full = fills.every((x) => x !== null)
  const put = (ci) => {
    if (done) return
    sfx?.tap?.()
    setFills((prev) => {
      const b = prev.indexOf(null)
      if (b < 0 || prev.includes(ci)) return prev
      const n = [...prev]
      n[b] = ci
      return n
    })
  }
  const clear = (b) => {
    if (done) return
    setFills((prev) => prev.map((x, i) => (i === b ? null : x)))
  }
  return (
    <View>
      <CodeBox lines={q.code} st={st} p={p} fills={texts} onBlank={clear} mark={done ? (i) => (texts[i] === q.a[i] ? 'ok' : 'bad') : null} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
        {bank.map((c, ci) => (
          <Pressable key={ci} onPress={() => put(ci)} accessibilityRole="button" accessibilityLabel={c} style={[st.chipBtn, used.has(ci) && { opacity: 0.35 }]}>
            <Text style={st.chipBtnText}>{c}</Text>
          </Pressable>
        ))}
      </View>
      <Btn label="CONFERIR" disabled={!full || done} onPress={() => onResolve(texts.every((tx, i) => tx === q.a[i]))} p={p} st={st} style={{ marginTop: 14 }} />
    </View>
  )
}

function BuildQ({ q, p, st, done, onResolve }) {
  const bank = useMemo(() => shuffle([...q.tokens, ...(q.extra || [])]), [q])
  const [seq, setSeq] = useState([])
  const add = (ci) => {
    if (done) return
    sfx?.tap?.()
    setSeq((prev) => (prev.includes(ci) ? prev : [...prev, ci]))
  }
  const remove = (ci) => {
    if (done) return
    setSeq((prev) => prev.filter((x) => x !== ci))
  }
  const texts = seq.map((ci) => bank[ci])
  const ok = texts.length === q.tokens.length && texts.every((tx, i) => tx === q.tokens[i])
  return (
    <View>
      <View style={[st.numBox, { marginTop: 14, minHeight: 72, flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 10, justifyContent: 'flex-start', alignItems: 'center' }, done && (ok ? st.optOk : st.optBad)]}>
        {seq.length === 0 ? <Text style={[st.small, { fontStyle: 'italic' }]}>Toque nas peças para montar a linha</Text> : null}
        {seq.map((ci) => (
          <Pressable key={ci} onPress={() => remove(ci)} accessibilityRole="button" accessibilityLabel={`Remover ${bank[ci]}`} style={st.chipBtn}>
            <Text style={st.chipBtnText}>{bank[ci]}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
        {bank.map((c, ci) => (
          <Pressable key={ci} onPress={() => add(ci)} accessibilityRole="button" accessibilityLabel={c} style={[st.chipBtn, seq.includes(ci) && { opacity: 0.35 }]}>
            <Text style={st.chipBtnText}>{c}</Text>
          </Pressable>
        ))}
      </View>
      <Btn label="CONFERIR" disabled={seq.length === 0 || done} onPress={() => onResolve(ok)} p={p} st={st} style={{ marginTop: 14 }} />
    </View>
  )
}

function MatchQ({ q, p, st, done, onResolve }) {
  const right = useMemo(() => shuffle(q.pairs.map((pr, i) => ({ text: pr[1], i }))), [q])
  const selRef = useRef(null)
  const okRef = useRef([])
  const missRef = useRef(0)
  const [sel, setSel] = useState(null)
  const [okIdx, setOkIdx] = useState([])
  const [flash, setFlash] = useState(null)
  const alive = useRef(true)
  useEffect(() => () => { alive.current = false }, [])
  const tapL = (i) => {
    if (done || okRef.current.includes(i)) return
    sfx?.tap?.()
    selRef.current = i
    setSel(i)
  }
  const tapR = (i) => {
    const cur = selRef.current
    if (done || okRef.current.includes(i) || cur === null) return
    selRef.current = null
    setSel(null)
    if (cur === i) {
      okRef.current = [...okRef.current, i]
      setOkIdx(okRef.current)
      sfx?.deploy?.()
      if (okRef.current.length === q.pairs.length) onResolve(missRef.current <= 1)
    } else {
      missRef.current += 1
      setFlash(i)
      sfx?.fail?.()
      setTimeout(() => alive.current && setFlash(null), 450)
      if (missRef.current >= 3) onResolve(false)
    }
  }
  return (
    <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
      <View style={{ flex: 1, gap: 10 }}>
        {q.pairs.map((pr, i) => (
          <Pressable key={i} onPress={() => tapL(i)} accessibilityRole="button" accessibilityLabel={pr[0]} style={[st.opt, { justifyContent: 'center' }, okIdx.includes(i) && st.optOk, sel === i && st.optSel]}>
            <Text style={[st.optText, { textAlign: 'center', fontFamily: MONO, fontSize: 14 }]}>{pr[0]}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flex: 1.3, gap: 10 }}>
        {right.map((r) => (
          <Pressable key={r.i} onPress={() => tapR(r.i)} accessibilityRole="button" accessibilityLabel={r.text} style={[st.opt, { justifyContent: 'center' }, okIdx.includes(r.i) && st.optOk, flash === r.i && st.optBad]}>
            <Text style={[st.optText, { fontSize: 13, textAlign: 'center' }]}>{r.text}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const RENDER = { mc: ChoiceQ, tf: ChoiceQ, num: NumQ, bug: BugQ, cells: CellsQ, order: OrderQ, fill: FillQ, build: BuildQ, match: MatchQ }
const TYPE_LABEL = {
  mc: 'ESCOLHA',
  tf: 'VERDADEIRO OU FALSO',
  num: 'DIGITE O RESULTADO',
  fill: 'COMPLETE',
  build: 'MONTE A LINHA',
  order: 'ORDENE',
  bug: 'ACHE O ERRO',
  match: 'LIGUE OS PARES',
  cells: 'TOQUE NA POSIÇÃO',
}

/* ------------------------------ tela ------------------------------ */
export default function TreinoScreen({ onClose }) {
  const insets = useSafeAreaInsets()
  const t = useTheme()
  const f = (n) => (t.fs ? t.fs(n) : n)
  const p = useMemo(() => makePalette(t), [t])
  const st = useMemo(() => makeStyles(p, f), [p, t])
  const setScreen = useStore((s) => s.setScreen)
  const progress = useStore((s) => s.progress) || {}

  const tr = treinoState(progress)
  const nStages = STAGES.length
  const cleared = tr.stage >= nStages
  const frontier = Math.min(tr.stage, nStages - 1)
  const xpTotal = totalXp(progress)

  const [phase, setPhase] = useState('home') // home | play | result
  const [sel, setSel] = useState(frontier)
  const [lesson, setLesson] = useState(null) // { stage, start }
  const [qs, setQs] = useState([])
  const [idx, setIdx] = useState(0)
  const [fb, setFb] = useState(null)
  const [res, setRes] = useState(null)
  const [muted, setMuted] = useState(() => {
    try {
      return music.isMuted()
    } catch (_) {
      return false
    }
  })

  const mem = useRef({ seen: {}, wrong: {}, lessons: {} })
  const qsRef = useRef([])
  const idxRef = useRef(0)
  const fbRef = useRef(null)
  const S = useRef({})
  const slide = useRef(new Animated.Value(0)).current

  // quando o degrau liberado muda (subiu de degrau / veio da nuvem), seleciona o novo
  useEffect(() => {
    setSel(frontier)
  }, [frontier])

  useEffect(() => {
    loadMem().then((m) => {
      mem.current = m
    })
    return () => {
      try {
        music.stop()
      } catch (_) {}
    }
  }, [])

  const stopMusic = () => {
    try {
      music.stop()
    } catch (_) {}
  }
  function leave() {
    sfx?.tap?.()
    stopMusic()
    if (onClose) onClose()
    else if (setScreen) setScreen('journey')
  }
  function toggleMute() {
    const nm = !muted
    setMuted(nm)
    try {
      music.setMuted(nm)
    } catch (_) {}
  }

  /* ---------- começar ---------- */
  function onTrain() {
    sfx?.tap?.()
    if (sel !== 'mix' && !mem.current.lessons[sel]) setLesson({ stage: sel, start: true })
    else start(sel)
  }

  function start(focus) {
    const list = pickSession(focus, frontier, mem.current)
    qsRef.current = list
    idxRef.current = 0
    fbRef.current = null
    S.current = { focus, answered: 0, correct: 0, firstTotal: 0, firstCorrect: 0, xp: 0, combo: 0, best: 0, retries: 0, done: false }
    setQs(list)
    setIdx(0)
    setFb(null)
    setRes(null)
    setPhase('play')
    try {
      if (!music.isMuted()) music.start()
    } catch (_) {}
  }

  /* ---------- responder ---------- */
  function resolve(ok) {
    if (fbRef.current) return
    const q = qsRef.current[idxRef.current]
    const s = S.current
    s.answered += 1
    if (!q.retry) {
      s.firstTotal += 1
      if (ok) s.firstCorrect += 1
    }
    let gain = 0
    let willRetry = false
    if (ok) {
      s.correct += 1
      s.combo += 1
      s.best = Math.max(s.best, s.combo)
      gain = xpFor(q, s.combo)
      s.xp += gain
      sfx?.deploy?.()
    } else {
      s.combo = 0
      sfx?.fail?.()
      if (!q.retry && s.retries < MAX_RETRY) {
        s.retries += 1
        willRetry = true
        qsRef.current = [...qsRef.current, { ...q, retry: true }]
        setQs(qsRef.current)
      }
    }
    if (!q.gen) {
      const m = mem.current
      m.seen[q.id] = (m.seen[q.id] || 0) + 1
      m.wrong[q.id] = ok ? Math.max(0, (m.wrong[q.id] || 0) - 1) : (m.wrong[q.id] || 0) + 1
    }
    const f1 = { ok, gain, willRetry, cheer: CHEERS[Math.floor(Math.random() * CHEERS.length)] }
    fbRef.current = f1
    setFb(f1)
    slide.setValue(t.reduce ? 1 : 0)
    if (!t.reduce) Animated.timing(slide, { toValue: 1, duration: 180, useNativeDriver: true }).start()
  }

  function next() {
    if (!fbRef.current) return
    sfx?.tap?.()
    if (idxRef.current + 1 >= qsRef.current.length) {
      finish()
      return
    }
    idxRef.current += 1
    fbRef.current = null
    setIdx(idxRef.current)
    setFb(null)
  }

  /** Grava a sessão (também ao sair no meio: o que foi respondido conta). */
  function commit(allowAdvance) {
    const s = S.current
    if (s.done || !s.answered) return null
    s.done = true
    const acc = s.firstTotal ? s.firstCorrect / s.firstTotal : 0
    const advance = allowAdvance && s.focus === frontier && !cleared && s.firstTotal >= SESSION && acc >= PASS
    const newStage = advance ? tr.stage + 1 : tr.stage
    const r = commitTreino({ answered: s.answered, correct: s.correct, xp: s.xp, stage: newStage })
    saveMem(mem.current)
    Promise.resolve(flushCloudSync()).catch(() => {})
    return { r, acc, advance, newStage }
  }

  function finish() {
    const s = S.current
    const c = commit(true)
    stopMusic()
    sfx?.win?.()
    if (!c) {
      setPhase('home')
      return
    }
    setRes({
      answered: s.answered,
      correct: s.correct,
      acc: c.acc,
      xp: s.xp,
      bonus: c.r.bonus,
      best: s.best,
      advance: c.advance,
      newStage: c.newStage,
      dayQ: c.r.dayQ,
      streak: c.r.streak,
      xpAfter: c.r.xpAfter,
      levelUp: levelInfo(c.r.xpAfter).level > levelInfo(c.r.xpBefore).level,
      cargoUp: cargoFor(c.r.xpAfter).index > cargoFor(c.r.xpBefore).index,
      focus: s.focus,
    })
    setPhase('result')
  }

  function exitPlay() {
    sfx?.tap?.()
    commit(false)
    stopMusic()
    setPhase('home')
  }

  /** "Mais 10": no degrau novo (se acabou de liberar) mostra a aula antes. */
  function again() {
    sfx?.tap?.()
    const target = res.advance ? Math.min(res.newStage, nStages - 1) : res.focus
    if (target !== 'mix' && !mem.current.lessons[target]) {
      setPhase('home') // a aula abre por cima da home
      setLesson({ stage: target, start: true })
    } else start(target)
  }

  /* ---------- aula-relâmpago ---------- */
  const lessonStage = lesson ? STAGES[lesson.stage] : null
  function closeLesson() {
    const go = lesson && lesson.start
    const sIdx = lesson && lesson.stage
    if (sIdx != null) {
      mem.current.lessons[sIdx] = true
      saveMem(mem.current)
    }
    setLesson(null)
    if (go) start(sIdx)
  }

  const bottom = insets.bottom + 12

  /* =============================== PLAY =============================== */
  if (phase === 'play' && qs[idx]) {
    const q = qs[idx]
    const Q = RENDER[q.t]
    const total = qs.length
    const prog = (idx + (fb ? 1 : 0)) / total
    const sheetY = slide.interpolate({ inputRange: [0, 1], outputRange: [40, 0] })
    return (
      <View style={[st.root, { paddingTop: insets.top }]}>
        <View style={st.top}>
          <Pressable onPress={exitPlay} style={st.iconBtn} accessibilityRole="button" accessibilityLabel="Sair do treino">
            <Ionicons name="close" size={26} color={p.muted} />
          </Pressable>
          <View style={st.bar} accessibilityLabel={`Questão ${idx + 1} de ${total}`}>
            <View style={[st.barFill, { width: `${Math.round(prog * 100)}%` }]} />
          </View>
          {S.current.combo >= 2 ? <Chip st={st} icon="flame" text={`x${S.current.combo}`} bg={p.orangeSoft} fg={p.orange} /> : null}
          <Pressable onPress={toggleMute} style={st.iconBtn} accessibilityRole="button" accessibilityLabel={muted ? 'Ligar música' : 'Desligar música'}>
            <Ionicons name={muted ? 'volume-mute' : 'musical-notes'} size={22} color={muted ? p.muted : p.violet} />
          </Pressable>
        </View>

        <ScrollView key={`${idx}-${q.id}`} contentContainerStyle={{ padding: 16, paddingBottom: fb ? 24 : bottom + 8 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={st.card} accessibilityLiveRegion="polite">
            <Text style={st.tag}>
              {TYPE_LABEL[q.t]}
              {q.retry ? ' · DE NOVO' : ''} · {STAGES[q.st]?.title?.toUpperCase()}
            </Text>
            <Text style={st.qText}>{q.q}</Text>
          </View>
          {q.code && !['fill', 'bug'].includes(q.t) ? <CodeBox lines={q.code} st={st} p={p} /> : null}
          <Q q={q} p={p} st={st} done={!!fb} onResolve={resolve} />
        </ScrollView>

        {fb ? (
          <Animated.View style={[st.sheet, { backgroundColor: fb.ok ? p.greenSoft : p.redSoft, borderTopColor: fb.ok ? p.green : p.red, paddingBottom: bottom, transform: [{ translateY: sheetY }] }]} accessibilityLiveRegion="polite">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name={fb.ok ? 'checkmark-circle' : 'close-circle'} size={26} color={fb.ok ? p.greenDark : p.red} />
              <Text style={{ color: fb.ok ? p.greenDark : p.red, fontWeight: '900', fontSize: f(18), flex: 1 }}>{fb.ok ? fb.cheer : 'Quase!'}</Text>
              {fb.ok && fb.gain > 0 ? <Chip st={st} icon="flash" text={`+${fb.gain} XP`} bg={p.paper} fg={p.violet} /> : null}
            </View>
            {!fb.ok ? (
              <View style={{ marginTop: 8 }}>
                <Text style={st.small}>Resposta certa</Text>
                <Text style={{ color: p.ink, fontWeight: '800', fontSize: f(14), lineHeight: f(20), fontFamily: isCode(answerText(q)) ? MONO : undefined }}>{answerText(q)}</Text>
              </View>
            ) : null}
            {q.e ? <Text style={{ color: p.inkSoft, fontWeight: '600', fontSize: f(14), lineHeight: f(20), marginTop: 8 }}>{q.e}</Text> : null}
            {!fb.ok && fb.willRetry ? <Text style={[st.small, { marginTop: 6 }]}>Ela volta no fim da sessão para você tentar de novo.</Text> : null}
            <Btn label={idx + 1 >= qs.length ? 'VER RESULTADO' : 'CONTINUAR'} onPress={next} p={p} st={st} tone={fb.ok ? 'green' : 'violet'} style={{ marginTop: 12 }} />
          </Animated.View>
        ) : null}
      </View>
    )
  }

  /* =============================== RESULTADO =============================== */
  if (phase === 'result' && res) {
    const cargo = cargoFor(res.xpAfter)
    const lv = levelInfo(res.xpAfter)
    const goalPct = Math.min(1, res.dayQ / tr.goal)
    return (
      <View style={[st.root, { paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: bottom + 12, alignItems: 'center' }} showsVerticalScrollIndicator={false}>
          <Text style={st.h2}>SESSÃO CONCLUÍDA</Text>
          <Text style={{ color: p.ink, fontWeight: '900', fontSize: f(64) }} accessibilityLabel={`${res.correct} acertos de ${res.answered}`}>
            {res.correct}/{res.answered}
          </Text>
          <Text style={st.sub}>{Math.round(res.acc * 100)}% de acerto de primeira</Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 14 }}>
            <Chip st={st} icon="flash" text={`+${res.xp + res.bonus} XP`} bg={p.violetSoft} fg={p.violet} />
            <Chip st={st} icon="flame" text={`combo x${res.best}`} bg={p.orangeSoft} fg={p.orange} />
            <Chip st={st} icon="calendar" text={`${res.streak} ${res.streak === 1 ? 'dia' : 'dias'} seguidos`} bg={p.greenSoft} fg={p.greenDark} />
          </View>

          {res.advance ? (
            <View style={[st.card, { alignSelf: 'stretch', marginTop: 16, backgroundColor: p.greenSoft, borderColor: p.green }]}>
              <Text style={[st.tag, { color: p.greenDark }]}>DEGRAU LIBERADO</Text>
              <Text style={st.qText}>{res.newStage < nStages ? STAGES[res.newStage].title : 'Você liberou tudo! Agora é treino livre.'}</Text>
            </View>
          ) : res.focus === frontier && !cleared ? (
            <Text style={[st.small, { marginTop: 14, textAlign: 'center' }]}>Acerte {Math.round(PASS * SESSION)} de {SESSION} de primeira para liberar o próximo degrau.</Text>
          ) : null}

          {res.bonus > 0 ? (
            <View style={[st.card, { alignSelf: 'stretch', marginTop: 12, backgroundColor: p.orangeSoft, borderColor: p.orange }]}>
              <Text style={[st.tag, { color: p.orange }]}>META DO DIA BATIDA</Text>
              <Text style={st.qText}>+{res.bonus} XP de bônus por fazer {tr.goal} questões hoje.</Text>
            </View>
          ) : null}

          {res.cargoUp ? (
            <View style={[st.card, { alignSelf: 'stretch', marginTop: 12, backgroundColor: cargo.color }]}>
              <Text style={[st.tag, { color: '#fff' }]}>PROMOÇÃO</Text>
              <Text style={[st.qText, { color: '#fff' }]}>Agora você é {cargo.name}!</Text>
            </View>
          ) : res.levelUp ? (
            <View style={[st.card, { alignSelf: 'stretch', marginTop: 12, backgroundColor: p.violetSoft, borderColor: p.violetEdge }]}>
              <Text style={[st.tag]}>NOVO NÍVEL</Text>
              <Text style={st.qText}>Nível {lv.level}</Text>
            </View>
          ) : null}

          <View style={[st.card, { alignSelf: 'stretch', marginTop: 12 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={st.h2}>META DE HOJE</Text>
              <Text style={st.h2}>{Math.min(res.dayQ, tr.goal)}/{tr.goal}</Text>
            </View>
            <View style={[st.bar, { flex: 0 }]}>
              <View style={[st.barFill, { width: `${Math.round(goalPct * 100)}%`, backgroundColor: goalPct >= 1 ? p.orange : p.green }]} />
            </View>
          </View>

          <View style={{ alignSelf: 'stretch', marginTop: 20, gap: 10 }}>
            <Btn label="MAIS 10 QUESTÕES" icon="play" onPress={again} p={p} st={st} />
            <Btn label="VOLTAR AO TREINO" tone="ghost" onPress={() => { sfx?.tap?.(); setPhase('home') }} p={p} st={st} />
          </View>
        </ScrollView>
      </View>
    )
  }

  /* =============================== HOME =============================== */
  const unlocked = (i) => cleared || i <= tr.stage
  const selStage = sel === 'mix' ? null : STAGES[sel]
  const goalPct = Math.min(1, tr.dayQ / tr.goal)
  const cargo = cargoFor(xpTotal)

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      <View style={st.top}>
        <Pressable onPress={leave} style={st.iconBtn} accessibilityRole="button" accessibilityLabel="Voltar para a trilha">
          <Ionicons name="chevron-back" size={26} color={p.muted} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable onPress={toggleMute} style={st.iconBtn} accessibilityRole="button" accessibilityLabel={muted ? 'Ligar música' : 'Desligar música'}>
          <Ionicons name={muted ? 'volume-mute' : 'musical-notes'} size={22} color={muted ? p.muted : p.violet} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottom + 16 }} showsVerticalScrollIndicator={false}>
        <Text style={[st.tag, { color: p.orange }]}>VALE DO SILÊNCIO · SEM REDE</Text>
        <Text style={st.h1}>Treino diário</Text>
        <Text style={st.sub}>Sem relógio e sem pressa. Responda, entenda o porquê e ganhe XP. Quanto mais questões, mais alto no ranking da semana.</Text>

        <View style={[st.card, { marginTop: 16 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={st.h2}>META DE HOJE</Text>
              <Text style={{ color: p.ink, fontWeight: '900', fontSize: f(28) }}>
                {Math.min(tr.dayQ, tr.goal)}
                <Text style={{ color: p.muted, fontSize: f(16) }}> / {tr.goal} questões</Text>
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Chip st={st} icon="flame" text={`${tr.streak} ${tr.streak === 1 ? 'dia' : 'dias'}`} bg={tr.streak > 0 ? p.orangeSoft : p.line} fg={tr.streak > 0 ? p.orange : p.muted} />
              <Chip st={st} icon="flash" text={`${cargo.name}`} bg={p.violetSoft} fg={p.violet} />
            </View>
          </View>
          <View style={[st.bar, { flex: 0, marginTop: 10 }]} accessibilityLabel={`Meta de hoje: ${tr.dayQ} de ${tr.goal}`}>
            <View style={[st.barFill, { width: `${Math.round(goalPct * 100)}%`, backgroundColor: goalPct >= 1 ? p.orange : p.green }]} />
          </View>
          <Text style={[st.small, { marginTop: 8 }]}>
            Esta semana: {tr.weekQ} questões · Total: {tr.questions} questões, {tr.correct} acertos
          </Text>
        </View>

        <Text style={[st.h2, { marginTop: 20 }]}>TRILHA DO TREINO</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4, paddingRight: 8 }}>
          {STAGES.map((s, i) => {
            const open = unlocked(i)
            const on = sel === i
            const isFront = i === frontier && !cleared
            return (
              <Pressable
                key={s.title}
                onPress={() => {
                  if (!open) {
                    sfx?.fail?.()
                    return
                  }
                  sfx?.tap?.()
                  setSel(i)
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: on, disabled: !open }}
                accessibilityLabel={`Degrau ${i + 1}: ${s.title}. ${open ? (isFront ? 'Seu degrau atual' : 'Liberado') : 'Bloqueado'}`}
                style={{ width: 84, alignItems: 'center', gap: 6 }}
              >
                <View style={{ width: 62, height: 62, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderBottomWidth: 6, backgroundColor: on ? p.violetSoft : open ? p.paper : p.line, borderColor: on ? p.violet : isFront ? p.green : p.line }}>
                  <Ionicons name={open ? s.icon : 'lock-closed'} size={26} color={on ? p.violet : open ? p.ink : p.muted} />
                </View>
                <Text numberOfLines={2} style={{ color: open ? p.ink : p.muted, fontWeight: '800', fontSize: f(11), textAlign: 'center' }}>
                  {i + 1}. {s.title}
                </Text>
              </Pressable>
            )
          })}
          <Pressable
            onPress={() => {
              if (!cleared && tr.stage < 3) {
                sfx?.fail?.()
                return
              }
              sfx?.tap?.()
              setSel('mix')
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: sel === 'mix', disabled: !cleared && tr.stage < 3 }}
            accessibilityLabel="Mistura geral dos degraus liberados"
            style={{ width: 84, alignItems: 'center', gap: 6 }}
          >
            <View style={{ width: 62, height: 62, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderBottomWidth: 6, backgroundColor: sel === 'mix' ? p.violetSoft : p.paper, borderColor: sel === 'mix' ? p.violet : p.line }}>
              <Ionicons name={cleared || tr.stage >= 3 ? 'shuffle' : 'lock-closed'} size={26} color={sel === 'mix' ? p.violet : p.ink} />
            </View>
            <Text style={{ color: p.ink, fontWeight: '800', fontSize: f(11), textAlign: 'center' }}>Mistura geral</Text>
          </Pressable>
        </ScrollView>

        <View style={[st.card, { marginTop: 10 }]}>
          {selStage ? (
            <>
              <Text style={st.tag}>
                DEGRAU {sel + 1} DE {nStages}
                {sel === frontier && !cleared ? ' · SEU DEGRAU' : ''}
              </Text>
              <Text style={st.qText}>{selStage.title}</Text>
              <Text style={[st.small, { marginTop: 4 }]}>Base: {selStage.src}</Text>
              <Pressable onPress={() => { sfx?.tap?.(); setLesson({ stage: sel, start: false }) }} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, minHeight: 44 }}>
                <Ionicons name="bulb" size={18} color={p.orange} />
                <Text style={{ color: p.violet, fontWeight: '900', fontSize: f(14) }}>Ver aula-relâmpago</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={st.tag}>MISTURA GERAL</Text>
              <Text style={st.qText}>Tudo o que você já liberou, embaralhado</Text>
              <Text style={[st.small, { marginTop: 4 }]}>Inclui questões geradas na hora: nunca acaba.</Text>
            </>
          )}
        </View>

        <Btn label={`TREINAR · ${SESSION} QUESTÕES`} icon="play" onPress={onTrain} p={p} st={st} style={{ marginTop: 14 }} />
        {sel === frontier && !cleared ? (
          <Text style={[st.small, { textAlign: 'center', marginTop: 8 }]}>Acerte {Math.round(PASS * SESSION)} de {SESSION} de primeira para liberar o próximo degrau.</Text>
        ) : null}

        <Text style={[st.small, { textAlign: 'center', marginTop: 20 }]}>
          Questões originais, na ordem dos cursos de C: MC202 (Unicamp), Curso de C (UFSC) e APC (UnB).
        </Text>
      </ScrollView>

      {/* aula-relâmpago */}
      <Modal visible={!!lesson} transparent animationType={t.reduce ? 'none' : 'slide'} onRequestClose={closeLesson}>
        <View style={{ flex: 1, backgroundColor: p.overlay, justifyContent: 'flex-end' }}>
          <View style={[st.sheet, { backgroundColor: p.paper, borderTopColor: p.violet, paddingBottom: bottom, maxHeight: '88%' }]} accessibilityViewIsModal>
            {lessonStage ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={st.tag}>AULA-RELÂMPAGO · DEGRAU {lesson.stage + 1}</Text>
                <Text style={st.qText}>{lessonStage.title}</Text>
                {lessonStage.lesson.map((ln, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: p.violetSoft, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: p.violet, fontWeight: '900', fontSize: 13 }}>{i + 1}</Text>
                    </View>
                    <Text style={{ flex: 1, color: p.ink, fontWeight: '600', fontSize: f(15), lineHeight: f(22) }}>{ln}</Text>
                  </View>
                ))}
                <CodeBox lines={lessonStage.example} st={st} p={p} />
                <Btn label={lesson.start ? 'ENTENDI, BORA TREINAR' : 'FECHAR'} onPress={closeLesson} p={p} st={st} style={{ marginTop: 16 }} />
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  )
}
