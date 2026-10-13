import jsep from 'jsep'

/** Bounded educational interpreter. No eval, Function, native compiler or host IO.
 * Supported subset is documented; unsupported constructs fail explicitly.
 */
export class ProgramError extends Error {}
const fail = message => { throw new ProgramError(message) }
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k)
const forbidden = new Set(['__proto__', 'constructor', 'prototype'])
const cleanName = name => { if (forbidden.has(name)) fail('Nome reservado.'); return name }
const operators = {
  '+': (a,b) => a+b, '-': (a,b) => a-b, '*': (a,b) => a*b,
  '/': (a,b) => { if (b === 0) fail('Divisão por zero.'); return a/b },
  '%': (a,b) => { if (b === 0) fail('Divisão por zero.'); return a%b },
  '<': (a,b) => a<b, '<=': (a,b) => a<=b, '>': (a,b) => a>b, '>=': (a,b) => a>=b,
  '==': (a,b) => a===b, '!=': (a,b) => a!==b,
}
function expression(text, env, functions, tick) {
  let ast
  try { ast = jsep(text) } catch { fail(`Expressão inválida: ${text}`) }
  function walk(n) {
    tick()
    if (n.type === 'Literal') return n.value
    if (n.type === 'Identifier') {
      const name = cleanName(n.name)
      if (!own(env, name)) fail(`Variável não definida: ${name}`)
      return env[name]
    }
    if (n.type === 'UnaryExpression') {
      const v = walk(n.argument)
      if (n.operator === '!') return !v
      if (n.operator === '-') return -v
      if (n.operator === '+') return +v
    }
    if (n.type === 'BinaryExpression' || n.type === 'LogicalExpression') {
      const a = walk(n.left)
      if (n.operator === '&&') return a ? walk(n.right) : false
      if (n.operator === '||') return a ? a : walk(n.right)
      const op = operators[n.operator]
      if (op) return op(a, walk(n.right))
    }
    if (n.type === 'ArrayExpression') return n.elements.map(walk)
    if (n.type === 'MemberExpression' && n.computed) {
      const a = walk(n.object), index = walk(n.property)
      if ((!Array.isArray(a) && typeof a !== 'string') || !Number.isInteger(index) || index < 0 || index >= a.length) fail('Índice fora dos limites.')
      return a[index]
    }
    if (n.type === 'CallExpression' && n.callee.type === 'Identifier') {
      const f = functions[cleanName(n.callee.name)]
      if (typeof f !== 'function') fail(`Função não suportada: ${n.callee.name}`)
      return f(...n.arguments.map(walk))
    }
    fail(`Expressão não suportada: ${n.type}`)
  }
  return walk(ast)
}
function stripComments(code) {
  return code.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, s => s.startsWith('/') ? ' ' : s)
}
function abcToSubset(code) {
  return code.split('\n').map(line => {
    const t = line.trim()
    if (!t || /^(algoritmo\b|inicio$|fim$|var$)/i.test(t)) return ''
    if (/^senao$/i.test(t)) return '} else {'
    if (/^(fimse|fimenquanto|fimpara)$/i.test(t)) return '}'
    const condition = t.match(/^se\s+(.+)\s+entao$/i)
    if (condition) return `if (${condition[1]}) {`
    const loop = t.match(/^enquanto\s+(.+)\s+faca$/i)
    if (loop) return `while (${loop[1]}) {`
    const forLoop = t.match(/^para\s+(\w+)\s+de\s+(.+)\s+ate\s+(.+)\s+faca$/i)
    if (forLoop) return `for (${forLoop[1]} = ${forLoop[2]}; ${forLoop[1]} <= ${forLoop[3]}; ${forLoop[1]}++) {`
    const declaration = t.match(/^(\w+)\s*:\s*(inteiro|real|texto|logico)$/i)
    if (declaration) return `int ${declaration[1]};`
    return `${t.replace(/<-|←/g, '=').replace(/\bescreval\b/gi, 'print').replace(/\bleia\b/gi, 'read')};`
  }).join('\n').replace(/"(?:\\.|[^"\\])*"|\b(verdadeiro|falso|nao|e|ou)\b/g, (s, word) => word ? ({verdadeiro:'true',falso:'false',nao:'!',e:'&&',ou:'||'}[word]) : s)
}
function parse(code) {
  let i = 0
  const ws = () => { while (/\s/.test(code[i] || '') && i < code.length) i++ }
  function until(end) {
    let result = '', quote = '', depth = 0
    while (i < code.length) {
      const c = code[i++]
      if (quote) { result += c; if (c === '\\') result += code[i++] || ''; else if (c === quote) quote = ''; continue }
      if (c === '"' || c === "'") { quote = c; result += c; continue }
      if (c === end && depth === 0) return result.trim()
      if (c === '(' || c === '[') depth++
      if (c === ')' || c === ']') depth--
      result += c
    }
    fail(`Esperado ${end}.`)
  }
  function body() { ws(); if (code[i] === '{') { i++; return block(true) } return [statement()] }
  function statement() {
    ws()
    const keyword = /^(if|while|for)\b/.exec(code.slice(i))
    if (keyword) {
      const kind = keyword[1]; i += kind.length; ws()
      if (code[i++] !== '(') fail('Condição precisa de parênteses.')
      const condition = until(')'), children = body(); ws()
      let alternate = []
      if (kind === 'if' && /^else\b/.test(code.slice(i))) { i += 4; alternate = body() }
      return { kind, condition, children, alternate }
    }
    // Small C functions and main; deliberately reject pointers/structs/preprocessor.
    const func = /^(?:int|float|double|void)\s+(\w+)\s*\(([^)]*)\)\s*\{/.exec(code.slice(i))
    if (func) { i += func[0].length; return {kind:'function',name:func[1],params:func[2],children:block(true)} }
    if (code[i] === '{') { i++; return { kind:'block', children:block(true) } }
    return { kind:'simple', text:until(';') }
  }
  function block(nested) {
    const nodes = []
    while (i < code.length) {
      ws(); if (i >= code.length) break
      if (code[i] === '}') { if (!nested) fail('Chave inesperada.'); i++; return nodes }
      if (code[i] === ';') { i++; continue }
      nodes.push(statement())
    }
    if (nested) fail('Falta fechar uma chave.')
    return nodes
  }
  return block(false)
}
export function runProgram(source, { language = 'abc', inputs = [], maxSteps = 10000 } = {}) {
  if (typeof source !== 'string' || source.length > 12000) fail('Código ausente ou muito longo.')
  let code = stripComments(source)
  if (language === 'abc') code = abcToSubset(code)
  else if (language === 'c') code = code.replace(/^\s*#include\s*<stdio.h>\s*$/gm, '')
  else fail('Linguagem não suportada.')
  if (/#/.test(code)) fail('Diretiva não suportada pelo interpretador didático.')
  const nodes = parse(code), output = [], env = Object.create(null), functions = Object.create(null)
  let steps = 0, inputIndex = 0, calls = 0
  const tick = () => { if (++steps > maxSteps) fail('Limite de execução: verifique a condição do laço.') }
  const value = (s, scope) => expression(s, scope, functions, tick)
  const readInput = () => { if (inputIndex >= inputs.length) fail('Faltou uma entrada para leia/scanf.'); return inputs[inputIndex++] }
  functions.strlen = s => String(s).length
  function assign(target, val, scope) {
    const match = target.match(/^(\w+)(?:\[(.+)\])?$/)
    if (!match) fail('Destino de atribuição inválido.')
    const name = cleanName(match[1])
    if (match[2]) {
      const a = scope[name], index = value(match[2], scope)
      if (!Array.isArray(a) || !Number.isInteger(index) || index < 0 || index >= a.length) fail('Índice fora dos limites.')
      a[index] = val
    } else scope[name] = val
  }
  function simple(text, scope) {
    tick()
    if (!text) return
    if (/^return(?:\s|$)/.test(text)) return { returned:true, value:text.slice(6).trim() ? value(text.slice(6),scope) : undefined }
    const declaration = /^(int|float|double|char)\s+(\w+)(?:\[(\d*)\])?(?:\s*=\s*(.+))?$/.exec(text)
    if (declaration) {
      const [,type,name,size,initializer] = declaration; cleanName(name)
      let v = initializer ? value(initializer.replace(/^\{(.*)\}$/, '[$1]'), scope) : 0
      if (size !== undefined) {
        if (size === '' && !initializer) fail('Array sem tamanho precisa de inicializador.')
        const count = size === '' ? (typeof v === 'string' ? v.length+1 : v.length) : Number(size)
        if (!Number.isInteger(count) || count > 1000) fail('Array muito grande ou tamanho inválido.')
        if (type === 'char' && typeof v === 'string') {
          if (v.length >= count) fail('String não cabe com o terminador nulo.')
          // Keep strings as strings in this didactic subset, not raw memory buffers.
        } else {
          v = initializer ? v : Array(count).fill(0)
          if (!Array.isArray(v) || v.length > count) fail('Inicializador de array inválido.')
          v = [...v, ...Array(count-v.length).fill(0)]
        }
      }
      scope[name] = v; return
    }
    const print = /^(print|printf)\((.*)\)$/.exec(text)
    if (print) {
      if (print[1] === 'print') { output.push(String(value(print[2],scope))); return }
      let call
      try { call = jsep(`format(${print[2]})`) } catch { fail('printf inválido.') }
      const args = call.arguments.map(a => expressionFromNode(a,scope)), format = args.shift()
      if (typeof format !== 'string') fail('printf exige uma string de formato.')
      let at = 0
      output.push(format.replace(/%%|%[dfs]/g, tag => { if (tag === '%%') return '%'; if (at >= args.length) fail('Faltam argumentos no printf.'); const v = args[at++]; return tag === '%d' ? String(Math.trunc(v)) : String(v) }).replace(/\n$/, ''))
      return
    }
    const read = /^read\((\w+)\)$/.exec(text)
    if (read) { assign(read[1], readInput(), scope); return }
    const scanf = /^scanf\("%([dfsc])",\s*&?(\w+)\)$/.exec(text)
    if (scanf) { const input = readInput(); const v = /[df]/.test(scanf[1]) ? Number(input) : String(input); if (typeof v === 'number' && !Number.isFinite(v)) fail('Entrada numérica inválida.'); assign(scanf[2],v,scope); return }
    const inc = /^(\w+)(\+\+|--)$/.exec(text)
    if (inc) { assign(inc[1], value(inc[1],scope) + (inc[2] === '++' ? 1 : -1),scope); return }
    const assignment = /^(\w+(?:\[.+\])?)\s*(\+=|-=|\*=|\/=|=(?!=))\s*(.+)$/.exec(text)
    if (assignment) { const [,target,op,rhs] = assignment; assign(target,op === '=' ? value(rhs,scope) : value(`${target} ${op[0]} (${rhs})`,scope),scope); return }
    value(text,scope)
  }
  // Evaluate printf argument ASTs through a temporary zero-argument interpreted call.
  function expressionFromNode(node, scope) {
    function render(n) {
      if (n.type === 'Literal') return JSON.stringify(n.value)
      if (n.type === 'Identifier') return n.name
      if (n.type === 'BinaryExpression') return `(${render(n.left)} ${n.operator} ${render(n.right)})`
      if (n.type === 'UnaryExpression') return `(${n.operator}${render(n.argument)})`
      if (n.type === 'MemberExpression' && n.computed) return `${render(n.object)}[${render(n.property)}]`
      if (n.type === 'CallExpression' && n.callee.type === 'Identifier') return `${n.callee.name}(${n.arguments.map(render).join(',')})`
      fail('Argumento de printf não suportado.')
    }
    return value(render(node),scope)
  }
  function execute(list, scope) {
    for (const n of list) {
      tick(); let result
      if (n.kind === 'simple') result = simple(n.text,scope)
      else if (n.kind === 'block') result = execute(n.children,scope)
      else if (n.kind === 'if') result = execute(value(n.condition,scope) ? n.children : n.alternate,scope)
      else if (n.kind === 'while') { while (value(n.condition,scope)) { tick(); result = execute(n.children,scope); if (result?.returned) break } }
      else if (n.kind === 'for') {
        const parts = n.condition.split(';'); if (parts.length !== 3) fail('for exige início, condição e atualização.')
        simple(parts[0].trim(),scope)
        while (value(parts[1],scope)) { tick(); result = execute(n.children,scope); if (result?.returned) break; simple(parts[2].trim(),scope) }
      }
      if (result?.returned) return result
    }
  }
  for (const n of nodes.filter(n => n.kind === 'function')) {
    cleanName(n.name)
    functions[n.name] = (...args) => {
      if (++calls > 50) fail('Limite de chamadas de função.')
      const local = Object.assign(Object.create(null),env), params = n.params === 'void' || !n.params.trim() ? [] : n.params.split(',').map(p => p.trim().match(/^(?:int|float|double|char)\s+(\w+)$/)?.[1])
      if (params.some(p => !p) || args.length !== params.length) fail('Parâmetros de função incompatíveis.')
      params.forEach((p,i) => { local[cleanName(p)] = args[i] })
      try { return execute(n.children,local)?.value } finally { calls-- }
    }
  }
  execute(nodes.filter(n => n.kind !== 'function'),env)
  if (own(functions,'main')) functions.main()
  return { output, variables:{...env}, steps, inputsConsumed:inputIndex }
}
