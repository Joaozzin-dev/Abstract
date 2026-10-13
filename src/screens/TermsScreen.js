/**
 * Termos de Uso + Aviso de Privacidade + Créditos e Contato (linguagem simples) em um arquivo só.
 * Uso: <TermsScreen theme={t} initialTab="privacy" onClose={() => ...} />  (abra dentro de um <Modal>)
 * initialTab: 'terms' | 'privacy' | 'credits'
 * `theme` vem de useTheme() (ProfileScreen.js); sem ele, usa o visual padrão.
 *
 * ATENÇÃO: confira CONTACT e revise com um(a) advogado(a) antes de publicar.
 * Cada frase aqui descreve algo que o backend precisa fazer de verdade (retenção, exclusão, etc.).
 */
import { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

export const TERMS_VERSION = '2026-10-12'
export const LAST_UPDATE_LABEL = '12 de outubro de 2026'

export const CONTACT = {
  controller: 'Equipe de desenvolvimento do ab.c', // CONFIRMAR: nome da pessoa física ou jurídica responsável
  email: 'joao-rodrigues.jr@aluno.unb.br', // CONFIRMAR: ideal trocar por um e-mail do projeto
  responseDays: 15, // prazo que você realmente consegue cumprir
  deletionDays: 30, // prazo em que o backend apaga de fato os dados após o pedido
}

export function mailtoRequest(kind, handle) {
  const subject = encodeURIComponent(`Pedido de ${kind} de dados${handle ? ` (@${handle})` : ''}`)
  return `mailto:${CONTACT.email}?subject=${subject}`
}

/* ------------------------------ TERMOS ------------------------------ */

const TERMS = [
  { title: 'O que é o app', body: 'O ab.c é um projeto educacional que ensina programação introdutória e acessibilidade digital por fases e desafios. Ao criar uma conta, você concorda em usar o app de forma respeitosa.' },
  { title: 'Sua conta', body: 'Você é responsável por manter sua senha em segredo. Use seu nome e @usuário de forma honesta e não se passe por outra pessoa.' },
  { title: 'Regras de convivência', body: 'Não é permitido ofender, assediar, expor dados de outras pessoas ou publicar conteúdo ilegal. Conteúdos e perfis que descumprirem as regras podem ser removidos, e contas podem ser suspensas.' },
  { title: 'Moderação', body: 'Podemos revisar nomes, @usuários e conteúdos que aparecem para outros usuários. Você pode denunciar perfis e conteúdos pelo canal de contato.' },
  { title: 'Conteúdo educacional', body: 'As atividades têm finalidade de aprendizado. Fazemos o possível para que o conteúdo esteja correto, mas ele pode conter erros. Se encontrar algum, avise pelo canal de contato.' },
  { title: 'Mudanças', body: 'Se estes termos mudarem de forma relevante, avisaremos no app e pediremos um novo aceite.' },
]

/* ----------------------------- PRIVACIDADE ----------------------------- */

const PRIVACY = [
  { title: 'Quem cuida dos seus dados', body: `${CONTACT.controller}. Contato sobre privacidade: ${CONTACT.email}.` },
  { title: 'Quais dados coletamos', body: 'Nome de exibição, @usuário, escola ou instituição (se você quiser informar), etapa de ensino, faixa de idade, senha (guardada apenas pelo provedor de autenticação, de forma protegida) e seu progresso no app (fases, estrelas, XP, respostas e tentativas). Para menores de 18 anos, também o e-mail do responsável. Não pedimos CPF, endereço nem data completa de nascimento.' },
  { title: 'Para que usamos', body: 'Para criar e proteger sua conta, mostrar seu perfil e progresso, salvar onde você parou e manter o app funcionando. Usamos a faixa de idade só para aplicar as proteções para menores. Não usamos seus dados para publicidade.' },
  { title: 'Por quanto tempo guardamos', body: `Enquanto sua conta existir. Se você pedir a exclusão, apagamos seus dados em até ${CONTACT.deletionDays} dias, exceto o que a lei nos obrigar a guardar. Cópias de segurança podem levar um pouco mais para serem eliminadas.` },
  { title: 'Com quem podemos compartilhar', body: 'Com o provedor que hospeda o app e faz a autenticação, apenas para o funcionamento do serviço. Não vendemos seus dados. Também podemos informar dados quando a lei ou uma ordem válida de autoridade exigir. Outros usuários só veem o que seu perfil deixa visível (nome, @usuário e progresso).' },
  { title: 'Visibilidade do perfil e rankings', body: 'Para menores de 18 anos, o perfil começa privado. Você pode mudar isso depois, com ajuda do responsável quando for criança. Rankings públicos são só para adultos que escolherem participar: dados de crianças e adolescentes não aparecem em rankings públicos.' },
  { title: 'Crianças e adolescentes', body: 'Para crianças (menos de 12 anos), a conta só é ativada depois que um responsável confirma pelo e-mail informado. Para adolescentes (12 a 17), avisamos o responsável e tratamos os dados sempre pensando no melhor interesse do adolescente. Aceitar estes termos não autoriza nenhum uso de dados além do descrito aqui.' },
  { title: 'Segurança', body: 'Usamos controle de acesso, regras de autorização no banco de dados e proteção das credenciais. Nenhum sistema é 100% seguro, mas trabalhamos para reduzir riscos. Se houver um incidente que possa causar risco relevante, avisaremos as pessoas afetadas e a autoridade competente, conforme a lei.' },
  { title: 'Servidores em outros países', body: 'Os provedores que usamos podem guardar dados em outros países. Quando isso acontecer, seguimos as regras da LGPD e da ANPD para esse tipo de transferência.' },
  { title: 'Cookies e análise de uso', body: 'O app pode usar identificadores técnicos e registros de funcionamento para manter sua sessão e corrigir erros. Se um dia usarmos ferramentas de análise de uso, atualizaremos este aviso dizendo quais dados e para quê.' },
  { title: 'Seus direitos', body: `Você (ou seu responsável) pode pedir confirmação de que tratamos seus dados, acesso, correção, anonimização, bloqueio, eliminação, portabilidade e informações sobre compartilhamento, além de revogar um consentimento quando houver. Escreva para ${CONTACT.email}; respondemos em até ${CONTACT.responseDays} dias. Podemos pedir uma confirmação de identidade para proteger você.` },
  { title: 'Mudanças neste aviso', body: 'Se este aviso mudar de forma relevante, avisaremos no app. Quando a lei exigir, pediremos um novo consentimento: continuar usando o app não substitui essa autorização. A versão em vigor fica sempre disponível aqui.' },
]

/* ------------------------------ CRÉDITOS ------------------------------ */

const TEAM = [
  'Renan de Almeida Freire',
  'João Pedro Rodrigues de Souza',
  'Rafaela Luli Romero Ribeiro',
  'Vitor Fontes Cavalcante',
].sort((a, b) => a.localeCompare(b, 'pt-BR')) // ordem alfabética

const REFERENCES = [
  {
    title: 'Material de programação',
    items: [
      { label: 'MC202 — Unicamp', url: 'https://www.ic.unicamp.br/~rafael/mc202.html' },
      { label: 'Curso de C — UFSC', url: 'http://mtm.ufsc.br/~azeredo/cursoC/aulas-main.html' },
      { label: 'Material de APC', url: 'https://carlacastanho.github.io/Material-de-APC/aulas.html' },
      { label: 'Manual de Portugol', url: 'https://pt.slideshare.net/slideshow/manual-de-portugol/13227803' },
    ],
  },
  {
    title: 'Método de ensino',
    items: [
      { label: 'Primeiros passos: como aprender idiomas no Duolingo', url: 'https://blog.duolingo.com/pt/primeiros-passos-como-aprender-idiomas-no-duolingo/' },
      { label: 'O método Duolingo', url: 'https://blog.duolingo.com/pt/o-metodo-duolingo/' },
    ],
  },
  {
    title: 'Acessibilidade digital',
    items: [
      { label: 'WCAG — W3C', url: 'https://www.w3.org/WAI/standards-guidelines/wcag/' },
      { label: 'WebAIM', url: 'https://webaim.org/' },
      { label: 'eMAG — Governo Federal', url: 'https://www.gov.br/governodigital/pt-br/acessibilidade-e-usuario/acessibilidade-digital' },
      { label: 'Acessibilidade no React Native', url: 'https://reactnative.dev/docs/accessibility' },
    ],
  },
  {
    title: 'Legislação',
    items: [
      { label: 'LGPD (Lei 13.709/2018)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm' },
      { label: 'ECA (Lei 8.069/1990)', url: 'https://www.planalto.gov.br/ccivil_03/leis/l8069.htm' },
      { label: 'Lei Brasileira de Inclusão (Lei 13.146/2015)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13146.htm' },
      { label: 'ANPD', url: 'https://www.gov.br/anpd' },
    ],
  },
  {
    title: 'Plataformas de inspiração',
    items: [
      { label: 'Mimo', url: 'https://mimo.org/' },
      { label: 'Brilliant', url: 'https://brilliant.org/' },
    ],
  },
  {
    title: 'Tecnologias usadas',
    items: [
      { label: 'React Native', url: 'https://reactnative.dev/' },
      { label: 'Expo (áudio, voz, vibração e imagens)', url: 'https://expo.dev/' },
      { label: 'Firebase (contas e banco de dados)', url: 'https://firebase.google.com/' },
      { label: 'Zustand (estado do app)', url: 'https://github.com/pmndrs/zustand' },
      { label: 'Ionicons (ícones)', url: 'https://ionic.io/ionicons' },
    ],
  },
]

const initials = (name) => {
  const w = name.split(' ').filter((x) => x.length > 2)
  return ((w[0] || '')[0] + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase()
}

const BOOK = 'FORBELLONE, André Luiz Villar; EBERSPÄCHER, Henri Frederico. Lógica de Programação: a construção de algoritmos e estruturas de dados. 4. ed. São Paulo: Bookman, 2022.'

/* ------------------------------- TELA ------------------------------- */

const TABS = [['terms', 'Termos'], ['privacy', 'Privacidade'], ['credits', 'Créditos']]
const TITLES = { terms: 'Termos de Uso', privacy: 'Aviso de Privacidade', credits: 'Créditos e contato' }

const DEFAULT_T = {
  c: { bg: '#FFFFFF', card: '#FFFFFF', ink: '#1F2A48', inkSoft: '#2B3A63', muted: '#5B6385', line: '#EADFC5', green: '#58CC02', greenDark: '#46A302', greenSoft: '#E3F8CC', onGreen: '#1F2A48' },
  fs: (n) => n,
  bw: 2,
  touch: 48,
}

const cache = new WeakMap()
function stylesFor(t) {
  let s = cache.get(t)
  if (!s) {
    s = makeStyles(t)
    cache.set(t, s)
  }
  return s
}

function Card({ s, title, children }) {
  return (
    <View style={s.card}>
      <Text style={s.h} accessibilityRole="header">{title}</Text>
      {children}
    </View>
  )
}

function LinkRow({ s, t, label, url }) {
  return (
    <Pressable
      onPress={() => Linking.openURL(url)}
      accessibilityRole="link"
      accessibilityLabel={`${label}. Abre o link no navegador`}
      style={s.linkRow}
    >
      <Text style={s.linkText}>{label}</Text>
      <Ionicons name="open-outline" size={t.fs(16)} color={t.c.muted} />
    </Pressable>
  )
}

function Credits({ s, t }) {
  return (
    <>
      <Card s={s} title="Quem fez o ab.c">
        <Text style={s.teamLead}>Projeto educacional feito por estudantes: aprender a programar para todos.</Text>
        {TEAM.map((name, i) => (
          <View key={name} style={[s.member, i > 0 && s.memberSep]} accessible accessibilityLabel={name}>
            <View style={s.avatar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Text style={s.avatarText}>{initials(name)}</Text>
            </View>
            <Text style={s.memberName}>{name}</Text>
          </View>
        ))}
      </Card>

      <Card s={s} title="Contato">
        <Text style={s.p}>Dúvidas, sugestões, denúncias ou pedidos sobre seus dados:</Text>
        <Pressable
          style={s.mail}
          onPress={() => Linking.openURL(mailtoRequest('contato'))}
          accessibilityRole="link"
          accessibilityLabel={`Enviar e-mail para ${CONTACT.email}`}
        >
          <Ionicons name="mail-outline" size={t.fs(20)} color={t.c.inkSoft} />
          <Text style={s.mailText}>{CONTACT.email}</Text>
        </Pressable>
      </Card>

      <Text style={s.sectionLabel} accessibilityRole="header">Referências e inspirações</Text>
      {REFERENCES.map((group) => (
        <Card key={group.title} s={s} title={group.title}>
          {group.items.map((it) => (
            <LinkRow key={it.url} s={s} t={t} label={it.label} url={it.url} />
          ))}
        </Card>
      ))}

      <Card s={s} title="Bibliografia">
        <Text style={s.p}>{BOOK}</Text>
      </Card>

      <Text style={s.note}>
        Os conteúdos listados são referências de estudo e inspiração. Nomes e marcas citados pertencem aos seus respectivos donos.
      </Text>
    </>
  )
}

export default function TermsScreen({ initialTab = 'terms', onClose, theme }) {
  const t = theme || DEFAULT_T
  const s = stylesFor(t)
  const insets = useSafeAreaInsets()
  const [tab, setTab] = useState(initialTab)
  const sections = tab === 'terms' ? TERMS : tab === 'privacy' ? PRIVACY : null

  return (
    <View style={[s.root, { paddingTop: insets.top + 8 }]}>
      <View style={s.top}>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={12} style={s.close}>
          <Ionicons name="close" size={t.fs(26)} color={t.c.inkSoft} />
        </Pressable>
        <Text style={s.title} accessibilityRole="header">{TITLES[tab]}</Text>
        <View style={s.close} />
      </View>

      <View style={s.tabs} accessibilityRole="tablist">
        {TABS.map(([id, label]) => (
          <Pressable
            key={id}
            onPress={() => setTab(id)}
            style={[s.tab, tab === id && s.tabOn]}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === id }}
          >
            <Text style={[s.tabText, tab === id && s.tabTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
        {sections ? (
          <>
            <Text style={s.version}>Versão {TERMS_VERSION} · Atualizado em {LAST_UPDATE_LABEL}</Text>
            {sections.map((sec) => (
              <Card key={sec.title} s={s} title={sec.title}>
                <Text style={s.p}>{sec.body}</Text>
              </Card>
            ))}
            {tab === 'privacy' && (
              <Pressable
                style={s.mail}
                onPress={() => Linking.openURL(mailtoRequest('acesso/correção/exclusão'))}
                accessibilityRole="link"
              >
                <Ionicons name="mail-outline" size={t.fs(20)} color={t.c.inkSoft} />
                <Text style={s.mailText}>Falar sobre meus dados</Text>
              </Pressable>
            )}
          </>
        ) : (
          <Credits s={s} t={t} />
        )}
      </ScrollView>
    </View>
  )
}

function makeStyles(t) {
  const c = t.c
  const f = t.fs
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8 },
    close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
    title: { flex: 1, textAlign: 'center', fontSize: f(18), fontWeight: '900', color: c.ink },
    tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 4 },
    tab: { flex: 1, minHeight: t.touch, borderRadius: 12, borderWidth: t.bw, borderColor: c.line, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
    tabOn: { backgroundColor: c.greenSoft, borderColor: c.green },
    tabText: { fontWeight: '800', color: c.muted, fontSize: f(14), textAlign: 'center' },
    tabTextOn: { color: c.ink },
    version: { fontSize: f(12), fontWeight: '600', color: c.muted, marginBottom: 10 },
    sectionLabel: { fontSize: f(16), fontWeight: '900', color: c.ink, marginTop: 8, marginBottom: 10 },
    card: { backgroundColor: c.card, borderWidth: t.bw, borderBottomWidth: t.bw + 2, borderColor: c.line, borderRadius: 14, padding: 14, marginBottom: 10 },
    h: { fontSize: f(15), fontWeight: '900', color: c.ink, marginBottom: 6 },
    p: { fontSize: f(14), lineHeight: f(21), fontWeight: '600', color: c.inkSoft },
    teamLead: { fontSize: f(14), lineHeight: f(21), fontWeight: '600', color: c.inkSoft, marginBottom: 6 },
    member: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: t.touch + 8, paddingVertical: 8 },
    memberSep: { borderTopWidth: 1, borderTopColor: c.line },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.greenSoft, borderWidth: t.bw, borderColor: c.green, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: f(14), fontWeight: '900', color: c.ink },
    memberName: { flex: 1, fontSize: f(16), lineHeight: f(22), fontWeight: '900', color: c.ink },
    linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: t.touch, paddingVertical: 6 },
    linkText: { flex: 1, fontSize: f(14), lineHeight: f(20), fontWeight: '700', color: c.ink, textDecorationLine: 'underline' },
    note: { fontSize: f(12), lineHeight: f(18), fontWeight: '600', color: c.muted, marginTop: 4 },
    mail: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: t.touch, borderRadius: 14, borderWidth: t.bw, borderColor: c.line, backgroundColor: c.card, marginTop: 6, paddingHorizontal: 12 },
    mailText: { fontWeight: '800', color: c.ink, fontSize: f(14), flexShrink: 1 },
  })
}