/**
 * Trilha C introdutória — tópicos inspirados em material público (MC202 Unicamp / Curso de C),
 * adaptados ao Ensino Médio. Não copia slides/PDF.
 * Ref: https://www.ic.unicamp.br/~rafael/mc202.html
 */
export const C_LESSONS = [
  {
    id: 'c1',
    order: 1,
    title: 'Olá, C',
    topic: 'Programa mínimo e printf',
    blurb: 'Todo programa em C começa em algum lugar. O usuário final nunca vê o main — mas sente o resultado.',
    snippet: `#include <stdio.h>

int main(void) {
    printf("Loja no ar para todos\\n");
    return 0;
}`,
    question: 'O que o printf faz neste programa?',
    options: [
      { id: 'a', text: 'Mostra uma mensagem na saída', correct: true },
      { id: 'b', text: 'Apaga o banco de dados', correct: false },
      { id: 'c', text: 'Só declara variável', correct: false },
    ],
    reflection: 'Mesmo um “Hello” chega a alguém. Em produto real, pense quem lê a mensagem (ou o erro).',
  },
  {
    id: 'c2',
    order: 2,
    title: 'Tipos e valores',
    topic: 'int, float, char (intro)',
    blurb: 'Tipos guardam dados diferentes. Preço e quantidade não são a mesma coisa.',
    snippet: `int quantidade = 2;
float preco = 299.0f;
float total = preco * quantidade;`,
    question: 'Por que total usa float neste exemplo?',
    options: [
      { id: 'a', text: 'Porque o preço pode ter casas decimais', correct: true },
      { id: 'b', text: 'Porque C não tem int', correct: false },
      { id: 'c', text: 'Porque printf exige float sempre', correct: false },
    ],
    reflection: 'Dados errados no tipo viram bug na interface — e o usuário paga o preço (às vezes literalmente).',
  },
  {
    id: 'c3',
    order: 3,
    title: 'Decisões',
    topic: 'if / else simples',
    blurb: 'O programa escolhe caminhos. Acessibilidade também: se o contraste for baixo, avise ou corrija.',
    snippet: `if (contraste_ok) {
    printf("Pode publicar\\n");
} else {
    printf("Ajuste o contraste\\n");
}`,
    question: 'Se contraste_ok for falso, o que acontece?',
    options: [
      { id: 'a', text: 'Imprime o pedido de ajuste', correct: true },
      { id: 'b', text: 'Publica mesmo assim sem mensagem', correct: false },
      { id: 'c', text: 'O programa não compila', correct: false },
    ],
    reflection: 'Regras de negócio e regras de inclusão podem (e devem) aparecer no código.',
  },
  {
    id: 'c4',
    order: 4,
    title: 'Vetores (ideia)',
    topic: 'Sequência de valores',
    blurb: 'Um vetor guarda vários itens — como uma lista de produtos da loja.',
    snippet: `float precos[3] = {299.0f, 189.0f, 149.0f};
/* precos[0] é o primeiro produto */`,
    question: 'O que é precos[0]?',
    options: [
      { id: 'a', text: 'O primeiro preço da lista', correct: true },
      { id: 'b', text: 'A quantidade de produtos', correct: false },
      { id: 'c', text: 'Um erro de sintaxe', correct: false },
    ],
    reflection: 'Listas grandes na UI precisam de leitura clara (rótulos, ordem, foco) — não só de array na memória.',
  },
  {
    id: 'c5',
    order: 5,
    title: 'Quem usa o sistema?',
    topic: 'Eficiência × responsabilidade',
    blurb: 'Código rápido que exclui pessoas não é “bom o suficiente”.',
    snippet: `/* Pseudocódigo de atitude */
se (funciona_so_para_alguns)
    refatorar_para_todos();`,
    question: 'Qual afirmação combina com a mensagem da Loja do Tonho?',
    options: [
      { id: 'a', text: 'Desenvolvemos um sistema para todos', correct: true },
      { id: 'b', text: 'Acessibilidade é opcional no final', correct: false },
      { id: 'c', text: 'Só performance importa', correct: false },
    ],
    reflection: 'Nós não desenvolvemos um sistema. Nós desenvolvemos um sistema para todos.',
  },
]
