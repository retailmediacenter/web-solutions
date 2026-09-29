// V45.1 — shared with Node tests. Never invent affirmative business capabilities.
// Only explicit facts from the server skip a required decision. Visual preferences
// and unsupported optional hybrids do not become compulsory questionnaire screens.
export function buildAdvisorDraft(definition,signals={}){
  const answers={};
  if(definition?.hybrid)answers.hybridChoice=definition.hybrid.options.some(o=>o.id===signals.hybridChoice)?signals.hybridChoice:'none';
  if(definition?.emphasis&&definition.emphasis.options.includes(signals.emphasis))answers.emphasis=signals.emphasis;
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
  // Operations are usually presentation preferences and should not add
  // redundant Advisor steps. These exceptions are real server contracts:
  // - Pharmacy chooses independently between eligible orders and catalog inquiry.
  //   The consultation special is a SEPARATE yes/no decision, not an alternative.
  // - Hotels/apartments need the operation choice for external-booking routing.
  // A valid operation explicitly extracted from the user's description skips
  // this step; an unknown operation must NEVER be silently fabricated.
  if(['pharmacy','hotel','apartments'].includes(definition?.id)){
    if(!answers.businessMode)pending.unshift('operation');
  }
  // A rich template needs one explicit content priority. The old V39.5
  // Advisor asked this question; silently taking the first option is why the
  // current flow often created the same sparse result for every business.
  if(definition?.emphasis&&!answers.emphasis)pending.push('emphasis');
  return {
    steps:[...pending,'company'],answers,
    goal:['purchase','visit','catalog'].includes(signals.goal)?signals.goal:'purchase',
    style:definition?.styles?.some(s=>s.id===signals.style)?signals.style:'modern'
  };
}
