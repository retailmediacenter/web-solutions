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
 const allowed=['clientName','phone','serviceId','serviceName','date','time','duration','note','requestId'];
 if(Object.keys(raw).some(x=>!allowed.includes(x)))throw err(400,'Nepoznata polja rezervacije.');
 const clientName=String(raw.clientName||'').trim(),phone=String(raw.phone||'').trim(),serviceName=String(raw.serviceName||'').trim(),note=String(raw.note||'').trim();
 if(!clientName||clientName.length>100||phone.length>35||!serviceName||serviceName.length>100||note.length>350)throw err(400,'Proveri ime, telefon, uslugu i napomenu.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(raw.date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(raw.time)||!Number.isInteger(raw.duration)||raw.duration<5||raw.duration>1440)throw err(400,'Proveri datum, vreme i trajanje.');
 const date=new Date(`${raw.date}T00:00:00Z`);if(Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==raw.date)throw err(400,'Datum nije ispravan.');
 const serviceId=raw.serviceId==null?'':String(raw.serviceId).trim();
 if(serviceId&&!/^[A-Za-z0-9:_-]{2,120}$/.test(serviceId))throw err(400,'Neispravan identifikator usluge.');
 return {requestId:ensureRequestId(raw.requestId),clientName,phone,serviceId,serviceName,date:raw.date,time:raw.time,duration:raw.duration,note};
}
// Small injectable command adapter allows offline, deterministic tests without secrets.
export function createBookingQueue(redis){
 redis=redis||((...args)=>redisFromEnvironment()(...args));
 async function issue(profile=null){
   const siteId=id();const pairingCode=code();
   // A pending site has no access secret. Site identifier is public.
   const pairing=profile?{siteId,profile:parseBookingProfile(profile)}:{siteId};
   await redis('SET',key('pair',sha(pairingCode)),JSON.stringify(pairing),'EX',CODE_TTL,'NX');
   return {siteId,pairingCode,expiresIn:CODE_TTL};
 }
 async function claim(pairingCode){
   ensureCode(pairingCode);
   // Atomic consumption prevents a second device from claiming the same code.
   const stored=await redis('GETDEL',key('pair',sha(pairingCode)));
   if(!stored)throw err(404,'Kod je iskorišćen ili je istekao. Generiši novi sajt i kod.');
   let pairing;try{pairing=JSON.parse(stored);}catch{pairing={siteId:stored};}
   const siteId=ensureSite(pairing?.siteId);
   const accessToken=randomBytes(32).toString('base64url');
   await redis('SET',key('owner',siteId),sha(accessToken));
   return {siteId,accessToken,...(pairing.profile?{profile:parseBookingProfile(pairing.profile)}:{})};
 }
 async function authenticate(siteId,accessToken){
   ensureSite(siteId);ensureSecret(accessToken);
   const stored=await redis('GET',key('owner',siteId));
   const check=sha(accessToken);
   if(!stored||!timingSafeEqual(Buffer.from(stored),Buffer.from(check)))throw err(403,'Pristup sandučetu nije dozvoljen.');
 }
 async function submit(siteId,raw){
   ensureSite(siteId);
   // No unpaired site may accumulate requests in Redis.
   if(!await redis('EXISTS',key('owner',siteId)))throw err(404,'Sajt nije povezan sa Booking Managerom.');
   const booking=parseBooking(raw),record=JSON.stringify({...booking,receivedAt:new Date().toISOString()});
   // Lua transaction: duplicate request IDs cannot create duplicate inbox entries.
   const lua=`local item=KEYS[1]; local idx=KEYS[2]; if redis.call('EXISTS',item)==1 then return 0 end; if redis.call('ZCARD',idx)>=250 then return -1 end; redis.call('SET',item,ARGV[1],'EX',ARGV[2]); redis.call('ZADD',idx,ARGV[3],ARGV[4]); redis.call('EXPIRE',idx,ARGV[2]); return 1`;
   const result=await redis('EVAL',lua,2,key('msg',siteId,booking.requestId),key('index',siteId),record,QUEUE_TTL,Date.now(),booking.requestId);
   if(result===-1)throw err(429,'Sanduče je trenutno puno.');
   return {requestId:booking.requestId,duplicate:result===0};
 }
 async function pending(siteId,accessToken){
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
