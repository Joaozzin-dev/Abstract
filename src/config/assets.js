/**
 * Kit de ilustrações — arquivos LOCAIS (ou URL direta de imagem).
 *
 * Pinterest = só moodboard. Baixe o arquivo com licença OK e coloque em:
 *   assets/illustrations/
 *
 * NÃO use assets oficiais do Duolingo (coruja, logo, tipografia).
 * Mascote oficial deste app: SARUÊ (opossum/gambá).
 *
 * require() só funciona se o arquivo existir no bundle. Enquanto não tiver PNG,
 * deixe o campo null e o app usa ilustração SVG de fallback.
 */

// Descomente quando o PNG existir na pasta:
// const sarue = require('../../assets/illustrations/sarue-idle.png')

export const ASSETS = {
  /** Mascote — idle */
  sarue: null,
  /** Mascote — feliz (opcional) */
  sarueHappy: null,
  /** Chefe */
  chefe: null,
  /** Cátia (dev sênior) */
  catia: null,
  /** Produto fone */
  produtoFone: null,
  /** Resultado sucesso */
  sucesso: null,
  /** Resultado derrota / precisa refatorar */
  derrota: null,
  /** Ícone estrela / cadeado podem ficar nos Ionicons */
}

/**
 * Termos de busca + nome de arquivo sugerido (você baixa e renomeia).
 * Sites: Openclipart, Wikimedia Commons, Public Domain Vectors;
 * Freepik/Flaticon só com licença que permita o uso no app educacional.
 */
export const ASSET_SEARCH_GUIDE = [
  {
    key: 'sarue',
    file: 'sarue-idle.png',
    size: '512×512 PNG transparente',
    searchPt: 'saruê desenho fofo cartoon transparente',
    searchEn: 'cute opossum cartoon png transparent',
    avoid: 'Duolingo owl, trademark mascots',
  },
  {
    key: 'sarueHappy',
    file: 'sarue-happy.png',
    size: '512×512',
    searchPt: 'saruê feliz cartoon',
    searchEn: 'happy opossum cartoon illustration',
    avoid: '',
  },
  {
    key: 'chefe',
    file: 'chefe.png',
    size: '256–512',
    searchPt: 'chefe gerente cartoon amigável',
    searchEn: 'friendly manager cartoon character flat',
    avoid: 'scary boss stock photo only',
  },
  {
    key: 'catia',
    file: 'catia.png',
    size: '256–512',
    searchPt: 'mulher programadora cartoon',
    searchEn: 'woman developer cartoon flat illustration',
    avoid: '',
  },
  {
    key: 'produtoFone',
    file: 'produto-fone.png',
    size: '256',
    searchPt: 'fone bluetooth ilustração',
    searchEn: 'bluetooth headphones flat icon png',
    avoid: '',
  },
  {
    key: 'sucesso',
    file: 'sucesso.png',
    size: '256',
    searchPt: 'check celebração cartoon',
    searchEn: 'success check celebration flat illustration',
    avoid: '',
  },
  {
    key: 'derrota',
    file: 'derrota.png',
    size: '256',
    searchPt: 'erro suave ilustração',
    searchEn: 'gentle error oops illustration flat',
    avoid: 'violent fail memes',
  },
]

export const LICENSE_NOTE =
  'Verifique CC0, domínio público ou licença com atribuição antes de publicar na UnB. Não use URL de pin do Pinterest como src final.'
