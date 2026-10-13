/** Idempotent version of the supplied xp.commitRun, for vale2 only.
 * Exactly the same score/time tie-break and weekly XP rule; no guessed vale2Score.
 * Each run ID is retained in progress.vale2.completedRunIds (do not truncate).
 * Call ONLY through one reward owner, not alongside the legacy commitRun.
 */
const DAY=86400000, WEEK=7*DAY
export function buildRunCommit(progress,result,now=Date.now()) {
  if (!result.runId || ![result.score,result.xp,result.mistakes,result.timeMs,result.combo].every(n=>Number.isSafeInteger(n)&&n>=0) || ![15,25,40].includes(result.goal)) throw new Error('Resultado inválido.')
  const prev=progress.vale2 || {}, completed=prev.completedRunIds || []
  if (completed.includes(result.runId)) return {progress,duplicate:true,newBest:false}
  const wk=Math.floor((now+3*DAY)/WEEK)
  const newBest=result.score>0 && (prev.bestScore==null || result.score>prev.bestScore || (result.score===prev.bestScore && (prev.bestTimeMs==null || result.timeMs<prev.bestTimeMs)))
  const entry={...prev,done:prev.done || result.score>0,xp:(prev.xp||0)+result.xp,weekId:wk,
    weekXp:(prev.weekId===wk ? prev.weekXp||0 : 0)+result.xp,runs:(prev.runs||0)+1,
    bestCombo:Math.max(prev.bestCombo||0,result.combo),completedRunIds:[...completed,result.runId],
    trainingHistory:[...(prev.trainingHistory||[]),{...result,at:new Date(now).toISOString()}].slice(-100)}
  if (newBest) {entry.bestScore=result.score;entry.bestTimeMs=result.timeMs}
  return {progress:{...progress,vale2:entry},duplicate:false,newBest}
}
export function createRunCommitter(store,{flushProgress}={}) {
  if (typeof flushProgress !== 'function') throw new Error('Forneça flushProgress para confirmar a gravação durável antes de encerrar.')
  let queue=Promise.resolve()
  return result => {
    const task=queue.catch(()=>{}).then(async()=> {
      const st=store.getState(), next=buildRunCommit(st.progress||{},result)
      if (!next.duplicate) {
        if (typeof st.setProgress !== 'function') throw new Error('O store deve expor setProgress.')
        st.setProgress(next.progress)
      }
      // Retry flushing even if the synchronous in-memory ledger already contains the run.
      await flushProgress()
      return {duplicate:next.duplicate,newBest:next.newBest}
    })
    queue=task;return task
  }
}
