/**
 * Stub — Guia ABC / referência rápida.
 * Substitua pelo conteúdo real quando tiver a tela pronta.
 * Se o arquivo já existir com outro nome, apague este e corrija o import em Root.js.
 */
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore } from '../store/useStore'

export default function AbcGuide() {
  const insets = useSafeAreaInsets()
  const setScreen = useStore((s) => s.setScreen)

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }}>
        <Text style={styles.title}>Guia rápido</Text>
        <Text style={styles.sub}>
          Referência dos comandos que você usa nas missões da Loja do Tonho.
        </Text>

        {[
          ['algoritmo / inicio / fim', 'Estrutura básica de todo programa.'],
          ['var + tipo', 'Declara caixinhas: real, inteiro, caractere, logico.'],
          ['<-', 'Guarda um valor na variável (atribuição).'],
          ['leia(...)', 'Recebe o que a pessoa digita.'],
          ['escreval(...)', 'Mostra texto ou valor na tela.'],
          ['se ... entao / senao / fimse', 'Decide o caminho do programa.'],
          ['e / ou / nao', 'Junta ou inverte condições.'],
          ['> < >= <= == <>', 'Compara números ou textos.'],
        ].map(([cmd, desc]) => (
          <View key={cmd} style={styles.card}>
            <Text style={styles.cmd}>{cmd}</Text>
            <Text style={styles.desc}>{desc}</Text>
          </View>
        ))}

        <Pressable
          style={styles.btn}
          onPress={() => setScreen?.('map')}
          accessibilityRole="button"
          accessibilityLabel="Voltar ao mapa"
        >
          <Text style={styles.btnText}>VOLTAR</Text>
        </Pressable>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF8EA' },
  title: { fontSize: 26, fontWeight: '900', color: '#1F2A48', marginBottom: 6 },
  sub: { fontSize: 14, fontWeight: '600', color: '#6B7391', lineHeight: 20, marginBottom: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#EADFC5',
  },
  cmd: { fontFamily: 'monospace', fontWeight: '800', fontSize: 14, color: '#5B3FD9' },
  desc: { marginTop: 4, fontSize: 13, fontWeight: '600', color: '#2B3A63', lineHeight: 18 },
  btn: {
    marginTop: 16,
    backgroundColor: '#58CC02',
    borderRadius: 16,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#46A302',
  },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
})
