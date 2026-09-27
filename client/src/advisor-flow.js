// V45.1 — shared with Node tests. Never invent affirmative business capabilities.
// Only explicit facts from the server skip a required decision. Visual preferences
// and unsupported optional hybrids do not become compulsory questionnaire screens.
export function buildAdvisorDraft(definition,signals={}){
  const answers={};
  if(definition?.hybrid)answers.hybridChoice=definition.hybrid.options.some(o=>o.id===signals.hybridChoice)?signals.hybridChoice:'none';
  if(definition?.emphasis)answers.emphasis=definition.emphasis.options.includes(signals.emphasis)
    ?signals.emphasis:(definition.emphasis.options[0]||'');
  const ops=definition?.operation?.options||[];
  if(ops.includes(signals.businessMode))answers.businessMode=signals.businessMode;
  // The generic operation question is often redundant with the independent
  // order/Booking switch; an UNKNOWN operational channel remains unspecified.
  // Do not describe phone orders or shop visits unless the user said so.
  const specials=definition?.specials||(definition?.special?[definition.special]:[]);
  const pending=[];
  for(const q of specials){
    const value=signals[q.id];
    const ids=q.options.map(o=>typeof o==='string'?o:o.id);
    const valid=typeof value==='boolean'&&ids.includes(value?'yes':'no') ||
      typeof value==='string'&&ids.includes(value);
    if(valid)answers[q.id]=value;
    else pending.push('special:'+q.id);
  }
  // The external-booking choice actually changes the renderer/URL contract.
  // Other old operation questions select presentation wording, not capabilities.
  if(definition?.id==='hotel'||definition?.id==='apartments'){
    if(!answers.businessMode)pending.unshift('operation');
  }
  return {
    steps:[...pending,'company'],answers,
    goal:['purchase','visit','catalog'].includes(signals.goal)?signals.goal:'purchase',
    style:definition?.styles?.some(s=>s.id===signals.style)?signals.style:'modern'
  };
}
