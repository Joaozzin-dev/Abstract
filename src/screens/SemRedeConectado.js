/**
 * Sem rede já ligado ao app: pega a conta logada e o progresso do store.
 * Use no ValeGate no lugar de <Vale2Screen ... />:
 *   import SemRedeConectado from './SemRedeConectado'
 *   if (valeId === 'vale2') return <SemRedeConectado onClose={onClose} />
 */
import React from 'react'
import { View, Text } from 'react-native'
import { useStore } from '../store/useStore'
import { commitRun } from '../lib/xp'
import { CHAPTERS } from '../lib/unlocks'
import Vale2Screen from './Vale2Screen'

// XP por acerto. AJUSTE aqui se o app tiver outra regra (pistas usadas diminuem o ganho).
const XP_POR_ACERTO = 10
const rewardFor = ({ hints = 0 }) => Math.max(2, XP_POR_ACERTO - hints * 3)

export default function SemRedeConectado({ onClose, onFinish }) {
  const account = useStore((s) => s.account)
  const progress = useStore((s) => s.progress) || {}
  const soundEnabled = useStore((s) => s.soundEnabled)
  const userId = account?.uid

  // Mesma regra da Jornada: fase 4 concluída OU todas as fases concluídas.
  const allDone = Array.isArray(CHAPTERS) && CHAPTERS.length > 0 && CHAPTERS.every((c) => progress[c.id]?.done)
  const liberado = !!progress.fase4?.done || allDone
  const progressoTela = liberado ? { ...progress, fase4: { ...(progress.fase4 || {}), done: true } } : progress

  if (!userId) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 17, textAlign: 'center' }}>Carregando sua conta…</Text>
      </View>
    )
  }

  return (
    <Vale2Screen
      userId={userId}
      progress={progressoTela}
      rewardFor={rewardFor}
      soundEnabled={!!soundEnabled}
      onClose={onClose}
      onFinish={async (r) => {
        // Único dono da recompensa: grava o XP do vale2 no progresso do app.
        commitRun({ key: 'vale2', score: r.score, timeMs: r.timeMs, xp: r.xp, combo: r.combo })
        await onFinish?.(r)
      }}
    />
  )
}
