/**
 * Referências e créditos — não copiar PDFs/slides de terceiros.
 * Só tópicos + links com atribuição.
 */
export const REFERENCES = [
  {
    id: 'wcag22',
    title: 'WCAG 2.2',
    type: 'Padrão (W3C)',
    url: 'https://www.w3.org/TR/WCAG22/',
    use: 'Base das regras do Rule Engine (contraste, toque, cor, reflow).',
  },
  {
    id: 'wcag-understanding',
    title: 'Understanding WCAG 2.2',
    type: 'Guia (W3C)',
    url: 'https://www.w3.org/WAI/WCAG22/Understanding/',
    use: 'Textos de “porquê errei” nas lições e no terminal CI.',
  },
  {
    id: 'mc202',
    title: 'MC202 — Estruturas de Dados / Curso de C',
    type: 'Curso público (Unicamp)',
    url: 'https://www.ic.unicamp.br/~rafael/mc202.html',
    use: 'Referência de tópicos da trilha C (adaptados ao Ensino Médio). Não embutimos PDFs/slides.',
  },
  {
    id: 'w3schools-c',
    title: 'C Tutorial — W3Schools',
    type: 'Tutorial opcional',
    url: 'https://www.w3schools.com/c/index.php',
    use: 'Links “saiba mais” na trilha C introdutória.',
  },
  {
    id: 'visualgo',
    title: 'VisuAlgo',
    type: 'Visualização opcional',
    url: 'https://visualgo.net/',
    use: 'Apoio visual a estruturas (link externo, sem dependência de runtime).',
  },
]

export const A11Y_CHECKLIST = [
  'Contraste de texto ≥ 4.5:1 nos temas padrão',
  'Área de toque mínima de 44×44 px nos botões principais',
  'Rótulos acessíveis (accessibilityLabel) em ações importantes',
  'Navegação possível sem depender só de cor',
  'Opção de reduzir movimento (perfil)',
  'Opção de alto contraste e tema daltônico',
  'Tamanho de texto ajustável (perfil)',
]

export const CENTRAL_MESSAGE =
  'Nós não desenvolvemos um sistema. Nós desenvolvemos um sistema para todos.'

export const SOCIAL_BEATS = [
  'Quem usa a loja pode ter baixa visão, tremor ou usar leitor de tela.',
  'Acessibilidade é decisão de design — e responsabilidade de quem programa.',
  'Um botão invisível não é “detalhe”: é exclusão.',
]
