import { CHAPTER_COLORS, AVATAR_COLORS } from './colors'

/**
 * Regras de desbloqueio + metadados visuais das fases (ícones intuitivos).
 */

export const CHAPTERS = [
  {
    id: 'fase1',
    num: 1,
    title: 'Primeiros passos',
    subtitle: 'Organizar, ler e escrever o primeiro programa',
    short: 'Linguagem',
    tags: ['algoritmo', 'inicio/fim', 'leia × escreval'],
    icon: 'code-slash',
    color: CHAPTER_COLORS.fase1.color,
    soft: CHAPTER_COLORS.fase1.soft,
  },
  {
    id: 'fase2',
    num: 2,
    title: 'Caixinhas e contas',
    subtitle: 'Guardar dados e calcular o total do pedido',
    short: 'Variáveis',
    tags: ['variáveis', 'operadores', 'depuração'],
    icon: 'calculator',
    color: CHAPTER_COLORS.fase2.color,
    soft: CHAPTER_COLORS.fase2.soft,
  },
  {
    id: 'fase3',
    num: 3,
    title: 'Decisões da loja',
    subtitle: 'Se/então, comparações e operadores lógicos',
    short: 'Condições',
    tags: ['se/então', 'e / ou', 'mensagens'],
    icon: 'git-branch',
    color: CHAPTER_COLORS.fase3.color,
    soft: CHAPTER_COLORS.fase3.soft,
  },
  {
    id: 'fase4',
    num: 4,
    title: 'Inauguração',
    subtitle: 'Eventos, acessibilidade e testes de ponta a ponta',
    short: 'Tudo junto',
    tags: ['eventos', 'estados', 'testes'],
    icon: 'storefront',
    color: CHAPTER_COLORS.fase4.color,
    soft: CHAPTER_COLORS.fase4.soft,
  },
]

export const VALE = [
  {
    id: 'vale1',
    num: 1,
    title: 'Plantão noturno',
    subtitle: 'Desafios aleatórios · 1 min 30 s',
    short: 'Plantão',
    icon: 'flash',
    color: CHAPTER_COLORS.vale1.color,
    soft: CHAPTER_COLORS.vale1.soft,
    requires: 'fase4',
    durationMs: 90_000,
  },

]

/** Avatares disponíveis no perfil (ícones Ionicons). */
export const AVATARS = [
  { id: 'dev', icon: 'laptop-outline', label: 'Dev', color: AVATAR_COLORS.dev },
  { id: 'tonho', icon: 'storefront-outline', label: 'Tonho', color: AVATAR_COLORS.tonho },
  { id: 'catia', icon: 'glasses-outline', label: 'Cátia', color: AVATAR_COLORS.catia },
  { id: 'codigo', icon: 'code-slash-outline', label: 'Código', color: AVATAR_COLORS.codigo },
  { id: 'estrela', icon: 'star-outline', label: 'Estrela', color: AVATAR_COLORS.estrela },
  { id: 'foguete', icon: 'rocket-outline', label: 'Foguete', color: AVATAR_COLORS.foguete },
  { id: 'bug', icon: 'bug-outline', label: 'Bug', color: AVATAR_COLORS.bug },
  { id: 'livro', icon: 'book-outline', label: 'Livro', color: AVATAR_COLORS.livro },
]

export function isChapterUnlocked(chapterId, progress = {}) {
  const order = CHAPTERS.map((c) => c.id)
  const idx = order.indexOf(chapterId)
  if (idx <= 0) return true
  return !!progress[order[idx - 1]]?.done
}

/**
 * Vale liberado quando a fase exigida está concluída.
 * - vale1 e vale2: requires 'fase4' → progress.fase4.done
 * (antes vale2 pedia trilhaC, que não existe no app → sempre cadeado)
 */
export function isValeUnlocked(valeId, progress = {}) {
  const v = VALE.find((x) => x.id === valeId)
  if (!v) return false
  if (v.requires === 'fase4') return !!progress.fase4?.done
  if (v.requires === 'fase3') return !!progress.fase3?.done
  if (v.requires === 'fase2') return !!progress.fase2?.done
  if (v.requires === 'fase1') return !!progress.fase1?.done
  // legado: se ainda existir requires antigo, não trava o jogo
  if (v.requires === 'trilhaC') return !!progress.fase4?.done
  return !!progress.fase4?.done
}

export function chapterStatus(chapterId, progress = {}) {
  if (!isChapterUnlocked(chapterId, progress)) return 'locked'
  if (progress[chapterId]?.done) return 'done'
  return 'current'
}

export function nextPlayable(progress = {}) {
  for (const c of CHAPTERS) {
    if (chapterStatus(c.id, progress) === 'current') return c
  }
  if (isValeUnlocked('vale1', progress)) return VALE[0]
  if (isValeUnlocked('vale2', progress)) return VALE[1]
  return null
}

export function totalStars(progress = {}) {
  return CHAPTERS.reduce((acc, c) => acc + (progress[c.id]?.stars || 0), 0)
}

export function totalXp(progress = {}) {
  let xp = 0
  for (const c of CHAPTERS) {
    const p = progress[c.id]
    if (p?.done) xp += 30 + (p.stars || 0) * 50
  }
  xp += (progress.vale1?.bestScore || 0) * 10
  xp += (progress.vale2?.bestScore || 0) * 12
  return xp
}