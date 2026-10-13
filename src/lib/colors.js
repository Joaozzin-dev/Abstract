

/* ======================================================================== */
/* 1. PALETAS DE TEMA                                                        */
/* ======================================================================== */

export const LIGHT = {
  // Base
  bg: '#F5EED2',
  bgDeep: '#E8DFC0',
  card: '#FFFAEB',
  banner: '#132228',
  bannerBlob: '#28413F',
  bannerEdge: '#0B171B',
  ink: '#132228',
  inkSoft: '#344B4D',
  muted: '#586965',
  line: '#D3CBAF',
  track: '#82968A',

  // Marca
  primary: '#39745D',
  primaryDark: '#285641',
  onPrimary: '#FFFFFF',
  progress: '#EBAE29',

  // Semânticas
  success: '#23845B',
  successDark: '#176342',
  successInk: '#176342',
  successSoft: '#DCEFE3',
  successLine: '#A6D3B7',

  error: '#D94343',
  errorDark: '#A52D2D',
  errorInk: '#A52D2D',
  errorSoft: '#FBE3DF',
  errorLine: '#E9B2AA',

  orange: '#EBAE29',
  orangeDark: '#815600',
  orangeInk: '#815600',
  orangeSoft: '#FAEDC9',
  orangeLine: '#E8CD83',

  blue: '#287FA0',
  blueDark: '#185D78',
  blueInk: '#185D78',
  blueSoft: '#DCEEF4',

  // Categorias
  violet: '#7665A8',
  violetDark: '#554783',
  violetInk: '#554783',
  violetSoft: '#EAE5F6',
  violetLine: '#CFC5E9',

  pink: '#CC6686',
  pinkDark: '#963D5C',
  pinkInk: '#963D5C',
  pinkSoft: '#F8E2E9',

  yellow: '#EBAE29',

  // Bloqueado / desabilitado
  lockFace: '#EAE3CC',
  lockEdge: '#D3CBAF',
  lockIcon: '#78847B',
  lockCard: '#F9F3DE',

  // Modais
  scrim: '#f5f1f166',
}

export const DARK = {
  // Base
  bg: '#132228',
  bgDeep: '#0D191E',
  card: '#1D3035',
  banner: '#0B171B',
  bannerBlob: '#28413F',
  bannerEdge: '#071014',
  ink: '#F5EED2',
  inkSoft: '#D9DCCB',
  muted: '#B0C0B7',
  line: '#3A504F',
  track: '#637C72',

  // Marca
  primary: '#589C80',
  primaryDark: '#39745D',
  onPrimary: '#0D1917',
  progress: '#EBAE29',

  // Semânticas
  success: '#589C80',
  successDark: '#39745D',
  successInk: '#8DD5B2',
  successSoft: '#203D35',
  successLine: '#39745D',

  error: '#FF7770',
  errorDark: '#C94B48',
  errorInk: '#FFAAA3',
  errorSoft: '#432728',
  errorLine: '#85413F',

  orange: '#EBAE29',
  orangeDark: '#B98518',
  orangeInk: '#F5CD71',
  orangeSoft: '#3D341F',
  orangeLine: '#79602C',

  blue: '#66C1DF',
  blueDark: '#328EAD',
  blueInk: '#92D9EE',
  blueSoft: '#1C3843',

  // Categorias
  violet: '#B6A5ED',
  violetDark: '#8975C9',
  violetInk: '#D1C4FF',
  violetSoft: '#302A49',
  violetLine: '#574A7A',

  pink: '#F29AB8',
  pinkDark: '#CA6489',
  pinkInk: '#FFB7CE',
  pinkSoft: '#422633',

  yellow: '#F5C95B',

  // Bloqueado / desabilitado
  lockFace: '#24363A',
  lockEdge: '#3A504F',
  lockIcon: '#91A39A',
  lockCard: '#1A2B30',

  // Modais
  scrim: '#000000AA',
}

/**
 * Alto contraste: preto e branco, amarelo e ciano.
 * Mantido independente da identidade visual normal.
 */
export const CONTRAST = {
  bg: '#000000',
  bgDeep: '#1A1A1A',
  card: '#000000',
  banner: '#000000',
  bannerBlob: '#333333',
  bannerEdge: '#FFFFFF',
  ink: '#FFFFFF',
  inkSoft: '#FFFFFF',
  muted: '#E0E0E0',
  line: '#FFFFFF',
  track: '#BDBDBD',

  primary: '#FFE600',
  primaryDark: '#B3A100',
  onPrimary: '#000000',
  progress: '#00E5FF',

  success: '#00E676',
  successDark: '#00A152',
  successInk: '#69F0AE',
  successSoft: '#0A1F10',
  successLine: '#69F0AE',

  error: '#FF5252',
  errorDark: '#C62828',
  errorInk: '#FF8A80',
  errorSoft: '#240808',
  errorLine: '#FF8A80',

  orange: '#FFB020',
  orangeDark: '#B87800',
  orangeInk: '#FFCC66',
  orangeSoft: '#241800',
  orangeLine: '#FFCC66',

  blue: '#40C4FF',
  blueDark: '#0091EA',
  blueInk: '#80D8FF',
  blueSoft: '#001A26',

  violet: '#B388FF',
  violetDark: '#7C4DFF',
  violetInk: '#D1C4FF',
  violetSoft: '#150A26',
  violetLine: '#D1C4FF',

  pink: '#FF80AB',
  pinkDark: '#F50057',
  pinkInk: '#FFB3CC',
  pinkSoft: '#26000F',

  yellow: '#FFEA00',

  lockFace: '#1A1A1A',
  lockEdge: '#9E9E9E',
  lockIcon: '#BDBDBD',
  lockCard: '#000000',

  scrim: '#000000CC',
}

export const PALETTES = {
  light: LIGHT,
  dark: DARK,
  contrast: CONTRAST,
}

/** Escolhe a paleta do tema ativo. */
export function resolveTheme({
  dark = false,
  highContrast = false,
} = {}) {
  if (highContrast) {
    return { id: 'contrast', dark: true, c: CONTRAST }
  }

  return dark
    ? { id: 'dark', dark: true, c: DARK }
    : { id: 'light', dark: false, c: LIGHT }
}

/* ======================================================================== */
/* 2. CORES FIXAS                                                            */
/* ======================================================================== */

export const FIXED = {
  white: '#FFFFFF',
  tile: '#FEFEFE',

  // Medalhas
  medalSilver: '#B8C0CC',
  medalBronze: '#D9894B',

  // Editor de código e terminal
  code: '#132228',
  codeRow: '#1D3035',
  codeLine: '#344B4D',
  codeEdge: '#0B171B',
  codeText: '#F5EED2',
  codeMuted: '#B0C0B7',
  codeDim: '#82968A',
  codeIcon: '#D9DCCB',
  codeIconOff: '#637C72',

  codeOk: '#1E4D38',
  codeBad: '#4D1E27',
  codeSel: '#285641',
  codeRan: '#203D35',

  screenOn: '#0D191E',
  screenOff: '#24363A',

  // Realce de sintaxe
  synString: '#8DD5B2',
  synKeyword: '#F5C95B',
  synNumber: '#EBAE29',
  synType: '#66C1DF',
  synLogic: '#F5CD71',
  synOperator: '#F29AB8',
  synComment: '#91A39A',

  // Ilustrações
  mockBar: '#F5EED2',
  swatchLight: '#B5B5B5',
  swatchMid: '#8A8A8A',
  swatchDark: '#595959',

  shadow: '#000000',

  glass: 'rgba(255,255,255,0.2)',
  glassMid: 'rgba(255,255,255,0.35)',
  glassSoft: 'rgba(255,255,255,0.55)',
  glassStrong: 'rgba(255,255,255,0.8)',
  glassText: 'rgba(255,255,255,0.9)',
  glassTextSoft: 'rgba(255,255,255,0.92)',
  glassHair: '#FFFFFF88',
  glassFill: '#FFFFFFAA',

  shade: 'rgba(8, 12, 24, 0.7)',
  inkTone: '#6B7770',
}

/** Cores das pessoas das cenas das fases. */
export const PERSON_COLORS = {
  chefe: { skin: '#F2C39B', hair: '#3A2A1E' },
  catia: { skin: '#C98B5E', hair: '#132228' },
  marcos: { skin: '#8D5A3B', hair: '#1E140E' },
  sarue: { skin: '#B9B4A7', hair: '#637C72' },
  ana: { skin: '#F0BE98', hair: '#5A2E1A' },
  rafa: { skin: '#E0A57C', hair: '#B5432E' },
  claudia: { skin: '#F0BE98', hair: '#7A3B1E' },
  julia: { skin: '#D9A47A', hair: '#1E140E' },
  pedro: { skin: '#E8B58E', hair: '#3A2A1E' },
  beatriz: { skin: '#F2C39B', hair: '#2B2B2B' },
  tie: '#7A3B2E',
}

/** Personagens do perfil. */
export const CHARACTER_COLORS = {
  dragao: {
    bg: '#DCEFC1',
    body: '#589C80',
    inner: '#F5EED2',
    muzzle: '#F5EED2',
    nose: '#285641',
    horn: '#EBAE29',
  },

  raposa: {
    bg: '#FAEDC9',
    body: '#E58A35',
    inner: '#FFE2C2',
    muzzle: '#FFF1DE',
    nose: '#4A2A14',
  },

  gato: {
    bg: '#DCEEF4',
    body: '#718C91',
    inner: '#F3B8C8',
    muzzle: '#E9EDF4',
    nose: '#E88AA4',
  },

  urso: {
    bg: '#FAEDC9',
    body: '#9C6B3F',
    inner: '#E9C79F',
    muzzle: '#E9C79F',
    nose: '#2B1A10',
  },

  coelho: {
    bg: '#F8E2E9',
    body: '#F6F1F4',
    inner: '#F7A8C4',
    muzzle: '#FFFFFF',
    nose: '#F28AAE',
  },

  morcego: {
    bg: '#EAE5F6',
    body: '#4B3A7A',
    inner: '#8D78C9',
    muzzle: '#6A58A0',
    nose: '#2A1F4A',
  },

  robo: {
    bg: '#DCEEF4',
    body: '#9DB4C8',
    glow: '#287FA0',
  },

  astronauta: {
    bg: '#FAEDC9',
    body: '#FFD7B5',
  },

  // Detalhes comuns
  cheek: '#FF8FA3',
  mouth: '#7A2E3A',
  glassRim: 'rgba(255,255,255,0.9)',
  glassFill: 'rgba(170,215,255,0.28)',
}

/* ======================================================================== */
/* 3. C — PALETA DE AUTORIA                                                  */
/* ======================================================================== */

/** Valores do tema claro + cores fixas. */
export const C = { ...LIGHT, ...FIXED }

/* ---- Remapeamento pelo themedRN ---- */

const HUES = [
  'success',
  'error',
  'orange',
  'blue',
  'violet',
  'pink',
]

/** Fundos e bordas: token -> chave da paleta ativa. */
export const REMAP_FILL = [
  'bg',
  'bgDeep',
  'card',
  'line',
  'track',
  'primary',
  'primaryDark',
  'progress',
  'lockFace',
  'lockEdge',
  'lockCard',
  'banner',
  'bannerBlob',
  'bannerEdge',
  ...HUES.flatMap((h) => [
    h,
    `${h}Dark`,
    `${h}Soft`,
    `${h}Line`,
  ]),
  'yellow',
].filter((k) => k in C)

/** Texto e ícones: token -> chave da paleta ativa. */
export const REMAP_TEXT = [
  'ink',
  'inkSoft',
  'muted',
  'onPrimary',
  'lockIcon',
  'yellow',
  ...HUES.flatMap((h) => [
    h,
    `${h}Dark`,
  ]),
]

/** Em temas escuros, hueDark vira hueInk quando disponível. */
export const textKeyFor = (key) =>
  key.endsWith('Dark')
    ? key.replace('Dark', 'Ink')
    : key

/* ======================================================================== */
/* 4. DADOS VISUAIS                                                          */
/* ======================================================================== */

export const NEUTRAL = '#82968A'

export const CHAPTER_COLORS = {
  fase1: { color: C.orange, soft: C.orangeSoft },
  fase2: { color: C.blue, soft: C.blueSoft },
  fase3: { color: C.violet, soft: C.violetSoft },
  fase4: { color: C.success, soft: C.successSoft },

  vale1: { color: C.violet, soft: C.violetSoft },
  vale2: { color: C.pink, soft: C.pinkSoft },
}

export const AVATAR_COLORS = {
  dev: C.violet,
  tonho: C.orange,
  catia: C.violetDark,
  codigo: C.blue,
  estrela: C.yellow,
  foguete: C.success,
  bug: C.error,
  livro: C.blueDark,
}

export const CARGO_COLORS = {
  estagiario: NEUTRAL,
  junior: C.blue,
  pleno: C.success,
  senior: C.orange,
  lead: C.violet,
  arquiteto: C.pink,
  cto: C.yellow,
}
