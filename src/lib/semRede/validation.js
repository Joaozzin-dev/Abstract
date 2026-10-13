import { runProgram } from './runtime.js'
const normalize = v => String(v ?? '').replace(/\r/g,'').trim()
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b)
export function runCases(question, code, cases = question.tests || question.cases) {
  return cases.map((test,index) => {
    try {
      const result = runProgram(code,{language:question.language,inputs:test.inputs})
      const actual = result.output.map(normalize), expected = test.expected.map(normalize)
      return {index,inputs:test.inputs,expected,actual,pass:same(actual,expected),error:null}
    } catch (error) { return {index,inputs:test.inputs,expected:test.expected,actual:[],pass:false,error:error.message} }
  })
}
export function validate(question, answer, { testedCode = null, explored = [] } = {}) {
  let correct = false, observed = '', results = []
  const m = question.mechanic
  if (['choice','bug'].includes(m)) correct = Number.isInteger(answer) && answer === question.answer
  else if (['order','match'].includes(m)) correct = Array.isArray(answer) && same(answer,question.answer)
  else if (['fill','trace','predict'].includes(m)) correct = [question.answer,...(question.accepted || [])].some(v => normalize(v) === normalize(answer))
  else if (m === 'test_case') {
    if (new Set(explored).size !== question.cases.length || question.cases.some((_,i) => !explored.includes(i))) return {correct:false,observed:'Execute todos os casos antes de identificar a falha.',results:[]}
    correct = answer === question.answer
  } else if (['mini_write','debug_fix','customer_crisis'].includes(m)) {
    if (m === 'customer_crisis' && testedCode !== answer) return {correct:false,observed:'Teste a versão atual do código antes de enviar a solução.',results:[]}
    results = runCases(question,answer)
    correct = results.every(r => r.pass)
    const failed = results.find(r => !r.pass)
    observed = failed ? `Teste ${failed.index+1}: ${failed.error || `esperado ${failed.expected.join(' | ') || '(sem saída)'}, recebido ${failed.actual.join(' | ') || '(sem saída)'}`}` : 'Todos os testes passaram.'
  } else throw new Error(`Mecânica desconhecida: ${m}`)
  if (!observed) observed = correct ? 'Resposta correta.' : m === 'order' ? 'A sequência enviada não respeita a ordem de execução.' : m === 'match' ? 'Uma ou mais associações não correspondem ao conceito.' : 'A resposta ainda não corresponde ao resultado exigido.'
  return {correct,observed,results,explanation:question.explanation}
}
