/**
 * Jornada — trilha amigável para ensino médio.
 * Caminho em S + Duo pulando + revisão didática no Duo.
 *
 * Tema: todas as cores vêm de useTheme() (claro, escuro e alto contraste), igual ao Perfil.
 * Por isso a tela usa View/Text/Pressable do react-native e não o themedRN, para não
 * ter duas camadas mexendo nas mesmas cores.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, Image, Animated, Easing, Dimensions, Modal, View, Text, Pressable, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useStore } from '../store/useStore'
import {
  CHAPTERS,
  VALE,
  chapterStatus,
  isValeUnlocked,
  nextPlayable,
  totalStars,
} from '../lib/unlocks'
import { sfx } from '../lib/sounds'
import { totalXp, cargoFor } from '../lib/xp'
import { useTheme } from './ProfileScreen'
import { C } from '../lib/colors'
import {
  loadLearningMemory,
  useLearningMemory,
  hasReviewAvailable,
  phasesNeedingReview,
  clearPhaseReview,
  logReviewCloud,
} from '../fases/learningMemory'

const DUO = require('../assets/duo.png')
const { width: W } = Dimensions.get('window')

/** Paleta da tela a partir do tema atual (tudo vem de lib/colors.js). */
function makePalette(t) {
  const c = t.c
  return {
    bg: c.bg,
    paper: c.card,
    ink: c.ink,
    inkSoft: c.inkSoft,
    muted: c.muted,
    line: c.line,
    primary: c.primary,
    primaryDark: c.primaryDark,
    onPrimary: c.onPrimary,
    progress: c.progress,
    success: c.success,
    successDark: c.successDark,
    successSoft: c.successSoft,
    successInk: c.successInk,
    orange: c.orange,
    orangeSoft: c.orangeSoft,
    violet: c.violet,
    violetSoft: c.violetSoft,
    violetEdge: c.violetLine,
    blueSoft: c.blueSoft,
    yellow: c.yellow,
    lockFace: c.lockFace,
    lockEdge: c.lockEdge,
    lockIcon: c.lockIcon,
    lockCard: c.lockCard,
    trail: c.lockEdge,
    overlay: c.scrim,
    faceInk: C.codeEdge, // ícone/texto sobre cores vivas (nó atual): escuro nos três temas
  }
}

function sideForIndex(i) {
  const sides = ['center', 'right', 'left', 'right', 'left', 'right']
  return sides[i % sides.length]
}

function shiftFor(side) {
  const max = Math.min(72, W * 0.18)
  if (side === 'left') return -max
  if (side === 'right') return max
  return 0
}

function JumpingDuo({ flip, reduce }) {
  const y = useRef(new Animated.Value(0)).current
  const rot = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (reduce) return undefined
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(y, { toValue: -16, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(rot, { toValue: 1, duration: 280, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(y, { toValue: 0, duration: 280, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
          Animated.timing(rot, { toValue: 0, duration: 280, useNativeDriver: true }),
        ]),
        Animated.delay(520),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [y, rot, reduce])

  const spin = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-8deg'] })

  return (
    <Animated.View style={{ transform: [{ translateY: y }, { rotate: spin }, { scaleX: flip ? -1 : 1 }] }}>
      <Image source={DUO} style={{ width: 62, height: 62 }} resizeMode="contain" accessibilityIgnoresInvertColors />
    </Animated.View>
  )
}

function PathNode({ item, status, starsN, onPress, isLast, side, showDuo, onLayoutY, p, n, reduce }) {
  const locked = status === 'locked'
  const done = status === 'done'
  const current = status === 'current'
  const shift = shiftFor(side)
  const duoLeft = side !== 'left'

  const face = locked ? p.lockFace : done ? p.success : current ? item.color : p.paper
  const border = locked ? p.lockEdge : done ? p.successDark : item.color
  const iconColor = locked ? p.lockIcon : done ? p.faceInk : current ? p.faceInk : p.ink

  return (
    <View style={n.wrap} onLayout={(e) => onLayoutY && onLayoutY(e.nativeEvent.layout.y)}>
      <View style={[n.row, { transform: [{ translateX: shift }] }]}>
        {showDuo && duoLeft ? (
          <View style={n.duoBox}>
            <JumpingDuo flip={false} reduce={reduce} />
            <View style={n.bubble}>
              <Text style={n.bubbleText}>aqui!</Text>
            </View>
          </View>
        ) : null}

        <Pressable
          onPress={onPress}
          disabled={locked}
          accessibilityRole="button"
          accessibilityLabel={`${item.title}. ${locked ? 'Bloqueada' : done ? 'Concluída' : current ? 'Em andamento' : 'Disponível'}`}
          accessibilityState={{ disabled: locked }}
          style={[n.node, { backgroundColor: face, borderColor: border, opacity: locked ? 0.85 : 1 }]}
        >
          <Ionicons name={locked ? 'lock-closed' : done ? 'checkmark' : item.icon || 'flag'} size={28} color={iconColor} />
        </Pressable>

        {showDuo && !duoLeft ? (
          <View style={n.duoBox}>
            <JumpingDuo flip reduce={reduce} />
            <View style={n.bubble}>
              <Text style={n.bubbleText}>aqui!</Text>
            </View>
          </View>
        ) : null}
      </View>

      <View style={[n.card, { borderColor: border, backgroundColor: locked ? p.lockCard : p.paper }]}>
        <Text style={[n.cardTag, { color: locked ? p.muted : item.color }]}>
          {done ? 'CONCLUÍDA' : current ? 'EM ANDAMENTO' : locked ? 'BLOQUEADA' : 'FASE'}
        </Text>
        <Text style={[n.cardTitle, locked && { color: p.muted }]}>{item.title}</Text>
        <Text style={n.cardSub}>{item.subtitle || item.short || item.blurb || ''}</Text>
        {done ? (
          <View style={n.stars} accessibilityLabel={`${starsN} de 3 estrelas`}>
            {[1, 2, 3].map((k) => (
              <Ionicons key={k} name={k <= starsN ? 'star' : 'star-outline'} size={16} color={p.yellow} />
            ))}
          </View>
        ) : null}
        {current && !locked ? (
          <Pressable onPress={onPress} style={[n.playBtn, { backgroundColor: item.color }]} accessibilityRole="button">
            <Ionicons name="play" size={16} color={p.faceInk} />
            <Text style={[n.playText, { color: p.faceInk }]}>Entrar na missão</Text>
          </Pressable>
        ) : null}
      </View>

      {!isLast ? (
        <View style={n.trail}>
          <View style={[n.dot, { backgroundColor: done ? p.success : current ? item.color : p.trail }]} />
          <View style={[n.dot, { backgroundColor: done ? p.success : p.trail, opacity: 0.7 }]} />
          <View style={[n.dot, { backgroundColor: p.trail, opacity: 0.45 }]} />
        </View>
      ) : null}
    </View>
  )
}

const nodeStyles = (p) =>
  StyleSheet.create({
    wrap: { width: '100%', alignItems: 'center', marginBottom: 4 },
    row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', minHeight: 88 },
    node: { width: 78, height: 78, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderBottomWidth: 7 },
    duoBox: { alignItems: 'center', marginHorizontal: 6, marginBottom: 4 },
    // o balão inverte com o tema: fundo = cor do texto, texto = cor do fundo da tela
    bubble: { marginTop: 2, backgroundColor: p.ink, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    bubbleText: { color: p.bg, fontWeight: '900', fontSize: 11 },
    card: { marginTop: 10, width: Math.min(280, W - 48), borderRadius: 18, borderWidth: 2, padding: 12, borderBottomWidth: 4 },
    cardTag: { fontWeight: '900', fontSize: 10, letterSpacing: 0.8 },
    cardTitle: { color: p.ink, fontWeight: '900', fontSize: 18, marginTop: 2 },
    cardSub: { color: p.inkSoft, fontWeight: '600', fontSize: 13, lineHeight: 18, marginTop: 2 },
    stars: { flexDirection: 'row', gap: 3, marginTop: 8 },
    playBtn: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 40, borderRadius: 12, paddingHorizontal: 12 },
    playText: { fontWeight: '900', fontSize: 14 },
    trail: { flexDirection: 'column', alignItems: 'center', gap: 6, marginVertical: 10 },
    dot: { width: 8, height: 8, borderRadius: 4 },
  })

/** Textos didáticos por fase. Linguagem humana. */
const REVIEW_TEACH = {
  fase1: {
    title: 'Como um programa se organiza',
    steps: [
      {
        lead: 'Olá! Vamos olhar isso com calma.',
        body: 'Um programa é como uma receita. Tem um nome, um começo, o que acontece no meio e um fim. Se a ordem mistura, o computador se perde.',
      },
      {
        lead: 'Duas ideias que salvam a vida',
        body: 'caractere guarda texto. real guarda número. leia pega o que a pessoa digita. escreval só mostra na tela. São papéis diferentes.',
      },
      {
        lead: 'Antes de tentar de novo',
        body: 'Pergunte para você: isso é entrada, saída ou só organizar as linhas? Com essa pergunta a missão fica mais leve.',
      },
    ],
  },
  fase2: {
    title: 'Caixinhas e contas',
    steps: [
      {
        lead: 'Variável é uma caixinha com nome.',
        body: 'Você guarda um valor nela e depois usa esse valor em contas ou na tela. O nome da caixinha importa porque o programa procura por ele.',
      },
      {
        lead: 'Conta e depois mostra',
        body: 'Quando multiplica preço por quantidade, o resultado precisa ser guardado de novo, por exemplo em total. Se a caixinha não for atualizada, a tela continua com o valor antigo.',
      },
      {
        lead: 'Pense no cliente',
        body: 'Quem compra precisa enxergar quantidade, preço e total com clareza, inclusive com a letra maior. Informação escondida também é um tipo de erro.',
      },
    ],
  },
  fase3: {
    title: 'Quando o programa decide',
    steps: [
      {
        lead: 'se e senao são caminhos',
        body: 'O programa olha uma condição e escolhe o que fazer. Se a condição estiver frouxa, ele libera o que não devia ou trava o que deveria passar.',
      },
      {
        lead: 'e e ou mudam tudo',
        body: 'Com e as duas partes precisam ser verdadeiras. Com ou basta uma. Em pagamento e estoque, usar ou no lugar de e é um clássico de dor de cabeça.',
      },
      {
        lead: 'Teste o zero',
        body: 'Antes de voltar para a missão, imagine estoque zero e pagamento ok. O que a loja deveria dizer? Se a sua regra falha nesse caso, ainda tem ajuste.',
      },
    ],
  },
  fase4: {
    title: 'Eventos, estados e gente de verdade',
    steps: [
      {
        lead: 'Cada toque conta',
        body: 'Enquanto o app processa, um segundo toque não pode somar de novo. Mesmo assim a pessoa precisa de uma resposta, tipo aguarde, e não de silêncio.',
      },
      {
        lead: 'Voz e confirmação',
        body: 'Cancelar pedido só por fala é arriscado. Peça confirmação. Se a frase for ambígua, ofereça também um botão na tela.',
      },
      {
        lead: 'Aviso para todo mundo',
        body: 'Som sozinho não basta. Deixe o estado escrito na tela. Para leitor de tela, anuncie uma vez e sem loop. Tamanho e contraste do preço também fazem parte da regra.',
      },
    ],
  },
}

function teachFor(phase) {
  const key = String(phase || '').toLowerCase()
  if (REVIEW_TEACH[key]) return REVIEW_TEACH[key]
  if (key.includes('1')) return REVIEW_TEACH.fase1
  if (key.includes('2')) return REVIEW_TEACH.fase2
  if (key.includes('3')) return REVIEW_TEACH.fase3
  if (key.includes('4')) return REVIEW_TEACH.fase4
  return REVIEW_TEACH.fase1
}

function logReview(event) {
  try {
    if (typeof logReviewCloud === 'function') logReviewCloud(event)
  } catch (_) {}
}

export default function JourneyScreen() {
  const insets = useSafeAreaInsets()
  const t = useTheme()
  const p = useMemo(() => makePalette(t), [t])
  const s = useMemo(() => screenStyles(p), [p])
  const n = useMemo(() => nodeStyles(p), [p])
  const setScreen = useStore((st) => st.setScreen)
  const progress = useStore((st) => st.progress) || {}
  const setValeId = useStore((st) => st.setValeId)
  const name = useStore((st) => st.displayName) || 'dev'
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewStep, setReviewStep] = useState(0)
  const [reviewPhaseIdx, setReviewPhaseIdx] = useState(0)
  const [askConfirm, setAskConfirm] = useState(false)
  const memory = useLearningMemory()
  const needsReview = hasReviewAvailable()

  useEffect(() => {
    loadLearningMemory()
  }, [])

  const next = nextPlayable(progress)
  const stars = totalStars(progress)
  const doneCount = CHAPTERS.filter((c) => progress[c.id]?.done).length
  const allChaptersDone = CHAPTERS.length > 0 && doneCount === CHAPTERS.length
  const xp = totalXp(progress)
  const cargo = cargoFor(xp)

  // Vale liberado: regra da lib OU loja inteira concluída (Plantão E Sem rede).
  const valeOpen = (v, i) => isValeUnlocked(v.id, progress) || allChaptersDone
  const openVales = VALE.filter((v, i) => valeOpen(v, i))

  // Capítulo atual; se a loja acabou, o Duo vai para o Vale do Silêncio.
  const plantaoVales = VALE.filter((v) => v.durationMs)
  const chapterCurrentId =
    (next && !next.durationMs ? next.id : null) ||
    CHAPTERS.find((c) => chapterStatus(c.id, progress) === 'current')?.id ||
    null
  const valeTarget = chapterCurrentId ? null : openVales.find((v) => progress[v.id]?.bestScore == null) || openVales[0] || null
  const currentId = chapterCurrentId || (valeTarget && valeTarget.id) || null
  const ctaTarget = chapterCurrentId ? next : valeTarget

  // Rola a trilha até o Duo quando ele muda de lugar.
  const scrollRef = useRef(null)
  const nodeY = useRef({})
  useEffect(() => {
    if (!currentId) return undefined
    const id = setTimeout(() => {
      const y = nodeY.current[currentId]
      if (y != null && scrollRef.current && scrollRef.current.scrollTo) {
        scrollRef.current.scrollTo({ y: Math.max(0, y - 140), animated: true })
      }
    }, 450)
    return () => clearTimeout(id)
  }, [currentId])

  function openChapter(ch) {
    if (chapterStatus(ch.id, progress) === 'locked') {
      if (sfx && sfx.fail) sfx.fail()
      return
    }
    if (sfx && sfx.tap) sfx.tap()
    if (setScreen) setScreen(ch.id)
  }

  function openVale(v) {
    const idx = VALE.findIndex((x) => x.id === v.id)
    if (!valeOpen(v, idx)) {
      if (sfx && sfx.fail) sfx.fail()
      return
    }
    if (sfx && sfx.tap) sfx.tap()
    if (setValeId) setValeId(v.id)
    if (setScreen) setScreen('vale')
  }

  function openNext() {
    if (!ctaTarget) return
    // Plantão ou Sem rede — qualquer item de VALE
    if (VALE.some((v) => v.id === ctaTarget.id)) openVale(ctaTarget)
    else openChapter(ctaTarget)
  }

  const closeReview = () => {
    setReviewOpen(false)
    setAskConfirm(false)
    setReviewStep(0)
  }

  const tip =
    doneCount === 0
      ? 'Primeira vez por aqui? Relaxa. Cada missão é um chamado da loja.'
      : doneCount < 4
        ? 'Mandou bem nas ' + doneCount + '! Bora resolver o próximo chamado.'
        : 'Loja no ar! Agora é Vale do Silêncio: plantão ou treino Sem rede.'

  const firstName = (name || 'dev').split(' ')[0]
  const badgeSize = Math.max(t.fs(28), (t.touch || 48) * 0.48)

  const pending = phasesNeedingReview()
  const phases = pending.length ? pending : [{ phase: (memory && memory.lastPhase) || 'fase1', consecutiveErrors: 0, avgTimeSec: 0 }]
  const activePhase = phases[Math.min(reviewPhaseIdx, Math.max(phases.length - 1, 0))]
  const teach = teachFor(activePhase.phase)
  const step = teach.steps[Math.min(reviewStep, teach.steps.length - 1)]
  const lastStep = reviewStep >= teach.steps.length - 1

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.hero}>
        <View style={s.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.hello}>𝑶𝒊, {firstName}‼</Text>
            <Text style={s.heroTitle}>Trilha da Loja do Tonho</Text>
            <Text style={s.heroSub}>{tip}</Text>
          </View>
          <Pressable
            onPress={() => {
              if (!needsReview) return
              if (sfx && sfx.tap) sfx.tap()
              setReviewStep(0)
              setReviewPhaseIdx(0)
              setAskConfirm(false)
              setReviewOpen(true)
              logReview({ action: 'open_review' })
            }}
            accessibilityRole={needsReview ? 'button' : 'image'}
            accessibilityLabel={needsReview ? 'Sarueka: ô, tem revisão te esperando!' : 'Sarueka'}
            style={s.heroDuoWrap}
          >
            <Image source={DUO} style={s.heroDuo} resizeMode="contain" accessibilityIgnoresInvertColors />
            {needsReview ? (
              <View
                style={[s.reviewBadge, { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2, minWidth: badgeSize, minHeight: badgeSize }]}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <Text style={[s.reviewBadgeText, { fontSize: t.fs(16) }]}>!</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <View style={s.statsRow}>
          <View style={[s.chip, { backgroundColor: p.successSoft }]}>
            <Ionicons name="flag" size={14} color={p.successInk} />
            <Text style={[s.chipText, { color: p.successInk }]}>
              {doneCount}/{CHAPTERS.length} fases
            </Text>
          </View>
          <View style={[s.chip, { backgroundColor: p.orangeSoft }]}>
            <Ionicons name="star" size={14} color={p.orange} />
            <Text style={[s.chipText, { color: p.orange }]}>{stars} estrelas</Text>
          </View>
          <View style={[s.chip, { backgroundColor: p.violetSoft }]}>
            <Ionicons name={cargo.icon} size={14} color={p.violet} />
            <Text style={[s.chipText, { color: p.violet }]}>
              {cargo.name} · {xp} XP
            </Text>
          </View>
        </View>

        <View style={s.barTrack} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={[s.barFill, { width: (doneCount / Math.max(CHAPTERS.length, 1)) * 100 + '%' }]} />
        </View>

        {ctaTarget ? (
          <Pressable style={s.cta} onPress={openNext} accessibilityRole="button">
            <Ionicons name="flash" size={18} color={p.onPrimary} />
            <Text style={s.ctaText}>
              {VALE.some((v) => v.id === ctaTarget.id)
                ? ctaTarget.durationMs
                  ? 'Ir pro plantão · ' + (ctaTarget.short || ctaTarget.title || '')
                  : 'Treinar · ' + (ctaTarget.short || ctaTarget.title || 'Sem rede')
                : 'Continuar · ' + (ctaTarget.short || '')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 48 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.section}>CARREIRA</Text>

        {CHAPTERS.map((ch, i) => (
          <PathNode
            key={ch.id}
            item={ch}
            status={chapterStatus(ch.id, progress)}
            starsN={(progress[ch.id] && progress[ch.id].stars) || 0}
            onPress={() => openChapter(ch)}
            isLast={i === CHAPTERS.length - 1 && VALE.length === 0}
            side={sideForIndex(i)}
            showDuo={ch.id === currentId}
            onLayoutY={(y) => {
              nodeY.current[ch.id] = y
            }}
            p={p}
            n={n}
            reduce={t.reduce}
          />
        ))}

        <View style={s.banner}>
          <Ionicons name="moon" size={22} color={p.violet} />
          <View style={{ flex: 1 }}>
                 <Text style={s.bannerTitle}>Vale do Silêncio</Text>
            <Text style={s.bannerSub}>
              Do zero à sua primeira linguagem de programação. Aprenda na prática, supere desafios e ganhe XP, com ou sem renda extra.
            </Text>
          </View>
        </View>

        {VALE.map((v, i) => {
          const open = valeOpen(v, i)
          const rec = progress[v.id]
          const sub =
            rec && rec.bestScore != null
              ? v.durationMs
                ? `Recorde: ${rec.bestScore} acertos · ${rec.xp || 0} XP`
                : `Recorde: ${rec.bestScore} questões · ${rec.xp || 0} XP`
              : v.subtitle || v.short || v.blurb || ''
          return (
            <PathNode
              key={v.id}
              item={{ ...v, subtitle: sub }}
              status={open ? 'current' : 'locked'}
              starsN={0}
              onPress={() => openVale(v)}
              isLast={i === VALE.length - 1}
              side={sideForIndex(CHAPTERS.length + i)}
              showDuo={v.id === currentId}
              onLayoutY={(y) => {
                nodeY.current[v.id] = y
              }}
              p={p}
              n={n}
              reduce={t.reduce}
            />
          )
        })}

        <View style={s.footer}>
          <Text style={s.footerText}>O importante é não desistir de continuar caminhando. Até porque você já chegou longe demais, e voltar também dá trabalho.</Text>
        </View>
      </ScrollView>

      <Modal visible={reviewOpen} transparent animationType={t.reduce ? 'none' : 'slide'} onRequestClose={closeReview}>
        <Pressable style={s.reviewBg} onPress={closeReview} accessibilityLabel="Fechar folha de revisão">
          <Pressable
            style={[s.reviewSheet, { paddingBottom: insets.bottom + 16, maxHeight: '90%' }]}
            onPress={() => {}}
            accessibilityViewIsModal
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Image source={DUO} style={{ width: t.fs(52), height: t.fs(52) }} resizeMode="contain" accessibilityIgnoresInvertColors />
                <View style={{ flex: 1 }}>
                  <Text style={[s.reviewTitle, { fontSize: t.fs(18) }]}>Ei, vamos com calma</Text>
                  <Text style={[s.reviewSub, { fontSize: t.fs(13), marginBottom: 0 }]}>
                    {teach.title}. Passo {reviewStep + 1} de {teach.steps.length}.
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
                {teach.steps.map((_, i) => (
                  <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i <= reviewStep ? p.progress : p.line }} />
                ))}
              </View>

              {!askConfirm ? (
                <View style={s.reviewCard}>
                  <Text style={[s.reviewPhase, { fontSize: t.fs(12) }]}>{step.lead}</Text>
                  <Text style={[s.reviewTip, { fontSize: t.fs(15), lineHeight: t.fs(22), marginTop: 8 }]}>{step.body}</Text>

                  {lastStep ? (
                    <View style={[s.reviewTryBox, { marginTop: 12 }]}>
                      <Text style={[s.reviewTip, { fontSize: t.fs(13), lineHeight: t.fs(19), marginTop: 0 }]}>
                        Quando se sentir pronto, diga se isso fez sentido. Só então a gente tira o aviso do Sarueka.
                      </Text>
                    </View>
                  ) : null}

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                    {reviewStep > 0 ? (
                      <Pressable
                        onPress={() => {
                          if (sfx && sfx.tap) sfx.tap()
                          setReviewStep((x) => Math.max(0, x - 1))
                          logReview({ action: 'step_back', phase: activePhase.phase, step: reviewStep - 1 })
                        }}
                        style={[s.reviewClear, { minHeight: (t.touch || 48) * 0.75, marginTop: 0, justifyContent: 'center' }]}
                        accessibilityRole="button"
                        accessibilityLabel="Voltar passo"
                      >
                        <Text style={[s.reviewClearText, { fontSize: t.fs(13) }]}>Voltar</Text>
                      </Pressable>
                    ) : null}

                    {!lastStep ? (
                      <Pressable
                        onPress={() => {
                          if (sfx && sfx.tap) sfx.tap()
                          setReviewStep((x) => x + 1)
                          logReview({ action: 'step_next', phase: activePhase.phase, step: reviewStep + 1 })
                        }}
                        style={[s.reviewClose, { flex: 1, marginTop: 0, minHeight: t.touch || 48 }]}
                        accessibilityRole="button"
                        accessibilityLabel="Próximo passo da revisão"
                      >
                        <Text style={[s.reviewCloseText, { fontSize: t.fs(15) }]}>Continuar</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => {
                          if (sfx && sfx.tap) sfx.tap()
                          setAskConfirm(true)
                          logReview({ action: 'ask_understood', phase: activePhase.phase })
                        }}
                        style={[s.reviewClose, { flex: 1, marginTop: 0, minHeight: t.touch || 48 }]}
                        accessibilityRole="button"
                        accessibilityLabel="Avançar para confirmar se entendeu"
                      >
                        <Text style={[s.reviewCloseText, { fontSize: t.fs(15) }]}>Quase lá</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              ) : (
                <View style={s.reviewCard}>
                  <Text style={[s.reviewPhase, { fontSize: t.fs(12) }]}>Antes de tirar o aviso</Text>
                  <Text style={[s.reviewTip, { fontSize: t.fs(16), lineHeight: t.fs(23), marginTop: 8 }]}>
                    Você entendeu o que travou e como tentar de outro jeito?
                  </Text>
                  <Text style={[s.reviewTip, { fontSize: t.fs(13), lineHeight: t.fs(19), marginTop: 8, color: p.inkSoft }]}>
                    Se ainda estiver confuso, pode reler os passos. O aviso no Sarueka só some quando você confirmar.
                  </Text>

                  <Pressable
                    onPress={() => {
                      if (sfx && sfx.tap) sfx.tap()
                      clearPhaseReview(activePhase.phase)
                      logReview({ action: 'understood_clear', phase: activePhase.phase })
                      if (reviewPhaseIdx < phases.length - 1) {
                        setReviewPhaseIdx((i) => i + 1)
                        setReviewStep(0)
                        setAskConfirm(false)
                      } else {
                        closeReview()
                        setReviewPhaseIdx(0)
                      }
                    }}
                    style={[s.reviewClose, { minHeight: t.touch || 48, marginTop: 16 }]}
                    accessibilityRole="button"
                    accessibilityLabel="Confirmar que entendeu e remover aviso de revisão"
                  >
                    <Text style={[s.reviewCloseText, { fontSize: t.fs(15) }]}>Sim, entendi</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      if (sfx && sfx.tap) sfx.tap()
                      setAskConfirm(false)
                      setReviewStep(0)
                      logReview({ action: 'reread', phase: activePhase.phase })
                    }}
                    style={[s.reviewClear, { minHeight: (t.touch || 48) * 0.75, marginTop: 10, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' }]}
                    accessibilityRole="button"
                    accessibilityLabel="Reler os passos da revisão"
                  >
                    <Text style={[s.reviewClearText, { fontSize: t.fs(13) }]}>Ainda não, quero ler de novo</Text>
                  </Pressable>
                </View>
              )}

              <Pressable
                style={[s.reviewClear, { minHeight: (t.touch || 48) * 0.7, marginTop: 8, alignSelf: 'center', justifyContent: 'center', backgroundColor: 'transparent' }]}
                onPress={() => {
                  closeReview()
                  logReview({ action: 'dismiss_keep_badge', phase: activePhase.phase })
                }}
                accessibilityRole="button"
                accessibilityLabel="Fechar e manter o aviso no Sarueka"
              >
                <Text style={[s.reviewClearText, { fontSize: t.fs(12), color: p.muted }]}>Fechar e manter o aviso</Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

const screenStyles = (p) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: p.bg },
    hero: { marginHorizontal: 12, marginTop: 6, backgroundColor: p.paper, borderRadius: 24, padding: 16, borderWidth: 2, borderColor: p.line, borderBottomWidth: 5 },
    heroTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    hello: { color: p.muted, fontWeight: '800', fontSize: 13 },
    heroTitle: { color: p.ink, fontWeight: '900', fontSize: 22, marginTop: 2 },
    heroSub: { color: p.inkSoft, fontWeight: '600', fontSize: 13, lineHeight: 18, marginTop: 4 },
    heroDuoWrap: { width: 72, height: 72 },
    heroDuo: { width: 72, height: 72 },
    reviewBadge: { position: 'absolute', top: -2, right: -4, width: 26, height: 26, borderRadius: 13, backgroundColor: p.orange, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: p.paper },
    reviewBadgeText: { color: p.faceInk, fontWeight: '900', fontSize: 16 },
    reviewBg: { flex: 1, backgroundColor: p.overlay, justifyContent: 'flex-end' },
    reviewSheet: { backgroundColor: p.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderTopWidth: 2, borderColor: p.line },
    reviewTitle: { color: p.ink, fontWeight: '900', fontSize: 18 },
    reviewSub: { color: p.inkSoft, fontWeight: '600', fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 12 },
    reviewCard: { backgroundColor: p.violetSoft, borderRadius: 16, padding: 12, marginBottom: 10 },
    reviewPhase: { color: p.violet, fontWeight: '900', fontSize: 12, letterSpacing: 0.6 },
    reviewTip: { color: p.ink, fontWeight: '600', fontSize: 13, lineHeight: 18, marginTop: 6 },
    reviewTryBox: { marginTop: 10, backgroundColor: p.orangeSoft, borderRadius: 12, padding: 10 },
    reviewClear: { alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: p.paper },
    reviewClearText: { color: p.violet, fontWeight: '800', fontSize: 12 },
    reviewClose: { marginTop: 8, backgroundColor: p.primary, borderRadius: 14, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4, borderBottomColor: p.primaryDark },
    reviewCloseText: { color: p.onPrimary, fontWeight: '900', fontSize: 15 },
    statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
    chipText: { fontWeight: '800', fontSize: 12 },
    barTrack: { height: 12, borderRadius: 8, backgroundColor: p.line, marginTop: 12, overflow: 'hidden' },
    barFill: { height: 12, backgroundColor: p.progress, borderRadius: 8 },
    cta: { marginTop: 14, backgroundColor: p.primary, borderRadius: 16, minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderBottomWidth: 4, borderBottomColor: p.primaryDark },
    ctaText: { color: p.onPrimary, fontWeight: '900', fontSize: 15 },
    section: { color: p.muted, fontWeight: '900', fontSize: 11, letterSpacing: 1.2, textAlign: 'center', marginTop: 12, marginBottom: 14 },
    banner: { flexDirection: 'row', gap: 12, alignItems: 'center', marginHorizontal: 20, marginVertical: 16, backgroundColor: p.violetSoft, borderRadius: 18, padding: 14, borderWidth: 2, borderColor: p.violetEdge },
    bannerTitle: { color: p.violet, fontWeight: '900', fontSize: 15 },
    bannerSub: { color: p.inkSoft, fontWeight: '600', fontSize: 12, lineHeight: 17, marginTop: 2 },
    footer: { marginHorizontal: 24, marginTop: 8, marginBottom: 16, padding: 14, backgroundColor: p.blueSoft, borderRadius: 16 },
    footerText: { color: p.inkSoft, fontWeight: '600', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  })