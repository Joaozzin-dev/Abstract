/**
 * Root — Carregamento → Login (obrigatório) → rotas (ver appRoutes.js).
 * Firebase: sessão restaurada no boot, progresso sincronizado em segundo plano,
 * e logout automático se a sessão expirar.
 */
import { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet, Platform, Linking } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useStore } from './store/useStore'
import { setSoundEnabled } from './lib/sounds'
import { ROUTES, TABS, DEFAULT_ROUTE, isRoute, isFullscreen, canOpen, screenFromUrl } from './routes'
import { onAuthChanged } from './lib/Authservice'
import { sfx } from './lib/sounds'
import { startSocial, stopSocial, recordPhaseTime } from './lib/social'
import { installFeedback, setHapticsEnabled } from './lib/feedback'
import { setReduceMotion } from './lib/motion'
import { setCurrentTheme, themeSignature } from './lib/themedRN'
import { C } from './lib/colors'
import { startCloudSync, flushCloudSync, clearLocalUserData } from './lib/cloud'
import { startTracking, stopTracking, trackScreen, track, phaseStart, phaseEnd, phaseOpen } from './lib/analytics'

// Escreve direto no store (funciona mesmo que ele não tenha uma ação setAccount).
const setAccount = (account) => useStore.setState({ account })

installFeedback() // sons do app passam a vibrar junto (uma vez só)

import { useTheme, loadSettings } from './screens/ProfileScreen'
import LoginScreen, { authApi } from './screens/login'
import LoadingScreen, { useAppBootstrap } from './screens/LoadingScreen'

/* Tarefas REAIS de inicialização (o carregamento só termina quando todas acabam). */
const BOOT_TASKS = [
  { label: 'Ajustando suas preferências', optional: true, run: loadSettings },
  {
    label: 'Carregando seu progresso',
    weight: 2,
    optional: true,
    run: async () => {
      await useStore.persist?.rehydrate?.()
    },
  },
  {
    label: 'Verificando sua conta',
    weight: 2,
    optional: true,
    run: async () => {
      // Firebase é a fonte da verdade: sem sessão válida, limpa conta "fantasma" persistida.
      const account = await authApi.restoreSession()
      setAccount(account || null)
    },
  },
]

export default function Root() {
  const screen = useStore((s) => s.screen) || DEFAULT_ROUTE
  const setScreen = useStore((s) => s.setScreen)
  const finishPhase = useStore((s) => s.finishPhase)
  const soundEnabled = useStore((s) => s.soundEnabled)
  const hapticsEnabled = useStore((s) => s.hapticsEnabled)
  const account = useStore((s) => s.account)
  const progress = useStore((s) => s.progress)
  const valeId = useStore((s) => s.valeId)
  const insets = useSafeAreaInsets()
  const t = useTheme()
  setCurrentTheme(t) // telas e componentes temáticos leem o tema atual a partir daqui

  const boot = useAppBootstrap(BOOT_TASKS)
  const [booted, setBooted] = useState(false)
  const uid = account?.uid

  useEffect(() => {
    if (typeof setSoundEnabled === 'function') setSoundEnabled(soundEnabled !== false)
  }, [soundEnabled])

  useEffect(() => {
    setHapticsEnabled(hapticsEnabled !== false)
  }, [hapticsEnabled])

  // "Reduzir movimento" do Perfil vale para o app inteiro.
  useEffect(() => {
    setReduceMotion(!!t.reduce)
  }, [t.reduce])

  // Rota desconhecida ou bloqueada → Jornada.
  useEffect(() => {
    if (!booted) return
    const ok = isRoute(screen) ? canOpen(screen, progress, valeId) : ['splash', 'login', 'terms', 'map'].includes(screen)
    if (!ok) setScreen?.(DEFAULT_ROUTE)
  }, [booted, screen, progress, valeId])

  // Firestore: baixa/mescla o progresso e salva automaticamente enquanto houver conta.
  useEffect(() => {
    if (!booted || !uid) return
    let alive = true
    let stop
    startCloudSync(account).then((s) => {
      if (!alive) return s()
      stop = () => {
        s()
        stopSocial()
      }
      startSocial() // feed/ativos: só depois do progresso baixado
    })
    return () => {
      alive = false
      stop?.()
    }
  }, [booted, uid])

  // Telemetria: uma sessão por abertura do app, enquanto houver conta.
  useEffect(() => {
    if (!booted || !uid) return
    startTracking(account)
    return () => {
      stopTracking()
    }
  }, [booted, uid])

  // Tempo por tela e por fase.
  const [prevScreen, setPrevScreen] = useState(null)
  useEffect(() => {
    if (!booted || !uid) return
    if (prevScreen && prevScreen !== screen && phaseOpen(prevScreen)) phaseEnd(prevScreen, 'left')
    trackScreen(screen)
    if ((ROUTES[screen]?.phase || screen === 'vale') && !phaseOpen(screen)) phaseStart(screen)
    setPrevScreen(screen)
  }, [booted, uid, screen])

  // Sessão expirada / usuário removido no Firebase → volta pro login.
  useEffect(() => {
    if (!booted) return
    return onAuthChanged((user) => {
      if (!user && useStore.getState().account) setAccount(null)
    })
  }, [booted])

  // Deep links (poema://fase2, .../ranking). Só depois do login.
  useEffect(() => {
    if (!booted || !uid) return
    const go = (url) => {
      const id = screenFromUrl(url)
      if (id && canOpen(id, useStore.getState().progress, useStore.getState().valeId)) setScreen?.(id)
    }
    Linking.getInitialURL().then(go).catch(() => {})
    const sub = Linking.addEventListener('url', ({ url }) => go(url))
    return () => sub.remove()
  }, [booted, uid])

  if (!booted) {
    return (
      <LoadingScreen
        status={boot.label}
        ready={boot.ready}
        error={boot.error}
        onRetry={boot.retry}
        onFinish={() => {
          if (screen === 'login' || screen === 'splash') setScreen?.(DEFAULT_ROUTE)
          setBooted(true)
        }}
      />
    )
  }

  // Conta obrigatória: sem conta, só a tela de entrada aparece.
  if (!account) {
    return <LoginScreen onAuthenticated={(res) => {
          if (res?.account) setAccount(res.account)
          setScreen?.(DEFAULT_ROUTE)
        }} />
  }

  const c = t.c
  const route = ROUTES[screen] || ROUTES[DEFAULT_ROUTE]
  const Screen = route.Component
  const showTabs = !isFullscreen(screen)

  const backToJourney = () => {
    phaseEnd(screen, 'close')
    setScreen(DEFAULT_ROUTE)
  }

  async function signOut() {
    try {
      await flushCloudSync() // garante que o último progresso subiu
    } catch (_) {}
    try {
      await stopTracking('logout') // último envio precisa ir ANTES de sair do Firebase
    } catch (_) {}
    try {
      await authApi.signOut()
    } catch (_) {}
    clearLocalUserData() // próximo usuário do aparelho não herda o progresso
    setScreen?.(DEFAULT_ROUTE)
  }

  const props = {}
  if (route.phase) {
    props.onClose = backToJourney
    props.onFinish = (r) => {
      const ms = phaseEnd(screen, 'finish', { mistakes: r?.mistakes, stars: r?.stars })
      finishPhase?.(screen, r || {})
      if ((r?.stars || 0) >= 1) recordPhaseTime(screen, ms) // melhor tempo da fase → base de "recorde"

      setScreen(DEFAULT_ROUTE)
    }
  }
  if (route.needs?.includes('onSignOut')) props.onSignOut = signOut

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <View style={styles.body}>
        <Screen key={`${screen}:${themeSignature(t)}`} {...props} />
      </View>

      {showTabs && (
        <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8), backgroundColor: c.card, borderTopColor: c.line, borderTopWidth: t.bw }]}>
          {TABS.map((tab) => {
            const active = screen === tab.id
            return (
              <Pressable
                key={tab.id}
                onPress={() => {
                  track('tab_press', { tab: tab.id })
                  if (tab.id !== 'ranking') sfx?.tap?.() // o ranking toca o próprio som ao abrir
                  setScreen?.(tab.id)
                }}
                style={[styles.tab, { minHeight: t.touch }]}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={tab.label}
              >
                <Ionicons name={active ? tab.icon : `${tab.icon}-outline`} size={t.fs(22)} color={active ? c.violetInk : c.muted} />
                <Text style={[styles.tabLabel, { fontSize: t.fs(11), color: active ? c.violetInk : c.muted }]}>{tab.label}</Text>
              </Pressable>
            )
          })}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    paddingTop: 8,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: -2 } },
      android: { elevation: 8 },
    }),
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabLabel: { fontWeight: '800' },
})