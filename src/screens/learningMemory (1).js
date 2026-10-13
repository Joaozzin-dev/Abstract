/**
 * Memória de aprendizagem + calendário de atividade + dificuldade por fase.
 * Dificuldade é interna: erros consecutivos + tempo no exercício.
 * Revisão só é sugerida quando o aluno realmente precisa (badge no Duo da Journey).
 */
import AsyncStorage from '@react-native-async-storage/async-storage'

const MEMORY_KEY = 'learning:memory:v1'
const ACTIVITY_KEY = 'learning:activity:v1'

/**
 * phaseStats[phaseKey] = {
 *   consecutiveErrors: number,
 *   totalErrors: number,
 *   totalTimeMs: number,
 *   attempts: number,
 *   lastMissionStartedAt: number|null,
 *   needsReview: boolean,
 * }
 */
const EMPTY_MEMORY = {
  errors: [],
  consecutiveCorrect: 0,
  lastPhase: null,
  phaseStats: {},
}

let memoryState = EMPTY_MEMORY
const memListeners = new Set()
const memSubscribe = (cb) => {
  memListeners.add(cb)
  return () => memListeners.delete(cb)
}
const memEmit = () => memListeners.forEach((l) => l())

export async function loadLearningMemory() {
  try {
    const raw = await AsyncStorage.getItem(MEMORY_KEY)
    if (raw) {
      memoryState = { ...EMPTY_MEMORY, ...JSON.parse(raw), phaseStats: { ...EMPTY_MEMORY.phaseStats, ...(JSON.parse(raw).phaseStats || {}) } }
      memEmit()
    }
  } catch (_) {}
}

function persistMemory() {
  AsyncStorage.setItem(MEMORY_KEY, JSON.stringify(memoryState)).catch(() => {})
  memEmit()
}

export function getMemory() {
  return memoryState
}

export function useLearningMemory() {
  const { useSyncExternalStore } = require('react')
  return useSyncExternalStore(memSubscribe, () => memoryState)
}

function ensurePhase(phase) {
  const key = phase || 'geral'
  if (!memoryState.phaseStats[key]) {
    memoryState.phaseStats[key] = {
      consecutiveErrors: 0,
      totalErrors: 0,
      totalTimeMs: 0,
      attempts: 0,
      lastMissionStartedAt: null,
      needsReview: false,
    }
  }
  return memoryState.phaseStats[key]
}

/** Critério interno: revisão se 2+ erros seguidos OU tempo médio alto nos exercícios. */
function recomputeNeedsReview(st) {
  const avgTime = st.attempts > 0 ? st.totalTimeMs / st.attempts : 0
  // 2 erros consecutivos OU média acima de 90s por missão
  st.needsReview = st.consecutiveErrors >= 2 || (st.attempts >= 2 && avgTime >= 90000)
}

/** Inicia contagem de tempo de um desafio. */
export function startMissionTimer(phase) {
  const st = ensurePhase(phase)
  st.lastMissionStartedAt = Date.now()
  persistMemory()
}

/** Encerra o timer e acumula tempo (chamar ao acertar ou sair). */
export function endMissionTimer(phase) {
  const st = ensurePhase(phase)
  if (st.lastMissionStartedAt) {
    const elapsed = Math.max(0, Date.now() - st.lastMissionStartedAt)
    st.totalTimeMs += elapsed
    st.attempts += 1
    st.lastMissionStartedAt = null
    recomputeNeedsReview(st)
    persistMemory()
  }
}

/** Registra erro: aumenta erros consecutivos da fase e reavalia revisão. */
export function recordError({
  phase,
  mission,
  concept,
  studentInput,
  expected,
  got,
  tip,
}) {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    phase: phase || '?',
    mission: mission || '?',
    concept: concept || 'geral',
    studentInput: String(studentInput || '').slice(0, 200),
    expected: String(expected || '').slice(0, 120),
    got: String(got || '').slice(0, 120),
    tip: tip || '',
    fixed: false,
    at: new Date().toISOString(),
  }
  const st = ensurePhase(phase)
  st.consecutiveErrors = (st.consecutiveErrors || 0) + 1
  st.totalErrors = (st.totalErrors || 0) + 1
  recomputeNeedsReview(st)

  memoryState = {
    ...memoryState,
    errors: [entry, ...memoryState.errors].slice(0, 40),
    consecutiveCorrect: 0,
    lastPhase: phase || memoryState.lastPhase,
    phaseStats: { ...memoryState.phaseStats },
  }
  persistMemory()
  return entry
}

export function markFixed({ phase, mission, concept }) {
  const errors = memoryState.errors.map((e) => {
    if (
      !e.fixed &&
      e.phase === phase &&
      (mission == null || e.mission === mission) &&
      (concept == null || e.concept === concept)
    ) {
      return { ...e, fixed: true }
    }
    return e
  })
  memoryState = { ...memoryState, errors }
  persistMemory()
}

/** Acerto: zera erros consecutivos da fase, acumula tempo, reavalia revisão. */
export function recordCorrect(phase) {
  endMissionTimer(phase)
  const st = ensurePhase(phase)
  st.consecutiveErrors = 0
  // Se já tinha muitos erros no total, ainda pode precisar de revisão até melhorar
  if (st.totalErrors <= 1) st.needsReview = false
  else recomputeNeedsReview(st)

  const next = (memoryState.consecutiveCorrect || 0) + 1
  memoryState = {
    ...memoryState,
    consecutiveCorrect: next,
    lastPhase: phase || memoryState.lastPhase,
    phaseStats: { ...memoryState.phaseStats },
  }
  persistMemory()
  return next
}

export function resetConsecutive() {
  memoryState = { ...memoryState, consecutiveCorrect: 0 }
  persistMemory()
}

export function recentOpenErrors(phase, limit = 5) {
  const list = memoryState.errors.filter((e) => !e.fixed)
  const same = list.filter((e) => e.phase === phase)
  return (same.length ? same : list).slice(0, limit)
}

/** Há revisão disponível em alguma fase? (para badge ! no Duo da Journey) */
export function hasReviewAvailable() {
  const stats = memoryState.phaseStats || {}
  return Object.values(stats).some((s) => s && s.needsReview)
}

/** Fases que precisam de revisão (para o Duo explicar). */
export function phasesNeedingReview() {
  const stats = memoryState.phaseStats || {}
  return Object.entries(stats)
    .filter(([, s]) => s && s.needsReview)
    .map(([phase, s]) => ({
      phase,
      consecutiveErrors: s.consecutiveErrors,
      totalErrors: s.totalErrors,
      avgTimeSec: s.attempts ? Math.round(s.totalTimeMs / s.attempts / 1000) : 0,
    }))
}

/** Limpa flag de revisão de uma fase (após o aluno revisar). */
export function clearPhaseReview(phase) {
  const st = ensurePhase(phase)
  st.needsReview = false
  st.consecutiveErrors = 0
  persistMemory()
}

/* ------------------------------------------------------------------ */
/*  Calendário de atividade                                            */
/* ------------------------------------------------------------------ */
let activityDates = new Set()
const actListeners = new Set()
const actSubscribe = (cb) => {
  actListeners.add(cb)
  return () => actListeners.delete(cb)
}
const actEmit = () => actListeners.forEach((l) => l())

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function loadActivity() {
  try {
    const raw = await AsyncStorage.getItem(ACTIVITY_KEY)
    if (raw) {
      const arr = JSON.parse(raw)
      activityDates = new Set(Array.isArray(arr) ? arr : [])
      actEmit()
    }
  } catch (_) {}
}

function persistActivity() {
  AsyncStorage.setItem(ACTIVITY_KEY, JSON.stringify([...activityDates])).catch(() => {})
  actEmit()
}

export function markActivityToday() {
  const k = todayKey()
  if (activityDates.has(k)) return
  activityDates.add(k)
  persistActivity()
}

export function getActivityDates() {
  return activityDates
}

export function useActivityDates() {
  const { useSyncExternalStore } = require('react')
  return useSyncExternalStore(actSubscribe, () => activityDates)
}

export function currentStreak() {
  const set = activityDates
  if (!set.size) return 0
  let streak = 0
  const d = new Date()
  let key = todayKey()
  if (!set.has(key)) {
    d.setDate(d.getDate() - 1)
    key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  while (set.has(key)) {
    streak++
    d.setDate(d.getDate() - 1)
    key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  return streak
}

/** Dias ativos do mês (para desenhar faixas de ofensiva). */
export function activeDaysInMonth(year, month0) {
  const out = new Set()
  activityDates.forEach((k) => {
    const [y, m, d] = k.split('-').map(Number)
    if (y === year && m === month0 + 1) out.add(d)
  })
  return out
}

/* ------------------------------------------------------------------ */
/*  Níveis — 4 fases concluídas = Dev Pleno (restante ajustável depois) */
/* ------------------------------------------------------------------ */
export const LEVELS = [
  {
    id: 'estagiario',
    label: 'Estagiário',
    short: 'Estagiário',
    icon: 'school-outline',
    color: '#6B7391',
    soft: '#E8EAF0',
    minDone: 0,
    minStars: 0,
    desc: 'Primeiros passos em programação e acessibilidade.',
  },
  {
    id: 'junior',
    label: 'Dev Júnior',
    short: 'Júnior',
    icon: 'code-slash-outline',
    color: '#1CB0F6',
    soft: '#DDF3FF',
    minDone: 1,
    minStars: 0,
    desc: 'Domínio dos conceitos básicos.',
  },
  {
    id: 'pleno',
    label: 'Dev Pleno',
    short: 'Pleno',
    icon: 'construct-outline',
    color: '#7C5CFF',
    soft: '#ECE6FF',
    minDone: 4,
    minStars: 0,
    desc: 'Concluiu as quatro fases com autonomia.',
  },
  {
    id: 'senior',
    label: 'Dev Sênior',
    short: 'Sênior',
    icon: 'trophy-outline',
    color: '#FF9600',
    soft: '#FFE9C7',
    minDone: 99,
    minStars: 0,
    desc: 'Critérios avançados (a definir).',
  },
  {
    id: 'chefe',
    label: 'Dev Sênior-Chefe',
    short: 'Chefe',
    icon: 'ribbon-outline',
    color: '#58CC02',
    soft: '#E3F8CC',
    minDone: 99,
    minStars: 0,
    desc: 'Nível máximo (a definir).',
  },
]

export function levelFromProgress(doneCount, stars) {
  let current = LEVELS[0]
  for (const lv of LEVELS) {
    if (doneCount >= lv.minDone && stars >= lv.minStars) current = lv
  }
  return current
}

export function nextLevel(current) {
  const i = LEVELS.findIndex((l) => l.id === current.id)
  return i >= 0 && i < LEVELS.length - 1 ? LEVELS[i + 1] : null
}

/* ------------------------------------------------------------------ */
/*  Insígnias por fase                                                 */
/* ------------------------------------------------------------------ */
export const BADGES = {
  fase1: {
    id: 'fase1',
    title: 'Primeiros passos',
    subtitle: 'Algoritmo, início e fim',
    skill: 'Estrutura básica de programas e tipos de dados',
    icon: 'bookmark',
    color: '#7C5CFF',
    soft: '#ECE6FF',
  },
  fase2: {
    id: 'fase2',
    title: 'Contas que fazem sentido',
    subtitle: 'Variáveis e operações',
    skill: 'Atribuição, operadores e informações acessíveis',
    icon: 'calculator',
    color: '#1CB0F6',
    soft: '#DDF3FF',
  },
  fase3: {
    id: 'fase3',
    title: 'Decisões justas',
    subtitle: 'Condicionais e lógica',
    skill: 'Se/senão, comparações e operadores lógicos',
    icon: 'git-branch',
    color: '#FF6FA5',
    soft: '#FFE3EE',
  },
  fase4: {
    id: 'fase4',
    title: 'Loja aberta para todos',
    subtitle: 'Eventos, estados e testes',
    skill: 'Experiência completa e acessibilidade de ponta a ponta',
    icon: 'storefront',
    color: '#FF9600',
    soft: '#FFE9C7',
  },
}

/* ------------------------------------------------------------------ */
/*  Frases de apoio por fase                                           */
/* ------------------------------------------------------------------ */
export const SUPPORT = {
  fase1: {
    correct: [
      'Isso! Você organizou a ideia com clareza.',
      'Boa! O programa começa a fazer sentido.',
      'Acertou. Cada linha no lugar certo conta.',
      'Mandou bem — a estrutura está clara.',
    ],
    wrong: [
      'Quase! Releia o que a tela pede e tente de novo.',
      'Não foi dessa vez. Dica: pense no que o usuário vê primeiro.',
      'Erro comum no começo. Respira e olha a ordem das linhas.',
      'Falta um detalhe. Compare com o exemplo da missão.',
    ],
    streak3: 'Três acertos seguidos! Você já está pegando o jeito da linguagem.',
    phaseDone: 'Fase 1 concluída! Agora você sabe dar nome, início e fim a um programa.',
  },
  fase2: {
    correct: [
      'Perfeito! A conta bateu e a informação ficou clara.',
      'Isso aí — variável guardou o valor certo.',
      'Boa! O cliente consegue conferir o total.',
      'Acertou. Operação + saída = resultado útil.',
    ],
    wrong: [
      'Quase lá. Confira se multiplicou preço × quantidade.',
      'O valor não bateu. Acompanhe as variáveis passo a passo.',
      'Falta mostrar algo na tela. O usuário precisa ver o resultado.',
      'Revise a atribuição: total precisa receber o resultado da conta.',
    ],
    streak3: 'Três desafios seguidos! Você está dominando variáveis e operações.',
    phaseDone: 'Fase 2 concluída! Contas certas e informações que o cliente entende.',
  },
  fase3: {
    correct: [
      'Isso! A regra só libera quando faz sentido.',
      'Boa decisão — o sistema escolheu o caminho certo.',
      'Acertou a condição. Agora o cliente sabe o que aconteceu.',
      'Perfeito. “E” e “ou” fazem diferença na prática.',
    ],
    wrong: [
      'Quase. Teste o caso limite (zero, por exemplo).',
      'A condição liberou o que não deveria. Revise o operador lógico.',
      'Falta uma mensagem clara quando a compra não pode seguir.',
      'Compare os dois caminhos: se e senão precisam explicar o resultado.',
    ],
    streak3: 'Três acertos em sequência! Você está pensando como quem testa regras de verdade.',
    phaseDone: 'Fase 3 concluída! Decisões do programa que fazem sentido para quem usa.',
  },
  fase4: {
    correct: [
      'Excelente! A experiência ficou mais clara para todo mundo.',
      'Isso — o sistema respondeu do jeito certo ao evento.',
      'Boa! Teste passou e a acessibilidade melhorou.',
      'Acertou. Uma correção pequena, impacto grande.',
    ],
    wrong: [
      'Quase. Pense em quem não ouve o som ou não vê o aviso.',
      'O segundo toque ainda passou. Bloqueie enquanto processa.',
      'Revise a mensagem: ela precisa orientar, não só avisar erro.',
      'Teste outro cenário — às vezes o limite é o que quebra.',
    ],
    streak3: 'Três acertos seguidos na reta final! Você está pensando na experiência inteira.',
    phaseDone: 'Fase 4 concluída! A loja do Tonho está pronta para mais gente usar com autonomia.',
  },
}

export function pickSupport(phaseKey, kind) {
  const bag = SUPPORT[phaseKey]?.[kind] || SUPPORT.fase1[kind]
  if (Array.isArray(bag)) return bag[Math.floor(Math.random() * bag.length)]
  return bag || 'Continue assim!'
}
