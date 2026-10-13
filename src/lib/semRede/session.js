import { emptyMemory, chooseQuestion, recordAttempt } from './adaptive.js'
import { validate } from './validation.js'
export const GOALS = [15,25,40]
export function createSession({goal, id, now = Date.now()}) {
  if (!GOALS.includes(goal) || !id) throw new Error('Meta ou identificador inválido.')
  return {version:1,id,goal,startedAt:now,status:'active',score:0,xp:0,mistakes:0,combo:0,bestCombo:0,
    questionId:null,answer:null,hintCount:0,feedback:null,explored:[],testedCode:null,testResults:[],
    attemptNumber:0,recentIds:[],recentMechanics:[],seen:{},goalAcknowledged:false}
}
export function advance(session,memory,bank,random) {
  if (session.status !== 'active') throw new Error('A sessão não está ativa.')
  if (session.questionId && !session.feedback?.correct) throw new Error('Conclua a questão antes de avançar.')
  const q = chooseQuestion(bank,memory,session,random)
  const answer = ['mini_write','debug_fix','customer_crisis'].includes(q.mechanic) ? q.starter : q.mechanic === 'match' ? q.left.map(()=>null) : q.mechanic === 'order' ? [] : null
  return {...session,questionId:q.id,answer,hintCount:0,feedback:null,explored:[],testedCode:null,testResults:[],
    seen:{...session.seen,[q.id]:(session.seen[q.id]||0)+1},recentIds:[...session.recentIds,q.id].slice(-12),recentMechanics:[...session.recentMechanics,q.mechanic].slice(-8)}
}
export function submit(session,memory,question,{rewardFor,now=Date.now()}) {
  if (session.status !== 'active' || session.feedback?.correct) return {session,memory,event:null}
  if (typeof rewardFor !== 'function') throw new Error('Configure a política existente de XP antes de iniciar.')
  const feedback = validate(question,session.answer,{testedCode:session.testedCode,explored:session.explored})
  const attemptNumber = session.attemptNumber+1
  const event = {correct:feedback.correct,answer:session.answer,hintCount:session.hintCount,observed:feedback.observed,attemptId:`${session.id}:${attemptNumber}`,sessionId:session.id,at:new Date(now).toISOString()}
  const xp = feedback.correct ? rewardFor({question,hints:session.hintCount,combo:session.combo+1}) : 0
  if (!Number.isSafeInteger(xp) || xp < 0) throw new Error('A política de XP deve retornar inteiro não negativo.')
  const combo = feedback.correct ? session.combo+1 : 0
  return {session:{...session,attemptNumber,feedback,score:session.score+(feedback.correct?1:0),xp:session.xp+xp,mistakes:session.mistakes+(feedback.correct?0:1),combo,bestCombo:Math.max(session.bestCombo,combo)},memory:recordAttempt(memory,question,event),event}
}
export function finalize(session,now=Date.now()) {
  if (session.status === 'finished') return session
  return {...session,status:'finished',endedAt:now,result:{score:session.score,xp:session.xp,mistakes:session.mistakes,goal:session.goal,runId:session.id,timeMs:Math.max(0,now-session.startedAt),combo:session.bestCombo}}
}
export function emptyState() { return {version:1,memory:emptyMemory(),session:null} }
