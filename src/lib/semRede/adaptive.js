import { CONCEPTS } from './curriculum.js'
export function mastered(stats) {
  if (!stats) return false
  const recent = (stats.recent || []).slice(-6)
  return (stats.independentIds || []).length >= 3 && recent.length >= 3 && recent.filter(Boolean).length / recent.length >= .8
}
export function eligible(question, memory) {
  return question.prerequisites.every(c => mastered(memory.concepts[c]))
}
export function recordAttempt(memory, question, {correct, answer, hintCount, observed, attemptId, sessionId, at}) {
  if (memory.history.some(h => h.attemptId === attemptId)) return memory
  const previous = memory.concepts[question.concept] || { recent:[], independentIds:[], attempts:0, mistakes:0 }
  const independent = correct && hintCount === 0
  const stats = {...previous,attempts:previous.attempts+1,mistakes:previous.mistakes+(correct ? 0 : 1),
    recent:[...previous.recent,independent].slice(-6),
    independentIds:independent ? [...new Set([...previous.independentIds,question.id])] : previous.independentIds,
    reviewDue:correct && mastered({...previous,recent:[...previous.recent,independent].slice(-6)}) ? null : !correct ? memory.sequence+3 : previous.reviewDue,
    lastQuestion:question.id,
  }
  return { ...memory, sequence:memory.sequence+1, concepts:{...memory.concepts,[question.concept]:stats},
    history:[...memory.history,{attemptId,sessionId,questionId:question.id,concept:question.concept,mechanic:question.mechanic,correct,hintCount,answer:typeof answer === 'string' ? answer.slice(0,12000) : answer,observed,at}].slice(-400) }
}
export function emptyMemory() { return {version:1,sequence:0,concepts:{},history:[]} }
export function chooseQuestion(bank, memory, session, random = Math.random) {
  const available = bank.filter(q => eligible(q,memory))
  if (!available.length) throw new Error('Nenhuma questão atende aos pré-requisitos.')
  const recentIds = session.recentIds.slice(-8)
  let pool = available.filter(q => !recentIds.includes(q.id))
  if (!pool.length) pool = available.filter(q => q.id !== session.questionId)
  if (!pool.length) pool = available
  const lastMechanics = session.recentMechanics.slice(-2)
  const due = pool.filter(q => {const s=memory.concepts[q.concept]; return s?.reviewDue != null && s.reviewDue <= memory.sequence && q.id !== s.lastQuestion})
  if (due.length) pool = due
  return pool.map(q => {
    const s = memory.concepts[q.concept], rate = s?.recent.length ? s.recent.filter(Boolean).length/s.recent.length : 0
    const target = rate >= .8 ? 3 : rate >= .5 ? 2 : 1
    return {q,rank:Math.abs(q.difficulty-target)*2+(lastMechanics.includes(q.mechanic)?3:0)+(mastered(s)?4:0)+(session.seen[q.id]||0)*2+random()}
  }).sort((a,b)=>a.rank-b.rank)[0].q
}
export function reviewSummary(memory) {
  return Object.entries(memory.concepts).filter(([,s])=>s.reviewDue != null).map(([concept,s])=>({concept,label:CONCEPTS[concept]?.label || concept,mistakes:s.mistakes,independent:s.independentIds.length}))
}
