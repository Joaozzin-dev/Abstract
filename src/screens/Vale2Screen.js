import React, { useEffect, useRef, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, AccessibilityInfo, AppState, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { BANK } from '../lib/semRede/bank.js'
import { CONCEPTS } from '../lib/semRede/curriculum.js'
import { GOALS, createSession, advance, submit, finalize } from '../lib/semRede/session.js'
import { createRepository } from '../lib/semRede/storage.js'
import { runCases } from '../lib/semRede/validation.js'
import { reviewSummary } from '../lib/semRede/adaptive.js'
import { theme } from '../lib/semRede/theme.js'
import SemRedeMechanic, { Control } from './SemRedeMechanic.js'

/** No imports from absent app modules. All existing integrations are injected.
 * onFinish receives score/xp/mistakes/goal plus runId/timeMs/combo.
 * It must commit idempotently and resolve only after durable persistence.
 */
export default function Vale2Screen({userId,progress={},onClose,onFinish,rewardFor,onAttempt,
  colors=theme,storage=AsyncStorage,bank=BANK,audio,soundEnabled=false}) {
  const [state,setState]=useState(null), [error,setError]=useState(''), [busy,setBusy]=useState(false), [completed,setCompleted]=useState(false)
  const stateRef=useRef(null), repoRef=useRef(null), lock=useRef(false), audioRef=useRef(audio), onAttemptRef=useRef(onAttempt)
  audioRef.current=audio;onAttemptRef.current=onAttempt
  const allowed=!!progress.fase4?.done
  useEffect(()=> {
    let live=true
    setState(null);stateRef.current=null;setCompleted(false)
    try {
      const repo=createRepository(storage,userId);repoRef.current=repo
      repo.load().then(data=>{if(live){stateRef.current=data;setState(data);setError('')}}).catch(e=>{if(live)setError(e.message)})
    } catch(e) {setError(e.message)}
    return ()=>{live=false;repoRef.current=null}
  },[userId,storage])
  useEffect(()=> {
    if (!soundEnabled || !allowed) {audioRef.current?.stop?.();return}
    audioRef.current?.start?.()
    const sub=AppState.addEventListener('change',status=>{if(status==='active') audioRef.current?.start?.();else audioRef.current?.stop?.()})
    return ()=>{sub.remove();audioRef.current?.stop?.()}
  },[soundEnabled,allowed])
  async function transact(work) {
    if(lock.current || !stateRef.current || !repoRef.current)return false
    lock.current=true;setBusy(true);setError('')
    try {
      const old=stateRef.current, next=await work(old)
      if(next) {await repoRef.current.save(next);stateRef.current=next;setState(next)}
      return true
    } catch(e){setError(e.message);AccessibilityInfo.announceForAccessibility(e.message);return false}
    finally{lock.current=false;setBusy(false)}
  }
  function start(goal) {transact(old=>{let session=createSession({goal,id:`${encodeURIComponent(userId)}:${Date.now()}:${Math.random().toString(36).slice(2)}`});session=advance(session,old.memory,bank);return {...old,session}})}
  function patch(partial){transact(old=>({...old,session:{...old.session,...partial}}))}
  // Text changes are immediate, with ordered persistence; never drop keystrokes
  // or dismiss the keyboard by disabling the editor during a disk write.
  function editAnswer(answer) {
    const old=stateRef.current, repo=repoRef.current
    if(lock.current || !old?.session || !repo)return
    const next={...old,session:{...old.session,answer,feedback:null,testedCode:null,testResults:q?.mechanic==='test_case'?old.session.testResults:[]}}
    stateRef.current=next;setState(next)
    repo.save(next).catch(e=>setError(`Não foi possível salvar a resposta: ${e.message}`))
  }
  const s=state?.session, q=bank.find(item=>item.id===s?.questionId)
  async function check() {
    if(!q)return
    let pending=null
    const saved=await transact(old=>{const result=submit(old.session,old.memory,q,{rewardFor});pending=result.event;return {...old,session:result.session,memory:result.memory}})
    if(saved && pending) {
      const current=stateRef.current?.session
      AccessibilityInfo.announceForAccessibility(current?.feedback?.observed||'')
      if(soundEnabled) audioRef.current?.[pending.correct?'good':'bad']?.()
      // Memory bridge failure must not lose or roll back the local learning result.
      try {await onAttemptRef.current?.({...pending,question:q})} catch {setError('O resultado foi salvo no aparelho; a ajuda da jornada não foi sincronizada.')}
    }
  }
  async function finish() {
    await transact(async old=>{
      if(typeof onFinish!=='function')throw new Error('Configure a gravação dos resultados antes de encerrar.')
      const finished=finalize(old.session)
      // Save the result before external commit. On crash, reopening retries same runId.
      const pending={...old,session:finished};await repoRef.current.save(pending);stateRef.current=pending;setState(pending)
      await onFinish(finished.result)
      setCompleted(true)
      return {...pending,session:null}
    })
  }
  const text=[styles.text,{color:colors.ink}], title=[styles.title,{color:colors.ink}]
  const exit=()=>{if(busy)return;audioRef.current?.stop?.();onClose?.()}
  return <SafeAreaView style={[styles.root,{backgroundColor:colors.background}]}>
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS==='ios'?'padding':undefined}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}><Text style={title}>ab.c · Sem rede</Text><Control colors={colors} disabled={busy} label="Sair e manter treino salvo" onPress={exit}>×</Control></View>
      {!!error&&<Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[text,{color:colors.danger}]}>{error}</Text>}
      {!allowed?<Text style={text}>Conclua a fase 4 para liberar o Sem rede.</Text>:typeof rewardFor!=='function'?<Text style={text}>A política de XP do app precisa ser conectada antes de começar.</Text>:!state?<View><Text style={text}>Carregando seu treino…</Text>{error&&<Control colors={colors} onPress={async()=>{try{const data=await repoRef.current?.load();if(data){stateRef.current=data;setState(data);setError('')}}catch(e){setError(e.message)}}}>Tentar novamente</Control>}</View>:!s?<View>
        {completed&&<Text accessibilityLiveRegion="polite" style={text}>✓ Resultado registrado.</Text>}
        <Text style={title}>Sua meta de acertos</Text>{GOALS.map(goal=><Control colors={colors} key={goal} disabled={busy} onPress={()=>start(goal)}>{goal} acertos</Control>)}
        {reviewSummary(state.memory).length>0&&<View><Text style={title}>Revisões pendentes</Text>{reviewSummary(state.memory).map(r=><Text key={r.concept} style={text}>{r.label} · {r.independent} questões independentes resolvidas</Text>)}</View>}
      </View>:s.status==='finished'?<View><Text style={title}>Resultado pronto</Text><Text style={text}>{s.score} acertos · {s.xp} XP · {s.mistakes} erros</Text><Control colors={colors} disabled={busy} onPress={finish}>Registrar resultado</Control></View>:!q?<Text style={text}>A questão salva não existe neste banco. Restaure a versão correspondente antes de continuar.</Text>:<View>
        <Text accessibilityRole="progressbar" accessibilityValue={{min:0,max:s.goal,now:Math.min(s.score,s.goal),text:`${s.score} de ${s.goal} acertos`}} style={text}>{s.score} / {s.goal} acertos · {s.xp} XP</Text>
        <View style={[styles.progress,{backgroundColor:colors.border}]}><View style={[styles.progressFill,{backgroundColor:colors.primary,width:`${Math.min(100,s.score/s.goal*100)}%`}]} /></View>
        {s.score>=s.goal&&!s.goalAcknowledged?<View><Text style={title}>✓ Meta alcançada</Text><Text style={text}>{s.score} acertos · {s.mistakes} erros</Text><Control colors={colors} disabled={busy} onPress={()=>patch({goalAcknowledged:true})}>Continuar treinando</Control><Control colors={colors} disabled={busy} onPress={finish}>Encerrar e registrar</Control></View>:<View>
          <Text style={[text,{color:colors.muted}]}>Bloco {q.block} · {CONCEPTS[q.concept].label}</Text><Text style={title}>{q.prompt}</Text>
          <SemRedeMechanic colors={colors} question={q} session={s} disabled={busy||!!s.feedback?.correct}
            onAnswer={editAnswer}
            onExplore={index=>{const result=runCases(q,q.code,[q.cases[index]])[0];const testResults=[...s.testResults];testResults[index]=result;patch({explored:[...new Set([...s.explored,index])],testResults})}}
            onTest={()=>patch({testedCode:s.answer,testResults:runCases(q,s.answer)})}/>
          {s.hintCount>0&&q.hints.slice(0,s.hintCount).map((hint,i)=><Text key={i} style={text}>Pista {i+1}: {hint}</Text>)}
          {s.feedback&&<View accessibilityLiveRegion="polite"><Text style={[text,{color:s.feedback.correct?colors.success:colors.danger}]}>{s.feedback.correct?'✓':'✕'} {s.feedback.observed}</Text><Text style={text}>{s.feedback.explanation}</Text></View>}
          {s.feedback?.correct?<Control colors={colors} disabled={busy} onPress={()=>transact(old=>({...old,session:advance(old.session,old.memory,bank)}))}>Próximo desafio →</Control>:<View><Control colors={colors} disabled={busy} onPress={check}>Verificar resposta</Control><Control colors={colors} disabled={busy||s.hintCount>=q.hints.length} onPress={()=>patch({hintCount:s.hintCount+1})}>Pista {Math.min(s.hintCount+1,q.hints.length)}</Control></View>}
          <Control colors={colors} disabled={busy} onPress={finish}>Encerrar e registrar</Control>
        </View>}
      </View>}
    </ScrollView></KeyboardAvoidingView>
  </SafeAreaView>
}
const styles=StyleSheet.create({root:{flex:1},content:{padding:20,paddingBottom:48,width:'100%',maxWidth:760,alignSelf:'center',gap:16},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'},title:{fontSize:23,fontWeight:'700',lineHeight:32,marginVertical:10},text:{fontSize:17,lineHeight:26,marginVertical:4},progress:{height:12,borderRadius:6,overflow:'hidden',marginVertical:16},progressFill:{height:'100%'}})
