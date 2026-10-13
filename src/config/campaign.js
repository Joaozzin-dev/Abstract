/** Mundo 1 — Loja do Tonho (ABC + a11y prática) */
export const CHALLENGES = [
  { id: 'd1', order: 1, world: 'tonho', chapter: 1, title: 'Cadê o botão?', blurb: 'Botão de compra quase invisível (baixa visão).', type: 'contrast', a11y: 'Contraste WCAG 1.4.3',
    code: `algoritmo "botao_compra"\nmemoria\n    cor_texto: caractere\ninicio\n    cor_texto = "cinza_claro"\n    escreval("Botão configurado")\nfim` },
  { id: 'd2', order: 2, world: 'tonho', chapter: 1, title: 'Tá pequeno demais', blurb: 'Texto dos produtos pequeno.', type: 'font', a11y: 'Legibilidade',
    code: `algoritmo "texto_produto"\nmemoria\n    tamanho_fonte: inteiro\ninicio\n    tamanho_fonte = 10\n    escreval("Fonte definida")\nfim` },
  { id: 'd3', order: 3, world: 'tonho', chapter: 1, title: 'Não dá pra clicar', blurb: 'Botões pequenos demais.', type: 'touch', a11y: 'Toque ≥ 44px',
    code: `algoritmo "area_toque"\nmemoria\n    altura_botao: inteiro\ninicio\n    altura_botao = 28\n    escreval("Altura definida")\nfim` },
  { id: 'd4', order: 4, world: 'tonho', chapter: 2, title: 'A promoção sumiu', blurb: 'Promoção só pela cor.', type: 'color', a11y: 'Não só cor 1.4.1',
    code: `algoritmo "promocao"\nmemoria\n    so_cor: caractere\n    texto_extra: caractere\ninicio\n    so_cor = "sim"\n    texto_extra = "nao"\n    escreval("Promoção ok")\nfim` },
  { id: 'd5', order: 5, world: 'tonho', chapter: 2, title: 'Aumentei tudo', blurb: 'Fonte grande quebra o layout.', type: 'resize', a11y: 'Redimensionamento',
    code: `algoritmo "zoom"\nmemoria\n    tamanho_fonte: inteiro\n    layout_flexivel: caractere\ninicio\n    tamanho_fonte = 28\n    layout_flexivel = "nao"\n    escreval("Zoom ok")\nfim` },
  { id: 'd6', order: 6, world: 'tonho', chapter: 2, title: 'Cadê o produto?', blurb: 'Info some no zoom.', type: 'reflow', a11y: 'Reflow 1.4.10',
    code: `algoritmo "reflow"\nmemoria\n    largura_fixa: caractere\n    esconder_no_zoom: caractere\ninicio\n    largura_fixa = "sim"\n    esconder_no_zoom = "sim"\n    escreval("Layout ok")\nfim` },
  { id: 'd7', order: 7, world: 'tonho', chapter: 2, title: 'Contraste demais?', blurb: 'Equilíbrio e hierarquia.', type: 'hierarchy', a11y: 'Hierarquia visual',
    code: `algoritmo "hierarquia"\nmemoria\n    contraste: caractere\n    destaque_titulo: caractere\inicio\n    contraste = "extremo"\n    destaque_titulo = "nao"\n    escreval("Hierarquia ok")\nfim` },
]

/** Mundo 2 — Vale do Silêncio (usuário final, SAC, impacto social) */
export const VALE_CHALLENGES = [
  { id: 'v1', order: 8, world: 'vale', chapter: 3, title: 'O silêncio do SAC', blurb: 'Usuária relata: “não consigo concluir a compra com o leitor de tela”.', type: 'hierarchy', a11y: 'Nome acessível / hierarquia',
    code: `algoritmo "sac_leitor"\nmemoria\n    contraste: caractere\n    destaque_titulo: caractere\ninicio\n    contraste = "extremo"\n    destaque_titulo = "nao"\n    escreval("Formulário")\nfim` },
  { id: 'v2', order: 9, world: 'vale', chapter: 3, title: 'Review de 1 estrela', blurb: 'Avaliação na “loja”: botão de comprar some no zoom do celular.', type: 'reflow', a11y: 'Reflow 1.4.10',
    code: `algoritmo "review_zoom"\nmemoria\n    largura_fixa: caractere\n    esconder_no_zoom: caractere\ninicio\n    largura_fixa = "sim"\n    esconder_no_zoom = "sim"\n    escreval("Checkout")\nfim` },
  { id: 'v3', order: 10, world: 'vale', chapter: 3, title: 'Pedido de mudança', blurb: 'Cliente pede: área de toque maior no “Finalizar pedido”.', type: 'touch', a11y: 'Toque ≥ 44px',
    code: `algoritmo "pedido_mudanca"\nmemoria\n    altura_botao: inteiro\ninicio\n    altura_botao = 30\n    escreval("Finalizar pedido")\nfim` },
]

export const ALL_CHALLENGES = [...CHALLENGES, ...VALE_CHALLENGES]

export function getChallengeById(id) {
  return ALL_CHALLENGES.find((c) => c.id === id) || CHALLENGES[0]
}

export const STORE_PRODUCTS = [
  { id: 'fone', name: 'Fone Bluetooth', price: 'R$ 299', tag: 'Mais vendido' },
  { id: 'teclado', name: 'Teclado compacto', price: 'R$ 189', tag: '' },
  { id: 'mouse', name: 'Mouse ergonômico', price: 'R$ 149', tag: 'Acessível' },
  { id: 'suporte', name: 'Suporte de celular', price: 'R$ 59', tag: '' },
]

export const FAKE_REVIEWS = [
  { stars: 2, author: 'Cláudia M.', text: 'Não enxergo o botão de comprar. Parece que o site não foi feito pra mim.' },
  { stars: 1, author: 'Roberto S.', text: 'Com zoom o checkout some. Desisti da compra.' },
  { stars: 5, author: 'Ana P.', text: 'Depois da correção do Dev Júnior, finalmente consegui finalizar!' },
  { stars: 3, author: 'SAC interno', text: 'Vários tickets de toque pequeno no “Finalizar pedido”.' },
]
