/**
 * FONTE ÚNICA DE CORES DO ab.c
 * ---------------------------------------------------------------------------
 * Para mudar a identidade visual, edite SOMENTE este arquivo.
 *
 *  1. PALETAS DE TEMA ...... LIGHT, DARK, CONTRAST (tokens que mudam com o tema)
 *  2. FIXAS ................ cores iguais em todos os temas (editor de código,
 *                            personagens, medalhas, branco sobre cor viva...)
 *  3. `C` .................. paleta de "autoria": é o que as telas escrevem nos
 *                            estilos (valores do tema claro + fixas). Em tempo de
 *                            execução o themedRN troca cada valor de `C` pelo token
 *                            equivalente do tema ativo (veja REMAP_*).
 *  4. DADOS VISUAIS ........ fases, cargos, avatares, personagens
 *  5. `resolveTheme()` ..... escolhe a paleta do tema ativo (usado por useTheme)
 *
 * `xInk` = tom do matiz `x` para TEXTO (escuro no tema claro, claro nos escuros).
 *
 * REGRA DO REMAPEAMENTO POR VALOR: dois tokens do MESMO papel (fundo/borda ou
 * texto/ícone) não podem ter o mesmo valor em `C`. O script `npm run check:colors`
 * (scripts/checkColors.js) confere isso e o contraste mínimo de cada tema.
 */

/* ======================================================================== */
/* 1. PALETAS DE TEMA                                                        */
/* ======================================================================== */

export const LIGHT = {
  // base
  bg: '#F7F3FC', // fundo principal
  bgDeep: '#EDE5F8', // fundo rebaixado (trilhas, áreas internas)
  card: '#FFFFFF', // cartões e superfícies
  banner: '#3D2B52', // faixas escuras de destaque (cabeçalhos com texto branco)
  bannerBlob: '#5A4577', // detalhe decorativo da faixa
  bannerEdge: '#2A1D3B', // borda inferior 3D da faixa
  ink: '#49345F', // texto principal
  inkSoft: '#5F4B78', // texto secundário
  muted: '#6F5F86', // texto de apoio
  line: '#E8DDF8', // bordas
  track: '#8F7FAA', // trilho de switch e controles inativos
  // marca
  primary: '#49345F', // botão principal
  primaryDark: '#2E1F40', // base 3D do botão principal
  onPrimary: '#FDFCFF', // texto/ícone sobre o botão principal
  progress: '#9673C8', // barras e indicadores de progresso
  // semânticas
  success: '#58CC02', successDark: '#2E7D00', successInk: '#2E7D00', successSoft: '#E3F8CC', successLine: '#BFE89A', // acerto
  error: '#FF4B4B', errorDark: '#C62828', errorInk: '#C62828', errorSoft: '#FFE1E1', errorLine: '#FFB3B3', // erro
  orange: '#FF9600', orangeDark: '#9A5600', orangeInk: '#9A5600', orangeSoft: '#FFE9C7', orangeLine: '#FFD08A', // aviso / dica
  blue: '#1CB0F6', blueDark: '#0B6FA8', blueInk: '#0B6FA8', blueSoft: '#DDF3FF', // informação / link
  // matizes de categoria (personagens, fases, recompensas)
  violet: '#7C5CFF', violetDark: '#5B3FD9', violetInk: '#5B3FD9', violetSoft: '#ECE6FF', violetLine: '#D9CFFF',
  pink: '#FF6FA5', pinkDark: '#B02A62', pinkInk: '#B02A62', pinkSoft: '#FFE3EE',
  yellow: '#FFC800',
  // bloqueado / desabilitado
  lockFace: '#EFE9F7', lockEdge: '#DDD2EE', lockIcon: '#8A7BA6', lockCard: '#FBF9FE',
  // camada atrás de modais
  scrim: '#0006',
}

export const DARK = {
  bg: '#17131F', bgDeep: '#120E19', card: '#241E30',
  banner: '#2F2540', bannerBlob: '#46395D', bannerEdge: '#1D1727',
  ink: '#F2EBFC', inkSoft: '#DCD0EE', muted: '#B7A8CC', line: '#40334F', track: '#6F5F8C',
  primary: '#B99AEF', primaryDark: '#8E6BD0', onPrimary: '#17131F', progress: '#B99AEF',
  success: '#58CC02', successDark: '#3F9A00', successInk: '#8EE04A', successSoft: '#25381F', successLine: '#3D6A25',
  error: '#FF6B6B', errorDark: '#C94444', errorInk: '#FF9A92', errorSoft: '#40232A', errorLine: '#7A3340',
  orange: '#FFAA33', orangeDark: '#C77700', orangeInk: '#FFC266', orangeSoft: '#3D2E1A', orangeLine: '#7A5A24',
  blue: '#4CC3FF', blueDark: '#1E8FC9', blueInk: '#8BD6FF', blueSoft: '#1B3345',
  violet: '#A58BFF', violetDark: '#7A5FE0', violetInk: '#C5B5FF', violetSoft: '#2D2650', violetLine: '#4B3F8F',
  pink: '#FF8FB8', pinkDark: '#D4558A', pinkInk: '#FFB3D0', pinkSoft: '#3F2536',
  yellow: '#FFD84D',
  lockFace: '#2A2338', lockEdge: '#40334F', lockIcon: '#8E80A6', lockCard: '#1E1828',
  scrim: '#000A',
}

/** Alto contraste: preto/branco puros, amarelo e ciano; bordas sempre brancas. */
export const CONTRAST = {
  bg: '#000000', bgDeep: '#1A1A1A', card: '#000000',
  banner: '#000000', bannerBlob: '#333333', bannerEdge: '#FFFFFF',
  ink: '#FFFFFF', inkSoft: '#FFFFFF', muted: '#E0E0E0', line: '#FFFFFF', track: '#BDBDBD',
  primary: '#FFE600', primaryDark: '#B3A100', onPrimary: '#000000', progress: '#00E5FF',
  success: '#00E676', successDark: '#00A152', successInk: '#69F0AE', successSoft: '#0A1F10', successLine: '#69F0AE',
  error: '#FF5252', errorDark: '#C62828', errorInk: '#FF8A80', errorSoft: '#240808', errorLine: '#FF8A80',
  orange: '#FFB020', orangeDark: '#B87800', orangeInk: '#FFCC66', orangeSoft: '#241800', orangeLine: '#FFCC66',
  blue: '#40C4FF', blueDark: '#0091EA', blueInk: '#80D8FF', blueSoft: '#001A26',
  violet: '#B388FF', violetDark: '#7C4DFF', violetInk: '#D1C4FF', violetSoft: '#150A26', violetLine: '#D1C4FF',
  pink: '#FF80AB', pinkDark: '#F50057', pinkInk: '#FFB3CC', pinkSoft: '#26000F',
  yellow: '#FFEA00',
  lockFace: '#1A1A1A', lockEdge: '#9E9E9E', lockIcon: '#BDBDBD', lockCard: '#000000',
  scrim: '#000C',
}

export const PALETTES = { light: LIGHT, dark: DARK, contrast: CONTRAST }

/** Escolhe a paleta do tema ativo. `dark` já deve considerar o modo automático do aparelho. */
export function resolveTheme({ dark = false, highContrast = false } = {}) {
  if (highContrast) return { id: 'contrast', dark: true, c: CONTRAST }
  return dark ? { id: 'dark', dark: true, c: DARK } : { id: 'light', dark: false, c: LIGHT }
}

/* ======================================================================== */
/* 2. CORES FIXAS (iguais em todos os temas)                                 */
/* ======================================================================== */

export const FIXED = {
  white: '#FFFFFF', // SÓ para texto/ícone sobre cor viva (como fundo seria remapeado para `card`)
  tile: '#FEFEFE', // branco fixo para logos
  // chip de rank / medalhas
  medalSilver: '#B8C0CC',
  medalBronze: '#D9894B',
  // editor de código, terminal e telas simuladas: escuros em qualquer tema
  code: '#1B1526', codeRow: '#271F36', codeLine: '#3A2E52', codeEdge: '#120D1B',
  codeText: '#F2EBFC', codeMuted: '#A99BC0', codeDim: '#7C6E96',
  codeIcon: '#D9CCEE', codeIconOff: '#5E5078',
  codeOk: '#1E4D2B', codeBad: '#4D1E27', codeSel: '#3B2F66', codeRan: '#2A2447',
  screenOn: '#0E0A16', screenOff: '#2A2040',
  // realce de sintaxe
  synString: '#9AE6A0', synKeyword: '#C4A8FF', synNumber: '#FFD27A',
  synType: '#6CD0FF', synLogic: '#FFB86C', synOperator: '#FF8FB8', synComment: '#8A7BA6',
  // ilustrações
  mockBar: '#EEF1FF', // barra do app simulado
  swatchLight: '#B5B5B5', swatchMid: '#8A8A8A', swatchDark: '#595959', // amostras de contraste (fase 4)
  shadow: '#000000',
  glass: 'rgba(255,255,255,0.2)', glassMid: 'rgba(255,255,255,0.35)', glassSoft: 'rgba(255,255,255,0.55)',
  glassStrong: 'rgba(255,255,255,0.8)', glassText: 'rgba(255,255,255,0.9)', glassTextSoft: 'rgba(255,255,255,0.92)',
  glassHair: '#FFFFFF88', glassFill: '#FFFFFFAA',
  shade: 'rgba(8, 12, 24, 0.7)', // escurece a tela atrás do tutorial
  inkTone: '#6B6385', // detalhes neutros de ilustração (antena)
}

/** Pessoas das cenas das fases. */
export const PEOPLE = {
  chefe: { skin: '#F2C39B', hair: '#3A2A1E' },
  catia: { skin: '#C98B5E', hair: '#2A1B3D' },
  marcos: { skin: '#8D5A3B', hair: '#1E140E' },
  sarue: { skin: '#B9B4C7', hair: '#8E88A3' },
  ana: { skin: '#F0BE98', hair: '#5A2E1A' },
  rafa: { skin: '#E0A57C', hair: '#B5432E' },
  claudia: { skin: '#F0BE98', hair: '#7A3B1E' },
  julia: { skin: '#D9A47A', hair: '#1E140E' },
  pedro: { skin: '#E8B58E', hair: '#3A2A1E' },
  beatriz: { skin: '#F2C39B', hair: '#2B2B2B' },
  tie: '#7A3B2E',
}

/** Personagens do perfil (cores do desenho). */
export const CHARACTER_COLORS = {
  dragao: { bg: '#B8E986', body: '#5BBF3B', inner: '#D8F3B0', muzzle: '#D8F3B0', nose: '#2F6B1E', horn: '#FFC800' },
  raposa: { bg: '#FFD9B0', body: '#F28C28', inner: '#FFE2C2', muzzle: '#FFF1DE', nose: '#4A2A14' },
  gato: { bg: '#D9D4FF', body: '#8E96A8', inner: '#F3B8C8', muzzle: '#E9EDF4', nose: '#E88AA4' },
  urso: { bg: '#FFE3A3', body: '#9C6B3F', inner: '#E9C79F', muzzle: '#E9C79F', nose: '#2B1A10' },
  coelho: { bg: '#FFD6E8', body: '#F6F1F4', inner: '#F7A8C4', muzzle: '#FFFFFF', nose: '#F28AAE' },
  morcego: { bg: '#E3D4FF', body: '#4B3A7A', inner: '#8D78C9', muzzle: '#6A58A0', nose: '#2A1F4A' },
  robo: { bg: '#BFE6FF', body: '#9DB4C8', glow: '#1CB0F6' },
  astronauta: { bg: '#C6CCFF', body: '#FFD7B5' },
  // detalhes comuns do desenho
  cheek: '#FF8FA3', mouth: '#7A2E3A', glassRim: 'rgba(255,255,255,0.9)', glassFill: 'rgba(170,215,255,0.28)',
}

/* ======================================================================== */
/* 3. `C` — PALETA DE AUTORIA (o que as telas escrevem nos estilos)          */
/* ======================================================================== */

/** Valores do tema claro + cores fixas. Em estilos estáticos use sempre `C.token`. */
export const C = { ...LIGHT, ...FIXED }

/* ---- como o themedRN converte `C` no tema ativo ---- */
const HUES = ['success', 'error', 'orange', 'blue', 'violet', 'pink']

/** Fundos e bordas: token → chave da paleta ativa. */
export const REMAP_FILL = [
  'bg', 'bgDeep', 'card', 'line', 'track', 'primary', 'primaryDark', 'progress',
  'lockFace', 'lockEdge', 'lockCard', 'banner', 'bannerBlob', 'bannerEdge',
  ...HUES.flatMap((h) => [h, `${h}Dark`, `${h}Soft`, `${h}Line`]),
  'yellow',
].filter((k) => k in C)
/** Texto e ícones: token → chave da paleta ativa (hueDark usa o tom claro `hueInk` nos temas escuros). */
export const REMAP_TEXT = [
  'ink', 'inkSoft', 'muted', 'onPrimary', 'lockIcon', 'yellow',
  ...HUES.flatMap((h) => [h, `${h}Dark`]),
]
/** Em texto, `xDark` do tema claro vira `xInk` do tema ativo (quando existir). */
export const textKeyFor = (key) => (key.endsWith('Dark') ? key.replace('Dark', 'Ink') : key)

/* ======================================================================== */
/* 4. DADOS VISUAIS                                                          */
/* ======================================================================== */

export const NEUTRAL = '#8F84A6' // estagiário e itens neutros

export const CHAPTER_COLORS = {
  fase1: { color: C.orange, soft: C.orangeSoft },
  fase2: { color: C.blue, soft: C.blueSoft },
  fase3: { color: C.violet, soft: C.violetSoft },
  fase4: { color: C.success, soft: C.successSoft },
  vale1: { color: C.violet, soft: C.violetSoft },
  vale2: { color: C.pink, soft: C.pinkSoft },
}

export const AVATAR_COLORS = {
  dev: C.violet, tonho: C.orange, catia: C.violetDark, codigo: C.blue,
  estrela: C.yellow, foguete: C.success, bug: C.error, livro: C.blueDark,
}

export const CARGO_COLORS = {
  estagiario: NEUTRAL, junior: C.blue, pleno: C.success, senior: C.orange,
  lead: C.violet, arquiteto: C.pink, cto: C.yellow,
}