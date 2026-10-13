/**
 * Interpretador ABC (estilo Portugol) — tokenizer simples + execução.
 * Suporta: algoritmo, memoria, inicio/fim, tipos, atribuição, + - * /,
 * escreva/escreval, leia (usa defaults ou mapa de inputs).
 */

function stripComment(line) {
  return line.replace(/\/\/.*$/, '').trim()
}

function unquote(s) {
  const t = String(s).trim()
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1)
  }
  return t
}

function evalExpr(expr, vars) {
  let e = String(expr).trim()
  if ((e.startsWith('"') && e.endsWith('"')) || (e.startsWith("'") && e.endsWith("'"))) {
    return unquote(e)
  }
  // replace variable names with values
  e = e.replace(/[a-zA-Z_]\w*/g, (name) => {
    if (Object.prototype.hasOwnProperty.call(vars, name)) {
      const v = vars[name]
      return typeof v === 'string' ? JSON.stringify(v) : String(v)
    }
    return name
  })
  // only allow safe arithmetic
  if (/^[\d\s+\-*/().]+$/.test(e)) {
    try {
      // eslint-disable-next-line no-new-func
      return Function(`"use strict"; return (${e})`)()
    } catch {
      return NaN
    }
  }
  // fallback: single identifier already resolved
  if (Object.prototype.hasOwnProperty.call(vars, expr.trim())) return vars[expr.trim()]
  const n = Number(e)
  if (!isNaN(n)) return n
  return unquote(expr)
}

/** Extrai atribuições simples (compat + preview ao vivo). */
export function extractVars(source, inputs = {}) {
  const result = runProgram(source, inputs)
  return result.vars
}

export function checkSyntax(source) {
  const errors = []
  const s = String(source || '')
  const lines = s.split('\n')

  if (!/algoritmo\s+/i.test(s)) {
    errors.push({ line: 1, message: 'Falta a declaração algoritmo', hint: 'Comece com: algoritmo "nome"' })
  }
  if (!/\binicio\b/i.test(s)) {
    errors.push({ line: 1, message: 'Falta inicio', hint: 'Depois da memória, escreva inicio' })
  }
  if (!/\bfim\b/i.test(s)) {
    errors.push({ line: lines.length, message: 'Falta fim', hint: 'Termine o programa com fim' })
  }

  let inInicio = false
  lines.forEach((raw, i) => {
    const line = stripComment(raw)
    if (!line) return
    const ln = i + 1
    const opens = (line.match(/"/g) || []).length
    if (opens % 2 !== 0) {
      errors.push({ line: ln, message: 'Aspas sem fechar', hint: 'Feche a string com "' })
    }
    if (/^inicio\b/i.test(line)) inInicio = true
    if (/^fim\b/i.test(line)) inInicio = false

    if (/^\w+\s*:\s*\w+/i.test(line) && !/memoria|algoritmo|inicio|fim/i.test(line)) {
      // declaration ok in memoria block
    }
    if (inInicio && /^[a-zA-Z_]\w*\s*=/.test(line)) {
      const rhs = line.split('=').slice(1).join('=').trim()
      if (!rhs) errors.push({ line: ln, message: 'Atribuição vazia', hint: 'Ex.: total = preco * quantidade' })
    }
    if (/\bleia\s*\(\s*\)/.test(line)) {
      errors.push({ line: ln, message: 'leia precisa de variável', hint: 'Ex.: leia(produto)' })
    }
  })

  return errors
}

/**
 * Executa o programa ABC.
 * @returns {{ vars: object, output: string[], errors: array, ok: boolean }}
 */
export function runProgram(source, inputs = {}) {
  const vars = {}
  const output = []
  const errors = []
  const lines = String(source || '').split('\n')
  let phase = 'header' // header | memoria | inicio

  const defaultInputs = {
    produto: inputs.produto ?? 'Fone Bluetooth',
    preco: inputs.preco ?? 299,
    quantidade: inputs.quantidade ?? 1,
    ...inputs,
  }
  let inputKeys = Object.keys(defaultInputs)
  let inputIdx = 0

  for (let i = 0; i < lines.length; i++) {
    const ln = i + 1
    let line = stripComment(lines[i])
    if (!line) continue

    if (/^algoritmo\b/i.test(line)) {
      phase = 'header'
      continue
    }
    if (/^memoria\b/i.test(line)) {
      phase = 'memoria'
      continue
    }
    if (/^inicio\b/i.test(line)) {
      phase = 'inicio'
      continue
    }
    if (/^fim\b/i.test(line)) {
      break
    }

    if (phase === 'memoria') {
      // nome: tipo
      const decl = line.match(/^([a-zA-Z_]\w*)\s*:\s*(caractere|inteiro|real|real_br)\b/i)
      if (decl) {
        const name = decl[1]
        const typ = decl[2].toLowerCase()
        vars[name] = typ === 'caractere' ? '' : 0
        continue
      }
    }

    if (phase === 'inicio') {
      // escreval("...") or escreval("a", var)
      const ew = line.match(/^escreva(l)?\s*\((.*)\)\s*$/i)
      if (ew) {
        const args = splitArgs(ew[2])
        const parts = args.map((a) => {
          const v = evalExpr(a, vars)
          return v === undefined || v === null ? '' : String(v)
        })
        const text = parts.join('')
        if (ew[1]) output.push(text)
        else output.push(text) // escreva also to output for mobile simplicity
        continue
      }

      // leia(var)
      const rd = line.match(/^leia\s*\(\s*([a-zA-Z_]\w*)\s*\)\s*$/i)
      if (rd) {
        const name = rd[1]
        const key = inputKeys[inputIdx] || name
        inputIdx++
        let val = defaultInputs[name] ?? defaultInputs[key] ?? ''
        if (typeof vars[name] === 'number' || /real|inteiro/i.test(String(vars[name]))) {
          val = Number(val)
        }
        vars[name] = val
        output.push(`> leia(${name}) ← ${val}`)
        continue
      }

      // assignment
      const as = line.match(/^([a-zA-Z_]\w*)\s*=\s*(.+)$/)
      if (as) {
        const name = as[1]
        const value = evalExpr(as[2], vars)
        vars[name] = value
        continue
      }

      errors.push({
        line: ln,
        message: `Comando não entendido: ${line.slice(0, 40)}`,
        hint: 'Use escreval, leia, ou atribuição (x = 1)',
      })
    }
  }

  return {
    vars,
    output,
    errors,
    ok: errors.length === 0,
  }
}

function splitArgs(s) {
  const args = []
  let cur = ''
  let inStr = false
  let q = ''
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (inStr) {
      cur += ch
      if (ch === q) inStr = false
      continue
    }
    if (ch === '"' || ch === "'") {
      inStr = true
      q = ch
      cur += ch
      continue
    }
    if (ch === ',') {
      args.push(cur.trim())
      cur = ''
      continue
    }
    cur += ch
  }
  if (cur.trim()) args.push(cur.trim())
  return args
}

/** Rule Engine WCAG + logs estilo terminal CI */
export function runChecks(type, vars) {
  const logs = []
  const push = (ok, code, msg) => {
    logs.push({
      ok,
      level: ok ? 'PASS' : code === 'CRITICAL' ? 'CRITICAL' : 'FAIL',
      msg,
      terminal: `[${ok ? 'PASS' : code === 'CRITICAL' ? 'CRITICAL' : 'FAIL'}] ${msg}`,
    })
  }

  if (type === 'contrast') {
    const c = String(vars.cor_texto || '').toLowerCase()
    const ok = ['preto', 'cinza_escuro', 'black'].includes(c)
    push(ok, 'FAIL', ok ? 'Contraste de texto ≥ 4.5:1 (WCAG 1.4.3)' : 'Contraste insuficiente — use cor_texto = "preto"')
  }
  if (type === 'font') {
    const n = Number(vars.tamanho_fonte || 0)
    const ok = n >= 14 && n <= 20
    push(ok, 'FAIL', ok ? 'Tamanho de fonte legível (14–20)' : 'tamanho_fonte deve estar entre 14 e 20')
  }
  if (type === 'touch') {
    const h = Number(vars.altura_botao || 0)
    const ok = h >= 44
    push(ok, 'FAIL', ok ? 'Área de toque ≥ 44px (WCAG 2.5.5 / Apple HIG)' : 'altura_botao = 44 ou mais')
  }
  if (type === 'color') {
    const ok =
      String(vars.so_cor || '').toLowerCase() === 'nao' && String(vars.texto_extra || '').toLowerCase() === 'sim'
    push(ok, 'FAIL', ok ? 'Informação não depende só da cor (1.4.1)' : 'so_cor = "nao" e texto_extra = "sim"')
  }
  if (type === 'resize') {
    const ok =
      Number(vars.tamanho_fonte || 0) <= 20 && String(vars.layout_flexivel || '').toLowerCase() === 'sim'
    push(ok, 'FAIL', ok ? 'Layout tolera redimensionamento' : 'fonte ≤ 20 e layout_flexivel = "sim"')
  }
  if (type === 'reflow') {
    const ok =
      String(vars.largura_fixa || '').toLowerCase() === 'nao' &&
      String(vars.esconder_no_zoom || '').toLowerCase() === 'nao'
    push(ok, 'FAIL', ok ? 'Reflow OK (1.4.10)' : 'largura_fixa e esconder_no_zoom = "nao"')
  }
  if (type === 'hierarchy') {
    const ok =
      ['bom', 'adequado'].includes(String(vars.contraste || '').toLowerCase()) &&
      String(vars.destaque_titulo || '').toLowerCase() === 'sim'
    push(ok, 'FAIL', ok ? 'Hierarquia visual adequada' : 'contraste = "bom" e destaque_titulo = "sim"')
  }

  // generic safety
  if (String(vars.animacao || '').toLowerCase() === 'ping_rapido') {
    push(false, 'CRITICAL', 'Risco de epilepsia fotossensível — evite animação agressiva')
  }

  const failed = logs.filter((l) => !l.ok)
  const critical = failed.some((l) => l.level === 'CRITICAL')
  let verdict = 'success'
  if (critical || failed.length >= 2) verdict = 'demitido'
  else if (failed.length === 1) verdict = 'gambiarra'
  else if (failed.length > 0) verdict = 'demitido'

  // refine: all pass = success; one fail = gambiarra; any critical or majority fail = demitido
  if (failed.length === 0) verdict = 'success'
  else if (critical) verdict = 'demitido'
  else if (failed.length === 1 && logs.length > 1) verdict = 'gambiarra'
  else if (failed.length === 1) verdict = 'gambiarra'
  else verdict = 'demitido'

  return {
    logs,
    verdict,
    all: failed.length === 0,
    terminalLines: [
      '$ ci/cd run --target loja-do-tonho',
      ...logs.map((l) => l.terminal),
      failed.length === 0 ? 'status: deploy ready' : 'status: blocked',
      'status: no ar, sempre disponível (ambiente de treino)',
    ],
  }
}

export const ABC_GUIDE = {
  title: 'Guia da linguagem ABC',
  sections: [
    {
      title: 'Estrutura',
      body: `algoritmo "nome"
memoria
    // declarações
inicio
    // comandos
fim`,
    },
    {
      title: 'Tipos',
      body: 'caractere (texto), inteiro (número sem decimal), real / real_br (número).',
    },
    {
      title: 'Comandos',
      body: `escreval("texto") — escreve e pula linha
escreva("texto") — escreve
leia(variavel) — lê valor (no app usamos exemplos prontos)
x = 10 — atribuição
total = preco * quantidade — operações + - * /`,
    },
    {
      title: 'Exemplo 1 — botão acessível',
      body: `algoritmo "botao"
memoria
    cor_texto: caractere
inicio
    cor_texto = "preto"
    escreval("Botão configurado")
fim`,
    },
    {
      title: 'Exemplo 2 — carrinho',
      body: `algoritmo "carrinho"
memoria
    preco: real
    quantidade: inteiro
    total: real
inicio
    preco = 299
    quantidade = 2
    total = preco * quantidade
    escreval("Total: ", total)
fim`,
    },
  ],
}
