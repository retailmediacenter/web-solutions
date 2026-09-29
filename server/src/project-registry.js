import {randomBytes} from 'node:crypto';

const invalid=(message,status=400)=>Object.assign(new Error(message),{status});
const validSiteId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{24}$/.test(value);
const id=()=>randomBytes(18).toString('base64url');

export function createProjectRegistry(queue,{now=()=>new Date().toISOString()}={}){
 if(!queue?.redis||!queue?.key||!queue?.validateProfile)throw new Error('Project Registry zahteva Booking Redis sloj.');
 const key=siteId=>queue.key('project',siteId);
 const read=async siteId=>{
  if(!validSiteId(siteId))throw invalid('Neispravan Project ID.');
  const raw=await queue.redis('GET',key(siteId));if(!raw)throw invalid('Projekat nije pronađen.',404);
  try{return JSON.parse(raw);}catch{throw invalid('Sačuvani projekat nije čitljiv.',503);}
 };
 const save=async project=>{await queue.redis('SET',key(project.siteId),JSON.stringify(project));return project;};
 async function register(sourcePayload){
  const site=sourcePayload?.siteConfig||sourcePayload;
  const booking=Boolean(site?.capabilities?.booking?.enabled&&site.bookingProfile?.services?.length);
  const commerce=Boolean(site?.capabilities?.commerce&&site.siteProfile?.commerce?.enabled);
  if(!booking&&!commerce)return null;
  const profiles={};
  if(booking)profiles.booking=queue.validateProfile(site.bookingProfile);
  if(commerce){
   profiles.commerce=queue.validateProfile({...site.siteProfile,services:[]});
   profiles.business=queue.validateProfile(site.siteProfile);
  }else profiles.business=profiles.booking;
  for(let attempt=0;attempt<4;attempt++){
   const siteId=id(),project={version:2,siteId,business:{name:profiles.business.business.name},capabilities:{booking,commerce},profiles,siteConfig:site,sourcePayload:sourcePayload?.siteConfig?sourcePayload:{siteConfig:site},createdAt:now(),activation:null};
   if(await queue.redis('SET',key(siteId),JSON.stringify(project),'NX'))return project;
  }
  throw invalid('Nije moguće dodeliti Project ID. Pokušajte ponovo.',503);
 }
 async function summary(siteId){const p=await read(siteId);return {siteId:p.siteId,business:p.business,capabilities:p.capabilities,profiles:p.profiles,siteConfig:p.siteConfig,createdAt:p.createdAt,activation:p.activation};}
 async function activate(siteId,packageName){
  const project=await read(siteId),name=String(packageName||'').toLowerCase();
  const profile=name==='booking'?project.profiles.booking:name==='commerce'?project.profiles.commerce:name==='business'?project.profiles.business:null;
  if(!profile)throw invalid('Izabrani paket nije dostupan za ovaj projekat.');
  const issued=await queue.issue(profile,{siteId:project.siteId});
  project.activation={package:name,issuedAt:now()};await save(project);
  return {...issued,package:name};
 }
 async function activateExport(siteId,packageName,apiBaseUrl){
  const project=await read(siteId),name=String(packageName||'').toLowerCase();
  const profile=name==='booking'?project.profiles.booking:name==='commerce'?project.profiles.commerce:name==='business'?project.profiles.business:null;
  if(!profile)throw invalid('Izabrani paket nije dostupan za ovaj projekat.');
  let url;try{url=new URL(apiBaseUrl);}catch{throw invalid('Produkcioni API za aktivirani ZIP nije podešen.',503);}
  if(url.protocol!=='https:'||url.pathname!=='/'||url.search||url.hash)throw invalid('Produkcioni API za aktivirani ZIP nije bezbedno podešen.',503);
  if(!project.sourcePayload)throw invalid('Ovaj stariji projekat nema sačuvane podatke za aktivirani ZIP. Generišite ga ponovo.',409);
  const payload=structuredClone(project.sourcePayload),site=payload.siteConfig;
  site.projectId=project.siteId;
  const transport={siteId:project.siteId,apiBaseUrl:url.origin};
  if(name==='booking'||name==='business'){
   if(!project.profiles.booking)throw invalid('Booking paket nije dostupan za ovaj projekat.');
   site.bookingTransport=transport;
  }
  if(name==='commerce'||name==='business'){
   if(!project.profiles.commerce)throw invalid('Commerce paket nije dostupan za ovaj projekat.');
   site.commerceTransport=transport;
  }
  const issued=await queue.issue(profile,{siteId:project.siteId});
  project.activation={package:name,issuedAt:now()};await save(project);
  return {...issued,package:name,payload};
 }
 return {register,summary,activate,activateExport};
}
