/**
 * Camada de tema para TODAS as telas (fases, Jornada, Ranking...), sem reescrever os estilos.
 *
 * As telas continuam com as cores "claras" originais; estes componentes trocam as cores no
 * momento de desenhar, usando o tema escolhido no Perfil (useTheme):
 *   - modo escuro / alto contraste / paletas   → cores de fundo, borda e texto
 *   - tamanho da fonte                          → fontSize e lineHeight
 *   - alvo de toque maior                       → minHeight dos botões
 *   - bordas mais grossas                       → borderWidth
 * Uso: troque `View, Text, TextInput, Pressable, ScrollView, Ionicons` pelos daqui.
 * O Root chama setCurrentTheme(t) a cada render e remonta a tela quando o tema muda.
 */
import React, { createContext, forwardRef, useContext } from 'react'
import {
  View as RNView,
  Text as RNText,
  TextInput as RNTextInput,
  Pressable as RNPressable,
  ScrollView as RNScrollView,
  StyleSheet,
} from 'react-native'
import { Ionicons as RNIonicons } from '@expo/vector-icons'
import { C, REMAP_FILL, REMAP_TEXT, textKeyFor } from './colors'

let current = null
export const setCurrentTheme = (t) => {
  current = t
}

export function themeSignature(t) {
  if (!t) return 'none'
  const c = t.c || {}
  return [t.dark ? 1 : 0, t.bw, t.touch, typeof t.fs === 'function' ? t.fs(100) : 100, t.reduce ? 1 : 0, c.bg, c.card, c.ink, c.primary, c.success].join('|')
}

/* ---------- cores ---------- */
// Todas as cores vêm de lib/colors.js. As telas escrevem valores de `C` (tema claro); aqui cada
// valor é trocado pelo token equivalente do tema ativo (REMAP_FILL / REMAP_TEXT).
const BG_KEYS = new Set([
  'backgroundColor', 'borderColor', 'borderTopColor', 'borderBottomColor',
  'borderLeftColor', 'borderRightColor', 'borderStartColor', 'borderEndColor',
])
const cache = new WeakMap()

function buildMap(keys, c, keyFor = (k) => k) {
  const map = {}
  for (const k of keys) {
    const from = C[k]
    const to = c[keyFor(k)] ?? c[k]
    if (from && to && String(from).toLowerCase() !== String(to).toLowerCase()) map[String(from).toLowerCase()] = to
  }
  return map
}

function derive(t) {
  if (!t) return null
  let d = cache.get(t)
  if (d) return d
  const c = t.c || {}
  const bg = buildMap(REMAP_FILL, c)
  const text = buildMap(REMAP_TEXT, c, textKeyFor)
  const ratio = typeof t.fs === 'function' ? t.fs(100) / 100 : 1
  d = {
    bg,
    text,
    ratio,
    touch: (t.touch || 0) > 48 ? t.touch : 0,
    bw: (t.bw || 0) >= 3 ? t.bw : 0,
    darkInk: t.dark ? c.ink : null,
  }
  d.identity = !Object.keys(bg).length && !Object.keys(text).length && ratio === 1 && !d.touch && !d.bw && !d.darkInk
  cache.set(t, d)
  return d
}

const NestedText = createContext(false)

function remap(style, d, { isText, isPress, nested }) {
  if (!d || d.identity) return style
  const f = StyleSheet.flatten(style) || {}
  const out = { ...f }
  for (const k in f) {
    const v = f[k]
    if (typeof v === 'string') {
      if (k === 'color') {
        const r = d.text[v.toLowerCase()]
        if (r) out.color = r
      } else if (BG_KEYS.has(k)) {
        const r = d.bg[v.toLowerCase()]
        if (r) out[k] = r
      }
    }
  }
  if (isText) {
    if (d.ratio !== 1) {
      if (typeof f.fontSize === 'number') out.fontSize = Math.round(f.fontSize * d.ratio)
      if (typeof f.lineHeight === 'number') out.lineHeight = Math.round(f.lineHeight * d.ratio)
    }
    if (d.darkInk && f.color == null && !nested) out.color = d.darkInk
  }
  if (d.bw) {
    for (const k of ['borderWidth', 'borderTopWidth', 'borderLeftWidth', 'borderRightWidth']) {
      if (typeof f[k] === 'number' && f[k] > 0) out[k] = Math.max(f[k], d.bw)
    }
    if (typeof f.borderBottomWidth === 'number' && f.borderBottomWidth > 0) out.borderBottomWidth = Math.max(f.borderBottomWidth, d.bw + 2)
  }
  if (isPress && d.touch && typeof f.minHeight === 'number' && f.minHeight >= 36) out.minHeight = Math.max(f.minHeight, d.touch)
  return out
}

/* ---------- componentes ---------- */
export const View = forwardRef(function View({ style, ...p }, ref) {
  return <RNView ref={ref} {...p} style={remap(style, derive(current), {})} />
})

export const Text = forwardRef(function Text({ style, children, ...p }, ref) {
  const nested = useContext(NestedText)
  return (
    <RNText ref={ref} {...p} style={remap(style, derive(current), { isText: true, nested })}>
      <NestedText.Provider value>{children}</NestedText.Provider>
    </RNText>
  )
})

export const TextInput = forwardRef(function TextInput({ style, ...p }, ref) {
  const d = derive(current)
  const dark = d?.darkInk
  return (
    <RNTextInput
      ref={ref}
      placeholderTextColor={dark ? current?.c?.muted : undefined}
      {...p}
      style={remap(style, d, { isText: true })}
    />
  )
})

export const Pressable = forwardRef(function Pressable({ style, ...p }, ref) {
  const d = derive(current)
  const fn = typeof style === 'function'
  return <RNPressable ref={ref} {...p} style={fn ? (st) => remap(style(st), d, { isPress: true }) : remap(style, d, { isPress: true })} />
})

export const ScrollView = forwardRef(function ScrollView({ style, contentContainerStyle, ...p }, ref) {
  const d = derive(current)
  return <RNScrollView ref={ref} {...p} style={remap(style, d, {})} contentContainerStyle={remap(contentContainerStyle, d, {})} />
})

export function Ionicons({ color, ...p }) {
  const d = derive(current)
  const mapped = color && d ? d.text[String(color).toLowerCase()] || color : color || d?.darkInk || undefined
  return <RNIonicons {...p} color={mapped} />
}