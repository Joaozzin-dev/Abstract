/**
 * Níveis e títulos a partir dos pontos.
 * Ajuste a tabela livremente — UI e store usam getRankFromPoints.
 */
export const RANKS = [
  { level: 1, minPoints: 0, title: 'Estagiário', subtitle: 'Primeiro dia na Loja do Tonho' },
  { level: 2, minPoints: 25, title: 'Dev Júnior', subtitle: 'Já entrega com acessibilidade em mente' },
  { level: 3, minPoints: 60, title: 'Dev Pleno', subtitle: 'Contraste e toque sob controle' },
  { level: 4, minPoints: 110, title: 'Dev Sênior', subtitle: 'Quase um colega da Cátia' },
  { level: 5, minPoints: 160, title: 'Tech Lead a11y', subtitle: 'A loja está no ar para todos' },
  { level: 6, minPoints: 175, title: 'Guardião WCAG', subtitle: 'Completou a introdução com excelência' },
]

export function getRankFromPoints(points = 0) {
  const p = Number(points) || 0
  let current = RANKS[0]
  for (const r of RANKS) {
    if (p >= r.minPoints) current = r
  }
  const idx = RANKS.findIndex((r) => r.level === current.level)
  const next = RANKS[idx + 1] || null
  const prevMin = current.minPoints
  const nextMin = next ? next.minPoints : prevMin
  const span = Math.max(1, nextMin - prevMin)
  const progress = next ? Math.min(1, Math.max(0, (p - prevMin) / span)) : 1
  const pointsToNext = next ? Math.max(0, nextMin - p) : 0
  return {
    ...current,
    next,
    progress,
    pointsToNext,
    isMax: !next,
  }
}
