/** Delegate to existing learningMemory, never replace it. */
export function createLearningBridge({recordError,recordCorrect,markFixed,markActivityToday}) {
  return event => {
    const q=event.question, phases={io:'fase1',variables:'fase2',arithmetic:'fase2',conditions:'fase3',logic:'fase3',loops:'fase4',integration:'fase4'}
    const phase=phases[q.concept]||'fase4'
    if(event.correct) {
      recordCorrect(phase)
      // One answer is not mastery. Mark ONLY this same question's old error fixed.
      markFixed({phase,mission:`semRede:${q.id}`,concept:q.concept})
    } else recordError({phase,mission:`semRede:${q.id}`,concept:q.concept,studentInput:JSON.stringify(event.answer),expected:q.criteria||JSON.stringify(q.answer),got:event.observed,tip:q.hints[Math.min(event.hintCount,q.hints.length-1)]})
    markActivityToday()
  }
}
