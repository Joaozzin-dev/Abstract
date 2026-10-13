import test from 'node:test'
import assert from 'node:assert/strict'
import { BANK } from '../lib/semRede/bank.js'
import { CONCEPTS, MECHANICS } from '../lib/semRede/curriculum.js'
import { runProgram } from '../lib/semRede/runtime.js'
import { runCases, validate } from '../lib/semRede/validation.js'
import { createSession, advance, submit, finalize, emptyState } from '../lib/semRede/session.js'
import { emptyMemory, mastered, chooseQuestion, recordAttempt, eligible } from '../lib/semRede/adaptive.js'
import { buildRunCommit, createRunCommitter } from '../lib/semRede/commit.js'
import { createRepository } from '../lib/semRede/storage.js'

const rewardFor=()=>12 // Test fixture only, NOT an app reward policy.
const q=id=>BANK.find(q=>q.id===id)
const independent=()=>({recent:[true,true,true],independentIds:['a','b','c'],attempts:3,mistakes:0})
function correctAnswer(question) {return question.solution??question.answer}
function solve(s,m,question) {
  const answer=correctAnswer(question)
  return submit({...s,answer,testedCode:answer,explored:question.cases?.map((_,i)=>i)||[]},m,question,{rewardFor})
}

test('60 individually authored questions; all concepts/mechanics and required metadata',()=>{
  assert.equal(BANK.length,60);assert.equal(new Set(BANK.map(q=>q.id)).size,60)
  assert.deepEqual(new Set(BANK.map(q=>q.mechanic)),new Set(MECHANICS))
  for(const concept of Object.keys(CONCEPTS)) assert.equal(BANK.filter(q=>q.concept===concept).length,3)
  for(const question of BANK) {assert.ok(question.explanation);assert.ok(question.commonErrors.length);assert.equal(question.hints.length,2);assert.ok(question.prerequisites)}
})
for(const question of BANK) test(`Expected answer passes: ${question.id} (${question.mechanic})`,()=> {
  const answer=correctAnswer(question)
  assert.equal(validate(question,answer,{testedCode:answer,explored:question.cases?.map((_,i)=>i)||[]}).correct,true)
})
test('runtime: arrays/functions, short circuit, loops, decimals, IO',()=> {
  assert.deepEqual(runProgram('inicio\nleia(x)\nescreval(x / 2)\nfim',{inputs:[3]}).output,['1.5'])
  assert.deepEqual(runProgram('inicio\npara i de 1 ate 3 faca\nescreval(i)\nfimpara\nfim').output,['1','2','3'])
  assert.deepEqual(runProgram('int main(){ if(0 && indefinido){printf("nao");} else {printf("ok");} return 0;}',{language:'c'}).output,['ok'])
})
test('runtime rejects runaway loops, indices, host access, directives and division by zero',()=> {
  for(const code of ['inicio\nescreval(1 / 0)\nfim','inicio\nescreval(constructor)\nfim','inicio\nescreval(process.exit())\nfim','inicio\ni <- 0\nenquanto i < 1 faca\nescreval(i)\nfimenquanto\nfim'])assert.throws(()=>runProgram(code))
  assert.throws(()=>runProgram('int main(){int a[1]; printf("%d", a[1]); return 0;}',{language:'c'}))
  assert.throws(()=>runProgram('#define A 3\nint main(){return 0;}',{language:'c'}))
})
test('starter code genuinely fails for every debug/crisis; writing requires real outputs',()=>{
  for(const question of BANK.filter(q=>['debug_fix','customer_crisis','mini_write'].includes(q.mechanic)))assert.ok(runCases(question,question.starter).some(r=>!r.pass),question.id)
})
test('specific test failures, no cached test after code changes, all case exploration required',()=>{
  const crisis=q('logic-3');const fail=validate(crisis,crisis.starter,{testedCode:crisis.starter})
  assert.equal(fail.correct,false);assert.match(fail.observed,/Teste 1/)
  assert.equal(validate(crisis,crisis.solution,{testedCode:crisis.starter}).correct,false)
  const tc=q('conditions-3');assert.equal(validate(tc,tc.answer,{explored:[1]}).correct,false)
  assert.equal(validate(q('variables-1'),'==').correct,false)
  assert.equal(validate(q('io-2'),[0,1,2,3]).correct,false)
  assert.equal(validate(q('variables-3'),[0,1,2]).correct,false)
})
test('mastery requires multiple distinct unaided successes; a single success never unlocks',()=>{
  let m=emptyMemory(); const question=q('io-1')
  for(let i=0;i<5;i++)m=recordAttempt(m,question,{correct:true,hintCount:0,attemptId:String(i),at:'x'})
  assert.equal(mastered(m.concepts.io),false)
  for(const question of BANK.filter(q=>q.concept==='io'))m=recordAttempt(m,question,{correct:true,hintCount:0,attemptId:question.id,at:'x'})
  assert.equal(mastered(m.concepts.io),true)
  assert.equal(eligible(q('variables-1'),m),true)
  assert.equal(eligible(q('syntax-1'),m),false)
  assert.equal(mastered({...independent(),recent:[false,true,false]}),false)
})
test('wrong answer logs concept/input/hints; delayed revision uses a different question',()=>{
  let m=recordAttempt(emptyMemory(),q('io-1'),{correct:false,answer:0,hintCount:1,observed:'leia recebe',attemptId:'1',at:'x'})
  assert.equal(m.history[0].concept,'io');assert.equal(m.history[0].answer,0);assert.equal(m.history[0].hintCount,1)
  assert.equal(m.concepts.io.reviewDue,3)
  m={...m,sequence:3};const s={...createSession({id:'a',goal:15}),questionId:'io-1',recentIds:['io-1']}
  assert.notEqual(chooseQuestion(BANK,m,s,()=>0).id,'io-1')
  assert.deepEqual(recordAttempt(m,q('io-1'),{attemptId:'1'}),m)
})
for(const goal of [15,25,40]) test(`Full adaptive ${goal}-correct session, continuation, finalization and repeat commit`,()=>{
  let memory=emptyMemory(),session=createSession({goal,id:`run-${goal}`,now:100})
  for(let i=0;i<goal+2;i++) {
    session=advance(session,memory,BANK,()=>.1)
    const question=q(session.questionId),result=solve(session,memory,question)
    session=result.session;memory=result.memory
    const repeat=submit(session,memory,question,{rewardFor});assert.equal(repeat.session.score,session.score)
  }
  assert.equal(session.score,goal+2);assert.equal(session.xp,(goal+2)*12);assert.equal(memory.history.length,goal+2)
  const ended=finalize(session,1000);assert.deepEqual(finalize(ended,2000),ended)
  const first=buildRunCommit({vale1:{xp:10}},ended.result,1000);const repeat=buildRunCommit(first.progress,ended.result,1000)
  assert.equal(first.progress.vale2.runs,1);assert.equal(repeat.progress.vale2.xp,session.xp);assert.equal(repeat.duplicate,true);assert.deepEqual(first.progress.vale1,{xp:10})
})
test('legacy score/time tie-break, weekly reset and original fields are preserved',()=>{
  const result={runId:'a',score:10,xp:12,mistakes:1,goal:15,timeMs:100,combo:2}
  const prev={vale2:{bestScore:10,bestTimeMs:200,xp:30,weekId:-1,weekXp:40,runs:3,custom:'preserve'}}
  const next=buildRunCommit(prev,result,1000)
  assert.equal(next.newBest,true);assert.equal(next.progress.vale2.bestTimeMs,100);assert.equal(next.progress.vale2.weekXp,12);assert.equal(next.progress.vale2.xp,42);assert.equal(next.progress.vale2.custom,'preserve')
  assert.throws(()=>buildRunCommit({}, {...result,xp:NaN}))
})
test('storage serializes writes, separates accounts, restores complete attempts and surfaces corruption',async()=>{
  const data=new Map(),storage={getItem:async k=>data.get(k),setItem:async(k,v)=>{await new Promise(r=>setTimeout(r,2));data.set(k,v)},removeItem:async k=>data.delete(k)}
  const a=createRepository(storage,'a'),b=createRepository(storage,'b')
  assert.deepEqual(await a.load(),emptyState());let state=emptyState();state.session=createSession({id:'save',goal:25})
  await Promise.all([a.save(state),a.save({...state,session:{...state.session,score:2}})])
  assert.equal((await a.load()).session.score,2);assert.equal((await b.load()).session,null)
  data.set(a.key,'bad json');await assert.rejects(a.load(),/corrompido/);assert.equal(data.get(a.key),'bad json')
})
test('durable commit retries flushing after failure without double XP',async()=>{
  let progress={},calls=0
  const store={getState:()=>({progress,setProgress:p=>{progress=p}})}
  const commit=createRunCommitter(store,{flushProgress:async()=>{if(++calls===1)throw new Error('disk failed')}})
  const result={runId:'retry',score:2,xp:24,mistakes:0,goal:15,timeMs:20,combo:2}
  await assert.rejects(commit(result),/disk failed/);await commit(result)
  assert.equal(progress.vale2.xp,24);assert.equal(progress.vale2.runs,1);assert.equal(calls,2)
  await Promise.all([commit(result),commit(result)]);assert.equal(progress.vale2.xp,24)
})
