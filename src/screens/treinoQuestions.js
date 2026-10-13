/**
 * Banco do Treino sem rede (Vale do Silêncio · vale2).
 *
 * Trilha de 19 degraus, do "nunca vi programação" até listas, pilhas, filas e árvores,
 * seguindo a ordem dos cursos de C usados como referência (MC202/Unicamp, Curso de C/UFSC-UFMG, APC).
 * Todas as perguntas e explicações são originais.
 *
 * Cada pergunta tem uma MECÂNICA de resolução diferente:
 *   mc     escolha                    tf     verdadeiro ou falso
 *   num    digite o número (teclado)  fill   complete a lacuna com peças
 *   build  monte a linha com peças    order  ponha as linhas na ordem
 *   bug    toque na linha com erro    match  ligue os pares
 *   cells  toque na posição certa do vetor
 *
 * Dentro de cada degrau as perguntas estão em ordem crescente de dificuldade (d = 1..3).
 * `e` = explicação mostrada depois de responder.
 * Para adicionar: coloque uma linha no degrau certo. O id e a dificuldade são gerados sozinhos.
 */

/* --------------------------- degraus (aulas-relâmpago) --------------------------- */
export const STAGES = [
  {
    title: 'Primeiro contato',
    icon: 'sparkles',
    src: 'Curso de C · aulas 1-2 · MC202 · unid. 2',
    lesson: [
      'Um programa é uma lista de instruções que o computador segue, na ordem.',
      'Em C, tudo começa na função main. O que está entre { e } roda de cima para baixo.',
      'printf escreve na tela. Cada instrução termina com ponto e vírgula (;).',
    ],
    example: ['#include <stdio.h>', 'int main() {', '    printf("Ola!");', '    return 0;', '}'],
  },
  {
    title: 'Variáveis e tipos',
    icon: 'cube',
    src: 'Curso de C · aula 3 · MC202 · unid. 2',
    lesson: [
      'Uma variável é uma caixinha com nome que guarda um valor.',
      'Em C você declara o tipo: int (inteiro), float (com vírgula) e char (um caractere).',
      'O sinal = guarda o valor da direita na variável da esquerda.',
    ],
    example: ['int idade = 16;', 'float nota = 8.5;', "char letra = 'A';"],
  },
  {
    title: 'Contas e operadores',
    icon: 'calculator',
    src: 'Curso de C · aula 3 · MC202 · unid. 3',
    lesson: [
      'Operadores: + - * / e % (resto da divisão). Multiplicação e divisão vêm antes de soma e subtração.',
      'Com dois int, a divisão é inteira: 7 / 2 vale 3 (a parte decimal some).',
      '% dá o resto: 7 % 2 vale 1. x++ soma 1 em x.',
    ],
    example: ['int a = 7;', 'printf("%d", a / 2); // 3', 'printf("%d", a % 2); // 1'],
  },
  {
    title: 'Entrada e saída',
    icon: 'keypad',
    src: 'Curso de C · aula 9 · MC202 · unid. 2',
    lesson: [
      'printf escreve; scanf lê o que a pessoa digita.',
      '%d é para int, %f para float, %c para char e %s para texto.',
      'No scanf, use & antes da variável: scanf("%d", &idade);',
    ],
    example: ['int idade;', 'scanf("%d", &idade);', 'printf("Voce tem %d anos", idade);'],
  },
  {
    title: 'Decisões',
    icon: 'git-branch',
    src: 'Curso de C · aula 4 · MC202 · unid. 2',
    lesson: [
      'if executa um bloco só se a condição for verdadeira; else, se for falsa.',
      'Compare com == (igual), != (diferente), <, >, <=, >=. Cuidado: = guarda valor, == compara.',
      '&& significa E, || significa OU, ! significa NÃO.',
    ],
    example: ['if (nota >= 6) {', '    printf("Passou");', '} else {', '    printf("Recuperacao");', '}'],
  },
  {
    title: 'Repetição: while',
    icon: 'repeat',
    src: 'Curso de C · aula 4 · MC202 · unid. 3',
    lesson: [
      'while repete um bloco enquanto a condição for verdadeira.',
      'Use um contador que muda dentro do laço, senão ele nunca termina.',
      'Acumulador: uma variável que vai somando a cada volta.',
    ],
    example: ['int i = 1;', 'while (i <= 3) {', '    printf("%d ", i);', '    i++;', '}'],
  },
  {
    title: 'Repetição: for',
    icon: 'sync',
    src: 'Curso de C · aula 4 · MC202 · unid. 3',
    lesson: [
      'for junta num só lugar: começo; condição; passo.',
      'for (i = 0; i < 3; i++) repete 3 vezes: i vale 0, 1 e 2.',
      'break sai do laço; continue pula para a próxima volta; do-while testa depois (roda ao menos 1 vez).',
    ],
    example: ['for (int i = 0; i < 3; i++) {', '    printf("%d ", i);', '}'],
  },
  {
    title: 'Vetores',
    icon: 'grid',
    src: 'Curso de C · aula 5 · MC202 · unid. 10',
    lesson: [
      'Um vetor guarda vários valores do mesmo tipo: int v[4];',
      'Os índices começam em 0: o primeiro é v[0] e o último de 4 posições é v[3].',
      'Acessar fora do vetor (v[4]) é erro: o C não avisa e pode estragar a memória.',
    ],
    example: ['int v[4] = {10, 20, 30, 40};', 'printf("%d", v[2]); // 30'],
  },
  {
    title: 'Textos (strings)',
    icon: 'text',
    src: 'Curso de C · aula 5 · MC202 · unid. 4',
    lesson: [
      "Texto em C é um vetor de char que termina com '\\0'.",
      'char nome[10] = "Ana"; guarda A, n, a e o \'\\0\' final.',
      'strlen conta as letras (sem o \'\\0\'); strcmp compara textos e devolve 0 se forem iguais.',
    ],
    example: ['char nome[10] = "Ana";', 'printf("%s", nome);', 'printf("%d", strlen(nome)); // 3'],
  },
  {
    title: 'Funções',
    icon: 'construct',
    src: 'Curso de C · aula 7 · MC202 · unid. 4',
    lesson: [
      'Função é um bloco com nome que faz uma tarefa e pode devolver um valor com return.',
      'int dobro(int x) { return x * 2; } recebe um int e devolve um int.',
      'Os parâmetros são cópias: mudar o parâmetro dentro da função não muda a variável de fora.',
    ],
    example: ['int dobro(int x) {', '    return x * 2;', '}', '// dobro(4) vale 8'],
  },
  {
    title: 'Ponteiros',
    icon: 'locate',
    src: 'Curso de C · aula 6 · MC202 · unid. 6',
    lesson: [
      'Todo valor mora num endereço da memória. & pega o endereço; * acessa o que está nele.',
      'int *p = &x; faz p guardar o endereço de x. Então *p é o próprio x.',
      'Passando o endereço, uma função consegue mudar a variável de fora.',
    ],
    example: ['int x = 5;', 'int *p = &x;', '*p = 8;   // x agora vale 8'],
  },
  {
    title: 'Structs',
    icon: 'albums',
    src: 'Curso de C · aula 11 · MC202 · unid. 5',
    lesson: [
      'struct agrupa variáveis de tipos diferentes numa só.',
      'Acesse os campos com ponto: aluno.nota. Com ponteiro, use seta: p->nota.',
      'typedef dá um apelido ao tipo, para não repetir a palavra struct.',
    ],
    example: ['struct Aluno {', '    char nome[20];', '    float nota;', '};', 'struct Aluno a = {"Ana", 9.0};'],
  },
  {
    title: 'Memória dinâmica',
    icon: 'server',
    src: 'MC202 · unid. 7 e 28',
    lesson: [
      'malloc reserva memória enquanto o programa roda e devolve um endereço.',
      'Toda memória reservada com malloc deve ser devolvida com free, senão há vazamento.',
      'Sempre confira se malloc devolveu NULL (sem memória).',
    ],
    example: ['int *v = malloc(3 * sizeof(int));', 'v[0] = 7;', 'free(v);'],
  },
  {
    title: 'Recursão',
    icon: 'infinite',
    src: 'MC202 · unid. 8',
    lesson: [
      'Recursão: uma função que chama a si mesma com um problema menor.',
      'Precisa de um caso base (quando para) e de um passo recursivo.',
      'Sem caso base, a recursão não termina e a pilha de chamadas estoura.',
    ],
    example: ['int fat(int n) {', '    if (n <= 1) return 1;     // caso base', '    return n * fat(n - 1);   // passo recursivo', '}'],
  },
  {
    title: 'Eficiência',
    icon: 'speedometer',
    src: 'MC202 · unid. 9',
    lesson: [
      'Medimos a eficiência pelo quanto o trabalho cresce quando a entrada cresce.',
      'O(1): sempre o mesmo trabalho. O(n): cresce junto com n. O(n²): dois laços aninhados.',
      'Se a entrada dobra e o trabalho quadruplica, o algoritmo é quadrático.',
    ],
    example: ['for (i = 0; i < n; i++)       // O(n)', '    for (j = 0; j < n; j++)   // O(n²) no total', '        trabalho();'],
  },
  {
    title: 'Busca e ordenação',
    icon: 'swap-vertical',
    src: 'MC202 · unid. 19 a 21',
    lesson: [
      'Busca linear olha um por um. Busca binária exige vetor ordenado e corta o espaço pela metade a cada passo.',
      'Bubble sort troca vizinhos fora de ordem; selection sort põe o menor no começo; insertion sort encaixa cada elemento na parte já ordenada.',
      'Mergesort e quicksort dividem o problema: são bem mais rápidos em vetores grandes.',
    ],
    example: ['// busca binária em v[ini..fim]', 'meio = (ini + fim) / 2;', 'if (v[meio] == x) achou();'],
  },
  {
    title: 'Listas ligadas',
    icon: 'link',
    src: 'MC202 · unid. 11 e 12',
    lesson: [
      'Lista ligada: nós espalhados na memória, cada um aponta para o próximo.',
      'struct No { int valor; struct No *prox; }; O último nó aponta para NULL.',
      'Para percorrer: p = lista; while (p != NULL) { ...; p = p->prox; }',
    ],
    example: ['struct No {', '    int valor;', '    struct No *prox;', '};'],
  },
  {
    title: 'Pilhas e filas',
    icon: 'layers',
    src: 'MC202 · unid. 13 e 14',
    lesson: [
      'Pilha (LIFO): o último a entrar é o primeiro a sair. Operações: push (empilha) e pop (desempilha).',
      'Fila (FIFO): o primeiro a entrar é o primeiro a sair. Operações: enqueue (entra no fim) e dequeue (sai do começo).',
      'Pilhas servem para desfazer ações e conferir parênteses; filas, para atender por ordem de chegada.',
    ],
    example: ['push(1); push(2); push(3);', 'pop();   // devolve 3', '// fila: enqueue 1,2,3 -> dequeue devolve 1'],
  },
  {
    title: 'Árvores',
    icon: 'leaf',
    src: 'MC202 · unid. 15 e 16',
    lesson: [
      'Árvore: nós ligados em hierarquia. O nó de cima é a raiz; nós sem filhos são folhas.',
      'Árvore binária: cada nó tem no máximo 2 filhos (esquerdo e direito).',
      'Árvore binária de busca: à esquerda ficam os valores menores, à direita os maiores.',
    ],
    example: ['        8', '      /   \\', '     3     10', '    / \\', '   1   6'],
  },
]

/* ------------------------------ construtores ------------------------------ */
const mc = (q, a, w, e, code) => ({ t: 'mc', q, a, w, e, code })
const tf = (q, a, e, code) => ({ t: 'tf', q, a, e, code })
const num = (q, code, a, e) => ({ t: 'num', q, code, a: String(a), e })
const fill = (q, code, a, bank, e) => ({ t: 'fill', q, code, a, bank, e })
const build = (q, tokens, extra, e) => ({ t: 'build', q, tokens, extra, e })
const order = (q, lines, e) => ({ t: 'order', q, lines, e })
const bug = (q, code, a, e) => ({ t: 'bug', q, code, a, e })
const match = (q, pairs, e) => ({ t: 'match', q, pairs, e })
const cells = (q, items, a, e) => ({ t: 'cells', q, cells: items, a, e })

const BY_STAGE = [
  /* 0 · Primeiro contato */
  [
    mc('O que é um algoritmo?', 'Uma sequência de passos para resolver um problema', ['Um tipo de computador', 'Um erro do programa'], 'Receita de bolo é um algoritmo: passos claros, em ordem.'),
    mc('Para que serve o compilador?', 'Traduz o código C para a linguagem da máquina', ['Corrige os erros sozinho', 'Desenha a tela do app'], 'O computador só entende código de máquina. O compilador traduz e avisa erros de sintaxe.'),
    tf('Todo programa em C começa a rodar pela função main.', true, 'É a porta de entrada: o computador procura a main e começa por ela.'),
    mc('O que aparece na tela?', 'Oi', ['"Oi"', 'printf'], 'As aspas só marcam onde o texto começa e termina; elas não aparecem.', ['printf("Oi");']),
    bug('Qual linha tem erro?', ['int main() {', '    printf("Oi")', '    return 0;', '}'], 1, 'Falta o ponto e vírgula no fim do printf.'),
    mc('Como o texto aparece na tela?', 'A e B em linhas separadas', ['AB na mesma linha', 'Só o A'], '\\n é a quebra de linha: o que vem depois vai para a linha de baixo.', ['printf("A\\nB");']),
    fill('Complete para escrever Ola na tela.', ['____("Ola");'], ['printf'], ['scanf', 'print'], 'printf é o comando que escreve na tela.'),
    build('Monte a instrução que escreve Tchau.', ['printf', '(', '"Tchau"', ')', ';'], ['scanf', '{'], 'Nome do comando, parênteses com o texto entre aspas e ponto e vírgula no fim.'),
    order('Monte o programa mínimo.', ['#include <stdio.h>', 'int main() {', '    printf("Oi");', '    return 0;', '}'], 'Primeiro a biblioteca, depois a main, com as instruções dentro das chaves.'),
    match('Ligue cada peça ao que ela faz.', [['main', 'Onde o programa começa'], ['printf', 'Escreve na tela'], [';', 'Termina uma instrução'], ['{ }', 'Delimitam um bloco']], 'Estas quatro peças aparecem em todo programa em C.'),
  ],
  /* 1 · Variáveis e tipos */
  [
    mc('Qual tipo guarda o valor 42?', 'int', ['float', 'char'], 'int guarda números inteiros.'),
    mc('Qual tipo guarda o valor 3.14?', 'float', ['int', 'char'], 'float guarda números com parte decimal.'),
    tf('int x = 5; guarda o valor 5 na variável x.', true, 'O = copia o valor da direita para a variável da esquerda.'),
    mc('Qual é um nome de variável válido?', 'total_2', ['2total', 'meu total'], 'Nome não começa com número e não tem espaço.'),
    mc('Qual linha declara um char corretamente?', "char c = 'x';", ['char c = "x";', 'char c = xx;'], 'Um caractere usa aspas simples. Aspas duplas são para texto.'),
    fill('Declare uma variável inteira.', ['____ idade = 17;'], ['int'], ['float', 'char'], 'Idade inteira: int.'),
    num('Qual o valor de b no final?', ['int a = 4;', 'int b = a;', 'a = 9;'], 4, 'b copiou o valor de a quando a valia 4. Mudar a depois não altera b.'),
    order('Declare, mude e mostre a variável.', ['int pontos = 0;', 'pontos = 10;', 'printf("%d", pontos);'], 'A variável precisa existir antes de ser usada.'),
    num('Qual o valor final de x?', ['int x = 3;', 'x = x + 2;', 'x = x * 2;'], 10, 'Primeiro x vira 5 e depois 10. O lado direito usa o valor antigo de x.'),
    match('Ligue o tipo ao que ele guarda.', [['int', 'Número inteiro'], ['float', 'Número com vírgula'], ['char', 'Um caractere'], ['=', 'Guarda um valor']], 'Escolher o tipo certo evita erros e economiza memória.'),
  ],
  /* 2 · Contas e operadores */
  [
    num('O que aparece na tela?', ['printf("%d", 7 / 2);'], 3, 'Divisão de inteiros descarta a parte decimal.'),
    num('O que aparece na tela?', ['printf("%d", 7 % 2);'], 1, '% dá o resto da divisão: 7 = 3 × 2 + 1.'),
    mc('Qual operador dá o resto da divisão?', '%', ['/', '&'], 'O % é o "módulo": devolve o que sobra.'),
    num('O que aparece na tela?', ['printf("%d", 2 + 3 * 4);'], 14, 'A multiplicação vem antes: 3 × 4 = 12, mais 2.'),
    num('O que aparece na tela?', ['printf("%d", (2 + 3) * 4);'], 20, 'Parênteses mudam a ordem: 5 × 4.'),
    tf('Em C, 10 / 4 com inteiros vale 2.5.', false, 'Com int, vale 2. Para ter 2.5 pelo menos um lado precisa ser float.'),
    num('Qual o valor de x no final?', ['int x = 5;', 'x++;', 'x++;'], 7, 'Cada x++ soma 1.'),
    fill('Guarde em resto o resto de 17 por 5.', ['int resto = 17 ____ 5;'], ['%'], ['/', '*'], '17 = 3 × 5 + 2, então o resto é 2.'),
    build('Monte a linha que soma 1 em x.', ['x', '=', 'x', '+', '1', ';'], ['==', '-'], 'Lê-se: x recebe o valor antigo de x mais 1.'),
    num('Qual o valor de c?', ['int a = 10, b = 3;', 'int c = a / b + a % b;'], 4, '10 / 3 = 3 e 10 % 3 = 1. Somando: 4.'),
    mc('Qual condição testa se n é par?', 'n % 2 == 0', ['n / 2 == 0', 'n * 2 == 0'], 'Número par deixa resto 0 quando dividido por 2.'),
  ],
  /* 3 · Entrada e saída */
  [
    mc('Qual formato imprime um int?', '%d', ['%f', '%c'], '%d vem de "decimal".'),
    mc('Qual formato imprime um float?', '%f', ['%d', '%s'], '%f é para números com parte decimal.'),
    tf('scanf mostra texto na tela.', false, 'scanf lê o que a pessoa digita. Quem mostra é o printf.'),
    num('O que aparece na tela?', ['int n = 5;', 'printf("%d", n * 2);'], 10, 'O %d é trocado pelo valor de n * 2.'),
    fill('Complete a leitura.', ['int n;', 'scanf("%d", ____n);'], ['&'], ['*', '#'], 'scanf precisa do endereço da variável, por isso o &.'),
    bug('Qual linha tem erro?', ['int idade;', 'scanf("%d", idade);', 'printf("%d", idade);'], 1, 'Falta o & antes de idade.'),
    mc('O que aparece na tela?', '3+4', ['7', 'a+b'], 'Cada %d é trocado pelo valor seguinte, na ordem. O + é só texto.', ['int a = 3, b = 4;', 'printf("%d+%d", a, b);']),
    build('Monte a leitura de um int chamado x.', ['scanf', '(', '"%d"', ',', '&', 'x', ')', ';'], ['printf', '*'], 'Formato entre aspas, vírgula e o endereço da variável.'),
    order('Programa que lê e mostra.', ['int x;', 'scanf("%d", &x);', 'printf("%d", x);'], 'Declarar, ler, usar.'),
    match('Ligue o formato ao tipo.', [['%d', 'int'], ['%f', 'float'], ['%c', 'char'], ['%s', 'Texto']], 'O formato diz ao printf como interpretar o valor.'),
  ],
  /* 4 · Decisões */
  [
    mc('Qual operador compara igualdade?', '==', ['=', '=>'], 'Um = guarda valor; dois == comparam.'),
    tf('if (x = 5) compara x com 5.', false, 'x = 5 guarda 5 em x. Para comparar, use ==.'),
    mc('O que aparece na tela?', 'B', ['A', 'AB'], '7 > 10 é falso, então roda o else.', ['int n = 7;', 'if (n > 10) printf("A");', 'else printf("B");']),
    num('Qual o valor final de x?', ['int x = 8;', 'if (x % 2 == 0) x = x / 2;', 'else x = x * 3;'], 4, '8 é par, então x vira 8 / 2 = 4.'),
    mc('O que aparece na tela?', 'N', ['S', 'SN'], '&& exige as duas verdadeiras e b > 3 é falso.', ['int a = 5, b = 0;', 'if (a > 3 && b > 3) printf("S");', 'else printf("N");']),
    tf('A condição (a > 3 || b > 3) é verdadeira?', true, '|| basta uma verdadeira: a > 3 é verdadeiro.', ['int a = 5, b = 0;']),
    bug('Qual linha tem erro?', ['int idade = 18;', 'if (idade = 18) {', '    printf("Maior");', '}'], 1, 'Dentro do if use == para comparar.'),
    fill('Complete o else.', ['if (nota >= 6) {', '    printf("Passou");', '} ____ {', '    printf("Estude mais");', '}'], ['else'], ['elif', 'then'], 'else cobre o caso em que o if é falso.'),
    order('Monte o if/else.', ['if (x > 0) {', '    printf("positivo");', '} else {', '    printf("nao positivo");', '}'], 'if, bloco, else, bloco.'),
    num('Qual o valor final de r?', ['int n = 15;', 'int r = 0;', 'if (n > 10) r = r + 1;', 'if (n > 12) r = r + 1;', 'if (n > 20) r = r + 1;'], 2, 'Cada if é avaliado separadamente: os dois primeiros são verdadeiros.'),
    mc('Qual condição testa se n está entre 1 e 10 (inclusive)?', 'n >= 1 && n <= 10', ['n >= 1 || n <= 10', '1 <= n <= 10'], 'Em C escreva as duas comparações e una com &&.'),
  ],
  /* 5 · while */
  [
    mc('O que aparece na tela?', '1 2 3', ['1 2 3 4', '0 1 2'], 'i começa em 1 e o laço roda enquanto i <= 3.', ['int i = 1;', 'while (i <= 3) {', '    printf("%d ", i);', '    i++;', '}']),
    num('Qual o valor de i ao sair do laço?', ['int i = 0;', 'while (i < 5) i++;'], 5, 'O laço para quando i < 5 fica falso, ou seja, quando i chega a 5.'),
    tf('while (1) { } sem break repete para sempre.', true, 'A condição 1 é sempre verdadeira.'),
    mc('Falta uma linha dentro do laço. Qual a causa do problema?', 'Falta i++ para mudar o contador', ['O printf está errado', 'O while não aceita <='], 'Sem mudar i, a condição nunca fica falsa: laço infinito.', ['int i = 1;', 'while (i <= 3) {', '    printf("%d", i);', '}']),
    num('Qual o valor de s?', ['int s = 0, i = 1;', 'while (i <= 4) {', '    s = s + i;', '    i++;', '}'], 10, '1 + 2 + 3 + 4 = 10. Isso é um acumulador.'),
    fill('Complete para imprimir três asteriscos.', ['int i = 0;', 'while (i < 3) {', '    printf("*");', '    ____;', '}'], ['i++'], ['i--', 'i == 3'], 'i precisa aumentar para o laço terminar.'),
    mc('Quantas vezes imprime x?', 'Nenhuma', ['3 vezes', 'Infinitas'], 'A condição já começa falsa, então o laço nem entra.', ['int i = 5;', 'while (i < 3) {', '    printf("x");', '}']),
    build('Monte o começo de um laço que repete enquanto i < 10.', ['while', '(', 'i', '<', '10', ')', '{'], ['if', '>'], 'while, condição entre parênteses e abre chave.'),
    order('Monte uma contagem regressiva.', ['int i = 3;', 'while (i > 0) {', '    printf("%d ", i);', '    i--;', '}'], 'Começa em 3 e diminui até chegar a 0.'),
    num('Qual o valor de c?', ['int n = 20, c = 0;', 'while (n > 1) {', '    n = n / 2;', '    c++;', '}'], 4, '20 → 10 → 5 → 2 → 1: foram 4 divisões.'),
  ],
  /* 6 · for */
  [
    mc('O que aparece na tela?', '0 1 2', ['1 2 3', '0 1 2 3'], 'i começa em 0 e o laço roda enquanto i < 3.', ['for (int i = 0; i < 3; i++) {', '    printf("%d ", i);', '}']),
    mc('Quantas vezes roda for (i = 0; i < 10; i++)?', '10', ['9', '11'], 'i vale 0, 1, 2, ..., 9: são 10 valores.'),
    num('Qual o valor de s?', ['int s = 0;', 'for (int i = 1; i <= 5; i++)', '    s += i;'], 15, '1+2+3+4+5. O += soma ao valor atual.'),
    num('Qual o valor de c?', ['int c = 0;', 'for (int i = 0; i < 10; i += 2)', '    c++;'], 5, 'i vale 0, 2, 4, 6 e 8.'),
    fill('Complete para imprimir 0123.', ['for (int i = 0; i ____ 4; i++) {', '    printf("%d", i);', '}'], ['<'], ['>', '=='], 'Roda enquanto i < 4.'),
    mc('O que aparece na tela?', '12', ['1245', '123'], 'break sai do laço quando i chega a 3.', ['for (int i = 1; i <= 5; i++) {', '    if (i == 3) break;', '    printf("%d", i);', '}']),
    mc('O que aparece na tela?', '1245', ['12', '12345'], 'continue pula só a volta em que i vale 3.', ['for (int i = 1; i <= 5; i++) {', '    if (i == 3) continue;', '    printf("%d", i);', '}']),
    tf('do-while executa o bloco pelo menos uma vez.', true, 'Ele testa a condição depois de executar.'),
    build('Monte o cabeçalho de um for de 0 a 9.', ['for', '(', 'int', 'i', '=', '0', ';', 'i', '<', '10', ';', 'i', '++', ')'], ['while', '--'], 'Começo; condição; passo.'),
    order('Monte um for que soma de 1 a 3.', ['int s = 0;', 'for (int i = 1; i <= 3; i++) {', '    s += i;', '}'], 'O acumulador começa em 0 antes do laço.'),
    num('Qual o valor de c?', ['int c = 0;', 'for (int i = 0; i < 3; i++)', '    for (int j = 0; j < 4; j++)', '        c++;'], 12, 'Laço dentro de laço: 3 × 4 voltas.'),
  ],
  /* 7 · Vetores */
  [
    cells('Toque no elemento v[2].', ['10', '20', '30', '40'], 2, 'Os índices começam em 0: v[0], v[1], v[2]...'),
    mc('Em int v[5], qual é o último índice válido?', '4', ['5', '1'], 'Cinco posições: índices 0 a 4.'),
    num('O que aparece na tela?', ['int v[3] = {4, 7, 9};', 'printf("%d", v[0] + v[2]);'], 13, 'v[0] = 4 e v[2] = 9.'),
    tf('v[5] é um acesso válido em int v[5].', false, 'Os índices vão de 0 a 4. v[5] está fora do vetor.'),
    cells('Toque no maior valor.', ['3', '9', '5', '2'], 1, 'O maior é 9, que está no índice 1.'),
    num('Qual o valor de s?', ['int v[4] = {2, 4, 6, 8};', 'int s = 0;', 'for (int i = 0; i < 4; i++)', '    s += v[i];'], 20, '2 + 4 + 6 + 8.'),
    bug('Qual linha tem erro?', ['int v[3] = {1, 2, 3};', 'for (int i = 0; i <= 3; i++)', '    printf("%d", v[i]);'], 1, 'i <= 3 chega a v[3], fora do vetor. Use i < 3.'),
    fill('Preencha o vetor com 0, 2, 4, 6, 8.', ['int v[5];', 'for (int i = 0; i < 5; i++)', '    v[i] = ____;'], ['i * 2'], ['v[i]', 'i == 2'], 'O dobro do índice: 0, 2, 4, 6, 8.'),
    num('Qual o valor de maior?', ['int v[5] = {5, 3, 8, 1, 6};', 'int maior = v[0];', 'for (int i = 1; i < 5; i++)', '    if (v[i] > maior) maior = v[i];'], 8, 'Guarda o maior visto até agora e atualiza quando acha um maior.'),
    order('Ler 3 números e somar.', ['int v[3], s = 0;', 'for (int i = 0; i < 3; i++) {', '    scanf("%d", &v[i]);', '    s += v[i];', '}'], 'Declara, percorre, lê e acumula.'),
    num('O que aparece na tela?', ['int m[2][3] = {{1, 2, 3}, {4, 5, 6}};', 'printf("%d", m[1][2]);'], 6, 'm[linha][coluna]: linha 1, coluna 2.'),
  ],
  /* 8 · Strings */
  [
    mc("Que caractere marca o fim de um texto em C?", "'\\0'", ["'\\n'", "';'"], "O '\\0' (nulo) avisa onde o texto termina."),
    num('O que aparece na tela?', ['char s[10] = "casa";', 'printf("%d", strlen(s));'], 4, 'strlen conta as letras, sem o \'\\0\'.'),
    mc('O que aparece na tela?', 'i', ['o', 'oi'], 's[1] é a segunda letra: o índice começa em 0.', ['char s[] = "oi";', 'printf("%c", s[1]);']),
    mc('Qual função compara dois textos?', 'strcmp', ['strlen', 'strcpy'], 'strcmp devolve 0 quando os textos são iguais.'),
    mc('strcmp("sol", "sol") devolve:', '0', ['1', '-1'], 'Zero significa iguais.'),
    tf('char nome[3] = "Ana"; tem espaço suficiente.', false, 'Precisa de 4 posições: 3 letras mais o \'\\0\'.'),
    mc('Qual o problema desta linha?', "Faltou espaço para o '\\0'", ['As aspas estão erradas', 'char não aceita texto'], 'Maria tem 5 letras mais o \'\\0\': são 6 posições.', ['char a[5] = "Maria";']),
    fill('Imprima a letra c.', ['char s[] = "abc";', 'printf("%c", s[____]);'], ['2'], ['3', '0'], 'a = 0, b = 1, c = 2.'),
    order('Ler um nome e cumprimentar.', ['char nome[30];', 'scanf("%s", nome);', 'printf("Oi, %s", nome);'], 'Em texto, o scanf não leva &.'),
    num('Quantos a existem em banana?', ['char s[] = "banana";', 'int c = 0;', "for (int i = 0; s[i] != '\\0'; i++)", "    if (s[i] == 'a') c++;"], 3, 'O laço anda até o \'\\0\' contando cada a.'),
  ],
  /* 9 · Funções */
  [
    num('O que aparece na tela?', ['int dobro(int x) { return x * 2; }', 'printf("%d", dobro(5));'], 10, 'dobro(5) devolve 10.'),
    mc('O que significa void antes do nome da função?', 'A função não devolve valor', ['A função devolve texto', 'A função é privada'], 'void quer dizer "vazio": nada é devolvido.'),
    num('O que aparece na tela?', ['int soma(int a, int b) { return a + b; }', 'printf("%d", soma(2, soma(3, 4)));'], 9, 'soma(3, 4) = 7 e soma(2, 7) = 9.'),
    tf('Mudar o parâmetro dentro da função muda a variável original.', false, 'Em C o valor é copiado (passagem por valor).'),
    num('Qual o valor de n depois da chamada?', ['void muda(int x) { x = 99; }', 'int n = 5;', 'muda(n);'], 5, 'muda recebeu uma cópia de n.'),
    fill('Complete o tipo de retorno.', ['____ quadrado(int x) {', '    return x * x;', '}'], ['int'], ['void', 'char'], 'A função devolve um inteiro.'),
    bug('Qual linha tem erro?', ['int max(int a, int b) {', '    if (a > b) return a;', '    return b', '}'], 2, 'Falta o ponto e vírgula no return.'),
    order('Monte a função e a chamada.', ['int triplo(int x) {', '    return x * 3;', '}', 'printf("%d", triplo(4));'], 'A função é definida antes de ser usada.'),
    match('Ligue o termo ao significado.', [['return', 'Devolve um valor e encerra a função'], ['parâmetro', 'Valor que a função recebe'], ['void', 'Sem valor de retorno'], ['main', 'Função onde o programa começa']], 'Quatro palavras que aparecem em toda função.'),
    num('O que aparece na tela?', ['int f(int n) {', '    int s = 0;', '    for (int i = 1; i <= n; i++) s += i;', '    return s;', '}', 'printf("%d", f(4));'], 10, '1 + 2 + 3 + 4.'),
  ],
  /* 10 · Ponteiros */
  [
    mc('O que & faz antes de uma variável?', 'Pega o endereço dela', ['Pega o valor dela', 'Soma 1'], '&x é o endereço de x.'),
    tf('int *p guarda um endereço de int.', true, 'O * na declaração diz que p é um ponteiro.'),
    num('Qual o valor de x?', ['int x = 5;', 'int *p = &x;', '*p = 8;'], 8, '*p é o próprio x.'),
    num('Qual o valor de a?', ['int a = 2;', 'int *p = &a;', '*p = *p + 3;'], 5, '*p vale 2; 2 + 3 = 5.'),
    fill('Faça p apontar para n.', ['int n = 7;', 'int *p = ____n;'], ['&'], ['*', '#'], 'p precisa receber o endereço de n.'),
    num('Qual o valor de n depois da chamada?', ['void muda(int *x) { *x = 99; }', 'int n = 5;', 'muda(&n);'], 99, 'Passando o endereço, a função altera o original.'),
    mc('O que aparece na tela?', '20', ['10', '30'], 'p + 1 anda uma posição do vetor.', ['int v[3] = {10, 20, 30};', 'int *p = v;', 'printf("%d", *(p + 1));']),
    bug('Qual linha tem erro?', ['int *p;', '*p = 10;', 'printf("%d", *p);'], 1, 'p ainda não aponta para lugar nenhum: escrever em *p é erro.'),
    order('Troque dois valores com ponteiros.', ['void troca(int *a, int *b) {', '    int t = *a;', '    *a = *b;', '    *b = t;', '}'], 'Guarda um valor em t antes de sobrescrever.'),
    match('Ligue a notação ao significado.', [['&x', 'Endereço de x'], ['*p', 'Valor apontado por p'], ['int *p', 'Ponteiro para int'], ['NULL', 'Não aponta para nada']], 'Esses quatro símbolos formam a base dos ponteiros.'),
  ],
  /* 11 · Structs */
  [
    mc('Como acessar o campo nota da variável a?', 'a.nota', ['a->nota', 'a(nota)'], 'Em variável comum use ponto.'),
    mc('Se p é ponteiro para struct, como acessar nota?', 'p->nota', ['p.nota', '*nota'], 'Com ponteiro, use a seta.'),
    tf('Uma struct pode ter campos de tipos diferentes.', true, 'Essa é a vantagem sobre o vetor.'),
    num('O que aparece na tela?', ['struct Ponto { int x; int y; };', 'struct Ponto p = {3, 4};', 'printf("%d", p.x + p.y);'], 7, '3 + 4.'),
    fill('Acesse o campo x.', ['struct Ponto p;', 'p____x = 10;'], ['.'], ['->', ','], 'Variável comum: ponto.'),
    bug('Qual linha tem erro?', ['struct P { int x; int y; }', 'struct P a = {1, 2};'], 0, 'Falta o ponto e vírgula depois do }.'),
    num('O que aparece na tela?', ['struct R { int l; int a; };', 'struct R r = {5, 3};', 'r.l = r.l + 1;', 'printf("%d", r.l * r.a);'], 18, 'l vira 6; 6 × 3 = 18.'),
    order('Monte a struct.', ['struct Livro {', '    int paginas;', '    float preco;', '};'], 'Campos entre chaves, terminando com ponto e vírgula.'),
    match('Ligue o termo ao significado.', [['struct', 'Agrupa campos'], ['.', 'Campo da variável'], ['->', 'Campo via ponteiro'], ['typedef', 'Apelido para um tipo']], 'Quatro peças para trabalhar com registros.'),
  ],
  /* 12 · Memória dinâmica */
  [
    mc('Qual função reserva memória dinâmica?', 'malloc', ['free', 'sizeof'], 'malloc = memory allocation.'),
    mc('Qual função devolve a memória?', 'free', ['malloc', 'return'], 'free libera o que o malloc reservou.'),
    tf('Esquecer o free causa vazamento de memória.', true, 'A memória fica ocupada até o programa terminar.'),
    num('O que aparece na tela?', ['int *v = malloc(3 * sizeof(int));', 'v[0] = 2; v[1] = 4; v[2] = 6;', 'printf("%d", v[1] + v[2]);'], 10, '4 + 6.'),
    fill('Reserve espaço para 5 inteiros.', ['int *v = malloc(5 * ____(int));'], ['sizeof'], ['length', 'size'], 'sizeof dá o tamanho do tipo em bytes.'),
    mc('O que significa malloc devolver NULL?', 'Não havia memória disponível', ['A memória foi liberada', 'O vetor ficou cheio de zeros'], 'Por isso sempre confira o resultado.'),
    mc('Quantos bytes reserva malloc(10 * sizeof(int)) se int tem 4 bytes?', '40', ['10', '14'], '10 inteiros × 4 bytes.'),
    bug('Qual linha tem erro?', ['int *p = malloc(sizeof(int));', '*p = 5;', 'free(p);', 'printf("%d", *p);'], 3, 'Depois do free, a memória não é mais sua.'),
    order('Ciclo de vida da memória dinâmica.', ['int *v = malloc(4 * sizeof(int));', 'v[0] = 1;', 'printf("%d", v[0]);', 'free(v);'], 'Reservar, usar, liberar.'),
  ],
  /* 13 · Recursão */
  [
    mc('O que é o caso base?', 'A condição que para as chamadas', ['A primeira chamada', 'O valor de retorno da main'], 'Sem ele, a função se chama para sempre.'),
    tf('Função recursiva sem caso base roda até estourar a pilha.', true, 'Cada chamada ocupa espaço na pilha de chamadas.'),
    num('O que aparece na tela?', ['int fat(int n) {', '    if (n <= 1) return 1;', '    return n * fat(n - 1);', '}', 'printf("%d", fat(4));'], 24, '4 × 3 × 2 × 1.'),
    num('O que aparece na tela?', ['int soma(int n) {', '    if (n == 0) return 0;', '    return n + soma(n - 1);', '}', 'printf("%d", soma(4));'], 10, '4 + 3 + 2 + 1 + 0.'),
    fill('Complete o caso base.', ['int f(int n) {', '    if (n == 0) ____ 0;', '    return n + f(n - 1);', '}'], ['return'], ['break', 'continue'], 'O caso base devolve um valor sem chamar a função.'),
    bug('Qual linha tem o problema?', ['int f(int n) {', '    return n * f(n - 1);', '}'], 1, 'Não há caso base: a recursão nunca para.'),
    mc('Quantas chamadas faz fat(3), contando a primeira?', '3', ['2', '4'], 'fat(3), fat(2) e fat(1).', ['int fat(int n) {', '    if (n <= 1) return 1;', '    return n * fat(n - 1);', '}']),
    order('Monte o fatorial.', ['int fat(int n) {', '    if (n <= 1) return 1;', '    return n * fat(n - 1);', '}'], 'Caso base primeiro, depois o passo recursivo.'),
    num('O que aparece na tela?', ['int f(int n) {', '    if (n == 0) return 0;', '    return 2 + f(n - 1);', '}', 'printf("%d", f(5));'], 10, 'Soma 2 cinco vezes.'),
    num('O que aparece na tela?', ['int fib(int n) {', '    if (n < 2) return n;', '    return fib(n - 1) + fib(n - 2);', '}', 'printf("%d", fib(6));'], 8, 'Sequência: 0, 1, 1, 2, 3, 5, 8.'),
  ],
  /* 14 · Eficiência */
  [
    mc('Acessar v[i] por índice custa:', 'O(1)', ['O(n)', 'O(n²)'], 'Vai direto à posição, sem percorrer.'),
    mc('Um único laço de 0 até n custa:', 'O(n)', ['O(1)', 'O(n²)'], 'O trabalho cresce junto com n.'),
    tf('Se a entrada dobra e o tempo dobra, o algoritmo é linear.', true, 'Crescimento proporcional é O(n).'),
    mc('Dois laços aninhados de 0 até n custam:', 'O(n²)', ['O(n)', 'O(2n)'], 'n voltas dentro de n voltas.'),
    num('Quantas vezes c++ é executado?', ['int c = 0;', 'for (int i = 0; i < 4; i++)', '    for (int j = 0; j < 5; j++)', '        c++;'], 20, '4 × 5.'),
    mc('Buscar um valor num vetor desordenado, no pior caso, olha:', 'Todos os n elementos', ['Só o primeiro', 'Metade dos elementos'], 'Pior caso: o valor é o último ou não existe.'),
    mc('Qual cresce mais rápido quando n é grande?', 'n²', ['n', 'log n'], 'Quadrático supera linear e logarítmico.'),
    match('Ligue a notação à descrição.', [['O(1)', 'Tempo constante'], ['O(n)', 'Cresce junto com a entrada'], ['O(n²)', 'Cresce com o quadrado da entrada'], ['O(log n)', 'Corta o problema ao meio a cada passo']], 'Notação O descreve como o custo cresce.'),
    order('Do mais rápido ao mais lento (n grande).', ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], 'Constante < logarítmico < linear < quadrático.'),
  ],
  /* 15 · Busca e ordenação */
  [
    mc('Busca binária exige que o vetor esteja:', 'Ordenado', ['Vazio', 'Com números repetidos'], 'Só dá para descartar metade se souber a ordem.'),
    tf('O insertion sort encaixa cada elemento na parte já ordenada.', true, 'É como ordenar cartas na mão.'),
    mc('O selection sort, a cada passo:', 'Coloca o menor restante na próxima posição', ['Troca todos os vizinhos', 'Divide o vetor ao meio'], 'Seleciona o menor e posiciona.'),
    mc('Uma passada do bubble sort em [4, 3, 2] resulta em:', '[3, 2, 4]', ['[2, 3, 4]', '[4, 2, 3]'], 'Troca 4 e 3 → [3, 4, 2]; troca 4 e 2 → [3, 2, 4]. O maior foi para o fim.'),
    num('Qual o primeiro índice do meio na busca binária?', ['Vetor: 2 5 8 11 14', 'ini = 0, fim = 4', 'meio = (ini + fim) / 2'], 2, '(0 + 4) / 2 = 2.'),
    mc('Em 1000 elementos ordenados, a busca binária precisa de cerca de:', '10 comparações', ['1000 comparações', '500 comparações'], '2 elevado a 10 é 1024: dá para dividir ao meio uns 10 vezes.'),
    cells('Vetor ordenado. Procurando o 14, toque no elemento que a busca binária compara primeiro.', ['2', '5', '8', '11', '14'], 2, 'O índice do meio é 2 (valor 8). Como 14 é maior, vai para a direita.'),
    order('Ordene os passos da busca binária.', ['Olhar o elemento do meio', 'Comparar com o valor procurado', 'Descartar a metade que não serve', 'Repetir na metade restante'], 'Cada volta joga fora metade das opções.'),
    mc('Qual é mais rápido em vetores grandes?', 'Mergesort', ['Bubble sort', 'Selection sort'], 'Mergesort custa O(n log n); os outros dois, O(n²).'),
    match('Ligue o algoritmo à ideia.', [['Bubble sort', 'Troca vizinhos fora de ordem'], ['Selection sort', 'Escolhe o menor e põe no começo'], ['Insertion sort', 'Encaixa na parte ordenada'], ['Busca binária', 'Corta o espaço ao meio']], 'Cada um tem uma estratégia diferente.'),
  ],
  /* 16 · Listas ligadas */
  [
    mc('O que o último nó guarda em prox?', 'NULL', ['O primeiro nó', 'O endereço de si mesmo'], 'NULL marca o fim da lista.'),
    tf('Numa lista ligada acessamos o i-ésimo elemento direto, como num vetor.', false, 'É preciso percorrer nó a nó.'),
    mc('Inserir no início de uma lista ligada custa:', 'O(1)', ['O(n)', 'O(n²)'], 'Só mexe em dois ponteiros.'),
    fill('Ande para o próximo nó.', ['while (p != NULL) {', '    printf("%d ", p->valor);', '    p = p->____;', '}'], ['prox'], ['valor', 'next'], 'prox é o campo que aponta para o próximo.'),
    num('Qual valor está em p->valor?', ['Lista: 3 -> 5 -> 9 -> NULL', 'p = lista;', 'p = p->prox;', 'p = p->prox;'], 9, 'Duas voltas: 3 → 5 → 9.'),
    mc('Vantagem da lista ligada sobre o vetor:', 'Inserir no início sem deslocar elementos', ['Acesso direto por índice', 'Usa menos memória sempre'], 'No vetor, inserir no início desloca todo mundo.'),
    bug('Qual linha está na ordem errada?', ['novo->valor = 7;', 'lista = novo;', 'novo->prox = lista;'], 1, 'Ligue novo->prox à lista antiga antes de mudar lista; senão perde o resto.'),
    order('Inserir um novo nó no início.', ['novo = malloc(sizeof(struct No));', 'novo->valor = 7;', 'novo->prox = lista;', 'lista = novo;'], 'Primeiro prende o resto, depois muda a cabeça.'),
    num('Qual o valor de s?', ['Lista: 2 -> 4 -> 6 -> NULL', 'int s = 0;', 'for (p = lista; p != NULL; p = p->prox)', '    s += p->valor;'], 12, '2 + 4 + 6.'),
    match('Ligue o termo ao significado.', [['nó', 'Guarda valor e ponteiro'], ['prox', 'Aponta para o próximo nó'], ['NULL', 'Fim da lista'], ['cabeça', 'Ponteiro para o primeiro nó']], 'As quatro ideias da lista ligada.'),
  ],
  /* 17 · Pilhas e filas */
  [
    mc('Qual estrutura é LIFO (último a entrar, primeiro a sair)?', 'Pilha', ['Fila', 'Vetor'], 'Como uma pilha de pratos.'),
    mc('Qual estrutura é FIFO (primeiro a entrar, primeiro a sair)?', 'Fila', ['Pilha', 'Árvore'], 'Como a fila do banco.'),
    num('Qual o valor de x?', ['push(1); push(2); push(3);', 'x = pop();'], 3, 'A pilha devolve o último que entrou.'),
    num('Qual o valor de x?', ['enqueue(1); enqueue(2); enqueue(3);', 'x = dequeue();'], 1, 'A fila devolve o primeiro que entrou.'),
    tf('A fila de atendimento do banco é um exemplo de FIFO.', true, 'Quem chegou primeiro é atendido primeiro.'),
    mc('Desfazer (Ctrl+Z) funciona como:', 'Uma pilha', ['Uma fila', 'Uma lista circular'], 'A última ação feita é a primeira desfeita.'),
    num('Qual o valor de x?', ['push(5); push(6);', 'pop();', 'push(7);', 'x = pop();'], 7, 'Depois do primeiro pop sobra o 5; entra o 7 e ele sai.'),
    mc('Para conferir se os parênteses estão balanceados usamos:', 'Uma pilha', ['Uma fila', 'Um vetor ordenado'], 'Cada ( entra e cada ) tira o último aberto.'),
    order('Ordem de saída de uma pilha que recebeu A, B, C.', ['C', 'B', 'A'], 'LIFO: sai o último que entrou.'),
    match('Ligue a operação ao efeito.', [['push', 'Empilha'], ['pop', 'Desempilha'], ['enqueue', 'Entra no fim da fila'], ['dequeue', 'Sai do começo da fila']], 'Quatro operações, duas estruturas.'),
  ],
  /* 18 · Árvores */
  [
    mc('Como se chama o nó de cima da árvore?', 'Raiz', ['Folha', 'Filho'], 'A raiz não tem pai.'),
    mc('Nó sem filhos é:', 'Folha', ['Raiz', 'Pai'], 'Folhas ficam nas pontas.'),
    tf('Numa árvore binária cada nó tem no máximo 2 filhos.', true, 'Esquerdo e direito.'),
    mc('Numa árvore de busca com raiz 8, onde fica o 5?', 'À esquerda do 8', ['À direita do 8', 'Na raiz'], '5 < 8, então vai para a esquerda.'),
    num('Para achar o 6 seguindo 8 → 3 → 6, quantos nós visitamos?', ['Árvore de busca com raiz 8.', '8 tem filho esquerdo 3.', '3 tem filho direito 6.'], 3, 'Visitamos 8, 3 e 6.'),
    mc('Percorrer em ordem (esquerda, raiz, direita) numa árvore de busca lista os valores:', 'Em ordem crescente', ['Em ordem decrescente', 'Embaralhados'], 'Menores à esquerda, maiores à direita.'),
    order('Percurso em ordem: ordem de visita.', ['Visitar a subárvore esquerda', 'Visitar a raiz', 'Visitar a subárvore direita'], 'Esquerda, raiz, direita.'),
    mc('Inserindo 4 numa árvore de busca com raiz 8 (filho esquerdo 3), o 4 entra:', 'À direita do 3', ['À esquerda do 3', 'À direita do 8'], '4 < 8 vai à esquerda; 4 > 3 vai à direita do 3.'),
    num('Quantas folhas tem a árvore? (raiz 8, filhos 3 e 10; o 3 tem filhos 1 e 6)', ['        8', '      /   \\', '     3     10', '    / \\', '   1   6'], 3, 'Folhas: 1, 6 e 10.'),
    match('Ligue o termo ao significado.', [['raiz', 'Nó do topo'], ['folha', 'Nó sem filhos'], ['altura', 'Maior caminho da raiz a uma folha'], ['filho', 'Nó ligado abaixo de outro']], 'Vocabulário básico de árvores.'),
  ],
]

/** Lista única, com id e dificuldade gerados. */
export const QUESTIONS = BY_STAGE.flatMap((arr, st) =>
  arr.map((q, i) => ({
    ...q,
    st,
    id: `t${st}-${i + 1}`,
    n: i, // posição no degrau (ordem crescente)
    d: Math.min(3, 1 + Math.floor((i * 3) / arr.length)),
  }))
)

/* ------------------------------ geradores infinitos ------------------------------ */
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1))
const gid = () => 'g' + Math.random().toString(36).slice(2, 9)
const shuffle = (a) => {
  const o = a.slice()
  for (let i = o.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[o[i], o[j]] = [o[j], o[i]]
  }
  return o
}

/** Cada gerador: { st: degrau mínimo, make: () => pergunta } */
export const GENERATORS = [
  {
    st: 2,
    make() {
      const b = ri(2, 9)
      const a = ri(b + 1, 60)
      return { t: 'num', q: 'O que aparece na tela?', code: [`int a = ${a}, b = ${b};`, 'printf("%d", a / b);'], a: String(Math.floor(a / b)), e: `Divisão inteira: ${a} / ${b} dá ${Math.floor(a / b)} (a parte decimal some).`, d: 1 }
    },
  },
  {
    st: 2,
    make() {
      const b = ri(2, 9)
      const a = ri(b + 1, 60)
      return { t: 'num', q: 'O que aparece na tela?', code: [`int a = ${a}, b = ${b};`, 'printf("%d", a % b);'], a: String(a % b), e: `${a} dividido por ${b} deixa resto ${a % b}.`, d: 1 }
    },
  },
  {
    st: 2,
    make() {
      const a = ri(1, 9)
      const b = ri(2, 6)
      const c = ri(2, 6)
      return { t: 'num', q: 'O que aparece na tela?', code: [`printf("%d", ${a} + ${b} * ${c});`], a: String(a + b * c), e: `Multiplicação primeiro: ${b} × ${c} = ${b * c}; depois soma ${a}.`, d: 2 }
    },
  },
  {
    st: 4,
    make() {
      const a = ri(1, 9)
      const b = ri(1, 9)
      const c = ri(1, 9)
      const ops = [
        { s: `a > b && b > c`, v: a > b && b > c },
        { s: `a > b || b > c`, v: a > b || b > c },
        { s: `a < b && b < c`, v: a < b && b < c },
        { s: `!(a == b)`, v: !(a === b) },
      ]
      const o = ops[ri(0, ops.length - 1)]
      return { t: 'tf', q: `A condição (${o.s}) é verdadeira?`, code: [`int a = ${a}, b = ${b}, c = ${c};`], a: o.v, e: `Com a = ${a}, b = ${b} e c = ${c}, a condição é ${o.v ? 'verdadeira' : 'falsa'}.`, d: 2 }
    },
  },
  {
    st: 5,
    make() {
      const n = ri(3, 8)
      return { t: 'num', q: 'Qual o valor de s no final?', code: ['int s = 0, i = 1;', `while (i <= ${n}) {`, '    s += i;', '    i++;', '}'], a: String((n * (n + 1)) / 2), e: `Soma de 1 até ${n}: ${(n * (n + 1)) / 2}.`, d: 2 }
    },
  },
  {
    st: 6,
    make() {
      const s = ri(0, 3)
      const k = ri(1, 3)
      const e = s + ri(4, 12)
      const count = Math.ceil((e - s) / k)
      return { t: 'num', q: 'Quantas vezes o printf é executado?', code: [`for (int i = ${s}; i < ${e}; i += ${k})`, '    printf("*");'], a: String(count), e: `i vale ${s}, ${s + k}, ${s + 2 * k}... enquanto for menor que ${e}: ${count} voltas.`, d: 2 }
    },
  },
  {
    st: 7,
    make() {
      const v = Array.from({ length: 5 }, () => ri(1, 20))
      const i = ri(0, 4)
      const j = ri(0, 4)
      return { t: 'num', q: 'O que aparece na tela?', code: [`int v[5] = {${v.join(', ')}};`, `printf("%d", v[${i}] + v[${j}]);`], a: String(v[i] + v[j]), e: `v[${i}] = ${v[i]} e v[${j}] = ${v[j]}.`, d: 2 }
    },
  },
  {
    st: 7,
    make() {
      const v = Array.from({ length: 5 }, () => ri(10, 99))
      const i = ri(0, 4)
      return { t: 'cells', q: `Toque no elemento v[${i}].`, cells: v.map(String), a: i, e: `Índices começam em 0: v[${i}] é o ${i + 1}º elemento.`, d: 1 }
    },
  },
  {
    st: 10,
    make() {
      const a = ri(1, 9)
      const b = ri(1, 9)
      return { t: 'num', q: 'Qual o valor de x no final?', code: [`int x = ${a};`, 'int *p = &x;', `*p = *p + ${b};`], a: String(a + b), e: `*p é o próprio x: ${a} + ${b} = ${a + b}.`, d: 2 }
    },
  },
  {
    st: 13,
    make() {
      const n = ri(2, 5)
      const f = [1, 1, 2, 6, 24, 120][n]
      return { t: 'num', q: 'O que aparece na tela?', code: ['int fat(int n) {', '    if (n <= 1) return 1;', '    return n * fat(n - 1);', '}', `printf("%d", fat(${n}));`], a: String(f), e: `${n}! = ${f}.`, d: 3 }
    },
  },
  {
    st: 15,
    make() {
      const v = shuffle([2, 3, 5, 7, 9, 11, 13, 15]).slice(0, 5).sort((x, y) => x - y)
      const alvo = v[ri(0, 4)]
      return { t: 'cells', q: `Vetor ordenado. Procurando o ${alvo}, toque no elemento que a busca binária compara primeiro.`, cells: v.map(String), a: 2, e: `meio = (0 + 4) / 2 = 2. A busca binária sempre começa pelo elemento do meio.`, d: 2 }
    },
  },
  {
    st: 17,
    make() {
      const stack = Math.random() < 0.5
      const xs = [ri(1, 9), ri(10, 19), ri(20, 29)]
      const pushes = xs.map((x) => `${stack ? 'push' : 'enqueue'}(${x});`)
      return {
        t: 'num',
        q: 'Qual o valor de x?',
        code: [pushes.join(' '), `x = ${stack ? 'pop' : 'dequeue'}();`],
        a: String(stack ? xs[2] : xs[0]),
        e: stack ? 'Pilha: sai o último que entrou.' : 'Fila: sai o primeiro que entrou.',
        d: 2,
      }
    },
  },
]

/** Cria uma pergunta nova a partir de um gerador (com id único). */
export function fromGenerator(g) {
  const q = g.make()
  return { ...q, id: gid(), st: g.st, gen: true }
}

/* ------------------------------ montar a sessão ------------------------------ */
export const SESSION = 10

/**
 * Escolhe as 10 questões de uma sessão.
 *   focus    número do degrau a treinar, ou 'mix' (mistura de tudo que já foi liberado)
 *   frontier maior degrau liberado
 *   mem      { seen: {id: vezes}, wrong: {id: erros} } (o que a pessoa já viu / errou)
 * Regras: ~6 do degrau (as menos vistas primeiro, erradas voltam antes), 2 de revisão de
 * degraus anteriores, 2 geradas na hora. Dentro da sessão a dificuldade sobe aos poucos.
 */
export function pickSession(focus, frontier, mem = {}) {
  const seen = mem.seen || {}
  const wrong = mem.wrong || {}
  const score = (q) => (seen[q.id] || 0) * 10 + q.n - (wrong[q.id] || 0) * 12 + Math.random() * 3
  // escolhe os n mais "úteis agora", espalhando as mecânicas (cada repetição de tipo custa pontos)
  const best = (pool, n) => {
    const left = pool.map((q) => ({ q, sc: score(q) }))
    const cnt = {}
    const picked = []
    while (picked.length < n && left.length) {
      let bi = 0
      let bs = Infinity
      left.forEach((x, i) => {
        const v = x.sc + (cnt[x.q.t] || 0) * 9
        if (v < bs) {
          bs = v
          bi = i
        }
      })
      const q = left.splice(bi, 1)[0].q
      cnt[q.t] = (cnt[q.t] || 0) + 1
      picked.push(q)
    }
    return picked
  }
  const gens = (maxSt) => GENERATORS.filter((g) => g.st <= maxSt)
  const makeGens = (maxSt, n) => {
    const g = gens(maxSt)
    return g.length ? Array.from({ length: n }, () => fromGenerator(g[Math.floor(Math.random() * g.length)])) : []
  }

  let out = []
  if (focus === 'mix') {
    const pool = QUESTIONS.filter((q) => q.st <= frontier)
    out = best(pool, 7).concat(makeGens(frontier, 3))
    if (out.length < SESSION) out = out.concat(best(pool.filter((q) => !out.includes(q)), SESSION - out.length))
  } else {
    const cur = QUESTIONS.filter((q) => q.st === focus)
    const rev = QUESTIONS.filter((q) => q.st < focus)
    const g = makeGens(focus, 2)
    const r = focus > 0 ? best(rev, 2) : []
    const need = SESSION - g.length - r.length
    out = best(cur, need).concat(r, g)
    if (out.length < SESSION) out = out.concat(best(cur.filter((q) => !out.includes(q)), SESSION - out.length))
  }
  out = out.slice(0, SESSION)

  // dificuldade crescente (com uma folga para misturar), sem repetir a mesma mecânica em sequência
  out = out
    .map((q) => ({ q, k: (q.d || 1) + Math.random() * 1.3 }))
    .sort((x, y) => x.k - y.k)
    .map((x) => x.q)
  for (let i = 1; i < out.length; i++) {
    if (out[i].t !== out[i - 1].t) continue
    for (let j = i + 1; j < Math.min(out.length, i + 4); j++) {
      if (out[j].t !== out[i - 1].t) {
        ;[out[i], out[j]] = [out[j], out[i]]
        break
      }
    }
  }
  return out
}
