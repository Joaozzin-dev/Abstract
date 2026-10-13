/**
 * Entrada do app (obrigatória): boas-vindas → Entrar | Criar conta, com consentimento e proteção de menores.
 * Uso: <LoginScreen onAuthenticated={(res) => ...} />   (sem opção de pular: o app exige conta)
 *
 * Cadastro: 1 Nome e @usuário · 2 Estudos · 3 Idade e senha · 4 Revisar e aceitar.
 *
 * >>> CONECTE O BACKEND EM `authApi` (logo abaixo). Enquanto não estiver conectado, o app
 * >>> avisa "serviço indisponível" em vez de fingir que criou a conta.
 * As funções `validate*` são exportadas para você reaplicar a MESMA validação no servidor.
 * Senhas nunca são logadas nem guardadas aqui: vão direto ao provedor de autenticação.
 */
import { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  AccessibilityInfo,
  Animated,
  Easing,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useStore } from '../store/useStore'
import TermsScreen, { TERMS_VERSION, CONTACT } from './TermsScreen'
import { useTheme, CHARACTERS } from './ProfileScreen'
import { authApi as firebaseAuthApi } from '../lib/Authservice'
import { searchInstitutions, searchLocalInstitutions } from '../lib/institutions'

const DUO = require('../assets/duo.png')

/* ---------- opções ---------- */
export const STAGES = [
  { id: 'fundamental', label: 'Ensino fundamental' },
  { id: 'medio', label: 'Ensino médio' },
  { id: 'tecnico', label: 'Ensino técnico' },
  { id: 'superior', label: 'Ensino superior' },
]
export const AGE_BANDS = [
  { id: 'under12', label: 'Menos de 12 anos', minor: true },
  { id: '12to17', label: '12 a 17 anos', minor: true },
  { id: '18plus', label: '18 anos ou mais', minor: false },
]
// Sugestões da busca local; troque por uma busca real em `authApi.searchInstitutions`.
const INSTITUTIONS = [
  'Universidade de Brasília (UnB)',
  'Instituto Federal de Brasília (IFB)',
  'Universidade Estadual de Campinas (Unicamp)',
  'Universidade de São Paulo (USP)',
  'Universidade Federal de Goiás (UFG)',
  'Centro de Ensino Médio (CEM)',
]
const searchLocal = (q) =>
  INSTITUTIONS.filter((i) => i.toLowerCase().includes(String(q).trim().toLowerCase())).slice(0, 5)

/* ---------- backend: Firebase (ver ../lib/authService) ---------- */
// A busca de instituições continua local; troque por uma busca real quando quiser.
export const authApi = {
  ...firebaseAuthApi,
  async searchInstitutions(query) {
    return searchInstitutions(query)
  },
}

/* ---------- validação (reaproveite no servidor) ---------- */
const HANDLE_RE = /^[a-z0-9_.]{3,20}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export const normalizeHandle = (v) => String(v || '').trim().replace(/^@/, '').toLowerCase()
export const isMinor = (ageBand) => !!AGE_BANDS.find((a) => a.id === ageBand)?.minor

export function validateStep(step, f, handleStatus) {
  const e = {}
  if (step === 0) {
    const name = f.name.trim()
    if (name.length < 2 || name.length > 50) e.name = 'Informe um nome com 2 a 50 caracteres.'
    const h = normalizeHandle(f.handle)
    if (!HANDLE_RE.test(h)) e.handle = 'Use de 3 a 20 letras minúsculas, números, ponto ou _.'
    else if (handleStatus === 'taken') e.handle = 'Este @usuário já está em uso. Tente outro.'
  }
  if (step === 1) {
    if (!f.noInstitution && f.institution.trim().length < 2) e.institution = 'Digite o nome da instituição ou escolha “Prefiro não informar”.'
    if (!f.stage) e.stage = 'Escolha uma etapa de ensino.'
  }
  if (step === 2) {
    if (!f.ageBand) e.ageBand = 'Escolha sua faixa de idade.'
    if (f.password.length < 8) e.password = 'A senha precisa ter pelo menos 8 caracteres.'
    else if (normalizeHandle(f.handle).length >= 3 && f.password.toLowerCase().includes(normalizeHandle(f.handle)))
      e.password = 'A senha não pode conter seu @usuário.'
    if (f.confirm !== f.password) e.confirm = 'As senhas não são iguais.'
  }
  if (step === 3) {
    if (isMinor(f.ageBand) && !EMAIL_RE.test(f.guardianEmail.trim())) e.guardianEmail = 'Informe um e-mail válido do responsável.'
    if (!f.accepted) e.accepted = 'Para criar a conta, é preciso aceitar os Termos de Uso e o Aviso de Privacidade.'
  }
  return e
}

function buildPayload(f) {
  const minor = isMinor(f.ageBand)
  return {
    name: f.name.trim(),
    handle: normalizeHandle(f.handle),
    password: f.password, // só para o provedor de autenticação
    institution: f.noInstitution ? null : f.institution.trim(),
    stage: f.stage,
    ageBand: f.ageBand,
    guardianEmail: minor ? f.guardianEmail.trim() : null,
    profilePublic: minor ? false : f.profilePublic,
    acceptedTerms: { version: TERMS_VERSION, at: new Date().toISOString() },
  }
}

/* ---------- estilos / tema ---------- */
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

function Field({ label, error, hint, optional, children }) {
  const [t, s] = useS()
  return (
    <View style={s.field}>
      <Text style={s.label}>
        {label}
        {optional ? <Text style={s.optional}> (opcional)</Text> : null}
      </Text>
      {children}
      {error ? (
        <View style={s.errRow} accessibilityLiveRegion="polite">
          <Ionicons name="alert-circle" size={t.fs(16)} color={t.c.errorInk} />
          <Text style={s.errText}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={s.hint}>{hint}</Text>
      ) : null}
    </View>
  )
}

function Input({ error, ...props }) {
  const [t, s] = useS()
  return <TextInput {...props} style={[s.input, error && s.inputErr]} placeholderTextColor={t.c.muted} autoCorrect={false} allowFontScaling />
}

function Choice({ options, value, onChange, label }) {
  const [t, s] = useS()
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ gap: 8 }}>
      {options.map((o) => {
        const on = value === o.id
        return (
          <Pressable key={o.id} onPress={() => onChange(o.id)} accessibilityRole="radio" accessibilityState={{ selected: on }} style={[s.choice, on && s.choiceOn]}>
            <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={t.fs(22)} color={on ? t.c.primary : t.c.muted} />
            <Text style={s.choiceText}>{o.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function Check({ checked, onChange, children, error }) {
  const [t, s] = useS()
  return (
    <Pressable onPress={() => onChange(!checked)} accessibilityRole="checkbox" accessibilityState={{ checked }} style={[s.check, error && s.inputErr]}>
      <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={t.fs(26)} color={checked ? t.c.primary : t.c.muted} />
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  )
}

function Button({ label, onPress, busy, kind = 'primary', disabled, icon }) {
  const [t, s] = useS()
  const primary = kind === 'primary'
  return (
    <Pressable
      onPress={onPress}
      disabled={busy || disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: busy || disabled, busy }}
      style={[primary ? s.btn : s.btnGhost, (busy || disabled) && { opacity: 0.6 }]}
    >
      {busy ? (
        <ActivityIndicator color={t.c.onPrimary} />
      ) : (
        <View style={s.btnInner}>
          {icon ? <Ionicons name={icon} size={t.fs(20)} color={primary ? t.c.onPrimary : t.c.inkSoft} /> : null}
          <Text style={primary ? s.btnText : s.btnGhostText}>{label}</Text>
        </View>
      )}
    </Pressable>
  )
}

function FormError({ text }) {
  const [t, s] = useS()
  return (
    <View style={s.formErr} accessibilityLiveRegion="assertive">
      <Ionicons name="alert-circle" size={t.fs(20)} color={t.c.errorInk} />
      <Text style={s.formErrText}>{text}</Text>
    </View>
  )
}

function Row({ k, v }) {
  const [, s] = useS()
  return (
    <View style={s.rv}>
      <Text style={s.rvK}>{k}</Text>
      <Text style={s.rvV}>{v || '—'}</Text>
    </View>
  )
}

const EMPTY = {
  name: '', handle: '', institution: '', noInstitution: false, stage: '', ageBand: '',
  password: '', confirm: '', guardianEmail: '', accepted: false, profilePublic: false,
}
const STEP_TITLES = ['Como podemos te chamar?', 'Conte sobre seus estudos', 'Quase lá!', 'Revise e aceite']

/* ---------- tela ---------- */
export default function LoginScreen({ onAuthenticated }) {
  const insets = useSafeAreaInsets()
  const [t, s] = useS()
  const setAccount = useStore((st) => st.setAccount)
  const avatarId = useStore((st) => st.avatarId)
  const tint = (CHARACTERS.find((c) => c.id === avatarId) || CHARACTERS[0]).bg

  const [mode, setMode] = useState('welcome') // welcome | login | signup | pending
  const [step, setStep] = useState(0)
  const [f, setF] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [handleStatus, setHandleStatus] = useState('idle') // idle | checking | free | taken | unknown
  const [results, setResults] = useState([])
  const [terms, setTerms] = useState(null) // null | 'terms' | 'privacy' | 'credits'
  const [showPass, setShowPass] = useState(false)
  const checkId = useRef(0)
  const bob = useRef(new Animated.Value(0)).current

  const set = (k) => (v) => {
    setF((p) => ({ ...p, [k]: v }))
    setErrors((p) => ({ ...p, [k]: undefined }))
    setFormError('')
  }
  const fail = (e) => {
    setErrors(e)
    const first = Object.values(e).find(Boolean)
    if (first) AccessibilityInfo.announceForAccessibility?.(first)
    return !!first
  }

  // Mascote da tela de boas-vindas.
  useEffect(() => {
    if (t.reduce || mode !== 'welcome') return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [t.reduce, mode])

  // Anuncia a mudança de passo para leitores de tela.
  useEffect(() => {
    if (mode === 'signup') AccessibilityInfo.announceForAccessibility?.(`Passo ${step + 1} de 4. ${STEP_TITLES[step]}`)
  }, [mode, step])

  // Disponibilidade do @ em tempo real (com atraso para não sobrecarregar o servidor).
  useEffect(() => {
    if (mode !== 'signup') return
    const h = normalizeHandle(f.handle)
    if (!HANDLE_RE.test(h)) return setHandleStatus('idle')
    setHandleStatus('checking')
    const id = ++checkId.current
    const timer = setTimeout(async () => {
      try {
        const free = await authApi.isHandleAvailable(h)
        if (id === checkId.current) setHandleStatus(free ? 'free' : 'taken')
      } catch (_) {
        if (id === checkId.current) setHandleStatus('unknown')
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [f.handle, mode])

  // Busca de instituições (com atraso).
  useEffect(() => {
    const q = f.institution.trim()
    if (f.noInstitution || q.length < 2) return setResults([])
    const timer = setTimeout(async () => {
      try {
        setResults(await authApi.searchInstitutions(q))
      } catch (_) {
        setResults(searchLocalInstitutions(q))
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [f.institution, f.noInstitution])

  function finish(res) {
    setF(EMPTY) // não deixa senha na memória do formulário
    if (res.status === 'pending_guardian') return setMode('pending')
    useStore.setState({ account: res.account }) // não depende de ação setAccount existir no store
    onAuthenticated?.(res)
  }

  function explain(err) {
    console.warn('[auth] erro:', err?.code, '|', err?.cause?.code || '', '|', err?.message)
    const code = err?.code || ''
    // Mensagens técnicas só aparecem em desenvolvimento; usuários (inclusive crianças) veem texto simples.
    if (__DEV__) {
      if (code === 'AUTH_DISABLED') return 'Ative “E-mail/senha” em Firebase Console → Authentication → Sign-in method.'
      if (code === 'BAD_API_KEY') return 'A apiKey do Firebase está inválida. Confira o firebase.js.'
      if (code === 'RULES' || code === 'permission-denied') return 'O Firestore recusou o acesso. Crie o banco e publique o firestore.rules.'
    }
    if (code === 'NETWORK') return 'Sem conexão com o servidor. Verifique sua internet e tente de novo.'
    if (code === 'NOT_CONFIGURED') return 'O serviço de contas ainda não está disponível. Tente novamente mais tarde.'
    if (code === 'INVALID_CREDENTIALS') return '@usuário ou senha incorretos.'
    if (code === 'TOO_MANY_REQUESTS') return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'
    return 'Não foi possível concluir agora. Verifique sua conexão e tente de novo.'
  }

  function go(m) {
    setMode(m)
    setStep(0)
    setErrors({})
    setFormError('')
    setF(EMPTY)
  }

  async function doLogin() {
    const e = {}
    if (!normalizeHandle(f.handle)) e.handle = 'Informe seu @usuário.'
    if (!f.password) e.password = 'Informe sua senha.'
    if (fail(e)) return
    setBusy(true)
    setFormError('')
    try {
      finish(await authApi.signIn({ handle: normalizeHandle(f.handle), password: f.password }))
    } catch (err) {
      setFormError(explain(err))
    } finally {
      setBusy(false)
    }
  }

  function next() {
    if (fail(validateStep(step, f, handleStatus))) return
    setStep((n) => n + 1)
  }

  async function doSignup() {
    if (fail(validateStep(3, f, handleStatus))) return
    setBusy(true)
    setFormError('')
    try {
      finish(await authApi.signUp(buildPayload(f)))
    } catch (err) {
      if (err?.code === 'HANDLE_TAKEN') {
        setHandleStatus('taken')
        setStep(0)
        setErrors({ handle: 'Este @usuário já está em uso. Tente outro.' })
      } else setFormError(explain(err))
    } finally {
      setBusy(false)
    }
  }

  const minor = isMinor(f.ageBand)
  const shown = results.filter((r) => r !== f.institution)
  const handleHint =
    handleStatus === 'checking' ? 'Verificando disponibilidade...'
    : handleStatus === 'free' ? '✓ @usuário disponível'
    : handleStatus === 'unknown' ? 'Não foi possível verificar agora; checamos de novo ao concluir.'
    : 'Letras minúsculas, números, ponto ou _. É assim que outros vão te encontrar.'

  const termsModal = (
    <Modal visible={!!terms} animationType={t.reduce ? 'none' : 'slide'} onRequestClose={() => setTerms(null)}>
      {terms ? <TermsScreen theme={t} initialTab={terms} onClose={() => setTerms(null)} /> : null}
    </Modal>
  )

  /* ----- aguardando responsável ----- */
  if (mode === 'pending') {
    return (
      <View style={[s.root, s.centerBox, { paddingTop: insets.top + 24 }]}>
        <Ionicons name="mail-open-outline" size={t.fs(56)} color={t.c.primary} />
        <Text style={s.h1} accessibilityRole="header">Falta a confirmação do responsável</Text>
        <Text style={s.lead}>Enviamos um e-mail para o responsável informado. Sua conta é ativada assim que ele confirmar.</Text>
        <Button label="VOLTAR AO INÍCIO" onPress={() => go('welcome')} />
      </View>
    )
  }

  /* ----- boas-vindas ----- */
  if (mode === 'welcome') {
    const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -10] })
    return (
      <View style={[s.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, paddingHorizontal: 24 }]}>
        <View style={s.welcomeTop}>
          <View style={s.stage} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={[s.blob, { backgroundColor: tint, opacity: t.dark ? 0.35 : 0.7 }]} />
            <Animated.Image source={DUO} style={{ width: 150, height: 150, transform: [{ translateY }] }} resizeMode="contain" accessibilityIgnoresInvertColors />
          </View>
          <Text style={[s.h1, { textAlign: 'center' }]} accessibilityRole="header">Que bom ter você aqui!</Text>
          <Text style={[s.lead, { textAlign: 'center', marginBottom: 0 }]}>Entre na sua conta ou crie uma nova para começar a jornada.</Text>
        </View>

        <View style={{ gap: 2 }}>
          <Button label="CRIAR CONTA" icon="person-add-outline" onPress={() => go('signup')} />
          <Button label="ENTRAR" kind="ghost" icon="log-in-outline" onPress={() => go('login')} />
          <View style={s.footer}>
            <Pressable onPress={() => setTerms('terms')} accessibilityRole="link" style={s.footLink}>
              <Text style={s.link}>Termos de Uso</Text>
            </Pressable>
            <Text style={s.hint}>·</Text>
            <Pressable onPress={() => setTerms('privacy')} accessibilityRole="link" style={s.footLink}>
              <Text style={s.link}>Privacidade</Text>
            </Pressable>
            <Text style={s.hint}>·</Text>
            <Pressable onPress={() => setTerms('credits')} accessibilityRole="link" style={s.footLink}>
              <Text style={s.link}>Créditos</Text>
            </Pressable>
          </View>
        </View>
        {termsModal}
      </View>
    )
  }

  /* ----- entrar / criar conta ----- */
  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
        <Pressable
          onPress={() => (mode === 'signup' && step > 0 ? setStep((n) => n - 1) : go('welcome'))}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          style={s.back}
        >
          <Ionicons name="arrow-back" size={t.fs(24)} color={t.c.inkSoft} />
        </Pressable>

        {mode === 'login' ? (
          <>
            <Text style={s.h1} accessibilityRole="header">Entrar</Text>
            <Text style={s.lead}>Bem-vindo de volta! Entre para continuar de onde parou.</Text>

            <Field label="@usuário" error={errors.handle}>
              <Input value={f.handle} onChangeText={set('handle')} autoCapitalize="none" textContentType="username" autoComplete="username" returnKeyType="next" error={errors.handle} accessibilityLabel="@usuário" />
            </Field>
            <Field label="Senha" error={errors.password}>
              <View>
                <Input value={f.password} onChangeText={set('password')} secureTextEntry={!showPass} autoCapitalize="none" textContentType="password" autoComplete="password" returnKeyType="go" onSubmitEditing={doLogin} error={errors.password} accessibilityLabel="Senha" />
                <Pressable onPress={() => setShowPass((v) => !v)} style={s.eye} accessibilityRole="button" accessibilityLabel={showPass ? 'Ocultar senha' : 'Mostrar senha'}>
                  <Ionicons name={showPass ? 'eye-off' : 'eye'} size={t.fs(22)} color={t.c.inkSoft} />
                </Pressable>
              </View>
            </Field>

            {formError ? <FormError text={formError} /> : null}
            <Button label="ENTRAR" onPress={doLogin} busy={busy} />
            <Button label="AINDA NÃO TENHO CONTA" kind="ghost" onPress={() => go('signup')} />
          </>
        ) : (
          <>
            <Text style={s.stepLabel} accessibilityLiveRegion="polite">Passo {step + 1} de 4</Text>
            <View style={s.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={[s.dot, i <= step && s.dotOn]} />
              ))}
            </View>
            <Text style={s.h1} accessibilityRole="header">{STEP_TITLES[step]}</Text>

            {step === 0 && (
              <>
                <Field label="Nome" error={errors.name} hint="O nome que você quer que apareça para os outros.">
                  <Input value={f.name} onChangeText={set('name')} textContentType="nickname" returnKeyType="next" error={errors.name} accessibilityLabel="Nome" />
                </Field>
                <Field label="@usuário" error={errors.handle} hint={handleHint}>
                  <Input value={f.handle} onChangeText={set('handle')} autoCapitalize="none" returnKeyType="done" onSubmitEditing={next} error={errors.handle} accessibilityLabel="@usuário" />
                </Field>
              </>
            )}

            {step === 1 && (
              <>
                <Field
                  label="Em qual escola ou instituição você estuda ou já estudou?"
                  error={errors.institution}
                  hint="Pode ser a atual ou uma de antes. Busque na lista ou digite o nome completo."
                >
                  <Input
                    value={f.institution}
                    onChangeText={(v) => {
                      set('institution')(v)
                      if (f.noInstitution) setF((p) => ({ ...p, noInstitution: false }))
                    }}
                    editable={!f.noInstitution}
                    error={errors.institution}
                    returnKeyType="search"
                    accessibilityLabel="Escola ou instituição"
                  />
                  {shown.map((i) => (
                    <Pressable key={i} onPress={() => { set('institution')(i); setResults([]) }} style={s.suggest} accessibilityRole="button" accessibilityLabel={`Escolher ${i}`}>
                      <Ionicons name="school-outline" size={t.fs(18)} color={t.c.inkSoft} />
                      <Text style={s.suggestText}>{i}</Text>
                    </Pressable>
                  ))}
                </Field>
                <Check
                  checked={f.noInstitution}
                  onChange={(v) => {
                    setF((p) => ({ ...p, noInstitution: v, institution: v ? '' : p.institution }))
                    setErrors((p) => ({ ...p, institution: undefined }))
                  }}
                >
                  <Text style={s.checkText}>Prefiro não informar agora</Text>
                </Check>
                <View style={{ height: 16 }} />
                <Field label="Qual etapa de ensino?" error={errors.stage} hint="A que você está cursando ou a última que concluiu.">
                  <Choice label="Etapa de ensino" options={STAGES} value={f.stage} onChange={set('stage')} />
                </Field>
              </>
            )}

            {step === 2 && (
              <>
                <Field label="Faixa de idade" error={errors.ageBand} hint="Não pedimos sua data de nascimento. Usamos isso só para aplicar as proteções para menores.">
                  <Choice label="Faixa de idade" options={AGE_BANDS} value={f.ageBand} onChange={set('ageBand')} />
                </Field>
                <Field label="Senha" error={errors.password} hint="Mínimo de 8 caracteres.">
                  <View>
                    <Input value={f.password} onChangeText={set('password')} secureTextEntry={!showPass} autoCapitalize="none" textContentType="newPassword" error={errors.password} accessibilityLabel="Senha" />
                    <Pressable onPress={() => setShowPass((v) => !v)} style={s.eye} accessibilityRole="button" accessibilityLabel={showPass ? 'Ocultar senha' : 'Mostrar senha'}>
                      <Ionicons name={showPass ? 'eye-off' : 'eye'} size={t.fs(22)} color={t.c.inkSoft} />
                    </Pressable>
                  </View>
                </Field>
                <Field label="Confirmar senha" error={errors.confirm}>
                  <Input value={f.confirm} onChangeText={set('confirm')} secureTextEntry={!showPass} autoCapitalize="none" textContentType="newPassword" error={errors.confirm} accessibilityLabel="Confirmar senha" />
                </Field>
              </>
            )}

            {step === 3 && (
              <>
                <View style={s.review} accessible accessibilityLabel="Resumo dos seus dados">
                  <Row k="Nome" v={f.name.trim()} />
                  <Row k="@usuário" v={`@${normalizeHandle(f.handle)}`} />
                  <Row k="Instituição" v={f.noInstitution ? 'Não informada' : f.institution.trim()} />
                  <Row k="Etapa" v={STAGES.find((x) => x.id === f.stage)?.label} />
                  <Row k="Idade" v={AGE_BANDS.find((x) => x.id === f.ageBand)?.label} />
                </View>

                {minor ? (
                  <>
                    <View style={s.notice}>
                      <Ionicons name="shield-checkmark-outline" size={t.fs(22)} color={t.c.inkSoft} />
                      <Text style={s.noticeText}>
                        {f.ageBand === 'under12'
                          ? 'Por ter menos de 12 anos, sua conta só será ativada depois que um responsável confirmar por e-mail.'
                          : 'Por ter menos de 18 anos, avisaremos um responsável por e-mail. Seu perfil começa privado.'}
                      </Text>
                    </View>
                    <Field label="E-mail do responsável" error={errors.guardianEmail}>
                      <Input value={f.guardianEmail} onChangeText={set('guardianEmail')} autoCapitalize="none" keyboardType="email-address" textContentType="emailAddress" error={errors.guardianEmail} accessibilityLabel="E-mail do responsável" />
                    </Field>
                  </>
                ) : (
                  <Check checked={f.profilePublic} onChange={set('profilePublic')}>
                    <Text style={s.checkText}>Deixar meu perfil visível para outros usuários e rankings</Text>
                    <Text style={s.hint}>Opcional. Você pode mudar isso depois.</Text>
                  </Check>
                )}

                <View style={s.docRow}>
                  <Pressable onPress={() => setTerms('terms')} accessibilityRole="link" style={s.docBtn}>
                    <Ionicons name="document-text-outline" size={t.fs(18)} color={t.c.blueInk} />
                    <Text style={s.link}>Ler Termos de Uso</Text>
                  </Pressable>
                  <Pressable onPress={() => setTerms('privacy')} accessibilityRole="link" style={s.docBtn}>
                    <Ionicons name="lock-closed-outline" size={t.fs(18)} color={t.c.blueInk} />
                    <Text style={s.link}>Ler Aviso de Privacidade</Text>
                  </Pressable>
                </View>

                <Check checked={f.accepted} onChange={set('accepted')} error={errors.accepted}>
                  <Text style={s.checkText}>Li e aceito os Termos de Uso e o Aviso de Privacidade.</Text>
                </Check>
                {errors.accepted ? (
                  <View style={s.errRow} accessibilityLiveRegion="polite">
                    <Ionicons name="alert-circle" size={t.fs(16)} color={t.c.errorInk} />
                    <Text style={s.errText}>{errors.accepted}</Text>
                  </View>
                ) : null}
                <Text style={s.hint}>
                  O aceite vale só para o que está descrito no Aviso de Privacidade. Para pedir acesso, correção ou exclusão dos seus dados: {CONTACT.email}.
                </Text>
              </>
            )}

            {formError ? <FormError text={formError} /> : null}
            <View style={{ height: 8 }} />
            {step < 3 ? <Button label="CONTINUAR" onPress={next} /> : <Button label="CRIAR CONTA" onPress={doSignup} busy={busy} />}
            {step === 0 && <Button label="JÁ TENHO CONTA" kind="ghost" onPress={() => go('login')} />}
          </>
        )}
      </ScrollView>
      {termsModal}
    </KeyboardAvoidingView>
  )
}

function makeStyles(t) {
  const c = t.c
  const f = t.fs
  const bw = t.bw
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    centerBox: { alignItems: 'center', paddingHorizontal: 28, gap: 14, justifyContent: 'center' },
    welcomeTop: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    stage: { height: 190, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
    blob: { position: 'absolute', width: 210, height: 210, borderRadius: 105 },
    h1: { fontSize: f(26), fontWeight: '900', color: c.ink, marginBottom: 6 },
    lead: { fontSize: f(15), lineHeight: f(22), fontWeight: '600', color: c.inkSoft, marginBottom: 18 },
    back: { width: t.touch, height: t.touch, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
    stepLabel: { fontSize: f(13), fontWeight: '800', color: c.muted, marginTop: 4 },
    dots: { flexDirection: 'row', gap: 6, marginVertical: 8 },
    dot: { flex: 1, height: 8, borderRadius: 4, backgroundColor: c.line },
    dotOn: { backgroundColor: c.progress },
    field: { marginBottom: 16 },
    label: { fontSize: f(14), fontWeight: '800', color: c.ink, marginBottom: 6 },
    optional: { fontWeight: '600', color: c.muted },
    input: { minHeight: t.touch + 4, borderRadius: 14, borderWidth: bw, borderColor: c.line, backgroundColor: c.card, paddingHorizontal: 14, fontSize: f(16), fontWeight: '600', color: c.ink },
    inputErr: { borderColor: c.errorInk },
    eye: { position: 'absolute', right: 4, top: 0, width: t.touch, height: t.touch + 4, alignItems: 'center', justifyContent: 'center' },
    hint: { fontSize: f(13), lineHeight: f(18), fontWeight: '600', color: c.muted, marginTop: 6 },
    errRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 6 },
    errText: { flex: 1, fontSize: f(13), fontWeight: '700', color: c.errorInk },
    choice: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: t.touch + 4, borderRadius: 14, borderWidth: bw, borderColor: c.line, backgroundColor: c.card, paddingHorizontal: 14, paddingVertical: 8 },
    choiceOn: { borderColor: c.primary, backgroundColor: c.violetSoft },
    choiceText: { flex: 1, fontSize: f(15), fontWeight: '700', color: c.ink },
    suggest: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: t.touch, paddingHorizontal: 6 },
    suggestText: { flex: 1, fontSize: f(14), fontWeight: '600', color: c.inkSoft },
    check: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', borderRadius: 14, borderWidth: bw, borderColor: c.line, backgroundColor: c.card, padding: 12, minHeight: t.touch + 4 },
    checkText: { fontSize: f(14), lineHeight: f(21), fontWeight: '700', color: c.ink },
    link: { color: c.blueInk, textDecorationLine: 'underline', fontWeight: '800', fontSize: f(14) },
    docRow: { gap: 4, marginVertical: 8 },
    docBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: t.touch },
    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
    footLink: { minHeight: t.touch, justifyContent: 'center' },
    review: { borderRadius: 14, borderWidth: bw, borderColor: c.line, backgroundColor: c.card, padding: 12, marginBottom: 16 },
    rv: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 6 },
    rvK: { fontSize: f(13), fontWeight: '700', color: c.muted },
    rvV: { flex: 1, textAlign: 'right', fontSize: f(14), fontWeight: '800', color: c.ink },
    notice: { flexDirection: 'row', gap: 10, backgroundColor: c.violetSoft, borderRadius: 14, padding: 12, marginBottom: 14, borderWidth: t.hc ? bw : 0, borderColor: c.line },
    noticeText: { flex: 1, fontSize: f(13), lineHeight: f(19), fontWeight: '700', color: c.ink },
    formErr: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: c.errorSoft, borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: t.hc ? bw : 0, borderColor: c.errorInk },
    formErrText: { flex: 1, fontSize: f(14), fontWeight: '700', color: c.errorInk },
    btn: { backgroundColor: c.primary, borderRadius: 14, minHeight: t.touch + 4, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4, borderBottomColor: c.primaryDark, marginTop: 4, paddingHorizontal: 16 },
    btnText: { color: c.onPrimary, fontWeight: '900', fontSize: f(15) },
    btnGhost: { borderRadius: 14, minHeight: t.touch + 4, alignItems: 'center', justifyContent: 'center', borderWidth: bw, borderBottomWidth: bw + 2, borderColor: c.line, backgroundColor: c.card, marginTop: 10, paddingHorizontal: 16 },
    btnGhostText: { color: c.inkSoft, fontWeight: '900', fontSize: f(15) },
    btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  })
}