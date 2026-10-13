/**
 * Ranking › Feed — quem está online/ativo (últimas 2 h) e conquistas automáticas.
 * Dados reais via lib/social (Firebase). Nada aqui é fixo ou simulado.
 */
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Animated, AppState, FlatList, Image, Modal, RefreshControl, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { View, Text, Pressable, ScrollView, Ionicons } from '../lib/themedRN'
import { C } from '../lib/colors'
import { useStore } from '../store/useStore'
import { CHAPTERS, VALE } from '../lib/unlocks'
import { sfx } from '../lib/sounds'
import { ACTIVE_LIMIT, FEED_PAGE, ONLINE_MS, useFeed, usePublicProfile, canPublish, invalidateProfileCache } from '../lib/social'
import { institutionInfo } from '../lib/institutionBadge'
import { setProfilePublic, flushCloudSync } from '../lib/cloud'
import { CHARACTERS, useTheme } from './ProfileScreen'

const TILE = C.tile // branco fixo para logos (não escurece no modo escuro)
const STAGE = { fundamental: 'Ensino fundamental', medio: 'Ensino médio', tecnico: 'Ensino técnico', superior: 'Ensino superior' }
const DAY = 86400000

/* ------------------------------ utilidades ------------------------------ */
function fmtTime(ms) {
  if (!ms) return '—'
  const s = ms / 1000
  return s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}
function ago(ms, now = Date.now()) {
  const m = Math.max(0, Math.round((now - ms) / 60000))
  if (m < 1) return 'agora'
  if (m < 60) return `há ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h} h`
  return `há ${Math.round(h / 24)} d`
}
function presence(seenMs, now = Date.now()) {
  if (now - seenMs < ONLINE_MS) return { online: true, label: 'Online agora', color: C.success, ink: C.successDark }
  return { online: false, label: `Ativo ${ago(seenMs, now)}`, color: C.orange, ink: C.orangeDark }
}
const cap = (n, max) => (n >= max ? `${max}+` : String(n))

/** "Agora" que se atualiza sozinho a cada `step` ms, só com o app aberto. */
function useNow(step = 30000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => AppState.currentState === 'active' && setNow(Date.now()), step)
    const sub = AppState.addEventListener('change', (st) => st === 'active' && setNow(Date.now()))
    return () => {
      clearInterval(id)
      sub.remove()
    }
  }, [step])
  return now
}

const itemOf = (id) => [...CHAPTERS, ...VALE].find((x) => x.id === id)
function titleOf(id) {
  const it = itemOf(id)
  if (it) return it.short || it.title
  return id === 'vale1' ? 'Plantão noturno' : id === 'vale2' ? 'Código sem rede' : id
}
// sem avatarId = personagem padrão, o mesmo que o Perfil mostra para a própria pessoa
const charOf = (avatarId) => CHARACTERS?.find?.((c) => String(c.id) === String(avatarId)) || CHARACTERS?.[0]
const tintOf = (avatarId) => charOf(avatarId)?.bg || C.blueSoft

function describe(p) {
  const t = titleOf(p.itemId)
  const sub = itemOf(p.itemId)?.subtitle
  if (p.kind === 'stars3')
    return {
      icon: 'star', color: C.orange, bg: C.orangeSoft,
      title: `3 estrelas em ${t}`, sub: sub || 'Missão perfeita!',
      bar: { fill: C.yellow, ink: C.orangeDark, text: p.timeMs ? `3 / 3 · ${fmtTime(p.timeMs)}` : '3 / 3' },
    }
  if (p.kind === 'record')
    return {
      icon: 'flash', color: C.violet, bg: C.violetSoft,
      title: `Novo recorde em ${t}`, sub: 'Bateu o próprio tempo',
      bar: { fill: C.violetLine, ink: C.violetDark, text: fmtTime(p.timeMs) },
    }
  return {
    icon: 'trophy', color: C.success, bg: C.successSoft,
    title: `Recorde no ${t}`, sub: 'Speed run · Vale do Silêncio',
    bar: { fill: C.successLine, ink: C.successDark, text: `${p.score || 0} acertos · ${fmtTime(p.timeMs)}` },
  }
}

/* ------------------------------ peças visuais ------------------------------ */

function Avatar({ name, avatarId, size = 44, bg, style }) {
  const ch = charOf(avatarId)

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg || tintOf(avatarId),
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {ch?.image ? (
        <Image
          source={ch.image}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
          }}
          resizeMode="cover"
          accessibilityLabel={`Avatar de ${name || 'usuário'}`}
        />
      ) : (
        <Text
          style={{
            fontWeight: '900',
            fontSize: size * 0.42,
            color: C.ink,
          }}
        >
          {String(name || '?').trim().charAt(0).toUpperCase()}
        </Text>
      )}
    </View>
  )
}

/** Avatar com bolinha de presença no canto. */
function AvatarStatus({ name, avatarId, size, color }) {
  return (
    <View style={{ width: size, height: size }}>
      <Avatar name={name} avatarId={avatarId} size={size} />
      <View style={{ position: 'absolute', right: 0, bottom: 0, width: 20, height: 20, borderRadius: 10, backgroundColor: color, borderWidth: 3, borderColor: C.card }} />
    </View>
  )
}

/** Bolinha que pulsa quando está online (parada se "reduzir animações"). */
function PresenceDot({ online, color, reduce, size = 10 }) {
  const pulse = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (!online || reduce) return undefined
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [online, reduce, pulse])
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] })
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] })
  const box = size * 2.4
  return (
    <View style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {online && !reduce ? <Animated.View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity, transform: [{ scale }] }} /> : null}
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  )
}

/** Logo da instituição (favicon oficial) ou ícone do tipo, se não houver/falhar. */
function InstBadge({ name, size = 22 }) {
  const info = institutionInfo(name)
  const [failed, setFailed] = useState(false)
  if (!info) return null
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: TILE, borderWidth: 2, borderColor: C.line, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {info.logo && !failed ? (
        <Image source={{ uri: info.logo }} style={{ width: size * 0.7, height: size * 0.7 }} resizeMode="contain" onError={() => setFailed(true)} accessibilityIgnoresInvertColors />
      ) : (
        <Ionicons name={info.icon} size={size * 0.55} color={info.color} />
      )}
    </View>
  )
}

/** Botão 3D no estilo do app: afunda ao tocar. */
function Btn({ label, onPress, color = C.blue, dark = C.blueDark, ink = C.white, busy, small, style }) {
  const [down, setDown] = useState(false)
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: !!busy, disabled: !!busy }}
      style={[s.btn, small && s.btnSm, { backgroundColor: color, borderBottomColor: dark, borderBottomWidth: down ? 1 : 4, transform: [{ translateY: down ? 3 : 0 }], opacity: busy ? 0.7 : 1 }, style]}
    >
      {busy ? <ActivityIndicator size="small" color={ink} /> : <Text style={[s.btnText, { color: ink }, small && { fontSize: 13 }]}>{label}</Text>}
    </Pressable>
  )
}

/** Cartão tocável com leve "apertar". */
function Tap({ onPress, style, children, label }) {
  const [down, setDown] = useState(false)
  return (
    <Pressable onPress={onPress} onPressIn={() => setDown(true)} onPressOut={() => setDown(false)} accessibilityRole="button" accessibilityLabel={label} style={[style, { transform: [{ scale: down ? 0.98 : 1 }] }]}>
      {children}
    </Pressable>
  )
}

/** Barra de "missão" (como a de XP): resultado principal da conquista. */
function Bar({ fill, ink, text }) {
  return (
    <View style={s.bar}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: fill, borderRadius: 14 }]} />
      <View style={s.barShine} />
      <Text style={[s.barText, { color: ink }]} numberOfLines={1}>{text}</Text>
    </View>
  )
}

/** Pulso suave dos esqueletos (parado se "reduzir animações"). */
function usePulse(reduce) {
  const a = useRef(new Animated.Value(reduce ? 0.7 : 0.45)).current
  useEffect(() => {
    if (reduce) return undefined
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(a, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [reduce, a])
  return a
}
const block = (w, h = 12, extra) => <View style={[{ width: w, height: h, borderRadius: 8, backgroundColor: C.line }, extra]} />

function OnlineSkeleton({ reduce }) {
  const a = usePulse(reduce)
  return (
    <Animated.View style={{ opacity: a, flexDirection: 'row', gap: 12 }} accessibilityLabel="Carregando quem está ativo" accessibilityLiveRegion="polite">
      {[0, 1].map((i) => (
        <View key={i} style={[s.onCard, { alignItems: 'center', gap: 8 }]}>
          {block(76, 76, { borderRadius: 38 })}
          {block('70%', 14)}
          {block('50%')}
          {block('100%', 40, { borderRadius: 14, marginTop: 8 })}
        </View>
      ))}
    </Animated.View>
  )
}

function PostSkeleton({ reduce }) {
  const a = usePulse(reduce)
  return (
    <Animated.View style={{ opacity: a }} accessibilityLabel="Carregando conquistas" accessibilityLiveRegion="polite">
      {[0, 1].map((i) => (
        <View key={i} style={[s.post, { gap: 12 }]}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            {block(44, 44, { borderRadius: 22 })}
            <View style={{ gap: 6 }}>{block(120, 14)}{block(80)}</View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {block(58, 58, { borderRadius: 16 })}
            <View style={{ flex: 1, gap: 8 }}>{block('80%', 16)}{block('100%', 26, { borderRadius: 14 })}</View>
          </View>
        </View>
      ))}
    </Animated.View>
  )
}

function Notice({ icon, title, text, action, onAction, tone = 'neutral', busy }) {
  const col = tone === 'error' ? C.error : C.muted
  return (
    <View style={s.emptyBox}>
      <View style={[s.emptyIcon, tone === 'error' && { backgroundColor: C.errorSoft }]}>
        <Ionicons name={icon} size={32} color={col} />
      </View>
      {!!title && <Text style={s.emptyTitle}>{title}</Text>}
      <Text style={s.empty}>{text}</Text>
      {action ? <Btn label={action} onPress={onAction} busy={busy} style={{ marginTop: 8, paddingHorizontal: 22 }} /> : null}
    </View>
  )
}

/* ------------------------------ ativos agora ------------------------------ */
const OnlineCard = memo(function OnlineCard({ p, onOpen, now }) {
  const pr = presence(p.seenMs, now)
  const info = institutionInfo(p.institution)
  return (
    <Tap onPress={() => onOpen(p.uid)} style={s.onCard} label={`Ver perfil de ${p.name}. ${pr.label}`}>
      <AvatarStatus name={p.name} avatarId={p.avatarId} size={76} color={pr.color} />
      <Text style={s.onName} numberOfLines={1}>{p.name}</Text>
      <Text style={s.onHandle} numberOfLines={1}>@{p.handle}</Text>
      <View style={s.onInst}>
        {info ? (
          <>
            <InstBadge name={p.institution} size={20} />
            <Text style={s.onInstText} numberOfLines={1}>{info.short}</Text>
          </>
        ) : null}
      </View>
      <View style={s.onStats}>
        <View style={s.stat}>
          <Ionicons name="star" size={15} color={C.orange} />
          <Text style={s.statText}>{p.stars || 0}</Text>
        </View>
        <View style={s.stat}>
          <Ionicons name="flag" size={15} color={C.success} />
          <Text style={s.statText}>{p.done || 0}/{CHAPTERS.length}</Text>
        </View>
      </View>
      <Text style={[s.presLabel, { color: pr.ink }]} numberOfLines={1}>{pr.label}</Text>
      <Btn label="VER PERFIL" small onPress={() => onOpen(p.uid)} style={{ alignSelf: 'stretch' }} />
    </Tap>
  )
})

/* ------------------------------ conquista ------------------------------ */
const PostCard = memo(function PostCard({ p, onOpen, now }) {
  const d = describe(p)
  const info = institutionInfo(p.institution)
  return (
    <Tap onPress={() => onOpen(p.uid)} style={s.post} label={`${p.name}: ${d.title}`}>
      <View style={s.postHead}>
        <Avatar name={p.name} avatarId={p.avatarId} size={44} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.who} numberOfLines={1}>{p.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            {!!info && <InstBadge name={p.institution} size={16} />}
            <Text style={s.handle} numberOfLines={1}>{info ? `${info.short} · ` : ''}@{p.handle}</Text>
          </View>
        </View>
        <Text style={s.when}>{ago(p.createdMs, now)}</Text>
      </View>

      <View style={s.achv}>
        <View style={[s.achvIcon, { backgroundColor: d.bg }]}>
          <Ionicons name={d.icon} size={30} color={d.color} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.achvTitle} numberOfLines={2}>{d.title}</Text>
          <Text style={s.achvSub} numberOfLines={1}>{d.sub}</Text>
          <Bar {...d.bar} />
        </View>
      </View>
    </Tap>
  )
})

/* ------------------------------ perfil ------------------------------ */
function StatCard({ icon, color, v, k, sub, dim }) {
  return (
    <View style={s.statCard}>
      <Ionicons name={icon} size={28} color={dim ? C.line : color} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[s.statCardV, dim && { color: C.muted }]} numberOfLines={1}>{v}</Text>
        <Text style={s.statCardK} numberOfLines={2}>{k}</Text>
        {!!sub && <Text style={s.statCardSub} numberOfLines={1}>{sub}</Text>}
      </View>
    </View>
  )
}

function ProfileModal({ uid, posts, onClose, reduce }) {
  const insets = useSafeAreaInsets()
  const { profile, loading } = usePublicProfile(uid) // direto do Firebase
  const now = useNow()
  const mine = posts.filter((p) => p.uid === uid).slice(0, 6)
  const pr = profile ? presence(profile.seenMs, now) : null
  const inst = institutionInfo(profile?.institution)
  const v1 = !!profile?.vale1Score
  const v2 = !!profile?.vale2Score
  return (
  <Modal
    visible={!!uid}
    animationType={reduce ? 'none' : 'slide'}
    onRequestClose={onClose}
    statusBarTranslucent
  >
    <View style={s.modal}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 32,
        }}
      >
        <View
          style={[
            s.mBand,
            {
              height: 250 + insets.top,
              backgroundColor: tintOf(profile?.avatarId),
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingBottom: 2,
            },
          ]}
        >
          {profile ? (
            <Avatar
              name={profile.name}
              avatarId={profile.avatarId}
              size={144}
              bg={C.glassSoft}
            />
          ) : null}
        </View>

        {loading ? (
          <ActivityIndicator
            style={{ marginTop: 48 }}
            color={C.violet}
          />
        ) : !profile ? (
          <View style={{ padding: 20 }}>
            <Notice
              icon="eye-off-outline"
              title="Perfil indisponível"
              text="Este perfil não está mais visível."
            />
          </View>
        ) : (
          <View>
            <View
              style={[
                s.pHead,
                {
                  paddingTop: 24,
                  paddingBottom: 16,
                  paddingHorizontal: 20,
                  alignItems: 'flex-start',
                },
              ]}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.pName} numberOfLines={2}>
                  {profile.name}
                </Text>

                <Text style={s.pHandle} numberOfLines={1}>
                  @{profile.handle}
                </Text>

                <View style={s.pPres}>
                  <PresenceDot
                    online={pr.online}
                    color={pr.color}
                    reduce={reduce}
                    size={9}
                  />

                  <Text
                    style={[
                      s.presLabel,
                      {
                        color: pr.ink,
                        marginTop: 0,
                        fontSize: 14,
                      },
                    ]}
                  >
                    {pr.label}
                  </Text>
                </View>
              </View>

              {!!inst && (
                <InstBadge
                  name={profile.institution}
                  size={44}
                />
              )}
            </View>

            {!!inst && (
              <View style={s.instRow}>
                <Text style={s.instName} numberOfLines={2}>
                  {inst.full}
                </Text>

                <Text style={s.instMeta}>
                  {[
                    STAGE[profile.stage],
                    inst.label,
                    inst.place,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
            )}

            <View style={s.divider} />

            <View style={s.section}>
              <Text style={s.h2}>Resumo</Text>

              <View style={s.gridRow}>
                <StatCard
                  icon="star"
                  color={C.yellow}
                  v={profile.stars || 0}
                  k="estrelas"
                />

                <StatCard
                  icon="flag"
                  color={C.success}
                  v={`${profile.done || 0}/${CHAPTERS.length}`}
                  k="fases concluídas"
                />
              </View>

              <View style={s.gridRow}>
                <StatCard
                  icon="alarm"
                  color={C.violet}
                  dim={!v1}
                  v={v1 ? profile.vale1Score : '—'}
                  k="Plantão noturno"
                  sub={
                    v1
                      ? `acertos · ${fmtTime(profile.vale1TimeMs)}`
                      : 'não jogou'
                  }
                />

                <StatCard
                  icon="cloud-offline"
                  color={C.blue}
                  dim={!v2}
                  v={v2 ? profile.vale2Score : '—'}
                  k="Código sem rede"
                  sub={
                    v2
                      ? `acertos · ${fmtTime(profile.vale2TimeMs)}`
                      : 'não jogou'
                  }
                />
              </View>

              <View style={s.gridRow}>
                <StatCard
                  icon="checkmark-done"
                  color={C.success}
                  v={
                    (profile.vale1Score || 0) +
                    (profile.vale2Score || 0)
                  }
                  k="acertos no total"
                />

                <StatCard
                  icon="flash"
                  color={C.yellow}
                  v={profile.xp ?? '—'}
                  k="XP (desempate)"
                />
              </View>
            </View>

            {mine.length > 0 && (
              <View style={s.section}>
                <Text style={s.h2}>Conquistas recentes</Text>

                {mine.map((p) => {
                  const d = describe(p)

                  return (
                    <View key={p.id} style={s.miniPost}>
                      <View
                        style={[
                          s.miniIcon,
                          { backgroundColor: d.bg },
                        ]}
                      >
                        <Ionicons
                          name={d.icon}
                          size={22}
                          color={d.color}
                        />
                      </View>

                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          style={s.miniTitle}
                          numberOfLines={1}
                        >
                          {d.title}
                        </Text>

                        <Text
                          style={s.miniSub}
                          numberOfLines={1}
                        >
                          {d.bar.text}
                        </Text>
                      </View>

                      <Text style={s.when}>
                        {ago(p.createdMs, now)}
                      </Text>
                    </View>
                  )
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <Pressable
        onPress={onClose}
        style={[s.close, { top: insets.top + 10 }]}
        accessibilityRole="button"
        accessibilityLabel="Fechar perfil"
      >
        <Ionicons
          name="close"
          size={26}
          color={C.ink}
        />
      </Pressable>
    </View>
  </Modal>

  )
}

/* ------------------------------ tela ------------------------------ */
export default function FeedView() {
  const insets = useSafeAreaInsets()
  const t = useTheme()
  const account = useStore((st) => st.account)
  const { posts, active, loading, loadingMore, hasMore, error, reload, loadMore } = useFeed()
  const now = useNow()
  const [open, setOpen] = useState(null)
  const [busy, setBusy] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const adult = account?.ageBand === '18plus'
  const visible = canPublish(account)
  const firstLoad = loading && posts.length === 0 && active.length === 0
  const stale = !!error && (posts.length > 0 || active.length > 0)
  const onlineNow = active.filter((p) => now - p.seenMs < ONLINE_MS).length
  const today = posts.filter((p) => now - p.createdMs < DAY).length
  const todayLabel = today >= FEED_PAGE && hasMore ? cap(today, FEED_PAGE) : String(today)

  const openProfile = useCallback((uid) => {
    sfx?.tap?.()
    invalidateProfileCache(uid)
    setOpen(uid)
  }, [])
  const closeProfile = useCallback(() => setOpen(null), [])

  // sobe o que você acabou de jogar para o Firebase e só então relê (tudo aqui vem do servidor)
  useEffect(() => {
    flushCloudSync().catch(() => {}).finally(() => reload())
  }, [reload])

  async function refresh() {
    setRefreshing(true)
    try {
      await reload()
    } finally {
      setRefreshing(false)
    }
  }
  function askPublic() {
    Alert.alert(
      'Tornar seu perfil visível?',
      'Seu nome, @, instituição, estrelas e conquistas ficam visíveis para outros jogadores. Você pode voltar ao modo privado quando quiser e suas postagens são apagadas.',
      [
        { text: 'Agora não', style: 'cancel' },
        { text: 'Tornar visível', onPress: makePublic },
      ]
    )
  }
  async function makePublic() {
    setBusy(true)
    try {
      await setProfilePublic(true)
      sfx?.deploy?.()
      reload()
    } catch {
      Alert.alert('Não foi possível', 'Seu perfil continua privado. Confira a conexão e tente de novo.')
    } finally {
      setBusy(false)
    }
  }

  const header = (
    <View>
      {/* destaque */}
      <View style={s.hero}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.heroTitle}>Comunidade</Text>
            <Text style={s.heroSub}>Veja quem está jogando agora e comemore as conquistas da turma.</Text>
          </View>
          <View style={s.heroIcon}>
            <Ionicons name="people" size={36} color={C.violetDark} />
          </View>
        </View>
        <View
          style={s.heroStats}
          accessible
          accessibilityLabel={firstLoad ? 'Carregando' : `${onlineNow} online agora, ${active.length} ativos nas últimas 2 horas, ${today} conquistas nas últimas 24 horas`}
        >
          <View style={s.heroStat}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              {!firstLoad && <PresenceDot online={onlineNow > 0} color={C.success} reduce={t.reduce} size={8} />}
              <Text style={s.heroN}>{firstLoad ? '—' : onlineNow}</Text>
            </View>
            <Text style={s.heroL}>online agora</Text>
          </View>
          <View style={s.heroStat}>
            <Text style={s.heroN}>{firstLoad ? '—' : cap(active.length, ACTIVE_LIMIT)}</Text>
            <Text style={s.heroL}>ativos em 2 h</Text>
          </View>
          <View style={s.heroStat}>
            <Text style={s.heroN}>{firstLoad ? '—' : todayLabel}</Text>
            <Text style={s.heroL}>conquistas hoje</Text>
          </View>
        </View>
      </View>

      {!visible && (
        <View style={s.banner}>
          <View style={s.bannerIcon}>
            <Ionicons name={adult ? 'eye-off-outline' : 'shield-checkmark-outline'} size={26} color={C.violetDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.bannerTitle}>{adult ? 'Seu perfil está privado' : 'Perfis de menores são privados'}</Text>
            <Text style={s.bannerSub}>
              {adult
                ? 'Você vê o feed, mas suas conquistas não são postadas. Ao ficar visível, aparecem seu nome, @, instituição e conquistas.'
                : 'Você pode ver o feed, mas seu perfil e suas conquistas não aparecem para outras pessoas.'}
            </Text>
            {adult && <Btn label="TORNAR PERFIL VISÍVEL" onPress={askPublic} busy={busy} color={C.primary} dark={C.primaryDark} ink={C.onPrimary} small style={{ alignSelf: 'flex-start', marginTop: 12, paddingHorizontal: 16 }} />}
          </View>
        </View>
      )}

      {stale && (
        <Pressable onPress={refresh} style={s.stale} accessibilityRole="button" accessibilityLabel="Sem conexão. Toque para tentar atualizar">
          <Ionicons name="cloud-offline-outline" size={18} color={C.orangeDark} />
          <Text style={s.staleText}>Sem conexão. Mostrando o último feed carregado.</Text>
          <Text style={s.staleAction}>ATUALIZAR</Text>
        </Pressable>
      )}

      <View style={s.sectionHead}>
        <Text style={s.h2} accessibilityRole="header">Ativos agora</Text>
        <Text style={s.hint}>últimas 2 h</Text>
      </View>
      {firstLoad ? (
        <OnlineSkeleton reduce={t.reduce} />
      ) : active.length === 0 ? (
        <Notice icon="moon-outline" title="Tudo quieto por aqui" text="Ninguém ativo nas últimas 2 horas. Chame a turma!" />
      ) : (
        <FlatList
          horizontal
          data={active}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <OnlineCard p={item} now={now} onOpen={openProfile} />}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingVertical: 4, paddingRight: 8 }}
          decelerationRate="fast"
          snapToInterval={192}
          initialNumToRender={3}
          windowSize={5}
        />
      )}

      <View style={[s.sectionHead, { marginTop: 28 }]}>
        <Text style={s.h2} accessibilityRole="header">Conquistas</Text>
      </View>
    </View>
  )

  const empty = firstLoad ? (
    <PostSkeleton reduce={t.reduce} />
  ) : error ? (
    <Notice tone="error" icon="cloud-offline-outline" title="Não deu para carregar" text="Confira sua conexão e tente de novo." action="TENTAR DE NOVO" onAction={refresh} busy={refreshing} />
  ) : (
    <Notice icon="sparkles-outline" title="Nenhuma conquista ainda" text="Ganhe 3 estrelas ou bata um recorde de tempo e a conquista aparece aqui sozinha." />
  )

  const footer = loadingMore ? (
    <ActivityIndicator style={{ marginVertical: 16 }} color={C.violet} />
  ) : posts.length > 0 && !hasMore ? (
    <Text style={s.end}>Você chegou ao fim das conquistas recentes.</Text>
  ) : null

  return (
    <>
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <PostCard p={item} now={now} onOpen={openProfile} />}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={footer}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        initialNumToRender={6}
        windowSize={7}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.violet} colors={[C.violet]} />}
      />
      <ProfileModal uid={open} posts={posts} reduce={t.reduce} onClose={closeProfile} />
    </>
  )
}

const s = StyleSheet.create({
  h2: { color: C.ink, fontWeight: '900', fontSize: 24 },
  hint: { color: C.muted, fontWeight: '800', fontSize: 13 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 4 },

  btn: { backgroundColor: C.blue, borderRadius: 16, borderBottomWidth: 4, borderBottomColor: C.blueDark, minHeight: 48, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  btnSm: { minHeight: 44, borderRadius: 14 },
  btnText: { color: C.white, fontWeight: '900', fontSize: 15, letterSpacing: 0.8 },

  /* destaque */
  hero: { backgroundColor: C.violet, borderRadius: 24, borderBottomWidth: 5, borderBottomColor: C.violetDark, padding: 18, marginBottom: 20 },
  heroTitle: { color: C.white, fontWeight: '900', fontSize: 28 },
  heroSub: { color: C.glassTextSoft, fontWeight: '600', fontSize: 15, lineHeight: 22, marginTop: 4 },
  heroIcon: { width: 68, height: 68, borderRadius: 22, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  heroStats: { flexDirection: 'row', gap: 8, marginTop: 16 },
  heroStat: { flex: 1, alignItems: 'center', backgroundColor: C.glass, borderRadius: 16, paddingVertical: 10, gap: 2 },
  heroN: { color: C.white, fontWeight: '900', fontSize: 22 },
  heroL: { color: C.glassText, fontWeight: '700', fontSize: 11 },

  banner: { flexDirection: 'row', gap: 14, backgroundColor: C.card, borderRadius: 20, padding: 16, borderWidth: 2, borderBottomWidth: 4, borderColor: C.line, marginBottom: 20 },
  bannerIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: C.violetSoft, alignItems: 'center', justifyContent: 'center' },
  bannerTitle: { color: C.ink, fontWeight: '900', fontSize: 17 },
  bannerSub: { color: C.muted, fontWeight: '600', fontSize: 14, lineHeight: 20, marginTop: 4 },

  stale: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.orangeSoft, borderRadius: 14, paddingHorizontal: 12, minHeight: 46, marginBottom: 16 },
  staleText: { flex: 1, color: C.orangeDark, fontWeight: '700', fontSize: 13 },
  staleAction: { color: C.orangeDark, fontWeight: '900', fontSize: 12, letterSpacing: 0.6 },
  end: { color: C.muted, fontWeight: '700', fontSize: 13, textAlign: 'center', marginVertical: 18 },

  /* ativos */
  onCard: { width: 180, backgroundColor: C.card, borderRadius: 22, borderWidth: 2, borderBottomWidth: 5, borderColor: C.line, padding: 14, alignItems: 'center' },
  onName: { color: C.ink, fontWeight: '900', fontSize: 17, marginTop: 10, maxWidth: '100%' },
  onHandle: { color: C.muted, fontWeight: '700', fontSize: 13, marginTop: 1, maxWidth: '100%' },
  onInst: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 24, marginTop: 8, maxWidth: '100%' },
  onInstText: { color: C.inkSoft, fontWeight: '700', fontSize: 12, flexShrink: 1 },
  onStats: { flexDirection: 'row', gap: 14, marginTop: 8 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { color: C.ink, fontWeight: '900', fontSize: 14 },
  presLabel: { fontWeight: '800', fontSize: 13, marginTop: 8, marginBottom: 12 },

  /* conquista */
  post: { backgroundColor: C.card, borderRadius: 22, padding: 14, marginBottom: 14, borderWidth: 2, borderBottomWidth: 5, borderColor: C.line },
  postHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  who: { color: C.ink, fontWeight: '900', fontSize: 16 },
  handle: { color: C.muted, fontWeight: '700', fontSize: 13, flexShrink: 1 },
  when: { color: C.muted, fontWeight: '700', fontSize: 12 },
  achv: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 14 },
  achvIcon: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  achvTitle: { color: C.ink, fontWeight: '900', fontSize: 17, lineHeight: 22 },
  achvSub: { color: C.muted, fontWeight: '600', fontSize: 13, marginTop: 1 },
  bar: { height: 28, borderRadius: 14, backgroundColor: C.bgDeep, marginTop: 10, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  barShine: { position: 'absolute', top: 5, left: 10, right: 10, height: 5, borderRadius: 3, backgroundColor: C.glassMid },
  barText: { fontWeight: '900', fontSize: 14 },

  /* vazio / erro */
  empty: { color: C.muted, fontWeight: '600', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  emptyBox: { alignItems: 'center', gap: 8, paddingVertical: 24, paddingHorizontal: 18, backgroundColor: C.card, borderRadius: 22, borderWidth: 2, borderColor: C.line },
  emptyIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: C.bgDeep, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: C.ink, fontWeight: '900', fontSize: 18 },

  /* perfil */
  modal: { flex: 1, backgroundColor: C.card },
  mBand: { alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  close: { position: 'absolute', right: 14, width: 46, height: 46, borderRadius: 23, backgroundColor: C.glassStrong, alignItems: 'center', justifyContent: 'center' },
  pHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20, paddingTop: 24 },
  pName: { color: C.ink, fontWeight: '900', fontSize: 32 },
  pHandle: { color: C.muted, fontWeight: '700', fontSize: 18, marginTop: 2 },
  pPres: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 6, marginLeft: -6 },
  instRow: { paddingHorizontal: 20, marginTop: 10 },
  instName: { color: C.inkSoft, fontWeight: '800', fontSize: 15 },
  instMeta: { color: C.muted, fontWeight: '600', fontSize: 14, marginTop: 2 },
  divider: { height: 2, backgroundColor: C.line, marginTop: 22 },
  section: { paddingHorizontal: 20, marginTop: 24, gap: 12 },
  gridRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 18, borderWidth: 2, borderBottomWidth: 4, borderColor: C.line, paddingHorizontal: 14, paddingVertical: 14, minHeight: 80 },
  statCardV: { color: C.ink, fontWeight: '900', fontSize: 22 },
  statCardK: { color: C.muted, fontWeight: '700', fontSize: 14, lineHeight: 18 },
  statCardSub: { color: C.muted, fontWeight: '600', fontSize: 12, marginTop: 1 },
  miniPost: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 18, borderWidth: 2, borderBottomWidth: 4, borderColor: C.line, padding: 12 },
  miniIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  miniTitle: { color: C.ink, fontWeight: '900', fontSize: 15 },
  miniSub: { color: C.muted, fontWeight: '700', fontSize: 13, marginTop: 1 },
})