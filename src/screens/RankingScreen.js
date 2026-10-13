/**
 * Ranking — Liga do Plantão.
 * Ordem: MAIOR NÚMERO DE ACERTOS na Speed Run (Vale do Silêncio). O XP só desempata.
 * Jogadores reais, vindos dos perfis públicos (adultos com perfil visível).
 * Só entra quem tem acertos na Speed Run (score > 0). Você só aparece se já tiver jogado.
 *
 *   Liga   = acertos do Plantão + Sem rede somados
 *   Plantão / Sem rede = melhor partida de cada jogo
 */
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { View, Text, ScrollView, Pressable, Ionicons } from '../lib/themedRN'
import { C } from '../lib/colors'
import { useStore } from '../store/useStore'
import { sfx } from '../lib/sounds'
import { playRankingOpen } from '../lib/feedback'
import { CARGOS, cargoFor, levelInfo, totalXp } from '../lib/xp'
import { canPublish, rankPlayers, useLeaderboard, republishAll } from '../lib/social'
import { flushCloudSync } from '../lib/cloud'
import FeedView from './FeedView'
import { CHARACTERS } from './ProfileScreen'
import { Image } from 'react-native'


const MEDAL = { 1: C.yellow, 2: C.medalSilver, 3: C.medalBronze }
const charOf = (id) => CHARACTERS?.find?.((c) => String(c.id) === String(id)) || CHARACTERS?.[0]

function fmtTime(ms) {
  if (ms == null) return '—'
  const s = ms / 1000
  return s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

/* ------------------------------ PEÇAS ------------------------------- */
function Medal({ cargo, state }) {
  // state: earned | current | locked
  const big = state === 'current'
  const size = big ? 74 : 52
  const locked = state === 'locked'
  return (
    <View style={{ alignItems: 'center', width: 78 }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: locked ? C.lockFace : cargo.color,
          borderWidth: big ? 4 : 0,
          borderColor: big ? C.card : 'transparent',
          opacity: state === 'earned' ? 0.85 : 1,
        }}
      >
        <Ionicons name={locked ? 'lock-closed' : cargo.icon} size={big ? 34 : 24} color={locked ? C.lockIcon : C.white} />
      </View>
      <Text
        numberOfLines={1}
        style={{ marginTop: 6, fontWeight: '900', fontSize: big ? 12 : 10, color: locked ? C.muted : C.ink }}
      >
        {cargo.name}
      </Text>
    </View>
  )
}

function PosBadge({ pos }) {
  const col = MEDAL[pos]
  if (!col) return <Text style={[s.pos, { color: C.muted }]}>{pos}</Text>
  return (
    <View style={[s.posMedal, { backgroundColor: col }]}>
      <Text style={s.posMedalText}>{pos}</Text>
    </View>
  )
}


function RowAvatar({ avatarId, size = 44 }) {
  const ch = charOf(avatarId)

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: ch?.bg || C.violetSoft,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0,
      }}
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
          accessibilityLabel={`Avatar ${ch.label}`}
        />
      ) : null}
    </View>
  )
}


function PlayerRow({ r, pos, game }) {
  const sub = game ? `${fmtTime(Number.isFinite(r.timeMs) ? r.timeMs : null)} · ${r.xp} XP` : `${r.xp} XP`
  return (
    <View style={[s.row, r.me && s.rowMe]} accessible accessibilityLabel={`${pos}º lugar, ${r.me ? 'você' : r.name}, ${r.score} acertos, ${r.xp} XP`}>
      <PosBadge pos={pos} />
      <RowAvatar avatarId={r.avatarId} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={[s.name, r.me && { color: C.violet }]}>
          {r.me ? `${r.name} (você)` : r.name}
        </Text>
        <Text numberOfLines={1} style={s.sub}>{sub}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[s.score, r.me && { color: C.violet }]}>{r.score}</Text>
        <Text style={s.scoreL}>acertos</Text>
      </View>
    </View>
  )
}

/** Lista do ranking com carregando / erro / vazio. */
function Board({ rows, loading, error, reload, game, private: isPrivate }) {
  const myIdx = rows.findIndex((r) => r.me)
  const me = myIdx >= 0 ? rows[myIdx] : null
  const above = myIdx > 0 ? rows[myIdx - 1] : null
  let chase
  if (!me) chase = { icon: 'play', text: 'Jogue a Speed Run para entrar no ranking.' }
  else if (!above) chase = { icon: 'trophy', text: 'Você lidera o ranking. Segure o topo!' }
  else if (above.score === me.score)
    chase = { icon: 'flash', text: `Empatado com ${above.name} em ${me.score} acertos. O XP desempata: faça mais XP na Speed Run.` }
  else chase = { icon: 'flash', text: `Faltam ${above.score - me.score} ${above.score - me.score === 1 ? 'acerto' : 'acertos'} para alcançar ${above.name}.` }

  return (
    <View>
      <View style={s.chase}>
        <Ionicons name={chase.icon} size={18} color={C.orange} />
        <Text style={s.chaseText}>{chase.text}</Text>
      </View>
      {error && rows.length > 0 ? (
        <Pressable onPress={reload} style={s.stale} accessibilityRole="button">
          <Ionicons name="cloud-offline-outline" size={16} color={C.orange} />
          <Text style={s.staleText}>Sem conexão. Toque para atualizar.</Text>
        </Pressable>
      ) : null}
      {loading && rows.length === 0 ? <ActivityIndicator style={{ marginVertical: 20 }} color={C.violet} /> : null}
      {error && !loading && rows.length === 0 ? (
        <Pressable onPress={reload} style={s.stale} accessibilityRole="button">
          <Ionicons name="cloud-offline-outline" size={16} color={C.orange} />
          <Text style={s.staleText}>Não deu para carregar os outros jogadores. Toque para tentar de novo.</Text>
        </Pressable>
      ) : null}
      {!loading && !error && rows.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="trophy-outline" size={40} color={C.muted} />
          <Text style={s.emptyTitle}>Ranking ainda vazio</Text>
          <Text style={s.emptySub}>
            Complete a Loja do Tonho, jogue a Speed Run e deixe o perfil visível para aparecer aqui.
          </Text>
        </View>
      ) : null}
      <View style={{ marginTop: 6 }}>
        {rows.map((r, i) => (
          <PlayerRow key={r.uid || r.id} r={r} pos={i + 1} game={game} />
        ))}
      </View>
      <Text style={s.note}>
        {isPrivate
          ? 'Seu perfil está privado: só você vê sua posição aqui. Ao deixá-lo visível (aba Feed), os outros também veem você.'
          : 'Ordem por acertos. Em caso de empate, vale o maior XP. Só entra quem já jogou a Speed Run.'}
      </Text>
    </View>
  )
}

function Stat({ icon, label, value }) {
  return (
    <View style={s.stat}>
      <Ionicons name={icon} size={18} color={C.violet} />
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  )
}

/* ------------------------------ TELA -------------------------------- */
export default function RankingScreen() {
  const insets = useSafeAreaInsets()
  const [tab, setTab] = useState('liga')
  const account = useStore((st) => st.account)
  const { players, mine: cloud, loading, error, reload } = useLeaderboard(account?.uid)

  // sobe progresso privado, republica o cartão público e só então lê o ranking
  useEffect(() => {
    flushCloudSync()
      .catch(() => {})
      .then(() => republishAll().catch(() => {}))
      .finally(() => reload())
  }, [reload])

  // Som + vibração ao abrir a aba do ranking.
  useEffect(() => {
    playRankingOpen()
  }, [])

  const ready = !!cloud
  const progress = cloud?.progress || {}
  const xp = totalXp(progress)
  const cargo = cargoFor(xp)
  const lv = levelInfo(xp)

  const me = useMemo(
    () => (cloud ? { uid: account?.uid || 'me', name: account?.name || cloud.name || 'Você', handle: account?.handle, avatarId: cloud.avatarId, ...cloud.stats } : null),
    [cloud, account?.uid, account?.name, account?.handle]
  )
  const mode = tab === 'liga' ? 'liga' : tab
  const rows = useMemo(() => (tab === 'feed' ? [] : rankPlayers(players, me, mode)), [players, me, mode, tab])

  // janela de 4 medalhas em volta do cargo atual
  const first = Math.max(0, Math.min(cargo.index - 1, CARGOS.length - 4))
  const medals = CARGOS.slice(first, first + 4)

  const isFeed = tab === 'feed'
  const isLeague = tab === 'liga'
  const valeKey = tab === 'vale2' ? 'vale2' : 'vale1'
  const mine = progress[valeKey]

  const TABS = [
    { id: 'liga', label: 'Liga', icon: 'trophy' },
    { id: 'vale1', label: 'Plantão' },
    { id: 'feed', label: 'Feed', icon: 'people' },
  ]

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>{isFeed ? 'COMUNIDADE' : 'RANKING POR ACERTOS'}</Text>
          <Text style={s.title}>{isFeed ? 'Feed da equipe' : isLeague ? 'Liga do Plantão' : tab === 'vale1' ? 'Plantão' : 'Sem rede'}</Text>
        </View>
      </View>

      <View style={s.tabs}>
        {TABS.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => {
              sfx?.tap?.()
              setTab(t.id)
            }}
            style={[s.tab, tab === t.id && s.tabOn]}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t.id }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              {t.icon && <Ionicons name={t.icon} size={14} color={tab === t.id ? C.violet : C.muted} />}
              <Text style={[s.tabText, tab === t.id && s.tabTextOn]}>{t.label}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      {isFeed ? (
        <FeedView />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
          {/* cargo + nível (vale para as 3 abas) */}
          {!ready ? (
            <View style={{ paddingVertical: 28 }}>
              {error ? (
                <Pressable onPress={reload} accessibilityRole="button" style={s.stale}>
                  <Ionicons name="cloud-offline-outline" size={16} color={C.orange} />
                  <Text style={s.staleText}>Não deu para carregar seus dados. Toque para tentar de novo.</Text>
                </Pressable>
              ) : (
                <ActivityIndicator color={C.violet} />
              )}
            </View>
          ) : null}
          {ready ? (
          <>
          <View style={s.medalsReal}>
            {medals.map((c) => {
              const i = CARGOS.findIndex((x) => x.id === c.id)
              const state = i < cargo.index ? 'earned' : i === cargo.index ? 'current' : 'locked'
              return <Medal key={c.id} cargo={c} state={state} />
            })}
          </View>

          <View style={s.levelCard}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Text style={s.levelTitle}>Nível {lv.level}</Text>
              <Text style={s.levelXp}>{xp} XP</Text>
            </View>
            <View style={s.track}>
              <View style={[s.fill, { width: `${Math.round(lv.pct * 100)}%` }]} />
            </View>
            <Text style={s.levelHint}>
              {cargo.next
                ? `Faltam ${cargo.toNext} XP para virar ${cargo.next.name}. XP só se ganha na Speed Run.`
                : 'Você chegou ao cargo máximo!'}
            </Text>
          </View>
          </>
          ) : null}

          {isLeague ? (
            <Board rows={rows} loading={loading} error={error} reload={reload} private={!canPublish(account)} />
          ) : mine && mine.bestScore != null ? (
            <View style={s.recordCard}>
              <Text style={s.recordEyebrow}>MELHOR PARTIDA</Text>
              <Text style={s.recordBig}>{mine.bestScore}</Text>
              <Text style={s.recordSub}>acertos em 1:30 · {fmtTime(mine.bestTimeMs)}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                <Stat icon="flame" label="melhor combo" value={`x${mine.bestCombo || 0}`} />
                <Stat icon="flash" label="XP aqui" value={mine.xp || 0} />
                <Stat icon="repeat" label="partidas" value={mine.runs || 1} />
              </View>
            </View>
          ) : (
            <View style={s.empty}>
              <Ionicons name="trophy-outline" size={40} color={C.muted} />
              <Text style={s.emptyTitle}>Nenhum recorde ainda</Text>
              <Text style={s.emptySub}>
                Complete a Loja do Tonho e jogue a Speed Run do Vale do Silêncio para aparecer aqui.
              </Text>
            </View>
          )}
          {!isLeague ? (
            <View style={{ marginTop: 18 }}>
              <Text style={s.boardTitle}>Ranking do {tab === 'vale1' ? 'Plantão' : 'Sem rede'}</Text>
              <Board rows={rows} loading={loading} error={error} reload={reload} game private={!canPublish(account)} />
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 8 },
  eyebrow: { color: C.orange, fontWeight: '900', fontSize: 11, letterSpacing: 1 },
  title: { color: C.ink, fontWeight: '900', fontSize: 26, marginTop: 4 },
  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, marginBottom: 4 },
  tab: { flex: 1, minHeight: 42, borderRadius: 12, backgroundColor: C.card, borderWidth: 2, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: C.violetSoft, borderColor: C.violet },
  tabText: { color: C.muted, fontWeight: '800', fontSize: 12 },
  tabTextOn: { color: C.violet },
  medalsReal: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 2, marginTop: 6 },
  levelCard: { backgroundColor: C.card, borderRadius: 20, borderWidth: 2, borderBottomWidth: 5, borderColor: C.line, padding: 14, marginTop: 14 },
  levelTitle: { color: C.ink, fontWeight: '900', fontSize: 18 },
  levelXp: { color: C.violet, fontWeight: '900', fontSize: 14 },
  track: { height: 12, borderRadius: 8, backgroundColor: C.line, marginTop: 10, overflow: 'hidden' },
  fill: { height: 12, borderRadius: 8, backgroundColor: C.violet },
  levelHint: { color: C.muted, fontWeight: '700', fontSize: 12, lineHeight: 17, marginTop: 8 },
  chase: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.orangeSoft, borderRadius: 14, padding: 12, marginTop: 14, marginBottom: 6 },
  chaseText: { flex: 1, color: C.ink, fontWeight: '800', fontSize: 13, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 8, borderWidth: 2, borderColor: C.line },
  rowMe: { borderColor: C.violet, backgroundColor: C.violetSoft },
  pos: { width: 30, fontWeight: '900', fontSize: 16, textAlign: 'center' },
  posMedal: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  posMedalText: { color: C.white, fontWeight: '900', fontSize: 15 },
  sub: { color: C.muted, fontWeight: '700', fontSize: 12, marginTop: 1 },
  score: { color: C.ink, fontWeight: '900', fontSize: 20 },
  scoreL: { color: C.muted, fontWeight: '700', fontSize: 11 },
  boardTitle: { color: C.ink, fontWeight: '900', fontSize: 22, marginBottom: 4 },
  stale: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.orangeSoft, borderRadius: 14, padding: 12, marginBottom: 8 },
  staleText: { flex: 1, color: C.ink, fontWeight: '700', fontSize: 13 },
  name: { color: C.ink, fontWeight: '800', fontSize: 15 },
  note: { color: C.muted, fontWeight: '600', fontSize: 12, textAlign: 'center', marginTop: 10, lineHeight: 17 },
  recordCard: { backgroundColor: C.card, borderRadius: 20, borderWidth: 2, borderBottomWidth: 5, borderColor: C.line, padding: 18, marginTop: 14, alignItems: 'center' },
  recordEyebrow: { color: C.orange, fontWeight: '900', fontSize: 11, letterSpacing: 1 },
  recordBig: { color: C.ink, fontWeight: '900', fontSize: 64, marginTop: 4 },
  recordSub: { color: C.inkSoft, fontWeight: '700', fontSize: 14 },
  stat: { flex: 1, backgroundColor: C.violetSoft, borderRadius: 14, paddingVertical: 10, alignItems: 'center', gap: 2 },
  statValue: { color: C.ink, fontWeight: '900', fontSize: 16 },
  statLabel: { color: C.muted, fontWeight: '700', fontSize: 11 },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { color: C.ink, fontWeight: '900', fontSize: 18, marginTop: 12 },
  emptySub: { color: C.muted, fontWeight: '600', fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },
})