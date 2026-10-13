/**
 * Painel "O QUE FAZER" de cada missão.
 * Usa os dados que já existem em MISSIONS: task, goals, steps, hint/hints.
 *
 *  <GuidePanel key={idx} mission={m} onTutorial={coachCtrl.reopen} />
 */
import { useState } from 'react'
import { Platform } from 'react-native'
import { View, Text, Pressable, Ionicons } from '../lib/themedRN'
import { C } from '../lib/colors'

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace'

function Pill({ icon, label, onPress, active, tone = 'violet' }) {
  const bg = active ? (tone === 'orange' ? C.orange : C.violet) : tone === 'orange' ? C.orangeSoft : C.violetSoft
  const fg = active ? C.white : tone === 'orange' ? C.orangeDark : C.violetDark
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ expanded: !!active }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 12, borderRadius: 14, backgroundColor: bg }}
    >
      <Ionicons name={icon} size={16} color={fg} />
      <Text style={{ color: fg, fontWeight: '900', fontSize: 12, letterSpacing: 0.4 }}>{label}</Text>
    </Pressable>
  )
}

export default function GuidePanel({ mission, onTutorial }) {
  const [showSteps, setShowSteps] = useState(false)
  const [hintLvl, setHintLvl] = useState(0)

  const goals = mission.goals || []
  const steps = mission.steps || []
  const hints = mission.hints || (mission.hint ? [mission.hint] : [])

  return (
    <View style={{ marginTop: 12 }}>
      {mission.task ? (
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: C.orangeSoft, borderRadius: 16, padding: 12, borderWidth: 2, borderColor: C.orangeLine }}>
          <Ionicons name="flag" size={20} color={C.orangeDark} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.orangeDark, fontWeight: '900', fontSize: 10, letterSpacing: 1 }}>SUA MISSÃO</Text>
            <Text style={{ color: C.ink, fontWeight: '800', fontSize: 15, lineHeight: 21, marginTop: 2 }}>{mission.task}</Text>
          </View>
        </View>
      ) : null}

      {goals.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          {goals.map((g, i) => (
            <View
              key={i}
              accessible
              accessibilityLabel={String(g.label).replace('\n', ' ')}
              style={{ flex: 1, alignItems: 'center', backgroundColor: g.bg, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 4 }}
            >
              <Ionicons name={g.icon} size={20} color={g.color} />
              <Text style={{ color: g.color, fontWeight: '900', fontSize: 11, lineHeight: 15, textAlign: 'center', marginTop: 4 }}>{g.label}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        {steps.length > 0 && <Pill icon="list" label="COMO FAZER" active={showSteps} onPress={() => setShowSteps((v) => !v)} />}
        {hints.length > 0 && (
          <Pill
            icon="bulb"
            tone="orange"
            label={hintLvl === 0 ? 'DICA' : hintLvl < hints.length ? `MAIS UMA DICA (${hintLvl}/${hints.length})` : `DICA ${hintLvl}/${hints.length}`}
            onPress={() => setHintLvl((v) => Math.min(hints.length, v + 1))}
          />
        )}
        {onTutorial && <Pill icon="help-circle" label="TUTORIAL" onPress={onTutorial} />}
      </View>

      {showSteps && (
        <View style={{ marginTop: 10, backgroundColor: C.card, borderRadius: 16, borderWidth: 2, borderColor: C.line, padding: 12, gap: 12 }}>
          {steps.map((st, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.violetSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: C.violetDark, fontWeight: '900', fontSize: 13 }}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.ink, fontWeight: '800', fontSize: 14, lineHeight: 20 }}>{st.title}</Text>
                {st.code ? (
                  <View style={{ alignSelf: 'flex-start', backgroundColor: C.code, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginTop: 6 }}>
                    <Text style={{ color: C.codeText, fontFamily: MONO, fontSize: 12 }}>{st.code}</Text>
                  </View>
                ) : null}
                {st.example ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {st.example.map((ex, k) => (
                      <View
                        key={k}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: ex.ok ? C.successSoft : C.errorSoft }}
                      >
                        <Ionicons name={ex.ok ? 'checkmark-circle' : 'close-circle'} size={14} color={ex.ok ? C.successDark : C.errorDark} />
                        <Text style={{ fontFamily: MONO, fontWeight: '800', fontSize: 12, color: ex.ok ? C.successDark : C.errorDark }}>{ex.label}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      )}

      {hintLvl > 0 &&
        hints.slice(0, hintLvl).map((h, i) => (
          <View
            key={i}
            accessibilityRole="alert"
            style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: C.orangeSoft, borderColor: C.orangeLine, borderWidth: 2, borderRadius: 16, padding: 12, marginTop: 10 }}
          >
            <Ionicons name="bulb" size={20} color={C.orangeDark} />
            <Text style={{ flex: 1, color: C.orangeDark, fontWeight: '700', fontSize: 13, lineHeight: 19 }}>{h}</Text>
          </View>
        ))}
    </View>
  )
}