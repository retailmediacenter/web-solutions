// V45.3: purely server-owned conversation state normalization.
// This does not change the Registry, renderer or module plan.
const styles=new Set(['traditional','modern','warm','tech','premium']);
const goals=new Set(['purchase','visit','catalog']);
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);

export function filterAdvisorSignals(def,untrusted={}){
  const value=(untrusted&&typeof untrusted==='object'&&!Array.isArray(untrusted))?untrusted:{};
  const result={};
  if(goals.has(value.goal))result.goal=value.goal;
  if(styles.has(value.style))result.style=value.style;
  if(def.operation?.options.includes(value.businessMode))result.businessMode=value.businessMode;
  if(def.emphasis?.options.includes(value.emphasis))result.emphasis=value.emphasis;
  if(def.hybrid?.options.some(option=>option.id===value.hybridChoice))result.hybridChoice=value.hybridChoice;
  for(const question of def.specials||[]){
    if(!own(value,question.id))continue;
    const candidate=value[question.id];
    const options=question.options.map(o=>typeof o==='string'?o:o.id);
    if(typeof candidate==='boolean'&&(options.includes('yes')&&options.includes('no'))){
      result[question.id]=candidate;
    }else if(typeof candidate==='string'&&options.includes(candidate)){
      // Canonicalize yes/no to boolean so the existing Advisor draft can skip it.
      result[question.id]=candidate==='yes'?true:candidate==='no'?false:candidate;
    }
  }
  return result;
}
export function mergeAdvisorSignals(def,prior,extracted){
  // Latest *explicit* validated facts override older answers. Absence never
  // means YES, NO or clearing an earlier response.
  return {...filterAdvisorSignals(def,prior),...filterAdvisorSignals(def,extracted)};
}
export function changedAdvisorSignals(def,prior,extracted){
  const before=filterAdvisorSignals(def,prior);
  const latest=filterAdvisorSignals(def,extracted);
  return Object.fromEntries(Object.entries(latest).filter(([key,value])=>!own(before,key)||before[key]!==value));
}
export function safeAdvisorAcknowledgement(def,changed){
  const entries=Object.entries(changed);
  if(!entries.length)return 'Razumem vaš odgovor. Ako želite da izmenite neko podešavanje, napišite šta konkretno menjate.';
  const [key,value]=entries[0];
  if(key==='ordersEnabled')return value?'Razumem. Kupci će moći da pripreme porudžbinu preko sajta, bez automatskog plaćanja.':'Razumem. Nećemo uključiti poručivanje preko sajta.';
  if(['acceptsTimeRequests','eyeExamAppointments','tableReservations','eventReservations','wineTastings'].includes(key))
    return value?'Razumem. Omogućićemo slanje zahteva, ali termin nije potvrđen dok ga vlasnik ne prihvati.':'Razumem. Nećemo uključiti online zahteve za termin.';
  if(key==='style')return 'U redu, sačuvao sam izbor vizuelnog stila.';
  if(key==='goal')return 'Razumem, prilagodio sam marketinški cilj sajta.';
  if(key==='hybridChoice')return 'U redu, sačuvao sam izbor dodatne delatnosti.';
  if(key==='businessMode')return 'Razumem, zabeležio sam način poslovanja.';
  if(key==='emphasis')return 'Razumem, sačuvao sam šta želite posebno da istaknemo.';
  if(key==='butcherGrillService')return 'Razumem, zabeležio sam da li nudite pripremu mesa.';
  if(key==='pharmacyConsultations'||key==='verticalEnabled')return 'Razumem, sačuvao sam tu mogućnost.';
  return 'Razumem, zabeležio sam vaš izbor.';
}

export function interpretShortAnswer(def,currentQuestionId,message){
  const raw=String(message||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[.!?]+$/g,'').trim();
  const questionId=String(currentQuestionId||'').startsWith('special:')?currentQuestionId.slice(8):'';
  const special=(def.specials||[]).find(q=>q.id===questionId);
  const options=special?.options.map(o=>typeof o==='string'?o:o.id)||[];
  if(!options.includes('yes')||!options.includes('no'))return {};
  if(/^(da|da hocu|da zelim|naravno|zelim|hocu)$/.test(raw))return {[questionId]:true};
  if(/^(ne|necu|ne zelim|nikako)$/.test(raw))return {[questionId]:false};
  return {};
}
