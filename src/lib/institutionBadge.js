/**
 * Identidade visual de uma instituição a partir do nome digitado/escolhido no cadastro.
 * - logo: favicon oficial do site (Google s2) quando a instituição é conhecida;
 * - senão, ícone + cor pelo tipo (universidade, técnico/IF, escola, cursinho...).
 * Nada é guardado no banco: tudo é derivado do nome na hora de desenhar.
 */
const strip = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

// k: trechos (já sem acento, minúsculos) que identificam; d: domínio do site oficial
const LOGOS = [
  { k: ['universidade de brasilia', '(unb)'], d: 'unb.br' },
  { k: ['universidade de sao paulo', '(usp)'], d: 'usp.br' },
  { k: ['unicamp', 'estadual de campinas'], d: 'unicamp.br' },
  { k: ['(ufrj)', 'federal do rio de janeiro'], d: 'ufrj.br' },
  { k: ['(ufmg)', 'federal de minas gerais'], d: 'ufmg.br' },
  { k: ['(ufrgs)', 'federal do rio grande do sul'], d: 'ufrgs.br' },
  { k: ['(ufg)', 'federal de goias'], d: 'ufg.br' },
  { k: ['(ufba)', 'federal da bahia'], d: 'ufba.br' },
  { k: ['(ufpe)', 'federal de pernambuco'], d: 'ufpe.br' },
  { k: ['(ufc)', 'federal do ceara'], d: 'ufc.br' },
  { k: ['(ufpr)', 'federal do parana'], d: 'ufpr.br' },
  { k: ['(ufsc)', 'federal de santa catarina'], d: 'ufsc.br' },
  { k: ['(ucb)', 'catolica de brasilia'], d: 'ucb.br' },
  { k: ['(ceub)', 'centro universitario de brasilia'], d: 'uniceub.br' },
  { k: ['puc-rio'], d: 'puc-rio.br' },
  { k: ['puc-sp'], d: 'pucsp.br' },
  { k: ['(ifb)', 'instituto federal de brasilia'], d: 'ifb.edu.br' },
  { k: ['(ifg)', 'instituto federal de goias'], d: 'ifg.edu.br' },
  { k: ['(ifsp)', 'instituto federal de sao paulo'], d: 'ifsp.edu.br' },
  { k: ['(ifrj)', 'instituto federal do rio de janeiro'], d: 'ifrj.edu.br' },
  { k: ['(ifmg)', 'instituto federal de minas gerais'], d: 'ifmg.edu.br' },
  { k: ['(ifpr)', 'instituto federal do parana'], d: 'ifpr.edu.br' },
  { k: ['(ifrs)', 'instituto federal do rio grande do sul'], d: 'ifrs.edu.br' },
  { k: ['(ifba)', 'instituto federal da bahia'], d: 'ifba.edu.br' },
  { k: ['(ifce)', 'instituto federal do ceara'], d: 'ifce.edu.br' },
  { k: ['cefet-mg'], d: 'cefetmg.br' },
  { k: ['cefet/rj', 'cefet-rj'], d: 'cefet-rj.br' },
  { k: ['colegio pedro ii'], d: 'cp2.g12.br' },
  { k: ['colegio militar de brasilia', '(cmb)'], d: 'cmb.eb.mil.br' },
  { k: ['senai'], d: 'senai.br' },
  { k: ['senac'], d: 'senac.br' },
]

const KIND = {
  superior: { icon: 'school', color: '#7C5CFF', label: 'Ensino superior' },
  tecnico: { icon: 'construct', color: '#FF9600', label: 'Técnico' },
  militar: { icon: 'shield-checkmark', color: '#46A302', label: 'Colégio' },
  escola: { icon: 'book', color: '#1CB0F6', label: 'Escola' },
  cursinho: { icon: 'document-text', color: '#FF6FA5', label: 'Preparatório' },
  outro: { icon: 'business', color: '#6B7391', label: 'Instituição' },
}

function kindOf(n) {
  if (/cursinho|pre-vestibular|preparatorio/.test(n)) return 'cursinho'
  if (/colegio|escola|centro educacional|centro de ensino|\bced\b|\bcem\b|cepmg/.test(n)) {
    if (/tecnic/.test(n)) return 'tecnico'
    return /militar/.test(n) ? 'militar' : 'escola'
  }
  if (/instituto federal|\bif[a-z]{1,3}\b|cefet|etec|faetec|senai|senac|tecnic|profissionalizante/.test(n)) return 'tecnico'
  if (/universidade|faculdade|centro universitario|\buf[a-z]{1,4}\b|\busp\b|\bunb\b|unicamp|\bpuc\b|\buern\b|\buerj\b/.test(n)) return 'superior'
  return 'outro'
}

const cache = new Map()

/** { short, place, kind, icon, color, label, logo } — ou null se o nome estiver vazio. */
export function institutionInfo(raw) {
  const name = String(raw || '').trim()
  if (!name) return null
  if (cache.has(name)) return cache.get(name)
  const n = strip(name)
  const hit = LOGOS.find((l) => l.k.some((x) => n.includes(x)))
  const kind = kindOf(n)

  let short = name
  let place = ''
  const m = name.match(/\(([^)]+)\)\s*$/)
  if (m) {
    const inside = m[1].trim()
    if (!inside.includes(',') && inside.length <= 12) short = inside // sigla: (UnB), (IFB)
    else {
      place = inside // cidade, estado
      short = name.replace(/\s*\([^)]*\)\s*$/, '')
    }
  }
  if (short.length > 26) short = `${short.slice(0, 25).trim()}…`

  const info = {
    short,
    place,
    full: name.replace(/\s*\([^)]*\)\s*$/, '') || name,
    kind,
    ...KIND[kind],
    logo: hit ? `https://www.google.com/s2/favicons?domain=${hit.d}&sz=128` : null,
  }
  cache.set(name, info)
  return info
}
