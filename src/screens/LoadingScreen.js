/**
 * Carregamento UnB/CIC em um arquivo só: mascote animado, barra no formato das letras U-N-B,
 * banco de frases, hook de bootstrap e a tela.
 * Uso: const boot = useAppBootstrap(TASKS); <LoadingScreen status={boot.label} ready={boot.ready}
 *        error={boot.error} onRetry={boot.retry} onFinish={...} />
 *
 * - UMA frase por carregamento: sorteada ao abrir e fixa até a tela sair.
 * - A barra enche de forma fluida e só fecha em 100% quando o app está pronto e o tempo mínimo passou.
 * - Imagem do mascote: src/assets/duo.png.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useStore } from '../store/useStore'
import { CHARACTERS, useTheme } from './ProfileScreen'
import { C } from '../lib/colors'

const DUO = require('../assets/duo.png')

// Tempo mínimo na tela, para dar tempo de ler a frase e apreciar o mascote.
const MIN_MS = 5500

/* ---------- frases (adicione novas aqui) ---------- */
// Para adicionar frases, basta incluir um item no array. Nenhum componente precisa mudar.
const LOADING_PHRASES = [
  'A cada 10 alunos do CIC, 9 indicam o app. O décimo só tá ocupado e esqueceu de avaliar.',
  'Sim, ainda estamos carregando. Aproveita pra piscar.',
  'O baiano disse que era rapidinho. Ele mentiu.',
  'Se você está lendo isso, pelo menos uma coisa está funcionando.',
  'Aqui, aqui, aqui... funciona, por favorrrrrrrr!',
  'Você não precisa saber tudo. Só precisa continuar descobrindo.',
  'Ainda não entendeu? Beleza. É pra isso que você está aqui.',
  'Ninguém nasce sabendo depurar código igual o baiano. Alguns nascem derrubando coisas.',
  'Vai no seu ritmo. O código não vai fugir. Provavelmente.',
  'Até o computador precisa de um tempinho.',
  'Se tudo der certo, foi lógica. Se der errado, foi aprendizado.',
    'Você esperou até aqui. Agora o baiano tá com vergonha de demorar.',
    'O baiano fez isso aqui funcionar e agora tem medo de mexer.',
    'Um erro não define você. Mas o baiano gostaria de conversar sobre esse ponto e vírgula.'

];

const KEY = 'loading:recentPhrases'

/** Sorteia uma frase que não esteja entre as últimas usadas (guardadas entre aberturas do app). */
async function pickPhrase(list = LOADING_PHRASES) {
  let recent = []
  try {
    recent = JSON.parse((await AsyncStorage.getItem(KEY)) || '[]')
  } catch (_) {}
  const keep = Math.min(5, Math.floor(list.length / 2))
  const pool = list.filter((p) => !recent.includes(p))
  const source = pool.length ? pool : list
  const phrase = source[Math.floor(Math.random() * source.length)]
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify([phrase, ...recent].slice(0, keep)))
  } catch (_) {}
  return phrase
}

function greetingFor(name) {
  const h = new Date().getHours()
  const hi = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
  return name ? `${hi}, ${name}!` : `${hi}!`
}

/* ---------- bootstrap ---------- */

/**
 * Executa as tarefas reais de inicialização em paralelo.
 * tasks: [{ label, run: async () => {}, weight?: number, optional?: boolean }]
 * Defina o array fora do componente (referência estável).
 */
export function useAppBootstrap(tasks) {
  const [st, setSt] = useState({ progress: 0, label: tasks[0]?.label ?? '', ready: false, error: null, attempt: 0 })

  useEffect(() => {
    let alive = true
    const total = tasks.reduce((a, t) => a + (t.weight ?? 1), 0)
    let doneW = 0
    const pending = new Set(tasks.map((t) => t.label))

    async function run(t) {
      try {
        await t.run()
      } catch (e) {
        if (!t.optional) throw e
      }
      if (!alive) return
      doneW += t.weight ?? 1
      pending.delete(t.label)
      setSt((p) => ({ ...p, progress: doneW / total, label: [...pending][0] ?? 'Tudo pronto' }))
    }

    setSt((p) => ({ ...p, progress: 0, ready: false, error: null }))
    Promise.all(tasks.map(run))
      .then(() => alive && setSt((p) => ({ ...p, progress: 1, ready: true })))
      .catch((error) => alive && setSt((p) => ({ ...p, error })))
    return () => {
      alive = false
    }
  }, [st.attempt])

  const retry = () => setSt((p) => ({ ...p, attempt: p.attempt + 1 }))
  return { ...st, retry }
}

/* ---------- barra em forma de U N B ---------- */

// As próprias letras são a barra: formas sólidas em grade 7x8, preenchidas da esquerda para a direita.
const GLYPHS = {
  U: ['XX...XX', 'XX...XX', 'XX...XX', 'XX...XX', 'XX...XX', 'XX...XX', 'XXX.XXX', '.XXXXX.'],
  N: ['XX...XX', 'XXX..XX', 'XXXX.XX', 'XX.XXXX', 'XX..XXX', 'XX...XX', 'XX...XX', 'XX...XX'],
  B: ['XXXXXX.', 'XX...XX', 'XX...XX', 'XXXXXX.', 'XX...XX', 'XX...XX', 'XX...XX', 'XXXXXX.'],
}
const WORD = 'UNB'
const GW = 7
const SPACE = 2
const ROWS = 8
const COLS = WORD.length * GW + (WORD.length - 1) * SPACE

// Une células vizinhas da mesma linha em "trechos" (menos views, sem emendas visíveis).
const RUNS = []
WORD.split('').forEach((ch, li) =>
  GLYPHS[ch].forEach((row, r) => {
    let start = -1
    for (let c = 0; c <= GW; c++) {
      const on = c < GW && row[c] === 'X'
      if (on && start < 0) start = c
      if (!on && start >= 0) {
        RUNS.push({ key: `${ch}${r}${start}`, row: r, col: li * (GW + SPACE) + start, len: c - start })
        start = -1
      }
    }
  })
)

/** progress: Animated.Value de 0 a 1. Decorativo: o leitor de tela lê a barra no componente pai. */
function UnbProgressBar({ progress, colors }) {
  const { width } = useWindowDimensions()
  const size = Math.max(6, Math.floor(Math.min(width - 96, 320) / COLS))
  const depth = Math.max(3, Math.round(size * 0.28))

  const fills = useMemo(
    () =>
      RUNS.map((r) =>
        progress.interpolate({
          inputRange: [r.col / COLS, (r.col + r.len) / COLS],
          outputRange: [0, r.len * size],
          extrapolate: 'clamp',
        })
      ),
    [progress, size]
  )

  return (
    <View style={{ width: size * COLS, height: size * ROWS + depth }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {/* base escura: dá o contorno e a "espessura" das letras */}
      {RUNS.map((r) => (
        <View key={`s${r.key}`} style={{ position: 'absolute', left: r.col * size, top: r.row * size + depth, width: r.len * size, height: size, backgroundColor: colors.banner }} />
      ))}
      {/* letras vazias + preenchimento animado */}
      {RUNS.map((r, i) => (
        <View key={r.key} style={{ position: 'absolute', left: r.col * size, top: r.row * size, width: r.len * size, height: size, backgroundColor: colors.bgDeep, overflow: 'hidden' }}>
          <Animated.View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: fills[i], backgroundColor: colors.progress }} />
        </View>
      ))}
    </View>
  )
}

/* ---------- tela ---------- */
const cache = new WeakMap()
function stylesFor(t) {
  let s = cache.get(t)
  if (!s) {
    s = makeStyles(t)
    cache.set(t, s)
  }
  return s
}

export default function LoadingScreen({ status = 'Carregando', ready = false, error = null, onRetry, onFinish, minMs = MIN_MS }) {
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  const t = useTheme()
  const s = stylesFor(t)
  const account = useStore((st) => st.account)
  const storeName = useStore((st) => st.displayName)
  const avatarId = useStore((st) => st.avatarId)

  // Conexão com o perfil: saudação com o seu nome e a cor do personagem escolhido.
  const tint = (CHARACTERS.find((c) => c.id === avatarId) || CHARACTERS[0]).bg
  const first = String(account?.name || storeName || '').trim().split(' ')[0]
  const mascot = Math.min(170, Math.round(height * 0.2))

  const anim = useRef(new Animated.Value(0)).current
  const fade = useRef(new Animated.Value(0)).current
  const bob = useRef(new Animated.Value(0)).current
  const finishedRef = useRef(false)
  const startRef = useRef(Date.now())
  const [pct, setPct] = useState(0)
  const [phrase, setPhrase] = useState(null) // sorteada uma vez; não muda enquanto a tela estiver aberta

  useEffect(() => {
    const id = anim.addListener(({ value }) => setPct(Math.round(value * 100)))
    return () => anim.removeListener(id)
  }, [anim])

  // Sorteia UMA frase e a exibe com um fade suave.
  useEffect(() => {
    let alive = true
    pickPhrase().then((p) => {
      if (!alive) return
      setPhrase(p)
      Animated.timing(fade, { toValue: 1, duration: t.reduce ? 0 : 500, useNativeDriver: true }).start()
    })
    return () => {
      alive = false
    }
  }, [])

  // Mascote "respirando" (desligado com movimento reduzido).
  useEffect(() => {
    if (t.reduce) return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [t.reduce])

  // A barra sobe suave até 96% e espera o app ficar pronto.
  useEffect(() => {
    if (error) return
    const a = Animated.timing(anim, {
      toValue: 0.96,
      duration: t.reduce ? 0 : minMs * 0.9,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    })
    a.start()
    return () => a.stop()
  }, [error, t.reduce, minMs])

  // Pronto + tempo mínimo cumprido → fecha em 100%, respira um instante e segue.
  useEffect(() => {
    if (!ready || error) return
    const wait = Math.max(0, minMs - (Date.now() - startRef.current))
    const id = setTimeout(() => {
      Animated.timing(anim, { toValue: 1, duration: t.reduce ? 0 : 450, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(({ finished }) => {
        if (finished && !finishedRef.current) {
          finishedRef.current = true
          setTimeout(() => onFinish?.(), t.reduce ? 0 : 500)
        }
      })
    }, wait)
    return () => clearTimeout(id)
  }, [ready, error, t.reduce, minMs])

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -12] })
  const shadowScale = bob.interpolate({ inputRange: [0, 1], outputRange: [1, 0.8] })

  return (
    <View style={[s.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={s.center}>
        <Text style={s.hello} accessibilityRole="header">{greetingFor(first)}</Text>

        <View style={[s.stage, { height: mascot * 1.35 }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={{ position: 'absolute', width: mascot * 1.45, height: mascot * 1.45, borderRadius: mascot * 0.725, backgroundColor: tint, opacity: t.dark ? 0.35 : 0.7 }} />
          <Animated.Image source={DUO} style={{ width: mascot, height: mascot, transform: [{ translateY }] }} resizeMode="contain" accessibilityIgnoresInvertColors />
          <Animated.View style={[s.shadow, { width: mascot * 0.6, transform: [{ scaleX: shadowScale }] }]} />
        </View>

        <View accessible accessibilityRole="progressbar" accessibilityLabel="Carregando o aplicativo" accessibilityValue={{ min: 0, max: 100, now: pct }}>
          <UnbProgressBar progress={anim} colors={t.c} />
        </View>

        {error ? (
          <View style={s.errorBox} accessibilityLiveRegion="assertive">
            <Text style={s.errorTitle}>Não deu para iniciar o app</Text>
            <Text style={s.status}>Verifique sua conexão e tente de novo.</Text>
            <Pressable style={s.btn} onPress={onRetry} accessibilityRole="button">
              <Text style={s.btnText}>TENTAR DE NOVO</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={s.pct}>{pct}%</Text>
            <Text style={s.status} accessibilityLiveRegion="polite">{status}</Text>
          </>
        )}
      </View>

      <View style={s.phraseCard}>
        <Animated.Text style={[s.phrase, { opacity: fade }]} accessibilityRole="text">{phrase}</Animated.Text>
      </View>
    </View>
  )
}

function makeStyles(t) {
  const c = t.c
  const f = t.fs
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 24 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
    hello: { fontSize: f(24), fontWeight: '900', color: c.ink, textAlign: 'center' },
    stage: { alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
    shadow: { position: 'absolute', bottom: 0, height: 10, borderRadius: 5, backgroundColor: C.shadow, opacity: t.dark ? 0.33 : 0.13 },
    pct: { fontSize: f(28), fontWeight: '900', color: c.ink },
    status: { fontSize: f(15), fontWeight: '700', color: c.muted, textAlign: 'center' },
    phraseCard: { minHeight: 104, justifyContent: 'center', backgroundColor: c.card, borderRadius: 20, borderWidth: t.bw, borderBottomWidth: t.bw + 2, borderColor: c.line, paddingHorizontal: 18, paddingVertical: 14 },
    phrase: { fontSize: f(16), lineHeight: f(24), fontWeight: '700', color: c.inkSoft, textAlign: 'center' },
    errorBox: { alignItems: 'center', gap: 10, marginTop: 8 },
    errorTitle: { fontSize: f(18), fontWeight: '900', color: c.ink },
    btn: { marginTop: 8, backgroundColor: c.primary, borderRadius: 14, minHeight: t.touch, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4, borderBottomColor: c.primaryDark },
    btnText: { color: c.onPrimary, fontWeight: '900', fontSize: f(15) },
  })
}