const STATUSES=new Set(['WAITING_MATERIAL','READY_TO_BUILD','BUILDING','REVIEW','APPROVED']);
const text=(value,max=1000)=>String(value??'').trim().slice(0,max);
const strings=value=>(Array.isArray(value)?value:[]).map(item=>typeof item==='string'?text(item,240):text(item?.label||item?.name||item?.purpose||item?.type,240)).filter(Boolean);

export function agentContext(project){
 const site=project.siteConfig||{},payload=project.sourcePayload||{},data=site.businessData||{},advisor=site.advisorContext||{};
 return {siteId:project.siteId,projectRecord:{createdAt:project.createdAt,updatedAt:project.updatedAt||null,requestedPlan:project.buildRequest?.request?.requestedPlan||'publish',capabilities:project.capabilities||{}},business:{name:data.businessName||site.business?.name||project.business?.name||'',phone:data.phone||site.contact?.phone||'',email:data.email||'',address:data.address||'',city:data.city||''},advisor:{businessId:advisor.businessId||site.businessId||'',description:advisor.description||'',goal:advisor.goal||site.goal||'',businessMode:advisor.businessMode||site.businessMode||''},modulePlan:site.modulePlan?.active||[],style:advisor.style||site.style||'',currentContent:{headline:payload.catalog?.headline||'',subtitle:payload.catalog?.subtitle||'',items:payload.catalog?.services||payload.catalog?.products||payload.catalog?.cards||[]},rmcNotes:text(project.agentDesk?.notes,4000),uploadedAssetMetadata:(project.agentDesk?.materials||[]).map(item=>({name:text(item.name,180),kind:text(item.kind,80),note:text(item.note,400),addedAt:item.addedAt}))};
}

function baseline(context){
 const missing=[];
 if(!context.business.name)missing.push('naziv firme');
 if(!context.business.phone&&!context.business.email)missing.push('potvrđen kontakt kanal');
 if(!context.currentContent.headline)missing.push('potvrđen sadržaj hero sekcije');
 if(!context.uploadedAssetMetadata.length)missing.push('fotografije klijenta ili RMC napomena da se koriste generičke fotografije');
 const buildReady=missing.length===0;
 return {status:buildReady?'READY_TO_BUILD':'WAITING_MATERIAL',summary:buildReady?'Projektni podaci i materijali su dovoljni za prvi personalizovani build.':'Advisor i renderer podaci su učitani; nedostaje materijal za personalizaciju.',missing,clientMessage:buildReady?'Materijali su dovoljni za početak izrade. Sledeći korak je izrada internog pregleda sajta.':`Pošaljite nam materijal kako vam je najlakše. Za nastavak su nam potrebni: ${missing.join(', ')}.`,recommendations:['Zadržati postojeći Advisor module plan i odobreni vizuelni pravac kao osnovu finalnog sajta.'],buildReady};
}

function validated(result,context){
 const safe=baseline(context),data=result&&typeof result==='object'&&!Array.isArray(result)?result:{};
 const status=STATUSES.has(data.status)?data.status:safe.status;
 const missing=strings(data.missing).slice(0,12);
 return {status,summary:text(data.summary,1200)||safe.summary,missing:missing.length?missing:safe.missing,clientMessage:text(data.clientMessage,1400)||safe.clientMessage,recommendations:strings(data.recommendations).slice(0,12),buildReady:Boolean(data.buildReady)&&status==='READY_TO_BUILD'};
}

export function createAgentService({fetchImpl=fetch,apiKey=process.env.OPENAI_AGENT_API_KEY,model=process.env.OPENAI_AGENT_MODEL||'gpt-4.1-mini'}={}){
 return {async assess(project){
  const context=agentContext(project);
  if(!apiKey)return {...baseline(context),agentMode:'offline'};
  const instructions='You are RMC Agent Desk, an internal Serbian production assistant. Analyze only the supplied context. Advisor and renderer facts are authoritative; never request a fact already supplied. clientMessage is a suggested message for Dragan to copy, never an automatically sent client message. Never expose secrets, Portal tokens, pairing codes or internal security details. Return JSON only: status (WAITING_MATERIAL|READY_TO_BUILD|BUILDING|REVIEW|APPROVED), summary, missing (string array), clientMessage, recommendations (string array), buildReady (boolean). READY_TO_BUILD requires enough real material or explicit RMC permission to use generic assets. Missing address does not block a build when location can be omitted.';
  const schema={type:'object',additionalProperties:false,properties:{status:{type:'string',enum:[...STATUSES]},summary:{type:'string'},missing:{type:'array',items:{type:'string'}},clientMessage:{type:'string'},recommendations:{type:'array',items:{type:'string'}},buildReady:{type:'boolean'}},required:['status','summary','missing','clientMessage','recommendations','buildReady']};
  const response=await fetchImpl('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model,instructions,input:JSON.stringify(context),text:{format:{type:'json_schema',name:'rmc_agent_assessment',strict:true,schema}}})});
  if(!response.ok)throw Object.assign(new Error('Agent Desk trenutno nije dostupan.'),{status:503});
  const payload=await response.json();
  const outputText=payload.output_text||payload.output?.flatMap(item=>item?.content||[]).find(item=>item?.type==='output_text')?.text||'';
  let parsed;try{parsed=JSON.parse(outputText);}catch{throw Object.assign(new Error('Agent Desk je dobio nečitljiv strukturisani odgovor.'),{status:503});}
  return {...validated(parsed,context),agentMode:'live'};
 }};
}
