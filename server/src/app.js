import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getRegistryCount } from './registry.js';
import { listBusinesses,recognizeBusiness,getAdvisorDefinition,understandAdvisorDescription } from './advisor.js';
import { buildSitePayload } from './site.js';
import { renderHtml } from './render-site.js';
import { exportSiteZip } from './exporter.js';
import {bookingRouter} from './booking-routes.js';
import {commerceRouter} from './commerce-routes.js';
import {createBookingQueue} from './booking-queue.js';
import {attachPublicSiteTransport} from './site-export-transport.js';
import {qaRouter} from './qa-routes.js';
import {mergeAdvisorSignals,changedAdvisorSignals,safeAdvisorAcknowledgement,interpretShortAnswer} from './advisor-dialog.js';
import {phraseVerifiedTurn,answerApprovedAdvisorQuestion} from './advisor-dialog-ai.js';
import {genericFood,foodClarification,proposeBusinessWithAi} from './advisor-ai.js';
export const app=express();
app.disable('x-powered-by');
app.use(express.json({limit:'40kb'}));
// A published Webglobe frontend requires CLIENT_ORIGIN=https://retailmediacenter.com
const origins=(process.env.CLIENT_ORIGIN||'').split(',').map(x=>x.trim().replace(/\/$/,'')).filter(Boolean);
app.use((req,res,next)=>{
  const origin=req.get('origin');
  const publicSubmit=['/api/booking/requests','/api/commerce/orders'].includes(req.path) && (req.method==='POST'||req.method==='OPTIONS');
  // The protected B4 login works on the same public QA Preview page.
  // Production remains disabled at the router even if this CORS check matches.
  const qaPreview=process.env.RMC_QA_MODE==='1'&&req.path.startsWith('/api/qa/')&&origin==='https://retailmediacenter.github.io';
  if(origin&&(origins.includes(origin)||publicSubmit||qaPreview)){
    res.set({'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Expose-Headers':'X-RMC-Booking-Code, X-RMC-Booking-Expires','Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS'});
  }
  if(req.method==='OPTIONS')return (origins.includes(origin)||publicSubmit||qaPreview)?res.status(204).end():res.status(403).end();
  next();
});
app.use('/api/booking',bookingRouter());
app.use('/api/commerce',commerceRouter());
app.use('/api/qa',qaRouter()); // disabled unless explicit STAGING-only RMC_QA_MODE=1 + secret
app.get('/api/health',(_req,res)=>res.json({status:'ok',service:'rmc-web-solutions-api',stage:'v42.1-location-free',registryEntries:getRegistryCount(),export:true}));
app.get('/api/registry/basic',(_req,res)=>res.json({count:getRegistryCount(),businesses:listBusinesses()}));
app.get('/api/advisor/recognize',(req,res)=>res.set('Cache-Control','no-store').json(understandAdvisorDescription(String(req.query.text||'').slice(0,800),{businessId:listBusinesses().some(b=>b.id===req.query.businessId)?req.query.businessId:null})));
// AI budget guard is best-effort per-process; use edge/Redis quotas before large public rollout.
const aiHits=new Map();let aiTotalDay=0,aiDay=new Date().toISOString().slice(0,10);
function allowAi(ip){
 const now=Date.now(),day=new Date(now).toISOString().slice(0,10);
 if(day!==aiDay){aiDay=day;aiTotalDay=0;aiHits.clear();}
 const recent=(aiHits.get(ip)||[]).filter(t=>now-t<3600000);
 if(recent.length>=12||aiTotalDay>=200)return false;
 recent.push(now);aiHits.set(ip,recent);aiTotalDay++;
 if(aiHits.size>1000)for(const [key,times] of aiHits)if(times.every(t=>now-t>3600000))aiHits.delete(key);
 return true;
}
function ambiguityResult(description,businesses){
 if(genericFood(description))return {businessId:null,needsClarification:true,
   clarification:{question:foodClarification.question,choices:foodClarification.choices.filter(id=>businesses.some(b=>b.id===id)).map(id=>businesses.find(b=>b.id===id))}};
 return null;
}
app.post('/api/advisor/understand',async(req,res)=>{
 res.set('Cache-Control','no-store');
 const description=typeof req.body?.description==='string'?req.body.description.trim().slice(0,800):'';
 if(description.length<3)return res.status(400).json({error:'Opišite svoju delatnost.'});
 const businesses=listBusinesses();
 const chosen=businesses.some(b=>b.id===req.body?.businessId)?req.body.businessId:null;
 // A manual clarification is a user decision, never an AI guess.
 if(chosen)return res.json({...understandAdvisorDescription(description,{businessId:chosen}),needsClarification:false});
 const fallback=()=>({...understandAdvisorDescription(description),engine:'rules-v45.1'});
 const forced=req.body?.clarified===true?null:ambiguityResult(description,businesses);
 if(forced)return res.json({...fallback(),...forced,engine:'clarification-v45.2'});
 const rules=fallback();
 const complex=/\b(i|ali|takođe|takodje|pored|osim|uz)\b/i.test(description)&&description.length>45;
 if(rules.businessId&&!complex)return res.json(rules);
 if(!process.env.OPENAI_API_KEY||!allowAi(req.ip))return res.json(rules);
 try{
   const proposed=await proposeBusinessWithAi(description,businesses);
   if(proposed?.needsClarification){
     const choices=proposed.choices.map(id=>businesses.find(b=>b.id===id)).filter(Boolean);
     if(choices.length)return res.json({...rules,businessId:null,needsClarification:true,clarification:{question:proposed.question||'Koja od ponuđenih delatnosti najbolje opisuje vaš posao?',choices},engine:'openai-clarification'});
   }
   const id=rules.businessId||proposed?.businessId;
   if(id&&businesses.some(b=>b.id===id)){
     // Explicit facts are extracted by the existing audited V45.1 rules for THIS ID.
     const checked=understandAdvisorDescription(description,{businessId:id});
     return res.json({...checked,engine:rules.businessId?'rules+openai-v45.2':'openai-classification-v45.2'});
   }
 }catch(_err){/* Fail closed to the already audited rules; do not log descriptions or keys. */}
 return res.json(rules);
});
// Public refinement accepts brief conversation turns; never store user text.
// This route cannot select another business or grant any module outside the
// current server-owned Advisor definition. Existing rules validate fresh facts.
const refinementHits=new Map();
app.post('/api/advisor/refine',async(req,res)=>{
  res.set('Cache-Control','no-store');
  const ip=req.ip,now=Date.now();
  const recent=(refinementHits.get(ip)||[]).filter(t=>now-t<3600000);
  if(recent.length>=30)return res.status(429).json({error:'Previše zahteva. Pokušajte ponovo kasnije.'});
  recent.push(now);refinementHits.set(ip,recent);
  if(refinementHits.size>1000)for(const [key,times] of refinementHits)if(times.every(t=>now-t>3600000))refinementHits.delete(key);
  const businessId=typeof req.body?.businessId==='string'?req.body.businessId:'';
  const message=typeof req.body?.message==='string'?req.body.message.trim():'';
  if(message.length<3||message.length>400)return res.status(400).json({error:'Napišite odgovor do 400 znakova.'});
  if(!listBusinesses().some(b=>b.id===businessId))return res.status(400).json({error:'Nepoznata delatnost.'});
  try{
    const def=getAdvisorDefinition(businessId);
    const prior={...req.body?.signals,goal:req.body?.goal||req.body?.signals?.goal,style:req.body?.style||req.body?.signals?.style};
    const extraction=understandAdvisorDescription(message,{businessId});
    const short=interpretShortAnswer(def,req.body?.currentQuestionId,message);
    const fresh={...extraction.signals,...short};
    const changes=changedAdvisorSignals(def,prior,fresh);
    const signals=mergeAdvisorSignals(def,prior,fresh);
    const baseReply=safeAdvisorAcknowledgement(def,changes);
    // One optional LLM call per substantial, newly verified free-text correction.
    // Use the same existing per-process AI quota. For plain chat with no verified
    // change, never burn tokens inventing business facts or functionality.
    const phraseOnly=Object.keys(changes).length&&Object.keys(changes).every(k=>['goal','style','emphasis'].includes(k));
    const polished=phraseOnly&&process.env.OPENAI_API_KEY&&allowAi(ip)
      ?await phraseVerifiedTurn({message,baseReply,changes,businessLabel:def.label}):null;
    const faq=!Object.keys(changes).length&&/[?]|\b(?:kako|koliko|da li|moze|mogu|sta znaci|zasto)\b/i.test(message)&&process.env.OPENAI_API_KEY&&allowAi(ip)
      ?await answerApprovedAdvisorQuestion({message}):null;
    res.json({businessId,signals,warnings:extraction.warnings||[],
      acknowledgement:polished||faq||baseReply,engine:polished?'openai-verified-dialog':faq?'openai-limited-faq':'rules-verified-dialog'});
  }catch{return res.status(400).json({error:'Odgovor nije obrađen. Pokušajte ponovo.'});}
});
app.get('/api/advisor/questions/:id',(req,res)=>{
  try{res.json(getAdvisorDefinition(req.params.id));}catch(e){res.status(404).json({error:e.message});}
});
app.post('/api/advisor/resolve',(req,res)=>{
  try{const p=buildSitePayload(req.body||{});res.json({siteConfig:p.siteConfig});}
  catch(e){res.status(400).json({error:e.message});}
});
app.post('/api/site/generate',(req,res)=>{
  try{
    const payload=buildSitePayload(req.body||{});
    res.set('Cache-Control','no-store').json({...payload,previewHtml:renderHtml(payload)});
  }catch(e){res.status(400).json({error:e.message});}
});
const exportHits=new Map();
app.post('/api/site/export',async(req,res)=>{
  const who=req.ip;const now=Date.now(),prior=(exportHits.get(who)||[]).filter(t=>now-t<60000);
  if(prior.length>=6)return res.status(429).json({error:'Sačekajte minut pre sledećeg izvoza.'});
  prior.push(now);exportHits.set(who,prior);
  // Avoid growing an unbounded in-memory map on the Free instance.
  if(exportHits.size>500){for(const [ip,times] of exportHits)if(times.every(t=>now-t>60000))exportHits.delete(ip);}
  try{
    const payload=buildSitePayload(req.body||{});
    // One pairing and SITE ID for Booking, Commerce, or BOTH; never in ZIP.
    const issued=await attachPublicSiteTransport(payload,createBookingQueue(),{
      apiBaseUrl:process.env.PUBLIC_API_BASE_URL||(process.env.NODE_ENV==='production'?'':`http://localhost:${process.env.PORT||3000}`)
    });
    const zip=exportSiteZip(payload,{pairingCode:issued?.pairingCode,expiresIn:issued?.expiresIn});
    if(issued)res.set({'X-RMC-Booking-Code':issued.pairingCode,'X-RMC-Booking-Expires':String(issued.expiresIn)});
    res.set({ 'Content-Type':'application/zip', 'Content-Disposition':'attachment; filename="rmc-besplatan-sajt.zip"', 'Cache-Control':'no-store', 'Content-Length':String(zip.length)}).end(zip);
  }catch(e){res.status(e.status|| (e.message?.includes('Redis')?503:400)).json({error:e.status?e.message:e.message?.includes('Redis')?'Servis za uparivanje trenutno nije dostupan.':'Izvoz nije uspeo: '+e.message});}
});
// Reference V39.5 is served read-only in local development only, NEVER on Render.
const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const legacyRoot=path.resolve(process.env.LEGACY_ROOT||path.join(projectRoot,'..','web-solutions'));
if(process.env.NODE_ENV!=='production'&&existsSync(path.join(legacyRoot,'index.html'))){
  app.use('/legacy',express.static(legacyRoot));
  console.log('Read-only V39.5 reference:',legacyRoot);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const port=Number(process.env.PORT||3000);
  app.listen(port,'0.0.0.0',()=>console.log('RMC API listening at http://localhost:'+port+'/api/health'));
}
