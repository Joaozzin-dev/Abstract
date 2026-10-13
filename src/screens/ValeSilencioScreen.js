/**
 * Speed Run — Vale do Silêncio.
 * 1:30 para acertar o máximo. É AQUI que se ganha XP (nível e cargo do perfil).
 *
 * Dinâmica:
 *  - 8 tipos de pergunta (escolha, V/F, decisão, o que aparece, complete, ache o erro, ordene, intruso)
 *  - Combo: acertos seguidos dão mais XP; a cada 5 seguidos ganha +2s
 *  - Rápido (<2,5s) dá bônus de XP; erro custa -3s e zera o combo
 *  - Nenhuma pergunta fixa se repete até o banco inteiro ser visto; 1 em cada 4 é gerada na hora
 *
 * Uso:  <ValeSilencioScreen valeId="vale1" onClose={() => ...} />
 * Sem props, lê o valeId e usa setScreen da store, como a JourneyScreen.
 * vale1 = Speed Run (esta tela). vale2 = Treino sem rede (TreinoScreen.js): sem tempo, vale por quantidade.
 */
import { useEffect, useRef, useState } from 'react'
import { StyleSheet, Animated, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { View, Text, Pressable, ScrollView, Ionicons } from '../lib/themedRN'
import { useStore } from '../store/useStore'
import { sfx } from '../lib/sounds'
import { BANKS } from './speedrunQuestions'
import { commitRun, levelInfo, cargoFor, totalXp } from '../lib/xp'
import { flushCloudSync } from '../lib/cloud'
import TreinoScreen from './TreinoScreen'

const DURATION_MS = 90000
const PENALTY_MS = 3000
const BONUS_MS = 2000
const COMBO_BONUS_EVERY = 5
const FAST_MS = 2500
const OK_DELAY = 320
const WRONG_DELAY = 1000

const BASE_XP = { tf: 6, dec: 6, mc: 8, code: 10, fix: 10, odd: 10, bug: 12, order: 14 }
const TYPE_LABEL = {
  mc: 'ESCOLHA',
  tf: 'VERDADEIRO OU FALSO',
  dec: 'DECISÃO RÁPIDA',
  code: 'O QUE APARECE?',
  fix: 'COMPLETE',
  bug: 'ACHE O ERRO',
  order: 'ORDENE',
  odd: 'ACHE O INTRUSO',
}

const C = {
  cream: '#FFF8EA',
  paper: '#FFFFFF',
  ink: '#1F2A48',
  inkSoft: '#2B3A63',
  inkMuted: '#6B7391',
  line: '#EADFC5',
  green: '#58CC02',
  greenDark: '#46A302',
  greenSoft: '#E3F8CC',
  orange: '#FF9600',
  orangeDark: '#D97E00',
  orangeSoft: '#FFE9C7',
  violet: '#7C5CFF',
  violetDark: '#5B3FD9',
  violetSoft: '#ECE6FF',
  red: '#FF4B4B',
  redDark: '#D63838',
  redSoft: '#FFE1E1',
  yellow: '#FFC800',
  code: '#18203A',
}

const TITLES = { vale1: 'Plantão', vale2: 'Sem rede' }
const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace'

/* ------------------------------------------------------------------ */
/*  BARALHO SEM REPETIÇÃO                                              */
/* ------------------------------------------------------------------ */
const usedByBank = {} // lembra as perguntas fixas já vistas, entre partidas

function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function makeDeck(bankKey) {
  const bank = BANKS[bankKey] || BANKS.vale1
  const used = (usedByBank[bankKey] = usedByBank[bankKey] || new Set())
  let fresh = bank.items.filter((q) => !used.has(q.id))
  if (!fresh.length) {
    used.clear() // viu todas: começa um novo ciclo
    fresh = bank.items
  }
  return shuffle(fresh)
}

/** Monta a pergunta pronta (alternativas embaralhadas etc). */
function prepare(q) {
  const base = { id: q.id, t: q.t, q: q.q, code: q.code, a: q.a }
  switch (q.t) {
    case 'tf':
      return { ...base, a: q.a ? 'Verdadeiro' : 'Falso', opts: ['Verdadeiro', 'Falso'] }
    case 'bug':
      return { ...base, lines: q.code }
    case 'order': {
      const items = q.lines.map((text, i) => ({ text, i }))
      let mixed = shuffle(items)
      for (let k = 0; k < 6 && mixed.every((it, idx) => it.i === idx); k++) mixed = shuffle(items)
      return { ...base, items: mixed, n: items.length, lines: q.lines }
    }
    case 'odd':
      return { ...base, opts: shuffle(q.items) }
    default:
      return { ...base, opts: shuffle([q.a, ...(q.w || [])]) }
  }
}

function useDeck(bankKey) {
  const queue = useRef([])
  const last = useRef(null)
  const count = useRef(0)
  return {
    reset() {
      queue.current = makeDeck(bankKey)
      last.current = null
      count.current = 0
    },
    next() {
      const bank = BANKS[bankKey] || BANKS.vale1
      count.current += 1
      // 1 a cada 4 perguntas vem de um gerador (números novos toda hora)
      if (bank.gens && bank.gens.length && count.current % 4 === 0) {
        const g = bank.gens[Math.floor(Math.random() * bank.gens.length)]
        return prepare(g())
      }
      if (!queue.current.length) {
        const used = usedByBank[bankKey]
        if (used) used.clear()
        queue.current = makeDeck(bankKey).filter((x) => x.id !== last.current)
      }
      const q = queue.current.pop()
      if (!q) return null
      usedByBank[bankKey].add(q.id)
      last.current = q.id
      return prepare(q)
    },
  }
}

const fmtClock = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/* ------------------------------------------------------------------ */
/*  PEÇAS                                                              */
/* ------------------------------------------------------------------ */
function Big({ label, onPress, tone = 'green', icon, style }) {
  const t = {
    green: { face: C.green, base: C.greenDark },
    violet: { face: C.violet, base: C.violetDark },
    ghost: { face: C.paper, base: C.line },
  }[tone]
  const [down, setDown] = useState(false)
  const ghost = tone === 'ghost'
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={style}
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
          borderWidth: ghost ? 2 : 0,
          borderColor: t.base,
          marginTop: down ? 4 : 0,
          marginBottom: down ? 0 : 4,
        }}
      >
        {icon ? <Ionicons name={icon} size={20} color={ghost ? C.ink : '#fff'} /> : null}
        <Text style={{ color: ghost ? C.ink : '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 0.8 }}>{label}</Text>
      </View>
    </Pressable>
  )
}

function Chip({ icon, text, bg, fg }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: bg, paddingHorizontal: 10, height: 34, borderRadius: 17 }}>
      <Ionicons name={icon} size={15} color={fg} />
      <Text style={{ color: fg, fontWeight: '900', fontSize: 14 }}>{text}</Text>
    </View>
  )
}

/** Bloco de código. `blank` preenche o ____ (só no fix). */
function CodeBlock({ lines, blank, blankOk }) {
  return (
    <View style={s.codeBox}>
      {lines.map((ln, i) => {
        const parts = String(ln).split('____')
        return (
          <View key={i} style={{ flexDirection: 'row' }}>
            <Text style={s.codeNum}>{i + 1}</Text>
            <Text style={s.codeText}>
              {parts.map((p, k) => (
                <Text key={k}>
                  {p}
                  {k < parts.length - 1 ? (
                    <Text style={[s.blank, blank ? { color: blankOk ? '#9BE564' : '#FF8A8A' } : null]}>
                      {blank ? ` ${blank} ` : ' ____ '}
                    </Text>
                  ) : null}
                </Text>
              ))}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

/* ------------------------------------------------------------------ */
/*  TELA                                                               */
/* ------------------------------------------------------------------ */
function SpeedRunScreen({ valeId, onClose }) {
  const insets = useSafeAreaInsets()
  const storeValeId = useStore((st) => st.valeId)
  const setScreen = useStore((st) => st.setScreen)
  const progress = useStore((st) => st.progress) || {}
  const key = (valeId || storeValeId) === 'vale2' ? 'vale2' : 'vale1'
  const best = progress[key]
  const myXp = totalXp(progress)

  const [stage, setStage] = useState('intro') // intro | count | play | result
  const [count, setCount] = useState(3)
  const [left, setLeft] = useState(DURATION_MS)
  const [score, setScore] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [combo, setCombo] = useState(0)
  const [xp, setXp] = useState(0)
  const [cur, setCur] = useState(null)
  const [picked, setPicked] = useState(null) // alternativa / linha tocada
  const [seq, setSeq] = useState([]) // ordem tocada (tipo order)
  const [pop, setPop] = useState(null)
  const [final, setFinal] = useState(null)

  const deck = useDeck(key)
  const startAt = useRef(0)
  const budget = useRef(DURATION_MS)
  const qStart = useRef(0)
  const lastHitMs = useRef(0)
  const scoreRef = useRef(0)
  const wrongRef = useRef(0)
  const comboRef = useRef(0)
  const bestComboRef = useRef(0)
  const xpRef = useRef(0)
  const seqRef = useRef([])
  const locked = useRef(true)
  const finished = useRef(false)
  const timers = useRef([])
  const tick = useRef(null)
  const shake = useRef(new Animated.Value(0)).current
  const popAnim = useRef(new Animated.Value(0)).current

  const later = (fn, ms) => {
    const id = setTimeout(fn, ms)
    timers.current.push(id)
  }
  const clearAll = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    if (tick.current) clearInterval(tick.current)
    tick.current = null
  }
  useEffect(() => clearAll, [])

  function close() {
    clearAll()
    sfx?.tap?.()
    if (onClose) onClose()
    else if (setScreen) setScreen('journey')
  }

  /* ---------- começar (3, 2, 1) ---------- */
  function start() {
    sfx?.tap?.()
    clearAll()
    deck.reset()
    scoreRef.current = 0
    wrongRef.current = 0
    comboRef.current = 0
    bestComboRef.current = 0
    xpRef.current = 0
    lastHitMs.current = 0
    budget.current = DURATION_MS
    finished.current = false
    locked.current = true
    seqRef.current = []
    setScore(0)
    setWrong(0)
    setCombo(0)
    setXp(0)
    setPicked(null)
    setSeq([])
    setPop(null)
    setLeft(DURATION_MS)
    setCur(null)
    setFinal(null)
    setCount(3)
    setStage('count')
    later(() => setCount(2), 700)
    later(() => setCount(1), 1400)
    later(beginPlay, 2100)
  }

  function beginPlay() {
    setCur(deck.next())
    setStage('play')
    startAt.current = Date.now()
    qStart.current = Date.now()
    locked.current = false
    tick.current = setInterval(() => {
      const rest = budget.current - (Date.now() - startAt.current)
      if (rest <= 0) finish()
      else setLeft(Math.min(rest, DURATION_MS))
    }, 100)
  }

  function finish() {
    if (finished.current) return
    finished.current = true
    clearAll()
    locked.current = true
    const sc = scoreRef.current
    const t = lastHitMs.current || DURATION_MS
    const gained = xpRef.current
    const res = commitRun({ key, score: sc, timeMs: t, xp: gained, combo: bestComboRef.current })
    // manda XP/recorde para a nuvem agora (o ranking e o feed leem de lá)
    Promise.resolve(flushCloudSync()).catch(() => {})
    const before = levelInfo(res.xpBefore)
    const after = levelInfo(res.xpAfter)
    setLeft(0)
    setFinal({
      score: sc,
      wrong: wrongRef.current,
      xp: gained,
      bestCombo: bestComboRef.current,
      newBest: res.newBest,
      xpAfter: res.xpAfter,
      levelUp: after.level > before.level,
      cargoUp: cargoFor(res.xpAfter).index > cargoFor(res.xpBefore).index,
    })
    setStage('result')
    sfx?.win?.()
  }

  /* ---------- feedback flutuante ---------- */
  function showPop(text, tone) {
    setPop({ text, tone })
    popAnim.setValue(0)
    Animated.timing(popAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start()
  }

  function judge(ok, q) {
    if (ok) {
      sfx?.deploy?.()
      comboRef.current += 1
      bestComboRef.current = Math.max(bestComboRef.current, comboRef.current)
      scoreRef.current += 1
      lastHitMs.current = Date.now() - startAt.current
      const fast = Date.now() - qStart.current <= FAST_MS
      const gain = (BASE_XP[q.t] || 8) + Math.min(comboRef.current - 1, 10) + (fast ? 5 : 0)
      xpRef.current += gain
      let msg = `+${gain} XP`
      if (comboRef.current % COMBO_BONUS_EVERY === 0) {
        budget.current += BONUS_MS
        msg += ' · +2s'
      }
      if (fast) msg += ' ⚡'
      setScore(scoreRef.current)
      setCombo(comboRef.current)
      setXp(xpRef.current)
      showPop(msg, 'ok')
    } else {
      sfx?.fail?.()
      comboRef.current = 0
      wrongRef.current += 1
      budget.current -= PENALTY_MS
      setCombo(0)
      setWrong(wrongRef.current)
      showPop('-3s', 'bad')
      shake.setValue(0)
      Animated.sequence([
        Animated.timing(shake, { toValue: 8, duration: 50, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -8, duration: 50, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 4, duration: 50, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start()
    }
  }

  function nextQuestion(delay) {
    later(() => {
      setPicked(null)
      seqRef.current = []
      setSeq([])
      setCur(deck.next())
      qStart.current = Date.now()
      locked.current = false
    }, delay)
  }

  const timeUp = () => budget.current - (Date.now() - startAt.current) <= 0

  /** Escolha, V/F, decisão, código, complete, intruso e "ache o erro" (índice da linha). */
  function answer(opt) {
    if (locked.current || !cur || cur.t === 'order') return
    if (timeUp()) return
    locked.current = true
    setPicked(opt)
    const ok = opt === cur.a
    judge(ok, cur)
    nextQuestion(ok ? OK_DELAY : WRONG_DELAY)
  }

  /** Ordene: toque nos passos na ordem certa. */
  function tapOrder(item) {
    if (locked.current || !cur || cur.t !== 'order') return
    if (timeUp()) return
    if (seqRef.current.includes(item.i)) return
    const expected = seqRef.current.length
    if (item.i !== expected) {
      locked.current = true
      setPicked(item.i)
      judge(false, cur)
      nextQuestion(WRONG_DELAY + 300)
      return
    }
    seqRef.current = [...seqRef.current, item.i]
    setSeq(seqRef.current)
    if (seqRef.current.length === cur.n) {
      locked.current = true
      judge(true, cur)
      nextQuestion(OK_DELAY + 100)
    } else {
      sfx?.tap?.()
    }
  }

  const danger = left <= 15000
  const barColor = danger ? C.red : left <= 40000 ? C.orange : C.green

  /* ---------------- INTRO ---------------- */
  if (stage === 'intro') {
    const cargo = cargoFor(myXp)
    const lv = levelInfo(myXp)
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={s.top}>
          <Pressable onPress={close} style={s.iconBtn} accessibilityRole="button" accessibilityLabel="Voltar">
            <Ionicons name="close" size={24} color={C.inkMuted} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
          <View style={s.hero}>
            <View style={s.heroTag}>
              <Text style={{ color: C.orangeDark, fontWeight: '900', fontSize: 11, letterSpacing: 0.6 }}>VALE DO SILÊNCIO · {TITLES[key].toUpperCase()}</Text>
            </View>
            <Text style={s.heroTitle}>Speed run: 1:30</Text>
            <Text style={s.heroSub}>Responda o mais rápido que der. Cada acerto vira XP e o XP sobe seu cargo.</Text>
          </View>

          <View style={s.cargoCard}>
            <View style={[s.cargoIcon, { backgroundColor: cargo.color }]}>
              <Ionicons name={cargo.icon} size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.ink, fontWeight: '900', fontSize: 15 }}>
                {cargo.name} · nível {lv.level}
              </Text>
              <View style={s.xpTrack}>
                <View style={[s.xpFill, { width: `${Math.round(lv.pct * 100)}%` }]} />
              </View>
              <Text style={{ color: C.inkMuted, fontWeight: '700', fontSize: 12, marginTop: 4 }}>
                {myXp} XP · faltam {lv.toNext} para o nível {lv.level + 1}
              </Text>
            </View>
          </View>

          <View style={s.rules}>
            {[
              ['flame', 'Acertos seguidos formam COMBO: mais XP a cada acerto.'],
              ['add-circle', `A cada ${COMBO_BONUS_EVERY} de combo você ganha +2 segundos.`],
              ['flash', 'Respondeu em menos de 2,5s? Bônus de XP.'],
              ['remove-circle', 'Errou? -3 segundos e o combo zera.'],
            ].map(([ic, tx]) => (
              <View key={ic} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.violetSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={ic} size={20} color={C.violet} />
                </View>
                <Text style={{ flex: 1, color: C.ink, fontWeight: '800', fontSize: 14, lineHeight: 20 }}>{tx}</Text>
              </View>
            ))}
          </View>

          {best && best.bestScore != null ? (
            <View style={s.best}>
              <Ionicons name="trophy" size={20} color={C.orangeDark} />
              <Text style={{ color: C.orangeDark, fontWeight: '900', fontSize: 14 }}>
                Recorde: {best.bestScore} acertos{best.bestCombo ? ` · combo x${best.bestCombo}` : ''}
              </Text>
            </View>
          ) : null}

          <Big label="COMEÇAR" icon="play" onPress={start} style={{ marginTop: 20 }} />
        </ScrollView>
      </View>
    )
  }

  /* ---------------- 3, 2, 1 ---------------- */
  if (stage === 'count') {
    return (
      <View style={[s.root, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: C.violet, fontWeight: '900', fontSize: 14, letterSpacing: 2 }}>PREPARE-SE</Text>
        <Text style={{ color: C.ink, fontWeight: '900', fontSize: 120 }} accessibilityLiveRegion="polite">
          {count}
        </Text>
      </View>
    )
  }

  /* ---------------- RESULTADO ---------------- */
  if (stage === 'result' && final) {
    const total = final.score + final.wrong
    const pct = total ? Math.round((final.score / total) * 100) : 0
    const lv = levelInfo(final.xpAfter)
    const cargo = cargoFor(final.xpAfter)
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 24, paddingBottom: insets.bottom + 24, alignItems: 'center' }} showsVerticalScrollIndicator={false}>
          <Text style={{ color: C.inkMuted, fontWeight: '900', fontSize: 12, letterSpacing: 1 }}>TEMPO ESGOTADO</Text>
          <Text style={{ color: C.ink, fontWeight: '900', fontSize: 72, marginTop: 6 }} accessibilityLabel={`${final.score} acertos`}>
            {final.score}
          </Text>
          <Text style={{ color: C.inkSoft, fontWeight: '800', fontSize: 16 }}>{final.score === 1 ? 'acerto' : 'acertos'}</Text>

          <View style={s.xpBig}>
            <Ionicons name="flash" size={22} color={C.orangeDark} />
            <Text style={{ color: C.orangeDark, fontWeight: '900', fontSize: 24 }}>+{final.xp} XP</Text>
          </View>

          {final.cargoUp ? (
            <View style={[s.banner, { backgroundColor: cargo.color }]}>
              <Ionicons name={cargo.icon} size={22} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>Promoção! Agora você é {cargo.name}</Text>
            </View>
          ) : final.levelUp ? (
            <View style={[s.banner, { backgroundColor: C.violet }]}>
              <Ionicons name="arrow-up-circle" size={22} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>Nível {lv.level}!</Text>
            </View>
          ) : null}

          {final.newBest ? (
            <View style={[s.best, { marginTop: 12 }]}>
              <Ionicons name="ribbon" size={20} color={C.orangeDark} />
              <Text style={{ color: C.orangeDark, fontWeight: '900', fontSize: 14 }}>Novo recorde!</Text>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 18 }}>
            <Chip icon="checkmark-circle" text={`${pct}% de acerto`} bg={C.greenSoft} fg={C.greenDark} />
            <Chip icon="close-circle" text={`${final.wrong} ${final.wrong === 1 ? 'erro' : 'erros'}`} bg={C.redSoft} fg={C.redDark} />
            <Chip icon="flame" text={`combo x${final.bestCombo}`} bg={C.orangeSoft} fg={C.orangeDark} />
          </View>

          <View style={[s.cargoCard, { alignSelf: 'stretch', marginTop: 22 }]}>
            <View style={[s.cargoIcon, { backgroundColor: cargo.color }]}>
              <Ionicons name={cargo.icon} size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.ink, fontWeight: '900', fontSize: 15 }}>
                {cargo.name} · nível {lv.level}
              </Text>
              <View style={s.xpTrack}>
                <View style={[s.xpFill, { width: `${Math.round(lv.pct * 100)}%` }]} />
              </View>
              <Text style={{ color: C.inkMuted, fontWeight: '700', fontSize: 12, marginTop: 4 }}>
                {final.xpAfter} XP · {cargo.next ? `faltam ${cargo.toNext} para ${cargo.next.name}` : 'cargo máximo!'}
              </Text>
            </View>
          </View>

          <View style={{ alignSelf: 'stretch', marginTop: 24 }}>
            <Big label="JOGAR DE NOVO" icon="refresh" onPress={start} />
            <Big label="VOLTAR À TRILHA" tone="ghost" onPress={close} style={{ marginTop: 10 }} />
          </View>
        </ScrollView>
      </View>
    )
  }

  /* ---------------- JOGO ---------------- */
  const reveal = picked !== null
  const rowLayout = cur && (cur.t === 'tf' || cur.t === 'dec')
  const popOpacity = popAnim.interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 1, 1, 0] })
  const popY = popAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -26] })

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.top}>
        <Pressable onPress={close} style={s.iconBtn} accessibilityRole="button" accessibilityLabel="Sair da speed run">
          <Ionicons name="close" size={24} color={C.inkMuted} />
        </Pressable>
        <View style={{ flex: 1 }} />
        {combo >= 2 ? (
          <>
            <Chip icon="flame" text={`x${combo}`} bg={C.orangeSoft} fg={C.orangeDark} />
            <View style={{ width: 8 }} />
          </>
        ) : null}
        <Chip icon="flash" text={`${xp}`} bg={C.violetSoft} fg={C.violet} />
        <View style={{ width: 8 }} />
        <Chip icon="checkmark-circle" text={String(score)} bg={C.greenSoft} fg={C.greenDark} />
        <View style={{ width: 8 }} />
        <Chip icon="close-circle" text={String(wrong)} bg={C.redSoft} fg={C.redDark} />
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Text
            style={{ color: danger ? C.redDark : C.ink, fontWeight: '900', fontSize: 34 }}
            accessibilityLabel={`${Math.ceil(left / 1000)} segundos restantes`}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {fmtClock(left)}
          </Text>
          <Animated.Text
            style={{
              position: 'absolute',
              left: 90,
              top: 4,
              fontWeight: '900',
              fontSize: 16,
              color: pop && pop.tone === 'bad' ? C.redDark : C.greenDark,
              opacity: popOpacity,
              transform: [{ translateY: popY }],
            }}
          >
            {pop ? pop.text : ''}
          </Animated.Text>
          <Text style={{ color: C.inkMuted, fontWeight: '800', fontSize: 12 }}>{TITLES[key].toUpperCase()}</Text>
        </View>
        <View style={{ height: 12, borderRadius: 8, backgroundColor: C.line, marginTop: 6, overflow: 'hidden' }}>
          <View style={{ height: 12, borderRadius: 8, backgroundColor: barColor, width: `${Math.max(0, Math.min(1, left / DURATION_MS)) * 100}%` }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {cur ? (
          <Animated.View style={{ transform: [{ translateX: shake }] }}>
            <View style={s.qCard} accessibilityLiveRegion="polite">
              <Text style={{ color: C.violet, fontWeight: '900', fontSize: 10, letterSpacing: 1 }}>
                {TYPE_LABEL[cur.t] || 'PERGUNTA'} · Nº {score + wrong + 1}
              </Text>
              <Text style={{ color: C.ink, fontWeight: '900', fontSize: 20, lineHeight: 27, marginTop: 6 }}>{cur.q}</Text>
            </View>

            {/* código de apoio (o que aparece / complete) */}
            {cur.t === 'code' && cur.code ? <CodeBlock lines={cur.code} /> : null}
            {cur.t === 'fix' && cur.code ? <CodeBlock lines={cur.code} blank={reveal ? cur.a : null} blankOk={picked === cur.a} /> : null}

            {/* ache o erro: toque na linha */}
            {cur.t === 'bug' ? (
              <View style={[s.codeBox, { paddingVertical: 8 }]}>
                {cur.lines.map((ln, i) => {
                  const right = reveal && i === cur.a
                  const badPick = reveal && picked === i && i !== cur.a
                  return (
                    <Pressable
                      key={i}
                      onPress={() => answer(i)}
                      accessibilityRole="button"
                      accessibilityLabel={`Linha ${i + 1}: ${ln}`}
                      style={[s.bugLine, right && { backgroundColor: '#1F4D1A' }, badPick && { backgroundColor: '#5A1F1F' }]}
                    >
                      <Text style={s.codeNum}>{i + 1}</Text>
                      <Text style={[s.codeText, { flex: 1 }]}>{ln}</Text>
                      {right ? <Ionicons name="checkmark-circle" size={18} color="#9BE564" /> : null}
                      {badPick ? <Ionicons name="close-circle" size={18} color="#FF8A8A" /> : null}
                    </Pressable>
                  )
                })}
              </View>
            ) : null}

            {/* ordene: toque na ordem certa */}
            {cur.t === 'order' ? (
              <View style={{ gap: 10, marginTop: 14 }}>
                {cur.items.map((it) => {
                  const pos = seq.indexOf(it.i)
                  const done = pos >= 0
                  const wrongPick = reveal && picked === it.i
                  const shouldBe = reveal && it.i === seq.length
                  return (
                    <Pressable
                      key={it.i}
                      onPress={() => tapOrder(it)}
                      accessibilityRole="button"
                      accessibilityLabel={it.text}
                      style={[
                        s.opt,
                        done && { backgroundColor: C.greenSoft, borderColor: C.green },
                        wrongPick && { backgroundColor: C.redSoft, borderColor: C.red },
                        shouldBe && { backgroundColor: C.greenSoft, borderColor: C.green },
                      ]}
                    >
                      <View style={[s.orderBadge, done && { backgroundColor: C.green }]}>
                        <Text style={{ color: done ? '#fff' : C.inkMuted, fontWeight: '900', fontSize: 13 }}>{done ? pos + 1 : '·'}</Text>
                      </View>
                      <Text style={{ color: C.ink, fontWeight: '800', fontSize: 14, lineHeight: 20, flex: 1, fontFamily: it.text.startsWith(' ') || /[<(=]/.test(it.text) ? MONO : undefined }}>
                        {it.text}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            ) : null}

            {/* alternativas */}
            {cur.opts ? (
              <View style={{ flexDirection: rowLayout ? 'row' : 'column', gap: 10, marginTop: 14 }}>
                {cur.opts.map((o) => {
                  const isRight = o === cur.a
                  const isPicked = picked === o
                  let bg = C.paper
                  let bd = C.line
                  if (reveal && isRight) {
                    bg = C.greenSoft
                    bd = C.green
                  } else if (reveal && isPicked) {
                    bg = C.redSoft
                    bd = C.red
                  }
                  return (
                    <Pressable
                      key={o}
                      onPress={() => answer(o)}
                      accessibilityRole="button"
                      accessibilityLabel={o}
                      style={[s.opt, rowLayout && { flex: 1, minHeight: cur.t === 'tf' ? 84 : 72 }, { backgroundColor: bg, borderColor: bd }]}
                    >
                      <Text style={{ color: C.ink, fontWeight: '800', fontSize: rowLayout ? 16 : 15, lineHeight: 21, flex: 1, textAlign: rowLayout ? 'center' : 'left' }}>{o}</Text>
                      {!rowLayout && reveal && isRight ? <Ionicons name="checkmark-circle" size={22} color={C.greenDark} /> : null}
                      {!rowLayout && reveal && isPicked && !isRight ? <Ionicons name="close-circle" size={22} color={C.redDark} /> : null}
                    </Pressable>
                  )
                })}
              </View>
            ) : null}
          </Animated.View>
        ) : null}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.cream },
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  hero: { backgroundColor: C.ink, borderRadius: 26, padding: 18, borderBottomWidth: 5, borderBottomColor: '#141B33' },
  heroTag: { alignSelf: 'flex-start', backgroundColor: C.orangeSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  heroTitle: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 10 },
  heroSub: { color: '#C9D0EA', fontWeight: '700', fontSize: 14, marginTop: 6, lineHeight: 20 },
  rules: { backgroundColor: C.paper, borderRadius: 20, borderWidth: 2, borderColor: C.line, padding: 14, gap: 14, marginTop: 16 },
  best: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.orangeSoft, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginTop: 14, alignSelf: 'flex-start' },
  qCard: { backgroundColor: C.paper, borderRadius: 20, borderWidth: 2, borderBottomWidth: 5, borderColor: C.line, padding: 16 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 16, borderWidth: 2, borderBottomWidth: 5, borderColor: C.line, backgroundColor: C.paper, paddingHorizontal: 14, paddingVertical: 14, minHeight: 58 },
  codeBox: { backgroundColor: C.code, borderRadius: 16, padding: 14, marginTop: 14, gap: 3 },
  codeNum: { color: '#5B6896', fontFamily: MONO, fontSize: 12, width: 22, lineHeight: 20 },
  codeText: { color: '#E8ECFF', fontFamily: MONO, fontSize: 14, lineHeight: 20 },
  blank: { color: '#FFC800', fontWeight: '900', backgroundColor: '#2B3560' },
  bugLine: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 9, borderRadius: 10, minHeight: 40 },
  orderBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.line, alignItems: 'center', justifyContent: 'center' },
  cargoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.paper, borderRadius: 20, borderWidth: 2, borderColor: C.line, padding: 14, marginTop: 16 },
  cargoIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  xpTrack: { height: 10, borderRadius: 6, backgroundColor: C.line, marginTop: 6, overflow: 'hidden' },
  xpFill: { height: 10, borderRadius: 6, backgroundColor: C.violet },
  xpBig: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.orangeSoft, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 10, marginTop: 16 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, marginTop: 14 },
})

/** Roteia: vale2 (Sem rede) = Treino diário; vale1 (Plantão) = Speed Run. */
export default function ValeSilencioScreen(props) {
  const storeValeId = useStore((st) => st.valeId)
  const id = props.valeId || storeValeId
  return id === 'vale2' ? <TreinoScreen {...props} /> : <SpeedRunScreen {...props} />
}