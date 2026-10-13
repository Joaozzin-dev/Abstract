/**
 * Perfil + configurações de acessibilidade + TEMA do app (useTheme).
 * Este arquivo é a "casa" do tema: LoadingScreen, LoginScreen e Root usam `useTheme()` daqui,
 * então qualquer ajuste (tamanho do texto, alto contraste, escuro...) vale para o app todo.
 *
 * Uso: <ProfileScreen onSignOut={() => ...} />
 */
import perfil1 from '../assets/perfil1.jpeg'
import perfil2 from '../assets/perfil2.jpeg'
import perfil3 from '../assets/perfil3.jpeg'
import perfil4 from '../assets/perfil4.jpeg'
import perfil5 from '../assets/perfil5.jpeg'
import { useEffect, useRef, useState, useSyncExternalStore, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  Modal,
  Linking,
  Animated,
  Image,
  AccessibilityInfo,
  useColorScheme,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useStore } from '../store/useStore'
import { C, DARK, CHARACTER_COLORS, resolveTheme } from '../lib/colors'
import { CHAPTERS, totalStars } from '../lib/unlocks'
import { useXp, CARGOS } from '../lib/xp'
import { music, sfx } from '../lib/sounds'
import TermsScreen, { mailtoRequest } from './TermsScreen'
import {
  loadLearningMemory,
  loadActivity,
  useActivityDates,
  currentStreak,
  BADGES,
  recentOpenErrors,
  getMemory,
} from '../fases/learningMemory'

const DUO = require('../assets/duo.png')

/* =====================================================================
 * CONFIGURAÇÕES + TEMA (compartilhados pelo app inteiro)
 * ===================================================================== */
const SETTINGS_KEY = 'settings:v1'
export const SETTINGS_DEFAULT = {
  appearance: 'auto', // auto | light | dark
  textScale: 1, // 1 | 1.15 | 1.3 | 1.5
  highContrast: false,
  reduceMotion: false, // também respeita a configuração do aparelho
  bigTargets: false, // áreas de toque maiores
}

let settingsState = SETTINGS_DEFAULT
const listeners = new Set()
const subscribe = (cb) => {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
const emit = () => listeners.forEach((l) => l())

/** Chame no carregamento do app (já está nas tarefas do Root). */
export async function loadSettings() {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY)
    if (raw) {
      settingsState = { ...SETTINGS_DEFAULT, ...JSON.parse(raw) }
      emit()
    }
  } catch (_) {}
}
export function setSetting(patch) {
  settingsState = { ...settingsState, ...patch }
  emit()
  AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsState)).catch(() => {})
}
export const resetSettings = () => setSetting(SETTINGS_DEFAULT)
export const useSettings = () => useSyncExternalStore(subscribe, () => settingsState)

/** Tema atual: cores, escala de texto, espessura de borda, tamanho mínimo de toque, movimento reduzido. */
export function useTheme() {
  const st = useSettings()
  const scheme = useColorScheme()
  const [sysReduce, setSysReduce] = useState(false)

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setSysReduce).catch(() => {})
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setSysReduce)
    return () => sub?.remove?.()
  }, [])

  const dark = st.appearance === 'dark' || (st.appearance === 'auto' && scheme === 'dark')
  return useMemo(() => {
    const { c, dark: isDark } = resolveTheme({ dark, highContrast: st.highContrast })
    const scale = st.textScale || 1
    return {
      c,
      dark: isDark,
      hc: st.highContrast,
      scale,
      bw: st.highContrast ? 3 : 2,
      touch: st.bigTargets ? 60 : 48,
      reduce: st.reduceMotion || sysReduce,
      fs: (n) => Math.round(n * scale),
    }
  }, [dark, st.highContrast, st.textScale, st.bigTargets, st.reduceMotion, sysReduce])
}

/* =====================================================================
 * PERSONAGENS (originais, desenhados em código)
 * ===================================================================== */
// bg = cor do cabeçalho do perfil para este personagem. Para adicionar um novo, inclua um item aqui.
export const CHARACTERS = [
  { id: 'perfil1', label: 'Perfil 1', image: perfil1, bg: '#DCEFC1' },
  { id: 'perfil2', label: 'Perfil 2', image: perfil2, bg: '#FAEDC9' },
  { id: 'perfil3', label: 'Perfil 3', image: perfil3, bg: '#DCEEF4' },
  { id: 'perfil4', label: 'Perfil 4', image: perfil4, bg: '#F8E2E9' },
  { id: 'perfil5', label: 'Perfil 5', image: perfil5, bg: '#EAE5F6' },
]
/** Desenha o personagem com Views, numa grade de 100 unidades escalada por `size`. */
export function Character({ c, size = 100 }) {
  const u = size / 100
  const box = (l, t, w, h, st) => ({ position: 'absolute', left: l * u, top: t * u, width: w * u, height: h * u, ...st })
  const tri = (l, t, w, h, color, rot = '0deg') => ({
    position: 'absolute', left: l * u, top: t * u, width: 0, height: 0,
    borderLeftWidth: (w / 2) * u, borderRightWidth: (w / 2) * u, borderBottomWidth: h * u,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color,
    transform: [{ rotate: rot }],
  })
  const dark = C.codeEdge
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {c.ears === 'pointy' && (<>
        <View style={tri(12, 4, 28, 34, c.body, '-14deg')} />
        <View style={tri(60, 4, 28, 34, c.body, '14deg')} />
        <View style={tri(19, 16, 14, 18, c.inner, '-14deg')} />
        <View style={tri(67, 16, 14, 18, c.inner, '14deg')} />
      </>)}
      {c.ears === 'bat' && (<>
        <View style={tri(8, 0, 32, 46, c.body, '-10deg')} />
        <View style={tri(60, 0, 32, 46, c.body, '10deg')} />
        <View style={tri(16, 14, 16, 26, c.inner, '-10deg')} />
        <View style={tri(68, 14, 16, 26, c.inner, '10deg')} />
      </>)}
      {c.ears === 'round' && (<>
        <View style={box(10, 10, 28, 28, { borderRadius: 14 * u, backgroundColor: c.body })} />
        <View style={box(62, 10, 28, 28, { borderRadius: 14 * u, backgroundColor: c.body })} />
        <View style={box(17, 17, 14, 14, { borderRadius: 7 * u, backgroundColor: c.inner })} />
        <View style={box(69, 17, 14, 14, { borderRadius: 7 * u, backgroundColor: c.inner })} />
      </>)}
      {c.ears === 'long' && (<>
        <View style={box(24, 0, 18, 48, { borderRadius: 9 * u, backgroundColor: c.body, transform: [{ rotate: '-8deg' }] })} />
        <View style={box(58, 0, 18, 48, { borderRadius: 9 * u, backgroundColor: c.body, transform: [{ rotate: '8deg' }] })} />
        <View style={box(28, 6, 10, 34, { borderRadius: 5 * u, backgroundColor: c.inner, transform: [{ rotate: '-8deg' }] })} />
        <View style={box(62, 6, 10, 34, { borderRadius: 5 * u, backgroundColor: c.inner, transform: [{ rotate: '8deg' }] })} />
      </>)}
      {c.ears === 'horns' && (<>
        <View style={tri(22, 8, 16, 28, c.horn, '-18deg')} />
        <View style={tri(62, 8, 16, 28, c.horn, '18deg')} />
      </>)}
      {c.ears === 'antenna' && (<>
        <View style={box(48.5, 8, 3, 22, { backgroundColor: C.inkTone })} />
        <View style={box(43, 0, 14, 14, { borderRadius: 7 * u, backgroundColor: c.glow })} />
      </>)}

      <View style={box(14, 24, 72, 72, { borderRadius: (c.visor ? 20 : 36) * u, backgroundColor: c.body })} />
      {c.muzzle && <View style={box(32, 58, 36, 28, { borderRadius: 14 * u, backgroundColor: c.muzzle })} />}

      {c.visor ? (<>
        <View style={box(24, 44, 52, 22, { borderRadius: 11 * u, backgroundColor: dark })} />
        <View style={box(34, 49, 12, 12, { borderRadius: 6 * u, backgroundColor: c.glow })} />
        <View style={box(54, 49, 12, 12, { borderRadius: 6 * u, backgroundColor: c.glow })} />
      </>) : (<>
        <View style={box(28, 44, 17, 17, { borderRadius: 8.5 * u, backgroundColor: C.white })} />
        <View style={box(55, 44, 17, 17, { borderRadius: 8.5 * u, backgroundColor: C.white })} />
        <View style={box(33, 49, 8, 8, { borderRadius: 4 * u, backgroundColor: dark })} />
        <View style={box(60, 49, 8, 8, { borderRadius: 4 * u, backgroundColor: dark })} />
      </>)}

      {c.nose && <View style={box(45, 62, 10, 7, { borderRadius: 4 * u, backgroundColor: c.nose })} />}
      {!c.visor && (<>
        <View style={box(20, 66, 10, 7, { borderRadius: 4 * u, backgroundColor: CHARACTER_COLORS.cheek, opacity: 0.55 })} />
        <View style={box(70, 66, 10, 7, { borderRadius: 4 * u, backgroundColor: CHARACTER_COLORS.cheek, opacity: 0.55 })} />
        <View style={box(42, 74, 16, 8, { borderBottomLeftRadius: 8 * u, borderBottomRightRadius: 8 * u, backgroundColor: CHARACTER_COLORS.mouth })} />
      </>)}
      {c.visor && <View style={box(40, 78, 20, 4, { borderRadius: 2 * u, backgroundColor: c.glow })} />}
      {c.ears === 'helmet' && (
        <View style={box(5, 14, 90, 88, { borderRadius: 45 * u, borderWidth: 5 * u, borderColor: CHARACTER_COLORS.glassRim, backgroundColor: CHARACTER_COLORS.glassFill })} />
      )}
    </View>
  )
}

/* =====================================================================
 * COMPONENTES DE CONFIGURAÇÃO
 * ===================================================================== */
const STAGE_LABEL = { fundamental: 'Ensino fundamental', medio: 'Ensino médio', tecnico: 'Ensino técnico', superior: 'Ensino superior' }

const cache = new WeakMap()
function useS() {
  const t = useTheme()
  let s = cache.get(t)
  if (!s) {
    s = makeStyles(t)
    cache.set(t, s)
  }
  return [t, s]
}

function Segmented({ label, options, value, onChange }) {
  const [t, s] = useS()
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={s.seg}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.a11y || o.label}
            style={[s.segItem, on && s.segOn]}
          >
            {on && <Ionicons name="checkmark" size={t.fs(14)} color={t.c.onPrimary} />}
            <Text style={[s.segText, on && s.segTextOn]}>{o.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function SwitchRow({ icon, label, hint, value, onChange }) {
  const [t, s] = useS()
  return (
    <View style={s.row}>
      <Ionicons name={icon} size={t.fs(22)} color={t.c.inkSoft} />
      <View style={{ flex: 1 }}>
        <Text style={s.rowLabel}>{label}</Text>
        <Text style={s.rowHint}>
          {value ? 'Ligado' : 'Desligado'}
          {hint ? ` · ${hint}` : ''}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: t.c.line, true: t.c.primary }}
        thumbColor={C.white}
        accessibilityLabel={label}
        accessibilityHint={hint}
      />
    </View>
  )
}

function LinkRow({ icon, label, onPress, danger, role = 'button' }) {
  const [t, s] = useS()
  const color = danger ? t.c.errorInk : t.c.inkSoft
  return (
    <Pressable style={s.row} onPress={onPress} accessibilityRole={role}>
      <Ionicons name={icon} size={t.fs(22)} color={color} />
      <Text style={[s.rowLabel, { flex: 1 }, danger && { color: t.c.errorInk }]}>{label}</Text>
      {!danger && <Ionicons name="chevron-forward" size={t.fs(18)} color={t.c.muted} />}
    </Pressable>
  )
}

function Group({ title, children }) {
  const [, s] = useS()
  return (
    <View style={s.group}>
      {title ? (
        <Text style={s.groupTitle} accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  )
}

/* =====================================================================
 * TELA
 * ===================================================================== */
export default function ProfileScreen({ onSignOut }) {
  const insets = useSafeAreaInsets()
  const [t, s] = useS()
  const settings = useSettings()
  const progress = useStore((st) => st.progress) || {}
  const account = useStore((st) => st.account)
  const storeName = useStore((st) => st.displayName)
  const avatarId = useStore((st) => st.avatarId)
  const setAvatarId = useStore((st) => st.setAvatarId)
  const soundEnabled = useStore((st) => st.soundEnabled)
  const setSoundEnabledStore = useStore((st) => st.setSoundEnabled)
  const storeSignOut = useStore((st) => st.signOut)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [terms, setTerms] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [badgesOpen, setBadgesOpen] = useState(false)
  const [levelsOpen, setLevelsOpen] = useState(false)
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date()
    return { y: d.getFullYear(), m: d.getMonth() }
  })

  useEffect(() => {
    loadLearningMemory()
    loadActivity()
  }, [])

  const activityDates = useActivityDates()
  const streak = currentStreak()

  const current = CHARACTERS.find((c) => c.id === avatarId) || CHARACTERS[0]

  // Transição suave da cor do cabeçalho ao trocar de personagem.
  const tr = useRef(new Animated.Value(1)).current
  const [colors, setColors] = useState({ from: current.bg, to: current.bg })
  useEffect(() => {
    if (colors.to === current.bg) return
    setColors((p) => ({ from: p.to, to: current.bg }))
    tr.setValue(0)
    Animated.timing(tr, { toValue: 1, duration: t.reduce ? 0 : 350, useNativeDriver: false }).start()
  }, [current.bg])
  const headerBg = tr.interpolate({ inputRange: [0, 1], outputRange: [colors.from, colors.to] })

  const displayName = account?.name || storeName || 'Dev júnior'
  const handle = account?.handle ? `@${account.handle}` : null
  const subtitle = [account?.institution, STAGE_LABEL[account?.stage]].filter(Boolean).join(' · ')

  const stars = totalStars(progress)
  const done = CHAPTERS.filter((c) => progress[c.id]?.done).length
  // XP, nível e cargo vêm da Speed Run (Vale do Silêncio)
  const { xp, level: lvl, cargo } = useXp()
  const plantao = progress.vale1?.bestScore ?? 0
  const muted = soundEnabled === false
  const first = String(displayName).trim().split(' ')[0]
  const tip =
    done >= 4
      ? `Você concluiu todas as fases, ${first}! Cargo atual: ${cargo.name}.`
      : done === 0
      ? `Oi, ${first}! Vamos começar sua primeira fase?`
      : `Muito bem, ${first}! ${done}/4 fases · você é ${cargo.name}.`

  function toggleMute(on) {
    setSoundEnabledStore?.(on)
    try {
      music?.setMuted?.(!on)
    } catch (_) {}
    sfx?.tap?.()
  }
  function choose(id) {
    sfx?.tap?.()
    setAvatarId?.(id)
    setPickerOpen(false)
  }
  const openPicker = () => {
    sfx?.tap?.()
    setPickerOpen(true)
  }
  const signOut = onSignOut || storeSignOut

  return (
    <View style={s.root}>
      <Animated.View style={[s.header, { paddingTop: insets.top + 8, backgroundColor: headerBg }]}>
        <Pressable
          onPress={openPicker}
          style={s.avatarBtn}
          accessibilityRole="button"
          accessibilityLabel={`Personagem atual: ${current.label}. Toque para trocar`}
        >
<View style={s.avatarCircle}>
  <Image
    source={current.image}
    style={{ width: 118, height: 118, borderRadius: 59 }}
    resizeMode="cover"
  />
</View>
          <View style={s.camBadge}>
            <Ionicons name="color-palette" size={15} color={C.white} />
          </View>
        </Pressable>
      </Animated.View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
        <Text style={s.name} accessibilityRole="header">{displayName}</Text>
        <Text style={s.handle}>{[handle, subtitle || 'Aprendiz de programação'].filter(Boolean).join(' · ')}</Text>
        <Pressable
          onPress={() => { sfx?.tap?.(); setLevelsOpen(true) }}
          accessibilityRole="button"
          accessibilityLabel={`Cargo ${cargo.name}, nível ${lvl.level}, ${xp} XP. Toque para ver a trajetória`}
          style={[s.cargoPill, { backgroundColor: cargo.color + '22', borderColor: cargo.color }]}
        >
          <Ionicons name={cargo.icon} size={t.fs(18)} color={cargo.color} />
          <Text style={[s.cargoPillText, { color: t.c.ink }]}>{cargo.name} · nível {lvl.level}</Text>
        </Pressable>
        <View style={s.cargoTrack} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={[s.cargoFill, { width: `${Math.round(lvl.pct * 100)}%`, backgroundColor: cargo.color }]} />
        </View>

        <View style={s.rowStats} accessible accessibilityLabel={`${done} de 4 fases, ${stars} estrelas, plantão ${plantao}`}>
          <View style={s.statCol}><Text style={s.statN}>{done}/4</Text><Text style={s.statL}>Fases</Text></View>
          <View style={s.sep} />
          <View style={s.statCol}><Text style={s.statN}>{stars}</Text><Text style={s.statL}>Estrelas</Text></View>
          <View style={s.sep} />
          <View style={s.statCol}><Text style={s.statN}>{plantao}</Text><Text style={s.statL}>Plantão</Text></View>
        </View>

        <View style={s.mascotRow}>
          <Image source={DUO} style={s.mascotImg} resizeMode="contain" accessibilityIgnoresInvertColors />
          <View style={s.bubble}>
            <View style={s.tail} />
            <Text style={s.bubbleText}>{tip}</Text>
          </View>
        </View>

        <Text style={s.section} accessibilityRole="header">Visão geral</Text>
        <View style={s.grid}>
          <Pressable
            style={s.tile}
            onPress={() => { sfx?.tap?.(); setCalendarOpen(true) }}
            accessibilityRole="button"
            accessibilityLabel={`${streak} dias seguidos. Toque para ver o calendário`}
          >
            <Ionicons name="flame" size={t.fs(22)} color={t.c.orange} />
            <Text style={s.tileN}>{streak}</Text>
            <Text style={s.tileL}>Dias seguidos</Text>
          </Pressable>
          <View style={s.tile}>
            <Ionicons name="flash" size={t.fs(22)} color={t.c.yellow} />
            <Text style={s.tileN}>{xp}</Text>
            <Text style={s.tileL}>Total de XP</Text>
          </View>
          <Pressable
            style={s.tile}
            onPress={() => { sfx?.tap?.(); setLevelsOpen(true) }}
            accessibilityRole="button"
            accessibilityLabel={`Cargo ${cargo.name}. Toque para ver a trajetória`}
          >
            <Ionicons name={cargo.icon} size={t.fs(22)} color={cargo.color} />
            <Text style={[s.tileN, { fontSize: t.fs(15) }]} numberOfLines={1}>{cargo.name}</Text>
            <Text style={s.tileL}>Cargo · nível {lvl.level}</Text>
          </Pressable>
          <Pressable
            style={s.tile}
            onPress={() => { sfx?.tap?.(); setBadgesOpen(true) }}
            accessibilityRole="button"
            accessibilityLabel={`${done} fases concluídas. Toque para ver insígnias`}
          >
            <Ionicons name="medal" size={t.fs(22)} color={t.c.violet} />
            <Text style={s.tileN}>{done}</Text>
            <Text style={s.tileL}>Fases concluídas</Text>
          </Pressable>
        </View>
        <View style={[s.levelHint, { borderColor: t.c.line }]}>
          <Ionicons name="flag-outline" size={t.fs(16)} color={t.c.muted} />
          <Text style={[s.levelHintText, { color: t.c.muted }]}>
            {cargo.next
              ? `Próximo cargo: ${cargo.next.name} · faltam ${cargo.toNext} XP. O XP vem da Speed Run e do Treino no Vale do Silêncio.`
              : 'Você chegou ao cargo máximo!'}
          </Text>
        </View>

        <Text style={s.section} accessibilityRole="header">Configurações</Text>

        <Group title="Aparência e leitura">
          <View style={s.pad}>
            <Text style={s.rowLabel}>Tema</Text>
            <Segmented
              label="Tema"
              value={settings.appearance}
              onChange={(v) => setSetting({ appearance: v })}
              options={[
                { value: 'auto', label: 'Automático', a11y: 'Tema automático, segue o aparelho' },
                { value: 'light', label: 'Claro' },
                { value: 'dark', label: 'Escuro' },
              ]}
            />
          </View>
          <View style={s.pad}>
            <Text style={s.rowLabel}>Tamanho do texto</Text>
            <Segmented
              label="Tamanho do texto"
              value={settings.textScale}
              onChange={(v) => setSetting({ textScale: v })}
              options={[
                { value: 1, label: 'Padrão' },
                { value: 1.15, label: 'Grande' },
                { value: 1.3, label: 'Maior' },
                { value: 1.5, label: 'Máximo' },
              ]}
            />
            <View style={s.preview} accessible accessibilityLabel="Prévia do tamanho do texto">
              <Text style={s.previewText}>Assim fica o texto no app. Ele muda na hora, sem precisar reiniciar.</Text>
            </View>
          </View>
          <SwitchRow icon="contrast" label="Alto contraste" hint="cores mais fortes e bordas mais grossas" value={settings.highContrast} onChange={(v) => setSetting({ highContrast: v })} />
        </Group>

        <Group title="Movimento e toque">
          <SwitchRow icon="pause-circle-outline" label="Reduzir animações" hint="também segue a configuração do aparelho" value={settings.reduceMotion || t.reduce} onChange={(v) => setSetting({ reduceMotion: v })} />
          <SwitchRow icon="finger-print-outline" label="Áreas de toque maiores" hint="botões mais altos e fáceis de acertar" value={settings.bigTargets} onChange={(v) => setSetting({ bigTargets: v })} />
        </Group>

        <Group title="Som e personagem">
          <SwitchRow icon={muted ? 'volume-mute' : 'volume-high'} label="Som e música" value={!muted} onChange={toggleMute} />
          <LinkRow icon="happy-outline" label="Trocar personagem" onPress={openPicker} />
        </Group>

        <Pressable style={s.resetBtn} onPress={resetSettings} accessibilityRole="button" accessibilityHint="Volta tema, texto, contraste e movimento ao padrão">
          <Ionicons name="refresh" size={t.fs(18)} color={t.c.inkSoft} />
          <Text style={s.resetText}>Restaurar configurações padrão</Text>
        </Pressable>

        <Text style={s.section} accessibilityRole="header">Privacidade e conta</Text>
        <Group>
          <LinkRow icon="document-text-outline" label="Termos de Uso e Privacidade" onPress={() => setTerms(true)} />
          <LinkRow icon="shield-checkmark-outline" label="Meus dados: acesso, correção ou exclusão" role="link" onPress={() => Linking.openURL(mailtoRequest('acesso, correção ou exclusão', account?.handle))} />
          {account && signOut ? <LinkRow icon="log-out-outline" label="Sair da conta" danger onPress={() => signOut()} /> : null}
        </Group>

        <Text style={s.section} accessibilityRole="header">Histórico da loja</Text>
        {CHAPTERS.map((ch) => {
          const p = progress[ch.id]
          return (
            <View key={ch.id} style={s.hist}>
              <View style={[s.histIcon, { backgroundColor: ch.soft }]}>
                <Ionicons name={ch.icon} size={t.fs(18)} color={ch.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.histTitle}>Fase {ch.num} · {ch.short}</Text>
                <Text style={s.histSub}>
                  {p?.done ? `Concluída · ${p.stars} estrelas · ${p.mistakes} erro${p.mistakes === 1 ? '' : 's'}` : 'Ainda não concluída'}
                </Text>
              </View>
              <Ionicons name={p?.done ? 'checkmark-circle' : 'lock-closed'} size={t.fs(22)} color={p?.done ? t.c.success : t.c.muted} />
            </View>
          )
        })}
      </ScrollView>

    
<Modal
  visible={pickerOpen}
  transparent
  animationType={t.reduce ? 'none' : 'slide'}
  onRequestClose={() => setPickerOpen(false)}
>
  <Pressable
    style={s.modalBg}
    onPress={() => setPickerOpen(false)}
    accessibilityLabel="Fechar"
    accessibilityRole="button"
  >
    <Pressable
      style={[
        s.modalSheet,
        { paddingBottom: insets.bottom + 16 },
      ]}
      onPress={() => {}}
      accessible={false}
    >
      <Text
        style={s.modalTitle}
        accessibilityRole="header"
      >
        Escolha seu personagem
      </Text>

      <View style={s.avatarGrid}>
        {CHARACTERS.map((item) => {
          const on = item.id === current.id;

          return (
            <Pressable
              key={item.id}
              style={s.avatarCell}
              onPress={() => choose(item.id)}
              accessibilityRole="button"
              accessibilityLabel={`Escolher ${item.label}`}
              accessibilityState={{ selected: on }}
            >
              <View
                style={[
                  s.avatarOpt,
                  { backgroundColor: item.bg },
                  on && s.avatarOptOn,
                ]}
              >
                <Image
                  source={item.image}
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: 34,
                  }}
                  resizeMode="cover"
                />

                {on && (
                  <View style={s.check}>
                    <Ionicons
                      name="checkmark"
                      size={13}
                      color={t.c.card}
                    />
                  </View>
                )}
              </View>

              <Text
                style={[
                  s.avatarLabel,
                  on && { color: t.c.ink },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={s.closeBtn}
        onPress={() => setPickerOpen(false)}
        accessibilityRole="button"
      >
        <Text style={s.closeText}>FECHAR</Text>
      </Pressable>
    </Pressable>
  </Pressable>
</Modal>

      <Modal visible={terms} animationType={t.reduce ? 'none' : 'slide'} onRequestClose={() => setTerms(false)}>
        <TermsScreen theme={t} onClose={() => setTerms(false)} />
      </Modal>

      {/* Calendário da ofensiva — visual estilo streak com faixas laranja */}
      <Modal visible={calendarOpen} transparent animationType={t.reduce ? 'none' : 'slide'} onRequestClose={() => setCalendarOpen(false)}>
        <Pressable style={s.modalBg} onPress={() => setCalendarOpen(false)} accessibilityLabel="Fechar" accessibilityRole="button">
          <Pressable style={[s.ofensivaSheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}} accessible={false}>
            <Text style={s.ofensivaTitle} accessibilityRole="header">Calendário da ofensiva</Text>
            <Text style={s.ofensivaSub}>
              {streak} dia{streak === 1 ? '' : 's'} seguidos · só conta quando você resolve um desafio
            </Text>
            <View style={s.ofensivaCard}>
              <View style={s.calNav}>
                <Pressable
                  onPress={() => setCalMonth((p) => (p.m === 0 ? { y: p.y - 1, m: 11 } : { y: p.y, m: p.m - 1 }))}
                  accessibilityRole="button"
                  accessibilityLabel="Mês anterior"
                  style={s.calNavBtn}
                >
                  <Ionicons name="chevron-back" size={t.fs(20)} color={t.c.muted} />
                </Pressable>
                <Text style={s.ofensivaMonth}>
                  {['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'][calMonth.m]} de {calMonth.y}
                </Text>
                <Pressable
                  onPress={() => setCalMonth((p) => (p.m === 11 ? { y: p.y + 1, m: 0 } : { y: p.y, m: p.m + 1 }))}
                  accessibilityRole="button"
                  accessibilityLabel="Próximo mês"
                  style={s.calNavBtn}
                >
                  <Ionicons name="chevron-forward" size={t.fs(20)} color={t.c.muted} />
                </Pressable>
              </View>
              <View style={s.calWeek}>
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d, i) => (
                  <Text key={i} style={s.ofensivaWeekDay}>{d}</Text>
                ))}
              </View>
              {(() => {
                const first = new Date(calMonth.y, calMonth.m, 1)
                const startPad = first.getDay()
                const daysInMonth = new Date(calMonth.y, calMonth.m + 1, 0).getDate()
                const today = new Date()
                const todayD =
                  today.getFullYear() === calMonth.y && today.getMonth() === calMonth.m ? today.getDate() : -1
                const rows = []
                let cells = []
                for (let i = 0; i < startPad; i++) cells.push(null)
                for (let d = 1; d <= daysInMonth; d++) {
                  cells.push(d)
                  if (cells.length === 7) {
                    rows.push(cells)
                    cells = []
                  }
                }
                if (cells.length) {
                  while (cells.length < 7) cells.push(null)
                  rows.push(cells)
                }
                return rows.map((row, ri) => {
                  // faixas de ofensiva: grupos consecutivos ativos na semana
                  const segments = []
                  let segStart = -1
                  row.forEach((d, ci) => {
                    const key = d
                      ? `${calMonth.y}-${String(calMonth.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                      : null
                    const active = key && activityDates.has(key)
                    if (active && segStart < 0) segStart = ci
                    if ((!active || ci === 6) && segStart >= 0) {
                      const end = active && ci === 6 ? ci : ci - 1
                      if (end >= segStart) segments.push([segStart, end])
                      segStart = -1
                    }
                  })
                  return (
                    <View key={`r${ri}`} style={s.ofensivaRow}>
                      {segments.map(([a, b], si) => (
                        <View
                          key={`s${si}`}
                          style={[
                            s.ofensivaFire,
                            {
                              left: `${(a / 7) * 100}%`,
                              width: `${((b - a + 1) / 7) * 100}%`,
                            },
                          ]}
                        />
                      ))}
                      {row.map((d, ci) => {
                        if (d == null) return <View key={`e${ri}-${ci}`} style={s.ofensivaCell} />
                        const key = `${calMonth.y}-${String(calMonth.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                        const active = activityDates.has(key)
                        const isToday = d === todayD
                        return (
                          <View
                            key={key}
                            style={s.ofensivaCell}
                            accessibilityLabel={`${d}${active ? ', dia ativo' : ''}${isToday ? ', hoje' : ''}`}
                          >
                            <View style={[isToday && s.ofensivaToday]}>
                              <Text
                                style={[
                                  s.ofensivaDay,
                                  active && s.ofensivaDayOn,
                                  isToday && s.ofensivaDayToday,
                                  !active && !isToday && d > todayD && todayD > 0 && s.ofensivaDayFuture,
                                ]}
                              >
                                {d}
                              </Text>
                            </View>
                          </View>
                        )
                      })}
                    </View>
                  )
                })
              })()}
            </View>
            <Pressable style={s.closeBtn} onPress={() => setCalendarOpen(false)} accessibilityRole="button">
              <Text style={s.closeText}>FECHAR</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Insígnias das fases */}
      <Modal visible={badgesOpen} transparent animationType={t.reduce ? 'none' : 'slide'} onRequestClose={() => setBadgesOpen(false)}>
        <Pressable style={s.modalBg} onPress={() => setBadgesOpen(false)} accessibilityLabel="Fechar" accessibilityRole="button">
          <Pressable style={[s.modalSheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}} accessible={false}>
            <Text style={s.modalTitle} accessibilityRole="header">Insígnias das fases</Text>
            <Text style={s.modalSub}>Cada fase conquistada deixa uma marca da habilidade que você treinou.</Text>
            {CHAPTERS.map((ch) => {
              const p = progress[ch.id]
              const badge = BADGES[ch.id] || BADGES[`fase${ch.num}`] || {
                title: ch.short,
                subtitle: ch.title,
                skill: '',
                icon: ch.icon,
                color: ch.color,
                soft: ch.soft,
              }
              const unlocked = !!p?.done
              return (
                <View key={ch.id} style={[s.badgeRow, !unlocked && { opacity: 0.45 }]}>
                  <View style={[s.badgeIcon, { backgroundColor: badge.soft || ch.soft }]}>
                    <Ionicons name={unlocked ? badge.icon : 'lock-closed'} size={t.fs(22)} color={unlocked ? badge.color : t.c.muted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.histTitle}>{badge.title}</Text>
                    <Text style={s.histSub}>{unlocked ? badge.skill || badge.subtitle : 'Ainda não conquistada'}</Text>
                  </View>
                  {unlocked ? (
                    <Ionicons name="checkmark-circle" size={t.fs(22)} color={t.c.success} />
                  ) : null}
                </View>
              )
            })}
            <Pressable style={s.closeBtn} onPress={() => setBadgesOpen(false)} accessibilityRole="button">
              <Text style={s.closeText}>FECHAR</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Níveis profissionais */}
      <Modal visible={levelsOpen} transparent animationType={t.reduce ? 'none' : 'slide'} onRequestClose={() => setLevelsOpen(false)}>
        <Pressable style={s.modalBg} onPress={() => setLevelsOpen(false)} accessibilityLabel="Fechar" accessibilityRole="button">
          <Pressable style={[s.modalSheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}} accessible={false}>
            <Text style={s.modalTitle} accessibilityRole="header">Sua trajetória</Text>
            <Text style={s.modalSub}>
              Seu cargo sobe com o XP da Speed Run (Vale do Silêncio). Não são certificações profissionais.
            </Text>
            {CARGOS.map((cg) => {
              const reached = xp >= cg.min
              const isCurrent = cg.id === cargo.id
              return (
                <View
                  key={cg.id}
                  style={[
                    s.badgeRow,
                    isCurrent && { borderWidth: 2, borderColor: cg.color, borderRadius: 14, padding: 10 },
                    !reached && { opacity: 0.5 },
                  ]}
                >
                  <View style={[s.badgeIcon, { backgroundColor: cg.color + '22' }]}>
                    <Ionicons name={reached ? cg.icon : 'lock-closed'} size={t.fs(22)} color={reached ? cg.color : t.c.muted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.histTitle}>
                      {cg.name}
                      {isCurrent ? ' · atual' : ''}
                    </Text>
                    <Text style={s.histSub}>A partir de {cg.min} XP</Text>
                  </View>
                  {reached ? <Ionicons name="checkmark-circle" size={t.fs(22)} color={t.c.success} /> : null}
                </View>
              )
            })}
            <Pressable style={s.closeBtn} onPress={() => setLevelsOpen(false)} accessibilityRole="button">
              <Text style={s.closeText}>FECHAR</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

function makeStyles(t) {
  const c = t.c
  const f = t.fs
  const bw = t.bw
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.card },
    header: { alignItems: 'center', paddingBottom: 40 },
    avatarBtn: { marginTop: 12 },
    avatarCircle: { width: 148, height: 148, borderRadius: 74, alignItems: 'center', justifyContent: 'center', backgroundColor: C.glassSoft, borderWidth: 4, borderColor: C.white },
    camBadge: { position: 'absolute', right: 6, bottom: 6, width: 32, height: 32, borderRadius: 16, backgroundColor: C.blueDark, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.white },
    name: { fontSize: f(24), fontWeight: '900', color: c.ink, marginTop: -8 },
    handle: { fontSize: f(13), fontWeight: '600', color: c.muted, marginTop: 4, marginBottom: 16 },
    rowStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 8 },
    statCol: { alignItems: 'center', flex: 1 },
    statN: { fontSize: f(18), fontWeight: '900', color: c.ink },
    statL: { fontSize: f(12), fontWeight: '600', color: c.muted, marginTop: 2 },
    sep: { width: 1, height: 28, backgroundColor: c.line },
    cargoPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: t.touch - 8, paddingHorizontal: 12, borderRadius: 16, borderWidth: bw, marginBottom: 8 },
    cargoPillText: { fontSize: f(14), fontWeight: '900' },
    cargoTrack: { height: 8, borderRadius: 6, backgroundColor: c.line, marginBottom: 16, overflow: 'hidden' },
    cargoFill: { height: 8, borderRadius: 6 },
    mascotRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 14 },
    mascotImg: { width: 84, height: 84 },
    bubble: { flex: 1, backgroundColor: c.card, borderRadius: 18, borderWidth: bw, borderBottomWidth: bw + 2, borderColor: c.line, paddingHorizontal: 14, paddingVertical: 12 },
    tail: { position: 'absolute', left: -8, top: '50%', marginTop: -7, width: 14, height: 14, backgroundColor: c.card, borderLeftWidth: bw, borderBottomWidth: bw, borderColor: c.line, transform: [{ rotate: '45deg' }] },
    bubbleText: { fontSize: f(15), lineHeight: f(21), fontWeight: '800', color: c.ink },
    section: { fontSize: f(18), fontWeight: '900', color: c.ink, marginTop: 22, marginBottom: 10 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    tile: { width: '47%', flexGrow: 1, backgroundColor: c.card, borderRadius: 16, borderWidth: bw, borderBottomWidth: bw + 2, borderColor: c.line, padding: 14, minHeight: 88 },
    tileN: { fontSize: f(20), fontWeight: '900', color: c.ink, marginTop: 6 },
    tileL: { fontSize: f(12), fontWeight: '600', color: c.muted, marginTop: 2 },
    group: { backgroundColor: c.card, borderRadius: 18, borderWidth: bw, borderBottomWidth: bw + 2, borderColor: c.line, marginBottom: 12, overflow: 'hidden' },
    groupTitle: { fontSize: f(13), fontWeight: '900', color: c.muted, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 },
    pad: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, minHeight: t.touch + 4 },
    rowLabel: { color: c.ink, fontWeight: '800', fontSize: f(15) },
    rowHint: { color: c.muted, fontWeight: '600', fontSize: f(12), marginTop: 2 },
    seg: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    segItem: { flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: t.touch, paddingHorizontal: 10, borderRadius: 12, borderWidth: bw, borderColor: c.line, backgroundColor: c.card },
    segOn: { backgroundColor: c.primary, borderColor: c.primaryDark },
    segText: { fontSize: f(14), fontWeight: '800', color: c.inkSoft },
    segTextOn: { color: c.onPrimary },
    preview: { borderRadius: 12, borderWidth: bw, borderColor: c.line, backgroundColor: c.bg, padding: 12 },
    previewText: { fontSize: f(15), lineHeight: f(22), fontWeight: '600', color: c.ink },
    resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: t.touch, borderRadius: 14, borderWidth: bw, borderColor: c.line, backgroundColor: c.card },
    resetText: { fontSize: f(14), fontWeight: '800', color: c.inkSoft },
    hist: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.card, borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: bw, borderColor: c.line },
    histIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    histTitle: { color: c.ink, fontWeight: '800', fontSize: f(14) },
    histSub: { color: c.inkSoft, fontWeight: '600', fontSize: f(12), marginTop: 2 },
    modalBg: { flex: 1, backgroundColor: c.scrim, justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
    modalTitle: { fontSize: f(20), fontWeight: '900', color: c.ink },
    modalSub: { fontSize: f(13), fontWeight: '600', color: c.muted, marginTop: 4, marginBottom: 16 },
    avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
    avatarCell: { width: '25%', alignItems: 'center' },
    avatarOpt: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'transparent' },
    avatarOptOn: { borderColor: c.ink },
    check: { position: 'absolute', right: -2, bottom: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.card },
    avatarLabel: { fontSize: f(12), fontWeight: '800', color: c.muted, marginTop: 6, textAlign: 'center' },
    closeBtn: { marginTop: 18, backgroundColor: c.primary, borderRadius: 14, minHeight: t.touch, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4, borderBottomColor: c.primaryDark },
    closeText: { color: c.onPrimary, fontWeight: '900', fontSize: f(15) },
    levelHint: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: bw, backgroundColor: c.bg },
    levelHintText: { flex: 1, fontSize: f(12), fontWeight: '600' },
    calNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    calNavBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    calWeek: { flexDirection: 'row', marginBottom: 8 },
    ofensivaSheet: { backgroundColor: DARK.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
    ofensivaTitle: { fontSize: f(20), fontWeight: '900', color: DARK.ink },
    ofensivaSub: { fontSize: f(13), fontWeight: '600', color: DARK.muted, marginTop: 4, marginBottom: 14 },
    ofensivaCard: {
      backgroundColor: DARK.card,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: DARK.line,
    },
    ofensivaMonth: { fontSize: f(15), fontWeight: '800', color: DARK.inkSoft, textTransform: 'lowercase' },
    ofensivaWeekDay: { width: '14.28%', textAlign: 'center', fontSize: f(11), fontWeight: '700', color: DARK.muted },
    ofensivaRow: { flexDirection: 'row', height: 40, marginBottom: 6, position: 'relative', alignItems: 'center' },
    ofensivaFire: {
      position: 'absolute',
      top: 4,
      bottom: 4,
      backgroundColor: C.orange,
      borderRadius: 16,
      opacity: 0.95,
    },
    ofensivaCell: { width: '14.28%', height: 40, alignItems: 'center', justifyContent: 'center' },
    ofensivaDay: { fontSize: f(14), fontWeight: '700', color: DARK.muted },
    ofensivaDayOn: { color: DARK.bg, fontWeight: '900' },
    ofensivaDayToday: { color: C.white, fontWeight: '900' },
    ofensivaDayFuture: { color: DARK.line },
    ofensivaToday: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: C.blue,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    badgeIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  })
}