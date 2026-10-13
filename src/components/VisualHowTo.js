/**
 * Guia visual durante a missão — sem mural de texto.
 * Botão "?" flutuante + folha com passos em ícones / chips de código.
 */
import { useMemo, useState } from 'react'
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { C } from '../lib/colors'
import { useTheme } from '../screens/ProfileScreen'

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace'

/**
 * Faixa de objetivo no topo da missão (3 ícones, poucas palavras).
 * goals: [{ icon, label, color? }]
 */
export function GoalStrip({ goals = [], title = 'O QUE FAZER' }) {
  const { c } = useTheme()
  const g = useMemo(() => goalStyles(c), [c])
  if (!goals.length) return null
  return (
    <View style={g.wrap}>
      <Text style={g.title}>{title}</Text>
      <View style={g.row}>
        {goals.map((x, i) => (
          <View key={i} style={g.item}>
            <View style={[g.icon, { backgroundColor: x.bg || c.violetSoft }]}>
              <Ionicons name={x.icon} size={22} color={x.color || c.violet} />
            </View>
            <Text style={g.label} numberOfLines={2}>
              {x.label}
            </Text>
            {i < goals.length - 1 && (
              <Ionicons
                name="arrow-forward"
                size={14}
                color={c.muted}
                style={g.arrow}
              />
            )}
          </View>
        ))}
      </View>
    </View>
  )
}

const goalStyles = (c) =>
  StyleSheet.create({
  wrap: {
    backgroundColor: c.card,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: c.line,
    padding: 12,
    marginTop: 12,
  },
  title: {
    color: c.muted,
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  item: { flex: 1, alignItems: 'center' },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 6,
    color: c.ink,
    fontWeight: '800',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
  },
  arrow: { position: 'absolute', right: -8, top: 14 },
})

/**
 * Botão de ajuda + modal visual.
 * steps: [{ icon, title, code?, tip? }]
 * tip máximo ~6 palavras; code é chip monospace.
 */
export function HowToButton({ steps = [], title = 'Como resolver' }) {
  const [open, setOpen] = useState(false)
  const insets = useSafeAreaInsets()
  const { c } = useTheme()
  const h = useMemo(() => sheetStyles(c), [c])
  if (!steps.length) return null

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={h.fab}
        accessibilityRole="button"
        accessibilityLabel="Abrir guia visual"
      >
        <Ionicons name="help" size={22} color={C.white} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={h.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[h.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={h.handle} />
            <Text style={h.sheetTitle}>{title}</Text>
            <Text style={h.sheetSub}>Toque nos passos — sem texto longo</Text>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {steps.map((st, i) => (
                <View key={i} style={h.step}>
                  <View style={h.stepNum}>
                    <Text style={h.stepNumText}>{i + 1}</Text>
                  </View>
                  <View style={[h.stepIcon, { backgroundColor: st.bg || c.orangeSoft }]}>
                    <Ionicons name={st.icon || 'bulb'} size={22} color={st.color || c.orangeInk} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={h.stepTitle}>{st.title}</Text>
                    {!!st.code && (
                      <View style={h.codeChip}>
                        <Text style={h.codeText}>{st.code}</Text>
                      </View>
                    )}
                    {!!st.example && (
                      <View style={h.exampleRow}>
                        {(st.example || []).map((ex, j) => (
                          <View key={j} style={[h.exChip, ex.ok === false && h.exBad, ex.ok && h.exOk]}>
                            <Ionicons
                              name={ex.ok === false ? 'close' : ex.ok ? 'checkmark' : 'ellipse'}
                              size={12}
                              color={ex.ok === false ? c.errorInk : ex.ok ? c.successInk : c.muted}
                            />
                            <Text
                              style={[
                                h.exText,
                                ex.ok === false && { color: c.errorInk },
                                ex.ok && { color: c.successInk },
                              ]}
                            >
                              {ex.label}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>

            <Pressable style={h.close} onPress={() => setOpen(false)}>
              <Text style={h.closeText}>ENTENDI</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

/** Atalho: faixa de objetivo + FAB de ajuda */
export function VisualHelp({ goals, steps, howTitle }) {
  return (
    <>
      <GoalStrip goals={goals} />
      <HowToButton steps={steps} title={howTitle || 'Como resolver'} />
    </>
  )
}

const sheetStyles = (c) =>
  StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: c.orange,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
    borderBottomColor: c.orangeDark,
    zIndex: 20,
    elevation: 6,
  },
  backdrop: {
    flex: 1,
    backgroundColor: c.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.line,
    marginBottom: 12,
  },
  sheetTitle: { color: c.ink, fontWeight: '900', fontSize: 20 },
  sheetSub: { color: c.muted, fontWeight: '600', fontSize: 13, marginTop: 2, marginBottom: 14 },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: c.line,
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  stepNumText: { color: c.onPrimary, fontWeight: '900', fontSize: 11 },
  stepIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: { color: c.ink, fontWeight: '800', fontSize: 14, lineHeight: 19 },
  codeChip: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: C.code,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  codeText: { fontFamily: MONO, color: C.synString, fontSize: 12, fontWeight: '700' },
  exampleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  exChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: c.bgDeep,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  exOk: { backgroundColor: c.successSoft },
  exBad: { backgroundColor: c.errorSoft },
  exText: { fontWeight: '700', fontSize: 11, color: c.inkSoft },
  close: {
    marginTop: 8,
    backgroundColor: c.primary,
    borderRadius: 16,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
    borderBottomColor: c.primaryDark,
  },
  closeText: { color: c.onPrimary, fontWeight: '900', fontSize: 15 },
})