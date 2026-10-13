/**
 * Rota "vale": abre Plantão (vale1) ou Sem rede (vale2) conforme store.valeId.
 * O Sem rede usa SemRedeConectado, que já pega a conta logada, o progresso
 * e grava o XP (não grave XP aqui de novo, senão conta em dobro).
 */
import { useStore } from '../store/useStore'
import ValeSilencioScreen from './ValeSilencioScreen'
import SemRedeConectado from './SemRedeConectado'
import { phaseEnd } from '../lib/analytics'

export default function ValeGate(props) {
  const valeId = useStore((s) => s.valeId) || 'vale1'
  const setScreen = useStore((s) => s.setScreen)

  const back = () => {
    try {
      phaseEnd?.('vale', 'close')
    } catch (_) {}
    setScreen?.('jornada')
    props.onClose?.()
  }

  if (valeId === 'vale2') {
    return (
      <SemRedeConectado
        onClose={back}
        onFinish={({ score = 0, xp = 0, mistakes = 0, goal } = {}) => {
          // Guarda só os dados da última partida (o XP já foi gravado pelo SemRedeConectado)
          const st = useStore.getState()
          const prev = st.progress?.vale2 || {}
          useStore.setState({
            progress: {
              ...st.progress,
              vale2: {
                ...prev,
                lastPlayedAt: Date.now(),
                lastScore: score,
                lastGoal: goal,
                lastMistakes: mistakes,
              },
            },
          })
          try {
            phaseEnd?.('vale', 'finish', { score, xp, mistakes })
          } catch (_) {}
        }}
      />
    )
  }

  // Plantão (vale1) — tela já existente
  return <ValeSilencioScreen {...props} onClose={back} />
}
