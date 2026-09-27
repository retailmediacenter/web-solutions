/* V43.2.1: short one-time pairing + durable Redis inbox. No manager credentials in exported sites. */
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
const QUEUE_TTL=72*60*60, CODE_TTL=30*60;
const PREFIX='rmc:booking:v1:';
const sha=value=>createHash('sha256').update(value).digest('hex');
const code=()=>{
  // 10 symbols: 50 bits of entropy; 12 chars including two hyphens.
  const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes=randomBytes(10);const raw=[...bytes].map(n=>alphabet[n%alphabet.length]).join('');
  return `${raw.slice(0,4)}-${raw.slice(4,8)}-${raw.slice(8)}`;
};
const id=()=>randomBytes(18).toString('base64url');
const reservationCode=()=>{const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';const bytes=randomBytes(8);return [...bytes].map(n=>alphabet[n%alphabet.length]).join('');};
const key=(...parts)=>PREFIX+parts.join(':');
function redisFromEnvironment(env=process.env){
  const url=env.UPSTASH_REDIS_REST_URL,token=env.UPSTASH_REDIS_REST_TOKEN;
  if(!url||!token)throw new Error('Redis nije konfigurisan.');
  let u;try{u=new URL(url);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)throw Error();}catch{throw new Error('Neispravna Redis HTTPS adresa.');}
  return async (...command)=>{
    const response=await fetch(u,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(command),signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw new Error('Redis servis nije dostupan.');
    const data=await response.json();if(data.error)throw new Error('Redis nije prihvatio komandu.');
    return data.result;
  };
}
const err=(status,message)=>Object.assign(new Error(message),{status});
const ensureSite=x=>{if(typeof x!=='string'||!/^[A-Za-z0-9_-]{24}$/.test(x))throw err(400,'Neispravan identifikator sajta.');return x;};
const ensureSecret=x=>{if(typeof x!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(x))throw err(401,'Neispravan pristup.');return x;};
const ensureCode=x=>{if(typeof x!=='string'||!/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{2}$/.test(x))throw err(400,'Kod mora imati format XXXX-XXXX-XX.');return x;};
const ensureRequestId=x=>{if(typeof x!=='string'||!/^[0-9a-f-]{36}$/i.test(x))throw err(400,'Neispravan ID zahteva.');return x.toLowerCase();};
const ensureReservationCode=x=>{if(typeof x!=='string'||!/^[A-HJ-NP-Z2-9]{8}$/.test(x))throw err(500,'Neispravan rezervacioni kod.');return x;};
const TIMING_MODES=new Set(['EXACT_TIME','DAY_PART']);
const DAY_PARTS=new Set(['MORNING','AFTERNOON','ANY']);
const profileText=(value,max=180)=>String(value??'').trim().slice(0,max);
function parseBookingProfile(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw err(400,'Nedostaje Booking profil sajta.');
 const business=raw.business&&typeof raw.business==='object'&&!Array.isArray(raw.business)?raw.business:{};
 const name=profileText(business.name,100);
 if(!name)throw err(400,'Booking profil nema naziv firme.');
 const services=Array.isArray(raw.services)?raw.services:[];
 if(!services.length||services.length>60)throw err(400,'Booking profil nema ispravne usluge.');
 const used=new Set();
 return {version:1,business:{name,phone:profileText(business.phone,35),email:profileText(business.email,160),city:profileText(business.city,80),address:profileText(business.address,180),hours:profileText(business.hours,140)},services:services.map(service=>{
  const id=profileText(service?.id,120),serviceName=profileText(service?.name,100);
  if(!/^[A-Za-z0-9:_-]{2,120}$/.test(id)||!serviceName||used.has(id))throw err(400,'Booking profil ima neispravnu uslugu.');
  used.add(id);return {id,name:serviceName};
 })};
}
function parseBooking(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw err(400,'Neispravna rezervacija.');
 const allowed=['clientName','phone','serviceId','serviceName','date','time','timingMode','dayPart','duration','note','requestId'];
 if(Object.keys(raw).some(x=>!allowed.includes(x)))throw err(400,'Nepoznata polja rezervacije.');
 const clientName=String(raw.clientName||'').trim(),phone=String(raw.phone||'').trim(),serviceName=String(raw.serviceName||'').trim(),note=String(raw.note||'').trim();
 if(!clientName||clientName.length>100||phone.length>35||!serviceName||serviceName.length>100||note.length>700)throw err(400,'Proveri ime, telefon, uslugu i napomenu.');
 const timingMode=raw.timingMode==null?'EXACT_TIME':String(raw.timingMode);
 const dayPart=raw.dayPart==null?'':String(raw.dayPart);
 const hasExactTime=/^([01]\d|2[0-3]):[0-5]\d$/.test(raw.time);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(raw.date)||!TIMING_MODES.has(timingMode)||!Number.isInteger(raw.duration)||raw.duration<5||raw.duration>1440)throw err(400,'Proveri datum i trajanje.');
 if(timingMode==='EXACT_TIME'&&!hasExactTime)throw err(400,'Proveri vreme termina.');
 if(timingMode==='DAY_PART'&&!DAY_PARTS.has(dayPart))throw err(400,'Proveri željeni deo dana.');
 if(timingMode==='DAY_PART'&&raw.time!=null&&String(raw.time)!=='')throw err(400,'DAY_PART zahtev ne sme sadržati konkretno vreme.');
 const date=new Date(`${raw.date}T00:00:00Z`);if(Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==raw.date)throw err(400,'Datum nije ispravan.');
 const serviceId=raw.serviceId==null?'':String(raw.serviceId).trim();
 if(serviceId&&!/^[A-Za-z0-9:_-]{2,120}$/.test(serviceId))throw err(400,'Neispravan identifikator usluge.');
 return {requestId:ensureRequestId(raw.requestId),clientName,phone,serviceId,serviceName,date:raw.date,time:timingMode==='EXACT_TIME'?String(raw.time):'',timingMode,dayPart:timingMode==='DAY_PART'?dayPart:'',duration:raw.duration,note};
}
// Small injectable command adapter allows offline, deterministic tests without secrets.
export function createBookingQueue(redis,{makeReservationCode=reservationCode}={}){
 redis=redis||((...args)=>redisFromEnvironment()(...args));
 async function issue(profile,{siteId=null}={}){
   // A pairing without a bootstrap profile can never be completed safely.
   const validProfile=parseBookingProfile(profile);
   const assignedId=siteId==null?id():ensureSite(siteId);const pairingCode=code();
   const pairing={siteId:assignedId,profile:validProfile};
   await redis('SET',key('pair',sha(pairingCode)),JSON.stringify(pairing),'EX',CODE_TTL,'NX');
   return {siteId:assignedId,pairingCode,expiresIn:CODE_TTL};
 }
 async function claim(pairingCode){
   ensureCode(pairingCode);
   // Atomic consumption prevents a second device from claiming the same code.
   const pairKey=key('pair',sha(pairingCode));
   // Validate before the one-way GETDEL. Invalid legacy data is left to expire.
   const preview=await redis('GET',pairKey);
   if(!preview)throw err(404,'Kod je iskorišćen ili je istekao. Generiši novi sajt i kod.');
   let checked;try{checked=JSON.parse(preview);parseBookingProfile(checked?.profile);ensureSite(checked?.siteId);}catch{throw err(400,'Kod nema ispravan Booking profil. Generiši novi sajt i kod.');}
   const stored=await redis('GETDEL',pairKey);
   if(!stored)throw err(404,'Kod je iskorišćen ili je istekao. Generiši novi sajt i kod.');
   let pairing;try{pairing=JSON.parse(stored);}catch{throw err(400,'Kod nema ispravan Booking profil.');}
   const siteId=ensureSite(pairing?.siteId);
   const profile=parseBookingProfile(pairing?.profile);
   const accessToken=randomBytes(32).toString('base64url');
   await redis('SET',key('owner',siteId),sha(accessToken));
   return {siteId,accessToken,profile};
 }
 async function authenticate(siteId,accessToken){
   ensureSite(siteId);ensureSecret(accessToken);
   const stored=await redis('GET',key('owner',siteId));
   const check=sha(accessToken);
   if(!stored||!timingSafeEqual(Buffer.from(stored),Buffer.from(check)))throw err(403,'Pristup sandučetu nije dozvoljen.');
 }
 async function submit(siteId,raw){
   ensureSite(siteId);
   if(!await redis('EXISTS',key('owner',siteId)))throw err(404,'Sajt nije povezan sa Booking Managerom.');
   const booking=parseBooking(raw),requestCodeKey=key('request-code',siteId,booking.requestId);
   const knownCode=await redis('GET',requestCodeKey);
   if(knownCode)return {requestId:booking.requestId,reservationCode:ensureReservationCode(knownCode),duplicate:true};
   let assignedCode='';
   for(let attempt=0;attempt<8;attempt++){
     const candidate=ensureReservationCode(makeReservationCode());
     const locked=await redis('SET',key('reservation',siteId,candidate),booking.requestId,'EX',QUEUE_TTL,'NX');
     if(locked){assignedCode=candidate;break;}
   }
   if(!assignedCode)throw err(503,'Nije moguće dodeliti rezervacioni kod. Pokušajte ponovo.');
   const record=JSON.stringify({...booking,reservationCode:assignedCode,receivedAt:new Date().toISOString()});
   const lua=`local item=KEYS[1]; local idx=KEYS[2]; if redis.call('EXISTS',item)==1 then return 0 end; if redis.call('ZCARD',idx)>=250 then return -1 end; redis.call('SET',item,ARGV[1],'EX',ARGV[2]); redis.call('ZADD',idx,ARGV[3],ARGV[4]); redis.call('EXPIRE',idx,ARGV[2]); return 1`;
   let result;try{result=await redis('EVAL',lua,2,key('msg',siteId,booking.requestId),key('index',siteId),record,QUEUE_TTL,Date.now(),booking.requestId);}catch(error){await redis('DEL',key('reservation',siteId,assignedCode));throw error;}
   if(result===-1){await redis('DEL',key('reservation',siteId,assignedCode));throw err(429,'Sanduče je trenutno puno.');}
   if(result===0){
     await redis('DEL',key('reservation',siteId,assignedCode));
     const stored=await redis('GET',key('msg',siteId,booking.requestId));
     let previous;try{previous=JSON.parse(stored);}catch{throw err(503,'Postojeći zahtev nema čitljiv rezervacioni kod.');}
     const previousCode=ensureReservationCode(previous?.reservationCode);
     await redis('SET',requestCodeKey,previousCode,'EX',QUEUE_TTL);
     return {requestId:booking.requestId,reservationCode:previousCode,duplicate:true};
   }
   await redis('SET',requestCodeKey,assignedCode,'EX',QUEUE_TTL);
   return {requestId:booking.requestId,reservationCode:assignedCode,duplicate:false};
 } async function pending(siteId,accessToken){
   await authenticate(siteId,accessToken);
   const ids=await redis('ZRANGE',key('index',siteId),0,249);
   if(!ids?.length)return [];
   const values=await redis('MGET',...ids.map(v=>key('msg',siteId,v)));
   // Expired records can remain in the index; remove those entries on read.
   const stale=ids.filter((_,i)=>!values[i]);
   if(stale.length)await redis('ZREM',key('index',siteId),...stale);
   return values.filter(Boolean).map(x=>JSON.parse(x));
 }
 async function acknowledge(siteId,accessToken,requestId){
   await authenticate(siteId,accessToken);ensureRequestId(requestId);
   // Client calls this ONLY after IndexedDB transaction completes successfully.
   await redis('DEL',key('msg',siteId,requestId));
   await redis('ZREM',key('index',siteId),requestId);
   return {ok:true};
 }
 return {issue,claim,authenticate,submit,pending,acknowledge,redis};
}
