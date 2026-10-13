/**
 * Banco da Speed Run (Vale do Silêncio).
 *
 * Cada banco tem:
 *   items: perguntas fixas (100 por banco)
 *   gens:  geradores que criam perguntas novas com números sorteados
 *          (a tela mistura 1 gerada a cada 4 perguntas)
 *
 * Tipos de pergunta, todos de toque rápido:
 *   mc     escolha: 3 alternativas
 *   tf     verdadeiro ou falso
 *   dec    decisão rápida: cenário + 2 ações (a certa e a errada)
 *   code   "o que aparece?": mostra um código e 3 resultados
 *   fix    complete a lacuna (____) do código
 *   bug    toque na linha com erro
 *   order  toque nas linhas/passos NA ORDEM certa (escreva já na ordem correta)
 *   odd    intruso: 4 itens, toque no que NÃO pertence
 *
 * Para adicionar: copie uma linha, mude o id (único) e o conteúdo.
 */

const mc = (id, q, a, w) => ({ id, t: 'mc', q, a, w })
const tf = (id, q, a) => ({ id, t: 'tf', q, a })
const dec = (id, q, a, w) => ({ id, t: 'dec', q, a, w: [w] })
const out = (id, code, a, w, q = 'O que aparece na tela?') => ({ id, t: 'code', q, code, a, w })
const fix = (id, q, code, a, w) => ({ id, t: 'fix', q, code, a, w })
const bug = (id, q, code, a) => ({ id, t: 'bug', q, code, a })
const order = (id, q, lines) => ({ id, t: 'order', q, lines })
const odd = (id, q, items, a) => ({ id, t: 'odd', q, items, a })

/* ------------------------------------------------------------------ */
/*  PLANTÃO · lógica, comparações e acessibilidade                     */
/* ------------------------------------------------------------------ */
export const PLANTAO = [
  /* escolha */
  mc('p-m01', 'Qual operador exige que as DUAS condições sejam verdadeiras?', 'e', ['ou', 'nao']),
  mc('p-m02', 'O que o "nao" faz?', 'Inverte verdadeiro e falso', ['Soma dois valores', 'Mostra na tela']),
  mc('p-m03', 'Qual palavra mostra um texto na tela?', 'escreval', ['leia', 'se']),
  mc('p-m04', 'Qual palavra pega o que a pessoa digita?', 'leia', ['escreval', 'fimse']),
  mc('p-m05', 'O que fecha um bloco "se"?', 'fimse', ['fim', 'senao']),
  mc('p-m06', 'O "senao" roda quando:', 'o "se" é falso', ['o "se" é verdadeiro', 'sempre']),
  mc('p-m07', 'Contraste mínimo para texto normal (WCAG AA):', '4,5:1', ['2:1', '1,5:1']),
  mc('p-m08', 'Tamanho mínimo recomendado para um botão tocável:', 'cerca de 44 px', ['16 px', '20 px']),
  mc('p-m09', 'Para o leitor de tela, uma imagem importante precisa de:', 'texto alternativo', ['mais brilho', 'som de fundo']),
  mc('p-m10', 'O leitor de tela deve anunciar uma mudança de estado:', 'uma única vez', ['em loop', 'nunca']),
  mc('p-m11', 'Qual é a melhor mensagem de erro?', 'Pagamento não aprovado. Tente outro cartão.', ['Erro', 'Falha 0x7F']),
  mc('p-m12', 'Cancelar um pedido por voz exige:', 'confirmação', ['nada', 'mais volume']),
  mc('p-m13', 'Frase de voz ambígua: o sistema deve', 'perguntar e oferecer botão', ['adivinhar', 'ficar mudo']),
  mc('p-m14', 'Depois de consertar uma parte, o certo é:', 'testar tudo de novo', ['liberar direto', 'apagar os testes']),

  /* verdadeiro ou falso */
  tf('p-t01', 'Com estoque 0 e pagamento aprovado, "estoque > 0 e pagamento_aprovado" é verdadeiro.', false),
  tf('p-t02', 'Com "ou", basta uma condição verdadeira.', true),
  tf('p-t03', 'Com "e", basta uma condição verdadeira.', false),
  tf('p-t04', 'Estoque 0 é um bom teste de limite.', true),
  tf('p-t05', 'Aviso só por som é suficiente.', false),
  tf('p-t06', 'O leitor de tela deve repetir o aviso várias vezes.', false),
  tf('p-t07', 'Texto na tela serve para todos, mesmo sem som.', true),
  tf('p-t08', '"total >= 200" é verdadeiro quando total = 200.', true),
  tf('p-t09', '"total > 200" é verdadeiro quando total = 200.', false),
  tf('p-t10', 'O símbolo <- compara dois valores.', false),
  tf('p-t11', 'O "senao" é opcional.', true),
  tf('p-t12', 'Programa sem erro de execução é sempre acessível.', false),
  tf('p-t13', 'Botão de 32 px atende ao tamanho de toque recomendado.', false),
  tf('p-t14', 'Contraste de 4,5:1 atende texto normal no nível AA.', true),
  tf('p-t15', 'Cancelar por voz deve pedir confirmação.', true),
  tf('p-t16', 'Mostrar o erro só em vermelho basta para todos.', false),

  /* o que aparece? */
  out('p-o01', ['total <- 180', 'se total > 200 entao', '   total <- total - 30', 'fimse', 'escreval(total)'], '180', ['150', '210']),
  out('p-o02', ['total <- 250', 'se total > 200 entao', '   total <- total - 30', 'fimse', 'escreval(total)'], '220', ['250', '280']),
  out('p-o03', ['estoque <- 0', 'se estoque > 0 entao', '   escreval("Disponível")', 'senao', '   escreval("Indisponível")', 'fimse'], 'Indisponível', ['Disponível', 'nada']),
  out('p-o04', ['estoque <- 3', 'pago <- falso', 'se estoque > 0 e pago entao', '   escreval("Liberada")', 'senao', '   escreval("Bloqueada")', 'fimse'], 'Bloqueada', ['Liberada', 'Erro']),
  out('p-o05', ['estoque <- 3', 'pago <- falso', 'se estoque > 0 ou pago entao', '   escreval("Liberada")', 'senao', '   escreval("Bloqueada")', 'fimse'], 'Liberada', ['Bloqueada', 'nada']),
  out('p-o06', ['x <- 5', 'x <- x + 2', 'escreval(x)'], '7', ['5', '52']),
  out('p-o07', ['a <- 10', 'se a >= 10 entao', '   escreval("sim")', 'senao', '   escreval("nao")', 'fimse'], 'sim', ['nao', '10']),
  out('p-o08', ['n <- 4', 'se nao n > 5 entao', '   escreval("pequeno")', 'fimse'], 'pequeno', ['nada', 'grande']),
  out('p-o09', ['preco <- 20', 'qtd <- 3', 'escreval(preco * qtd)'], '60', ['23', '203']),
  out('p-o10', ['pagamento <- falso', 'se pagamento == falso entao', '   escreval("Tente outro cartão")', 'fimse'], 'Tente outro cartão', ['nada', 'falso']),

  /* complete */
  fix('p-f01', 'Desconto só acima de 200.', ['se total ____ entao', '   total <- total - 30', 'fimse'], '> 200', ['< 200', '>= 100']),
  fix('p-f02', 'Liberar só com as duas condições.', ['se estoque > 0 ____ pago entao', '   escreval("Liberada")', 'fimse'], 'e', ['ou', 'nao']),
  fix('p-f03', 'Guardar o resultado.', ['total ____ preco * qtd'], '<-', ['==', '>']),
  fix('p-f04', 'Mostrar na tela.', ['____("Olá")'], 'escreval', ['leia', 'se']),
  fix('p-f05', 'Caminho alternativo.', ['se idade >= 18 entao', '   escreval("Adulto")', '____', '   escreval("Menor")', 'fimse'], 'senao', ['fimse', 'entao']),
  fix('p-f06', 'Fechar o bloco.', ['se total > 0 entao', '   escreval("ok")', '____'], 'fimse', ['senao', 'fim']),
  fix('p-f07', 'Avisar o cliente.', ['se pagamento == falso entao', '   escreval(____)', 'fimse'], '"Pagamento não aprovado. Tente outro cartão."', ['"Erro"', '"..."']),
  fix('p-f08', 'Avisar quando NÃO há estoque.', ['se ____ estoque > 0 entao', '   escreval("Esgotado")', 'fimse'], 'nao', ['e', 'ou']),

  /* ache o erro */
  bug('p-b01', 'Meta: liberar só com estoque E pagamento.', ['se estoque > 0 ou pago entao', '   escreval("Liberada")', 'senao', '   escreval("Bloqueada")', 'fimse'], 0),
  bug('p-b02', 'Meta: desconto só acima de 200.', ['se total >= 100 entao', '   total <- total - 30', 'fimse'], 0),
  bug('p-b03', 'Meta: dizer "Indisponível" com estoque 0.', ['se estoque >= 0 entao', '   escreval("Disponível")', 'senao', '   escreval("Indisponível")', 'fimse'], 0),
  bug('p-b04', 'Meta: mensagem que ajuda a pessoa.', ['se pagamento == falso entao', '   escreval("Erro")', 'fimse'], 1),
  bug('p-b05', 'Meta: guardar o total.', ['preco <- 20', 'qtd <- 3', 'total == preco * qtd', 'escreval(total)'], 2),
  bug('p-b06', 'Meta: mostrar o total na tela.', ['preco <- 20', 'total <- preco * 2', 'leia(total)'], 2),
  bug('p-b07', 'Meta: desconto (tirar R$ 30) para quem passou de 200.', ['se total > 200 entao', '   total <- total + 30', 'fimse'], 1),
  bug('p-b08', 'Meta: bloquear quando NÃO houver estoque.', ['se estoque > 0 entao', '   escreval("Bloqueado")', 'fimse'], 0),

  /* ---- novas: escolha ---- */
  mc('p-m15', 'Qual símbolo guarda um valor numa variável?', '<-', ['==', '>=']),
  mc('p-m16', 'Qual operador compara se dois valores são iguais?', '==', ['<-', 'e']),
  mc('p-m17', 'O que significa ">="?', 'maior ou igual', ['menor ou igual', 'diferente']),
  mc('p-m18', 'Um bom teste de limite para "idade >= 18" é:', 'idade = 18', ['idade = 50', 'idade = 7']),

  /* ---- novas: verdadeiro ou falso ---- */
  tf('p-t17', '"estoque <= 0" é verdadeiro quando estoque = 0.', true),
  tf('p-t18', 'Se x é verdadeiro, "nao x" é falso.', true),
  tf('p-t19', 'Mostrar o erro só pela cor é suficiente.', false),
  tf('p-t20', 'O botão "Pagar" precisa de um nome que o leitor de tela consiga ler.', true),

  /* ---- novas: o que aparece? ---- */
  out('p-o11', ['a <- 4', 'b <- 6', 'se a < b e b < 10 entao', '   escreval("ok")', 'senao', '   escreval("falhou")', 'fimse'], 'ok', ['falhou', 'nada']),
  out('p-o12', ['total <- 100', 'desc <- 0', 'se total >= 100 entao', '   desc <- 15', 'fimse', 'escreval(total - desc)'], '85', ['100', '115']),
  out('p-o13', ['x <- 3', 'y <- x * 2', 'x <- y + 1', 'escreval(x)'], '7', ['6', '3']),
  out('p-o14', ['pago <- verdadeiro', 'se nao pago entao', '   escreval("Cobrar")', 'senao', '   escreval("Entregar")', 'fimse'], 'Entregar', ['Cobrar', 'nada']),

  /* ---- novas: complete ---- */
  fix('p-f09', 'Comparar igualdade.', ['se status ____ "pago" entao', '   escreval("Ok")', 'fimse'], '==', ['<-', 'e']),
  fix('p-f10', 'Aplicar 10% de desconto.', ['total <- total ____ 0.9'], '*', ['+', '==']),

  /* ---- novas: ache o erro ---- */
  bug('p-b09', 'Meta: avisar quando o estoque é zero.', ['se estoque == 0 entao', '   escreval("Em estoque")', 'fimse'], 1),
  bug('p-b10', 'Meta: mostrar a quantidade na tela.', ['qtd <- 4', 'qtd <- qtd + 1', 'leia(qtd)'], 2),

  /* ---- novas: ordene ---- */
  order('p-r01', 'Monte o programa na ordem certa.', ['preco <- 20', 'qtd <- 3', 'total <- preco * qtd', 'escreval(total)']),
  order('p-r02', 'Ordene o bloco de estoque.', ['se estoque > 0 entao', '   escreval("Disponível")', 'senao', '   escreval("Indisponível")', 'fimse']),
  order('p-r03', 'Fluxo: pedir, calcular, mostrar.', ['leia(preco)', 'total <- preco * 2', 'escreval(total)']),
  order('p-r04', 'Ordem de um conserto seguro.', ['Reproduzir o erro', 'Achar a causa', 'Corrigir', 'Testar de novo']),
  order('p-r05', 'Ordem de uma compra.', ['Escolher o produto', 'Informar o pagamento', 'Confirmar o pedido', 'Ver o aviso na tela']),
  order('p-r06', 'Monte o desconto.', ['total <- 250', 'se total > 200 entao', '   total <- total - 30', 'fimse']),
  order('p-r07', 'Ordem para um botão acessível.', ['Dar nome ao botão', 'Aumentar para 44 px', 'Checar o contraste', 'Testar com leitor de tela']),
  order('p-r08', 'Ordem de escrever e rodar.', ['Escrever o código', 'Rodar', 'Ver o resultado', 'Corrigir se precisar']),

  /* ---- novas: intruso ---- */
  odd('p-i01', 'Qual NÃO é operador lógico?', ['e', 'ou', 'nao', 'escreval'], 'escreval'),
  odd('p-i02', 'Qual NÃO é comparação?', ['>=', '==', '<', '<-'], '<-'),
  odd('p-i03', 'Qual NÃO ajuda na acessibilidade?', ['Texto alternativo', 'Contraste alto', 'Botão grande', 'Aviso só por som'], 'Aviso só por som'),
  odd('p-i04', 'Qual NÃO faz parte do bloco "se"?', ['se', 'senao', 'fimse', 'leia'], 'leia'),
  odd('p-i05', 'Qual NÃO é uma boa mensagem de erro?', ['Pagamento recusado. Tente outro cartão.', 'Estoque esgotado. Quer ser avisado?', 'Erro 500', 'Sem conexão. Tente de novo.'], 'Erro 500'),
  odd('p-i06', 'Com total = 150, qual é FALSO?', ['total < 200', 'total >= 100', 'total == 150', 'total > 150'], 'total > 150'),
  odd('p-i07', 'Qual NÃO é tipo de dado?', ['caractere', 'real', 'inteiro', 'fimse'], 'fimse'),
  odd('p-i08', 'Qual NÃO é entrada de dados?', ['leia', 'teclado', 'toque na tela', 'escreval'], 'escreval'),

  /* ---- novas: decisão rápida ---- */
  dec('p-d01', 'Cliente sem estoque. Você:', 'Mostra "Indisponível"', 'Deixa a tela em branco'),
  dec('p-d02', 'Total passou de 200. Você:', 'Aplica o desconto', 'Ignora a regra'),
  dec('p-d03', 'Pagamento falhou. Você:', 'Explica e sugere outro cartão', 'Só mostra "Erro"'),
  dec('p-d04', 'Botão de 30 px. Você:', 'Aumenta para 44 px', 'Deixa assim'),
  dec('p-d05', 'Texto cinza claro no fundo branco. Você:', 'Aumenta o contraste', 'Diminui a fonte'),
  dec('p-d06', 'Pedido de cancelar por voz. Você:', 'Pede confirmação', 'Cancela na hora'),
  dec('p-d07', 'Estoque 0 e pago. Pode liberar?', 'Não', 'Sim'),
  dec('p-d08', 'Para exigir as DUAS condições use:', 'e', 'ou'),
  dec('p-d09', 'Teste de limite de "total > 200". Qual valor?', '200', '5'),
  dec('p-d10', 'Imagem do produto sem descrição. Você:', 'Adiciona texto alternativo', 'Troca a cor'),
  dec('p-d11', 'Corrigiu um bug. Próximo passo:', 'Testar tudo de novo', 'Liberar direto'),
  dec('p-d12', 'Erro mostrado só em vermelho. Você:', 'Adiciona texto também', 'Deixa só a cor'),
]

/* ------------------------------------------------------------------ */
/*  SEM REDE · estados, eventos, depuração e acessibilidade            */
/* ------------------------------------------------------------------ */
export const SEM_REDE = [
  /* escolha */
  mc('s-m01', 'Quando a internet cai, o app deve:', 'avisar e explicar o que fazer', ['fechar sozinho', 'ficar em branco']),
  mc('s-m02', 'Um estado é:', 'o que o app lembra agora', ['uma cor', 'um som']),
  mc('s-m03', 'Um evento é:', 'algo que acontece, como um toque', ['uma variável fixa', 'um erro de digitação']),
  mc('s-m04', '"processando <- verdadeiro" serve para:', 'lembrar que o app está ocupado', ['desligar o app', 'apagar o carrinho']),
  mc('s-m05', 'O aviso "Sem conexão" deve aparecer:', 'na tela, em texto', ['só como som', 'só como cor']),
  mc('s-m06', 'Quando a internet volta, o app deve:', 'avisar que voltou', ['não dizer nada', 'reiniciar o pedido']),
  mc('s-m07', 'Depurar é:', 'achar e corrigir a causa de um erro', ['apagar o código', 'trocar a cor']),
  mc('s-m08', 'Ao depurar, o melhor é mudar:', 'uma coisa por vez', ['tudo de uma vez', 'nada']),
  mc('s-m09', 'Um caso de teste é:', 'uma situação com resultado esperado', ['um tipo de erro', 'uma tela bonita']),
  mc('s-m10', 'Teste de regressão serve para ver se:', 'a correção quebrou outra parte', ['a tela é bonita', 'o app é rápido']),
  mc('s-m11', 'Entrada é o que:', 'chega ao programa', ['sai do programa', 'fica salvo']),
  mc('s-m12', 'Saída é o que:', 'o programa mostra ou devolve', ['a pessoa digita', 'o teclado faz']),
  mc('s-m13', 'Uma boa mensagem de erro diz:', 'o que houve e o que fazer', ['só "Erro"', 'um código secreto']),
  mc('s-m14', 'Timeout significa que:', 'a resposta demorou demais', ['a tela girou', 'a bateria acabou']),

  /* verdadeiro ou falso */
  tf('s-t01', 'Um estado guarda algo que o app lembra.', true),
  tf('s-t02', 'Um toque na tela é um evento.', true),
  tf('s-t03', 'Ao depurar, mude várias coisas de uma vez.', false),
  tf('s-t04', 'Sem conexão, o app pode ficar em branco sem avisar.', false),
  tf('s-t05', 'Salvar o carrinho no aparelho ajuda quando a rede cai.', true),
  tf('s-t06', 'Quem tocou duas vezes porque o app demorou é o culpado.', false),
  tf('s-t07', 'Texto na tela avisa quem não ouve.', true),
  tf('s-t08', 'Indicador de carregamento só girando basta para o leitor de tela.', false),
  tf('s-t09', 'Teste de regressão confere se uma correção quebrou outra parte.', true),
  tf('s-t10', 'Testar com pessoas reais mostra barreiras que o código não mostra.', true),
  tf('s-t11', 'Legenda em vídeo ajuda quem está sem som.', true),
  tf('s-t12', '"Erro" é uma boa mensagem para a pessoa.', false),
  tf('s-t13', 'Reproduzir o problema é o primeiro passo para achar a causa.', true),
  tf('s-t14', 'Tentar de novo várias vezes sem avisar pode confundir.', true),
  tf('s-t15', 'Timeout é quando a resposta chega rápido demais.', false),
  tf('s-t16', 'Botão pequeno pode prejudicar quem tem dificuldade motora.', true),

  /* o que aparece? */
  out('s-o01', ['processando <- falso', 'se processando == falso entao', '   processando <- verdadeiro', '   escreval("Adicionado")', 'senao', '   escreval("Aguarde")', 'fimse'], 'Adicionado', ['Aguarde', 'nada']),
  out('s-o02', ['processando <- verdadeiro', 'se processando == falso entao', '   processando <- verdadeiro', '   escreval("Adicionado")', 'senao', '   escreval("Aguarde")', 'fimse'], 'Aguarde', ['Adicionado', 'nada']),
  out('s-o03', ['qtd <- 0', 'qtd <- qtd + 1', 'qtd <- qtd + 1', 'escreval(qtd)'], '2', ['0', '1']),
  out('s-o04', ['online <- falso', 'se online entao', '   escreval("Enviando")', 'senao', '   escreval("Sem conexão. Tente de novo.")', 'fimse'], 'Sem conexão. Tente de novo.', ['Enviando', 'nada']),
  out('s-o05', ['tentativas <- 3', 'tentativas <- tentativas - 1', 'escreval(tentativas)'], '2', ['3', '4']),
  out('s-o06', ['espera <- 8', 'limite <- 5', 'se espera > limite entao', '   escreval("Timeout")', 'senao', '   escreval("OK")', 'fimse'], 'Timeout', ['OK', '8']),
  out('s-o07', ['salvo <- verdadeiro', 'se nao salvo entao', '   escreval("Perdeu dados")', 'senao', '   escreval("Dados salvos")', 'fimse'], 'Dados salvos', ['Perdeu dados', 'nada']),
  out('s-o08', ['carrinho <- 2', 'online <- verdadeiro', 'se carrinho > 0 e online entao', '   escreval("Finalizar")', 'senao', '   escreval("Aguardar")', 'fimse'], 'Finalizar', ['Aguardar', '2']),
  out('s-o09', ['x <- 10', 'x <- x / 2', 'escreval(x)'], '5', ['20', '12']),
  out('s-o10', ['audio <- falso', 'se audio entao', '   escreval("som")', 'fimse', 'escreval("tela: Pedido recebido")'], 'tela: Pedido recebido', ['som', 'nada']),

  /* complete */
  fix('s-f01', 'Lembrar que está ocupado.', ['processando <- ____'], 'verdadeiro', ['falso', '0']),
  fix('s-f02', 'Só aceitar se estiver livre.', ['se processando ____ falso entao', '   escreval("Adicionado")', 'fimse'], '==', ['<-', '>']),
  fix('s-f03', 'Aviso quando a rede cai.', ['se online == falso entao', '   escreval(____)', 'fimse'], '"Sem conexão. Tente de novo."', ['"Erro"', '""']),
  fix('s-f04', 'Diminuir as tentativas.', ['tentativas <- tentativas ____ 1'], '-', ['+', '==']),
  fix('s-f05', 'Detectar o timeout.', ['se espera ____ limite entao', '   escreval("Timeout")', 'fimse'], '>', ['<', '==']),
  fix('s-f06', 'Aviso na tela para todos.', ['escreval("tela: Pedido ", ____)'], 'estado', ['audio', '"som"']),
  fix('s-f07', 'Leitor fala só para quem usa.', ['se ____ entao', '   escreval("leitor: Pedido recebido")', 'fimse'], 'leitor', ['audio', 'nao leitor']),
  fix('s-f08', 'Fechar o bloco.', ['se online entao', '   escreval("Enviando")', '____'], 'fimse', ['senao', 'entao']),

  /* ache o erro */
  bug('s-b01', 'Meta: só somar quando estiver livre.', ['se processando == falso entao', '   quantidade <- quantidade + 1', 'senao', '   quantidade <- quantidade + 1', 'fimse'], 3),
  bug('s-b02', 'Meta: lembrar que ficou ocupado.', ['se processando == falso entao', '   processando <- falso', '   quantidade <- quantidade + 1', 'fimse'], 1),
  bug('s-b03', 'Meta: avisar quando a rede cair.', ['se online == falso entao', '   escreval("Erro")', 'fimse'], 1),
  bug('s-b04', 'Meta: timeout quando passar de 5 s.', ['limite <- 5', 'se espera < limite entao', '   escreval("Timeout")', 'fimse'], 1),
  bug('s-b05', 'Meta: aviso escrito para todos.', ['se audio entao', '   escreval("tela: Pedido recebido")', 'fimse'], 0),
  bug('s-b06', 'Meta: leitor anuncia uma vez só.', ['se leitor entao', '   escreval("leitor: Pedido recebido")', '   escreval("leitor: Pedido recebido")', 'fimse'], 2),
  bug('s-b07', 'Meta: guardar o total.', ['preco <- 20', 'total == preco * 2', 'escreval(total)'], 1),
  bug('s-b08', 'Meta: finalizar só com internet E carrinho.', ['se online ou carrinho > 0 entao', '   escreval("Finalizar")', 'fimse'], 0),

  /* ---- novas: escolha ---- */
  mc('s-m15', 'App ocupado e a pessoa toca de novo. O app deve:', 'ignorar o toque e avisar "Aguarde"', ['somar de novo', 'fechar o app']),
  mc('s-m16', 'Um "bug" é:', 'um erro no programa', ['um tipo de botão', 'uma cor']),
  mc('s-m17', 'Guardar dados no aparelho (cache) serve para:', 'usar sem rede', ['escurecer a tela', 'apagar o histórico']),
  mc('s-m18', 'Qual é um exemplo de estado?', 'online = falso', ['Toque no botão', 'Erro de digitação']),

  /* ---- novas: verdadeiro ou falso ---- */
  tf('s-t17', 'Um app pode funcionar parcialmente sem rede, quando possível.', true),
  tf('s-t18', 'Um registro (log) ajuda a descobrir o que houve antes do erro.', true),
  tf('s-t19', '"Algo deu errado" explica bem o que fazer.', false),
  tf('s-t20', 'Escrever "Carregando" na tela também ajuda o leitor de tela.', true),

  /* ---- novas: o que aparece? ---- */
  out('s-o11', ['carrinho <- 0', 'online <- verdadeiro', 'se carrinho > 0 e online entao', '   escreval("Finalizar")', 'senao', '   escreval("Carrinho vazio")', 'fimse'], 'Carrinho vazio', ['Finalizar', 'nada']),
  out('s-o12', ['tentativas <- 3', 'processando <- falso', 'se processando == falso entao', '   tentativas <- tentativas - 1', 'fimse', 'escreval(tentativas)'], '2', ['3', '1']),
  out('s-o13', ['espera <- 5', 'limite <- 5', 'se espera > limite entao', '   escreval("Timeout")', 'senao', '   escreval("OK")', 'fimse'], 'OK', ['Timeout', '5']),
  out('s-o14', ['qtd <- 1', 'qtd <- qtd * 3', 'qtd <- qtd + 2', 'escreval(qtd)'], '5', ['3', '9']),

  /* ---- novas: complete ---- */
  fix('s-f09', 'Avisar que vai tentar de novo.', ['se falhou e tentativas > 0 entao', '   tentativas <- tentativas - 1', '   escreval(____)', 'fimse'], '"Tentando de novo..."', ['"Erro"', '""']),
  fix('s-f10', 'Terminou: app livre de novo.', ['processando <- ____'], 'falso', ['verdadeiro', '0']),

  /* ---- novas: ache o erro ---- */
  bug('s-b09', 'Meta: avisar quando a internet voltar.', ['se online entao', '   escreval("Sem conexão")', 'fimse'], 1),
  bug('s-b10', 'Meta: diminuir as tentativas.', ['tentativas <- 3', 'tentativas <- tentativas + 1', 'escreval(tentativas)'], 1),

  /* ---- novas: ordene ---- */
  order('s-r01', 'Rede caiu: ordem certa.', ['Detectar que ficou offline', 'Mostrar aviso na tela', 'Guardar o carrinho no aparelho', 'Reenviar quando voltar']),
  order('s-r02', 'Ordem de um toque seguro.', ['Receber o toque', 'Marcar processando', 'Fazer a ação', 'Liberar de novo']),
  order('s-r03', 'Ordem da depuração.', ['Reproduzir o erro', 'Achar a causa', 'Corrigir', 'Rodar a regressão']),
  order('s-r04', 'Monte o bloqueio de toque duplo.', ['se processando == falso entao', '   processando <- verdadeiro', '   escreval("Adicionado")', 'fimse']),
  order('s-r05', 'Monte o timeout.', ['limite <- 5', 'espera <- 8', 'se espera > limite entao', '   escreval("Timeout")', 'fimse']),
  order('s-r06', 'Pedido sem rede: ordem certa.', ['Tocar em Pedir', 'Sem conexão: salvar rascunho', 'Rede volta', 'Enviar o pedido']),
  order('s-r07', 'Monte a contagem.', ['tentativas <- 3', 'tentativas <- tentativas - 1', 'escreval(tentativas)']),
  order('s-r08', 'Ordem de um teste.', ['Definir o caso de teste', 'Executar', 'Comparar com o esperado', 'Anotar o resultado']),

  /* ---- novas: intruso ---- */
  odd('s-i01', 'Qual NÃO é um evento?', ['Toque no botão', 'Rede caiu', 'Tempo esgotou', 'processando = verdadeiro'], 'processando = verdadeiro'),
  odd('s-i02', 'Qual NÃO é um estado?', ['online = falso', 'carrinho = 3', 'processando = verdadeiro', 'Toque no botão'], 'Toque no botão'),
  odd('s-i03', 'Qual NÃO é passo de depuração?', ['Reproduzir o erro', 'Achar a causa', 'Testar de novo', 'Apagar o teste'], 'Apagar o teste'),
  odd('s-i04', 'Qual NÃO ajuda quem está sem som?', ['Legenda', 'Texto na tela', 'Aviso visual', 'Aviso só em áudio'], 'Aviso só em áudio'),
  odd('s-i05', 'Qual NÃO é boa prática de erro?', ['Dizer o que houve', 'Dizer o que fazer', 'Culpar a pessoa', 'Dar outra opção'], 'Culpar a pessoa'),
  odd('s-i06', 'Qual NÃO é uma saída?', ['Texto na tela', 'Som de aviso', 'Vibração', 'Toque na tela'], 'Toque na tela'),
  odd('s-i07', 'Qual NÃO é uma entrada?', ['Teclado', 'Toque', 'Voz', 'Mensagem na tela'], 'Mensagem na tela'),
  odd('s-i08', 'Qual NÃO é causa comum de timeout?', ['Rede lenta', 'Servidor ocupado', 'Resposta demorada', 'Tela bonita'], 'Tela bonita'),

  /* ---- novas: decisão rápida ---- */
  dec('s-d01', 'Rede caiu no pagamento. Você:', 'Avisa e guarda o pedido', 'Fecha o app'),
  dec('s-d02', 'Toque duplo em "Pedir". Você:', 'Ignora o 2º e avisa "Aguarde"', 'Soma o pedido duas vezes'),
  dec('s-d03', 'Voz ambígua. Você:', 'Pergunta e mostra botões', 'Adivinha'),
  dec('s-d04', 'Corrigiu o bug. Você:', 'Roda o teste de regressão', 'Libera sem testar'),
  dec('s-d05', 'Vai depurar. Você muda:', 'Uma coisa por vez', 'Tudo de uma vez'),
  dec('s-d06', 'A internet voltou. Você:', 'Avisa na tela', 'Fica em silêncio'),
  dec('s-d07', 'Carregando... o leitor de tela:', 'Anuncia uma vez', 'Repete sem parar'),
  dec('s-d08', 'Aviso do pedido só em som. Você:', 'Adiciona texto na tela', 'Aumenta o volume'),
  dec('s-d09', 'Resposta em 9 s, limite de 5 s:', 'Timeout', 'OK'),
  dec('s-d10', 'Guardar o carrinho no aparelho serve para:', 'não perder dados sem rede', 'deixar o app bonito'),
  dec('s-d11', 'Quer achar a causa do erro. Primeiro:', 'Reproduz o problema', 'Apaga o código'),
  dec('s-d12', 'Botão pequeno e pessoa com tremor. Você:', 'Aumenta a área de toque', 'Pede para ter cuidado'),
]

/* ------------------------------------------------------------------ */
/*  GERADORES · perguntas novas a cada partida (números sorteados)     */
/* ------------------------------------------------------------------ */
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1))
const pick = (arr) => arr[rnd(0, arr.length - 1)]
const num = (n) => String(n).replace('.', ',')

function distinct(correct, extras) {
  const out = []
  ;[...extras].forEach((v) => {
    const s = String(v)
    if (s !== String(correct) && !out.includes(s) && out.length < 2) out.push(s)
  })
  let k = 1
  while (out.length < 2) {
    const s = String(Number(correct) + k * 10)
    if (s !== String(correct) && !out.includes(s)) out.push(s)
    k++
  }
  return out
}

/** "Com total = 180, 'total > 200' é...?" */
function genCompare() {
  const v = pick(['total', 'estoque', 'pontos'])
  const thr = rnd(2, 30) * 10
  const val = Math.random() < 0.4 ? thr : thr + pick([-30, -10, 10, 30])
  const op = pick(['>', '<', '>=', '<=', '=='])
  const r = { '>': val > thr, '<': val < thr, '>=': val >= thr, '<=': val <= thr, '==': val === thr }[op]
  return { id: `g-cmp-${v}-${val}-${op}-${thr}`, t: 'tf', q: `Com ${v} = ${val}, "${v} ${op} ${thr}" é verdadeiro.`, a: r }
}

/** e / ou com estoque e pagamento. */
function genLogic() {
  const est = pick([0, 5])
  const pago = pick([true, false])
  const op = pick(['e', 'ou'])
  const r = op === 'e' ? est > 0 && pago : est > 0 || pago
  return {
    id: `g-log-${est}-${pago}-${op}`,
    t: 'tf',
    q: `Com estoque ${est} e pagamento ${pago ? 'aprovado' : 'recusado'}, "estoque > 0 ${op} pagamento_aprovado" é verdadeiro.`,
    a: r,
  }
}

/** Conta com desconto: quanto vale o total no final? */
function genCalc() {
  const P = rnd(1, 8) * 5
  const Q = rnd(2, 6)
  const T = rnd(6, 15) * 10
  const D = rnd(1, 3) * 10
  const bruto = P * Q
  const final = bruto > T ? bruto - D : bruto
  const alts = distinct(final, [bruto, bruto + D, final + D, final - D])
  return {
    id: `g-calc-${P}-${Q}-${T}-${D}`,
    t: 'code',
    q: 'Quanto vale o total no final?',
    code: [`preco <- ${P}`, `qtd <- ${Q}`, 'total <- preco * qtd', `se total > ${T} entao`, `   total <- total - ${D}`, 'fimse', 'escreval(total)'],
    a: String(final),
    w: alts,
  }
}

/** Acessibilidade: fonte, botão e contraste. */
function genAccess() {
  const kind = pick(['fonte', 'botao', 'contraste'])
  if (kind === 'fonte') {
    const n = pick([12, 14, 16, 17, 18, 20, 24, 32])
    return { id: `g-acc-f${n}`, t: 'tf', q: `Preço com fonte ${n}: legível para baixa visão (mínimo 18).`, a: n >= 18 }
  }
  if (kind === 'botao') {
    const n = pick([30, 36, 40, 43, 44, 48, 56])
    return { id: `g-acc-b${n}`, t: 'tf', q: `Botão de ${n} px de altura: bom para tocar (mínimo 44).`, a: n >= 44 }
  }
  const r = pick([1.8, 2.5, 3.1, 4.0, 4.5, 5.2, 7.0])
  return { id: `g-acc-c${r}`, t: 'tf', q: `Contraste ${num(r)}:1 em texto normal: passa no AA (mínimo 4,5:1).`, a: r >= 4.5 }
}

/** Timeout: demorou mais que o limite? */
function genTimeout() {
  const l = rnd(2, 8)
  const e = pick([l - 1, l + 1, l + 2, l - 2, l + 4].filter((x) => x > 0 && x !== l))
  return { id: `g-to-${e}-${l}`, t: 'tf', q: `Resposta em ${e} s e limite de ${l} s: houve timeout.`, a: e > l }
}

/** Tentativas: o que sobra depois de falhar K vezes? */
function genRetry() {
  const N = rnd(4, 9)
  const K = rnd(1, 3)
  const code = [`tentativas <- ${N}`]
  for (let i = 0; i < K; i++) code.push('tentativas <- tentativas - 1')
  code.push('escreval(tentativas)')
  const final = N - K
  return {
    id: `g-try-${N}-${K}`,
    t: 'code',
    q: 'Quantas tentativas sobram?',
    code,
    a: String(final),
    w: distinct(final, [N, final + 1, final - 1]),
  }
}

export const BANKS = {
  vale1: { items: PLANTAO, gens: [genCompare, genLogic, genCalc] },
  vale2: { items: SEM_REDE, gens: [genAccess, genTimeout, genRetry] },
}