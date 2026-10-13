/**
 * Busca de instituições de QUALQUER tipo: escolas (fundamental/médio), técnicas,
 * cursinhos, institutos federais e universidades.
 *
 * 1) lista local (instantânea, funciona offline) com instituições conhecidas;
 * 2) OpenStreetMap via Photon (photon.komoot.io): escolas/faculdades de todo o Brasil,
 *    com cidade e estado para diferenciar "Escola Estadual X" de cidades diferentes;
 * 3) o campo continua aceitando texto livre, então escola fora da base nunca bloqueia o cadastro.
 *
 * Para incluir uma escola que falta: adicione uma linha em LOCAL, no formato
 * 'Nome da escola (Cidade, Estado)'.
 */
const strip = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

const LOCAL = [
  /* ---------------- Escolas específicas ---------------- */
  'Colégio Estadual de Tempo Integral Ruy Barbosa (Canápolis, Bahia)',

  /* ---------------- Ensino médio / técnico (redes conhecidas) ---------------- */
  'Colégio Pedro II (RJ)',
  'Colégio Militar de Brasília (CMB)',
  'Colégio Militar do Rio de Janeiro',
  'Colégio Militar de Belo Horizonte',
  'Colégio Militar de Curitiba',
  'Colégio Militar de Fortaleza',
  'Colégio Militar de Manaus',
  'Colégio Militar de Porto Alegre',
  'Colégio Militar de Recife',
  'Colégio Militar de Salvador',
  'Colégio Militar de Santa Maria',
  'Colégio Militar de Campo Grande',
  'Colégio Militar de Juiz de Fora',
  'Colégio Militar de Brasília',
  'Colégio Naval (RJ)',
  'Colégio de Aplicação da UFRJ',
  'Colégio de Aplicação da UFRGS',
  'Colégio de Aplicação da UFSC',
  'Colégio de Aplicação da UFPE',
  'Colégio de Aplicação da UFV (COLUNI)',
  'Colégio Técnico da UFMG (COLTEC)',
  'Colégio Técnico da UFRRJ',
  'Colégio Técnico de Campinas (COTUCA)',
  'Colégio Técnico Industrial de Santa Maria (CTISM)',
  'Escola de Aplicação da USP',
  'Escola Técnica Estadual (ETEC) - SP',
  'ETEC - Escola Técnica Estadual (SP)',
  'ETEC Parque da Juventude (SP)',
  'ETEC de Embu (SP)',
  'FAETEC - Fundação de Apoio à Escola Técnica (RJ)',
  'Escola Técnica Estadual (ETE) - Pernambuco',
  'Escola de Referência em Ensino Médio (EREM) - Pernambuco',
  'Escola Estadual de Educação Profissional (EEEP) - Ceará',
  'Escola Estadual de Ensino Médio em Tempo Integral (Ceará)',
  'Centro Estadual de Educação Profissional (CEEP) - Paraná',
  'Colégio Estadual do Paraná',
  'Colégio Estadual Central (Salvador, Bahia)',
  'Colégio Estadual da Bahia (Central) - Salvador',
  'Colégio Estadual de Tempo Integral (Bahia)',
  'Centro Territorial de Educação Profissional (CETEP) - Bahia',
  'Colégio da Polícia Militar da Bahia (CPM)',
  'Colégio Tiradentes da Polícia Militar (MG)',
  'Colégio Tiradentes da Polícia Militar (BA)',
  'Colégio da Polícia Militar (CPM)',
  'CEM - Centro de Ensino Médio (DF)',
  'CED - Centro Educacional (DF)',
  'CEF - Centro de Ensino Fundamental (DF)',
  'CEP - Centro de Educação Profissional (DF)',
  'CEPMG - Colégio Estadual da Polícia Militar (GO)',
  'Colégio Estadual (genérico)',
  'Escola Estadual (genérica)',
  'Escola Municipal (genérica)',
  'Escola Família Agrícola (EFA)',
  'Casa Familiar Rural',
  'Escola Técnica Federal',
  'SENAI',
  'SENAC',
  'SENAR',
  'SENAT',
  'SESI',
  'SESC',
  'Fundação Bradesco',
  'Cursinho pré-vestibular',
  'Cursinho popular',
  'EJA - Educação de Jovens e Adultos',
  'Ensino médio em casa (homeschooling)',

  /* ---------------- Institutos federais (todos) ---------------- */
  'Instituto Federal do Acre (IFAC)',
  'Instituto Federal de Alagoas (IFAL)',
  'Instituto Federal do Amapá (IFAP)',
  'Instituto Federal do Amazonas (IFAM)',
  'Instituto Federal da Bahia (IFBA)',
  'Instituto Federal Baiano (IF Baiano)',
  'Instituto Federal de Brasília (IFB)',
  'Instituto Federal do Ceará (IFCE)',
  'Instituto Federal do Espírito Santo (IFES)',
  'Instituto Federal de Goiás (IFG)',
  'Instituto Federal Goiano (IF Goiano)',
  'Instituto Federal do Maranhão (IFMA)',
  'Instituto Federal de Mato Grosso (IFMT)',
  'Instituto Federal de Mato Grosso do Sul (IFMS)',
  'Instituto Federal de Minas Gerais (IFMG)',
  'Instituto Federal do Norte de Minas Gerais (IFNMG)',
  'Instituto Federal do Sudeste de Minas Gerais (IF Sudeste MG)',
  'Instituto Federal do Sul de Minas Gerais (IFSULDEMINAS)',
  'Instituto Federal do Triângulo Mineiro (IFTM)',
  'Instituto Federal do Pará (IFPA)',
  'Instituto Federal da Paraíba (IFPB)',
  'Instituto Federal de Pernambuco (IFPE)',
  'Instituto Federal do Sertão Pernambucano (IF Sertão PE)',
  'Instituto Federal do Piauí (IFPI)',
  'Instituto Federal do Paraná (IFPR)',
  'Instituto Federal do Rio de Janeiro (IFRJ)',
  'Instituto Federal Fluminense (IFF)',
  'Instituto Federal do Rio Grande do Norte (IFRN)',
  'Instituto Federal de Rondônia (IFRO)',
  'Instituto Federal de Roraima (IFRR)',
  'Instituto Federal do Rio Grande do Sul (IFRS)',
  'Instituto Federal Farroupilha (IFFar)',
  'Instituto Federal Sul-rio-grandense (IFSul)',
  'Instituto Federal de Santa Catarina (IFSC)',
  'Instituto Federal Catarinense (IFC)',
  'Instituto Federal de São Paulo (IFSP)',
  'Instituto Federal de Sergipe (IFS)',
  'Instituto Federal do Tocantins (IFTO)',
  'Colégio Pedro II',
  'CEFET-MG',
  'CEFET/RJ',
  'Universidade Tecnológica Federal do Paraná (UTFPR)',

  /* ---------------- Universidades federais ---------------- */
  'Universidade de Brasília (UnB)',
  'Universidade Federal do Acre (UFAC)',
  'Universidade Federal de Alagoas (UFAL)',
  'Universidade Federal do Amapá (UNIFAP)',
  'Universidade Federal do Amazonas (UFAM)',
  'Universidade Federal da Bahia (UFBA)',
  'Universidade Federal do Oeste da Bahia (UFOB)',
  'Universidade Federal do Sul da Bahia (UFSB)',
  'Universidade Federal do Recôncavo da Bahia (UFRB)',
  'Universidade Federal do Vale do São Francisco (UNIVASF)',
  'Universidade Federal do Ceará (UFC)',
  'Universidade Federal do Cariri (UFCA)',
  'Universidade da Integração Internacional da Lusofonia Afro-Brasileira (UNILAB)',
  'Universidade Federal do Espírito Santo (UFES)',
  'Universidade Federal de Goiás (UFG)',
  'Universidade Federal de Catalão (UFCAT)',
  'Universidade Federal de Jataí (UFJ)',
  'Universidade Federal do Maranhão (UFMA)',
  'Universidade Federal de Mato Grosso (UFMT)',
  'Universidade Federal de Rondonópolis (UFR)',
  'Universidade Federal de Mato Grosso do Sul (UFMS)',
  'Universidade Federal da Grande Dourados (UFGD)',
  'Universidade Federal de Minas Gerais (UFMG)',
  'Universidade Federal de Juiz de Fora (UFJF)',
  'Universidade Federal de Lavras (UFLA)',
  'Universidade Federal de Itajubá (UNIFEI)',
  'Universidade Federal de Ouro Preto (UFOP)',
  'Universidade Federal de São João del-Rei (UFSJ)',
  'Universidade Federal de Uberlândia (UFU)',
  'Universidade Federal de Viçosa (UFV)',
  'Universidade Federal de Alfenas (UNIFAL)',
  'Universidade Federal do Triângulo Mineiro (UFTM)',
  'Universidade Federal dos Vales do Jequitinhonha e Mucuri (UFVJM)',
  'Universidade Federal do Pará (UFPA)',
  'Universidade Federal Rural da Amazônia (UFRA)',
  'Universidade Federal do Oeste do Pará (UFOPA)',
  'Universidade Federal do Sul e Sudeste do Pará (UNIFESSPA)',
  'Universidade Federal da Paraíba (UFPB)',
  'Universidade Federal de Campina Grande (UFCG)',
  'Universidade Federal de Pernambuco (UFPE)',
  'Universidade Federal Rural de Pernambuco (UFRPE)',
  'Universidade Federal do Agreste de Pernambuco (UFAPE)',
  'Universidade Federal do Piauí (UFPI)',
  'Universidade Federal do Delta do Parnaíba (UFDPar)',
  'Universidade Federal do Paraná (UFPR)',
  'Universidade Federal da Integração Latino-Americana (UNILA)',
  'Universidade Federal do Rio de Janeiro (UFRJ)',
  'Universidade Federal Fluminense (UFF)',
  'Universidade Federal do Estado do Rio de Janeiro (UNIRIO)',
  'Universidade Federal Rural do Rio de Janeiro (UFRRJ)',
  'Universidade Federal do Rio Grande do Norte (UFRN)',
  'Universidade Federal Rural do Semi-Árido (UFERSA)',
  'Universidade Federal do Rio Grande do Sul (UFRGS)',
  'Universidade Federal de Santa Maria (UFSM)',
  'Universidade Federal de Pelotas (UFPel)',
  'Universidade Federal do Rio Grande (FURG)',
  'Universidade Federal do Pampa (UNIPAMPA)',
  'Universidade Federal de Ciências da Saúde de Porto Alegre (UFCSPA)',
  'Universidade Federal da Fronteira Sul (UFFS)',
  'Universidade Federal de Rondônia (UNIR)',
  'Universidade Federal de Roraima (UFRR)',
  'Universidade Federal de Santa Catarina (UFSC)',
  'Universidade Federal de São Paulo (UNIFESP)',
  'Universidade Federal de São Carlos (UFSCar)',
  'Universidade Federal do ABC (UFABC)',
  'Universidade Federal de Sergipe (UFS)',
  'Universidade Federal do Tocantins (UFT)',
  'Universidade Federal do Norte do Tocantins (UFNT)',
  'Universidade Federal do Sul da Bahia (UFSB)',
  'Universidade Tecnológica Federal do Paraná (UTFPR)',

  /* ---------------- Universidades estaduais ---------------- */
  'Universidade de São Paulo (USP)',
  'Universidade Estadual de Campinas (Unicamp)',
  'Universidade Estadual Paulista (UNESP)',
  'Universidade Virtual do Estado de São Paulo (UNIVESP)',
  'Universidade do Estado do Rio de Janeiro (UERJ)',
  'Universidade Estadual do Norte Fluminense (UENF)',
  'Universidade Estadual da Bahia (UNEB)',
  'Universidade Estadual de Feira de Santana (UEFS)',
  'Universidade Estadual de Santa Cruz (UESC)',
  'Universidade Estadual do Sudoeste da Bahia (UESB)',
  'Universidade do Estado de Minas Gerais (UEMG)',
  'Universidade Estadual de Montes Claros (UNIMONTES)',
  'Universidade Estadual de Londrina (UEL)',
  'Universidade Estadual de Maringá (UEM)',
  'Universidade Estadual de Ponta Grossa (UEPG)',
  'Universidade Estadual do Oeste do Paraná (UNIOESTE)',
  'Universidade Estadual do Centro-Oeste (UNICENTRO)',
  'Universidade Estadual do Norte do Paraná (UENP)',
  'Universidade Estadual do Paraná (UNESPAR)',
  'Universidade do Estado de Santa Catarina (UDESC)',
  'Universidade Estadual do Rio Grande do Sul (UERGS)',
  'Universidade Estadual de Goiás (UEG)',
  'Universidade Estadual do Ceará (UECE)',
  'Universidade Estadual Vale do Acaraú (UVA)',
  'Universidade Regional do Cariri (URCA)',
  'Universidade de Pernambuco (UPE)',
  'Universidade Estadual da Paraíba (UEPB)',
  'Universidade do Estado do Rio Grande do Norte (UERN)',
  'Universidade Estadual de Alagoas (UNEAL)',
  'Universidade Estadual de Ciências da Saúde de Alagoas (UNCISAL)',
  'Universidade Estadual do Maranhão (UEMA)',
  'Universidade Estadual do Piauí (UESPI)',
  'Universidade do Estado do Pará (UEPA)',
  'Universidade do Estado do Amazonas (UEA)',
  'Universidade do Estado de Mato Grosso (UNEMAT)',
  'Universidade Estadual de Mato Grosso do Sul (UEMS)',
  'Universidade Estadual do Tocantins (UNITINS)',
  'Universidade Federal do Tocantins (UFT)',

  /* ---------------- Universidades privadas e confessionais ---------------- */
  'Universidade Católica de Brasília (UCB)',
  'Centro Universitário de Brasília (CEUB)',
  'Centro Universitário IESB (DF)',
  'Universidade Paulista (UNIP)',
  'Universidade Cruzeiro do Sul (UNICSUL)',
  'Universidade Anhanguera (UNIDERP)',
  'Anhanguera Educacional',
  'Universidade Estácio de Sá',
  'Universidade Nove de Julho (UNINOVE)',
  'Universidade Presbiteriana Mackenzie',
  'Universidade Metodista de São Paulo (UMESP)',
  'Universidade São Judas Tadeu',
  'Universidade de Fortaleza (UNIFOR)',
  'Universidade Salvador (UNIFACS)',
  'Universidade Católica de Salvador (UCSAL)',
  'Universidade Católica de Pernambuco (UNICAP)',
  'Universidade Católica de Goiás / PUC Goiás',
  'Universidade Positivo (UP)',
  'Universidade do Vale do Rio dos Sinos (UNISINOS)',
  'Universidade de Passo Fundo (UPF)',
  'Universidade de Caxias do Sul (UCS)',
  'Universidade de Santa Cruz do Sul (UNISC)',
  'Universidade Luterana do Brasil (ULBRA)',
  'Universidade do Vale do Itajaí (UNIVALI)',
  'Universidade Regional de Blumenau (FURB)',
  'Universidade do Sul de Santa Catarina (UNISUL)',
  'Universidade de Ribeirão Preto (UNAERP)',
  'Universidade de Franca (UNIFRAN)',
  'Universidade de Taubaté (UNITAU)',
  'Universidade de Sorocaba (UNISO)',
  'Universidade São Francisco (USF)',
  'Universidade Federal Rural (genérica)',
  'PUC-Rio',
  'PUC-SP',
  'PUC-Campinas',
  'PUC-Minas',
  'PUCRS',
  'PUC-PR',
  'PUC Goiás',
  'Insper',
  'FGV - Fundação Getulio Vargas',
  'FAAP',
  'FIAP',
  'ESPM',
  'Faculdade de Tecnologia (FATEC) - SP',
  'FATEC',
  'Instituto Militar de Engenharia (IME)',
  'Instituto Tecnológico de Aeronáutica (ITA)',
  'Academia Militar das Agulhas Negras (AMAN)',
  'Escola Naval',
  'Academia da Força Aérea (AFA)',
  'Universidade Aberta do Brasil (UAB)',
  'Centro Universitário Internacional (UNINTER)',
  'UNOPAR / Universidade Pitágoras Unopar Anhanguera',
  'Universidade Cruzeiro do Sul Virtual',
  'Centro Universitário Leonardo da Vinci (UNIASSELVI)',
]

/* ---------------- Busca local ---------------- */

/** Todas as palavras digitadas precisam aparecer no nome (em qualquer ordem). */
function matches(name, tokens) {
  const n = strip(name)
  return tokens.every((t) => n.includes(t))
}

export function searchLocalInstitutions(q, n = 6) {
  const tokens = strip(q).split(/\s+/).filter(Boolean)
  if (!tokens.length) return []
  const seen = new Set()
  return LOCAL.filter((i) => {
    const k = strip(i)
    if (seen.has(k) || !matches(i, tokens)) return false
    seen.add(k)
    return true
  }).slice(0, n)
}

/* ---------------- Busca online (OpenStreetMap / Photon) ---------------- */

const BRAZIL_BBOX = '-74.0,-33.8,-34.7,5.3'
const cache = new Map()

async function searchRemote(q) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 4000)
  try {
    const url =
      `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=10&lang=default&bbox=${BRAZIL_BBOX}` +
      '&osm_tag=amenity:school&osm_tag=amenity:college&osm_tag=amenity:university'
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`photon ${res.status}`)
    const json = await res.json()
    return (json.features || [])
      .map((f) => f.properties || {})
      .filter((p) => p.name)
      .map((p) => {
        const place = [p.city || p.county || p.district, p.state].filter(Boolean)
        const uniq = place.filter((v, i) => place.indexOf(v) === i)
        return uniq.length ? `${p.name} (${uniq.join(', ')})` : p.name
      })
  } finally {
    clearTimeout(timer)
  }
}

/** Lista de nomes (strings) que combinam com a busca. */
export async function searchInstitutions(q) {
  const query = String(q || '').trim()
  if (query.length < 2) return []
  const key = strip(query)
  if (cache.has(key)) return cache.get(key)

  const local = searchLocalInstitutions(query, 5)
  let remote = []
  try {
    remote = await searchRemote(query)
  } catch (_) {
    // offline / limite de uso: segue só com a lista local
  }
  const seen = new Set()
  const out = [...local, ...remote]
    .filter((n) => {
      const k = strip(n)
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    .slice(0, 8)
  if (remote.length) cache.set(key, out) // não guarda resultado de falha
  return out
}
