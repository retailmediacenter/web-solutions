/* V46.0: Commerce shares the Booking site's owner credential/Redis, but uses
   a separate event inbox so legacy Booking managers never misread an ORDER. */
import {randomBytes} from 'node:crypto';
import {redisPrefix} from './redis-namespace.js';
const TTL=72*60*60;

const e=(status,message)=>Object.assign(new Error(message),{status});
const siteId=x=>{if(typeof x!=='string'||!/^[A-Za-z0-9_-]{24}$/.test(x))throw e(400,'Neispravan SITE ID.');return x;};
const requestId=x=>{if(typeof x!=='string'||!/^[a-f0-9-]{36}$/i.test(x))throw e(400,'Neispravan ID zahteva.');return x.toLowerCase();};
const orderCode=()=>[...randomBytes(8)].map(n=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n%32]).join('');
const codePattern=/^[A-HJ-NP-Z2-9]{8}$/;
const clean=(v,max)=>String(v??'').trim().slice(0,max);
const money=x=>Math.round(x*100)/100;
const quantityValid=(qty,step,unit)=>Number.isFinite(qty)&&qty>= (unit==='kg'?.5:1)&&qty<=99&&Math.abs(qty/step-Math.round(qty/step))<1e-7;
function normalizeOrder(raw,profile){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw e(400,'Neispravan zahtev za porudžbinu.');
 const fields=['requestId','type','clientName','phone','note','fulfillment','items'];
 if(Object.keys(raw).some(k=>!fields.includes(k)))throw e(400,'Nepoznata polja u zahtevu.');
 const type=raw.type||'ORDER';
 if(!['ORDER','INQUIRY'].includes(type))throw e(400,'Nepoznat tip Commerce zahteva.');
 const clientName=clean(raw.clientName,100),phone=clean(raw.phone,35),note=clean(raw.note,700);
 if(clientName.length<2||!/^\+?[\d\s()\-]{6,35}$/.test(phone)||String(raw.clientName||'').trim().length>100||String(raw.note||'').trim().length>700)throw e(400,'Proveri ime, telefon i napomenu.');
 const fulfillment=type==='INQUIRY'?'':raw.fulfillment;
 if(type==='ORDER'&&!['PICKUP','AGREEMENT'].includes(fulfillment))throw e(400,'Izaberite način preuzimanja.');
 if(type==='INQUIRY'&&raw.fulfillment!=null&&raw.fulfillment!=='')throw e(400,'Upit nema preuzimanje.');
 if(!Array.isArray(raw.items)||!raw.items.length||raw.items.length>30)throw e(400,'Porudžbina mora sadržati 1–30 artikala.');
 const inventory=new Map(profile.commerce.products.map(p=>[p.id,p]));
 const items=raw.items.map(row=>{
  if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).some(k=>!['productId','quantity','size','preparation','variant'].includes(k)))throw e(400,'Neispravan artikal.');
  const p=inventory.get(row.productId);
  if(!p)throw e(400,'Artikal nije dostupan u povezanom katalogu.');
  const quantity=Number(row.quantity);
  if(!quantityValid(quantity,p.step,p.unit))throw e(400,'Neispravna količina artikla.');
  const size=clean(row.size,12),preparation=clean(row.preparation,20),variant=clean(row.variant,110);
  if(size&&(!p.allowSize||!/^(?:3[6-9]|4[0-5])$/.test(size)))throw e(400,'Neispravna veličina.');
  if(preparation&&(!p.allowPreparation||!['Sveže','Grilovano'].includes(preparation)))throw e(400,'Neispravna priprema.');
  if(variant&&!p.allowVariant)throw e(400,'Ovaj proizvod nema slobodnu varijantu.');
  if(p.requireVariant&&!variant)throw e(400,'Nedostaje podatak o kompatibilnosti/varijanti.');
  return {productId:p.id,name:p.name,image:p.image,unit:p.unit,quantity,unitPrice:p.price,lineTotal:money(quantity*p.price),size,preparation,variant};
 });
 return {requestId:requestId(raw.requestId),type,clientName,phone,note,fulfillment,
  currency:'RSD',pricing:'indicative',items,total:money(items.reduce((sum,item)=>sum+item.lineTotal,0))};
}
export function createCommerceQueue(bookingQueue,{makeOrderCode=orderCode}={}){
 if(!bookingQueue?.redis||!bookingQueue?.authenticate)throw new Error('Commerce zahteva postojeći Booking autentikacioni sloj.');
 const redis=bookingQueue.redis,namespace=bookingQueue.namespace||'',prefix=redisPrefix('commerce',namespace),bookingPrefix=redisPrefix('booking',namespace),key=(...p)=>prefix+p.join(':');
 async function submit(site,raw){
  siteId(site);
  if(!await redis('EXISTS',bookingPrefix+'owner:'+site))throw e(404,'Sajt nije povezan sa Business Portalom.');
  const rawProfile=await redis('GET',bookingPrefix+'profile:'+site);
  let profile;try{profile=JSON.parse(rawProfile);}catch{}
  if(!profile?.commerce?.enabled)throw e(403,'Commerce nije aktiviran za ovaj povezani sajt.');
  const order=normalizeOrder(raw,profile);
  const codeKey=key('request-code',site,order.requestId);
  const existingCode=await redis('GET',codeKey);
  if(existingCode){if(!codePattern.test(existingCode))throw e(503,'Oštećen kod postojećeg zahteva.');return {requestId:order.requestId,orderCode:existingCode,duplicate:true};}
  let assigned='';
  for(let n=0;n<8;n++){
   const candidate=makeOrderCode();if(!codePattern.test(candidate))throw e(503,'Neispravan kod porudžbine.');
   if(await redis('SET',key('code',site,candidate),order.requestId,'EX',TTL,'NX')){assigned=candidate;break;}
  }
  if(!assigned)throw e(503,'Trenutno nije moguće dodeliti kod porudžbine.');
  const record=JSON.stringify({...order,orderCode:assigned,receivedAt:new Date().toISOString()});
  const script=`local item=KEYS[1]; local idx=KEYS[2]; if redis.call('EXISTS',item)==1 then return 0 end; if redis.call('ZCARD',idx)>=250 then return -1 end; redis.call('SET',item,ARGV[1],'EX',ARGV[2]); redis.call('ZADD',idx,ARGV[3],ARGV[4]); redis.call('EXPIRE',idx,ARGV[2]); return 1`;
  let result;try{result=await redis('EVAL',script,2,key('msg',site,order.requestId),key('index',site),record,TTL,Date.now(),order.requestId);}catch(error){await redis('DEL',key('code',site,assigned));throw error;}
  if(result===-1){await redis('DEL',key('code',site,assigned));throw e(429,'Sanduče je trenutno puno.');}
  if(result===0){
   await redis('DEL',key('code',site,assigned));
   let previous;try{previous=JSON.parse(await redis('GET',key('msg',site,order.requestId)));}catch{}
   if(!codePattern.test(previous?.orderCode||''))throw e(503,'Postojeći zahtev nema ispravan kod.');
   await redis('SET',codeKey,previous.orderCode,'EX',TTL);
   return {requestId:order.requestId,orderCode:previous.orderCode,duplicate:true};
  }
  await redis('SET',codeKey,assigned,'EX',TTL);
  return {requestId:order.requestId,orderCode:assigned,duplicate:false};
 }
 async function pending(site,token){
  siteId(site);await bookingQueue.authenticate(site,token);
  const ids=await redis('ZRANGE',key('index',site),0,249);
  if(!ids?.length)return [];
  const records=await redis('MGET',...ids.map(id=>key('msg',site,id)));
  const stale=ids.filter((_,i)=>!records[i]);if(stale.length)await redis('ZREM',key('index',site),...stale);
  return records.filter(Boolean).map(x=>JSON.parse(x));
 }
 async function acknowledge(site,token,req){
  siteId(site);await bookingQueue.authenticate(site,token);requestId(req);
  await redis('DEL',key('msg',site,req));await redis('ZREM',key('index',site),req);
  return {ok:true};
 }
 return {submit,pending,acknowledge};
}
