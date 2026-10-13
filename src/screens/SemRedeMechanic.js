import React from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, Platform } from 'react-native'
import { theme } from '../lib/semRede/theme.js'
export function Control({children,onPress,disabled=false,selected=false,label,colors=theme}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled,selected}}
    disabled={disabled} onPress={onPress} style={({pressed})=>[styles.control,{backgroundColor:selected?colors.primarySoft:colors.surface,borderColor:selected?colors.primary:colors.border,opacity:disabled?.5:pressed?.75:1}]}>
    <Text style={[styles.controlText,{color:colors.ink}]}>{children}</Text>
  </Pressable>
}
export function Code({children,colors=theme}) {
  return <Text selectable style={[styles.code,{color:colors.codeText,backgroundColor:colors.code}]}>{children}</Text>
}
export default function SemRedeMechanic({question:q,session:s,onAnswer,onExplore,onTest,colors=theme,disabled=false}) {
  const m=q.mechanic
  const inputStyle=[styles.input,{color:colors.ink,borderColor:colors.border,backgroundColor:colors.surface}]
  const textStyle={color:colors.ink,fontSize:17,lineHeight:25}
  if (['choice','bug'].includes(m)) {
    const items=m==='bug'?q.lines:q.options
    return <View>{items.map((item,i)=><Control key={i} colors={colors} disabled={disabled} selected={s.answer===i} onPress={()=>onAnswer(i)} label={m==='bug'?`Linha ${i+1}: ${item}`:item}>{m==='bug'?`${i+1}. `:''}{item}{s.answer===i?' · selecionado':''}</Control>)}</View>
  }
  if (m==='order') {
    const order=s.answer||[]
    return <View><Text style={textStyle}>Sequência</Text>{order.map((index,pos)=><View key={index} style={styles.row}>
      <Text style={[textStyle,styles.flex]}>{pos+1}. {q.items[index]}</Text>
      <Control colors={colors} disabled={disabled||pos===0} label={`Mover ${q.items[index]} para cima`} onPress={()=>{const next=[...order];[next[pos-1],next[pos]]=[next[pos],next[pos-1]];onAnswer(next)}}>↑</Control>
      <Control colors={colors} disabled={disabled||pos===order.length-1} label={`Mover ${q.items[index]} para baixo`} onPress={()=>{const next=[...order];[next[pos],next[pos+1]]=[next[pos+1],next[pos]];onAnswer(next)}}>↓</Control>
      <Control colors={colors} disabled={disabled} label={`Remover ${q.items[index]} da sequência`} onPress={()=>onAnswer(order.filter(x=>x!==index))}>×</Control>
    </View>)}<Text style={textStyle}>Trechos disponíveis</Text>{q.items.map((item,i)=>!order.includes(i)&&<Control colors={colors} key={i} disabled={disabled} label={`Adicionar ${item} ao final`} onPress={()=>onAnswer([...order,i])}>{item}</Control>)}</View>
  }
  if (m==='match') return <View>{q.left.map((left,i)=><View key={left} style={styles.match}><Text style={textStyle}>{left}</Text>{q.right.map((right,j)=><Control colors={colors} key={right} disabled={disabled} selected={s.answer?.[i]===j} label={`${left}: ${right}`} onPress={()=>{const a=[...(s.answer||q.left.map(()=>null))];a[i]=j;onAnswer(a)}}>{right}{s.answer?.[i]===j?' · selecionado':''}</Control>)}</View>)}</View>
  if (['fill','trace','predict'].includes(m)) return <View>
    <Code colors={colors}>{q.code||q.template}</Code>
    <TextInput accessibilityLabel={m==='fill'?'Trecho que falta':'Saída prevista, uma linha por anúncio'} editable={!disabled} multiline={m!=='fill'} value={s.answer||''} onChangeText={onAnswer} style={inputStyle} placeholder="Sua resposta" placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false}/>
  </View>
  if (m==='test_case') return <View><Code colors={colors}>{q.code}</Code>{q.cases.map((test,i)=><View key={i} style={styles.match}>
    <Text style={textStyle}>Caso {i+1} · entradas: {JSON.stringify(test.inputs)}</Text><Text style={textStyle}>Esperado: {test.expected.join(' | ')||'(sem saída)'}</Text>
    <Control colors={colors} disabled={disabled} label={`Executar caso ${i+1}`} onPress={()=>onExplore(i)}>▶ Executar</Control>
    {s.testResults[i]&&<Text accessibilityLiveRegion="polite" style={textStyle}>Observado: {s.testResults[i].error||s.testResults[i].actual.join(' | ')||'(sem saída)'} · {s.testResults[i].pass?'corresponde':'diverge'}</Text>}
    <Control colors={colors} disabled={disabled||s.explored.length!==q.cases.length} selected={s.answer===i} onPress={()=>onAnswer(i)}>Identificar caso {i+1} como falha{s.answer===i?' · selecionado':''}</Control>
  </View>)}</View>
  return <View>
    {q.customer&&<Text style={textStyle}>{q.customer}</Text>}
    <TextInput accessibilityLabel="Editor de código" editable={!disabled} multiline value={s.answer||''} onChangeText={onAnswer} style={[inputStyle,styles.editor]} autoCapitalize="none" autoCorrect={false} spellCheck={false}/>
    <Control colors={colors} disabled={disabled} onPress={onTest} label="Executar todos os testes do código atual">▶ Testar código</Control>
    {(s.testResults.length?s.testResults:q.tests).map((test,i)=><View key={i} style={styles.match}>
      <Text style={textStyle}>Teste {i+1} · entradas: {JSON.stringify(test.inputs)}</Text>
      <Text style={textStyle}>Esperado: {test.expected.join(' | ')||'(sem saída)'}</Text>
      {'pass' in test&&<Text accessibilityLiveRegion="polite" style={textStyle}>{test.pass?'✓ Passou':'✕ Falhou'} · {test.error||test.actual.join(' | ')||'(sem saída)'}</Text>}
    </View>)}
  </View>
}
const styles=StyleSheet.create({
  control:{minHeight:48,borderWidth:1,borderRadius:8,paddingHorizontal:14,paddingVertical:12,justifyContent:'center',marginVertical:4},
  controlText:{fontSize:17,fontWeight:'600'},code:{fontFamily:Platform.OS==='ios'?'Menlo':'monospace',fontSize:16,lineHeight:25,padding:16,borderRadius:8,marginVertical:12},
  input:{borderWidth:1,borderRadius:8,padding:14,minHeight:52,fontSize:18,marginVertical:12},editor:{minHeight:240,textAlignVertical:'top',fontFamily:Platform.OS==='ios'?'Menlo':'monospace',fontSize:16},
  row:{flexDirection:'row',alignItems:'center',gap:6,flexWrap:'wrap'},flex:{flex:1,minWidth:120},match:{marginVertical:10,gap:4},
})
