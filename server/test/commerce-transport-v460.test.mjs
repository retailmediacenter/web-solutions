import test from 'node:test';
import assert from 'node:assert/strict';
import {createBookingQueue} from '../src/booking-queue.js';
import {createCommerceQueue} from '../src/commerce-queue.js';
import {buildSitePayload} from '../src/site.js';
import {PHARMACY_ORDERS} from '../src/pharmacy-engine.js';
import {scenarios,buildQaPayload} from '../../scripts/publication/scenarios.mjs';

const booking={requestId:'fb716e15-3a44-4d11-8077-a34d576ceff2',clientName:'Mira',phone:'060123456',serviceId:'tasting-1',serviceName:'Degustacija',date:'2026-11-15',time:'11:30',duration:30,note:'Test'};
const order={requestId:'cb716e15-3a44-4d11-8077-a34d576ceff2',type:'ORDER',clientName:'Dragan',phone:'060 123 456',note:'Preuzimam sutra',fulfillment:'PICKUP',items:[{productId:'wine-1',quantity:2}]};
const commerce={enabled:true,currency:'RSD',products:[{id:'wine-1',name:'Vino',price:1200,unit:'kom',step:1,image:'assets/images/curated/retail/wine-shop/products/wine_01.jpg'},{id:'butcher-1',name:'Meso',price:1000,unit:'kg',step:.5,allowPreparation:true,allowVariant:true}]};
const hybrid={version:2,business:{name:'Vinoteka TEST',phone:'060123456'},services:[{id:'tasting-1',name:'Degustacija'}],commerce};
const onlyShop={...hybrid,services:[],business:{name:'Prodavnica TEST'}};
function fakeRedis(){
 const db=new Map(),groups=new Map();
 const redis=async(cmd,...a)=>{
  if(cmd==='SET'){if(a.includes('NX')&&db.has(a[0]))return null;db.set(a[0],a[1]);return 'OK';}
  if(cmd==='GET')return db.get(a[0])??null;
  if(cmd==='GETDEL'){const v=db.get(a[0])??null;db.delete(a[0]);return v;}
  if(cmd==='EXISTS')return Number(db.has(a[0]));
  if(cmd==='DEL')return Number(db.delete(a[0]));
  if(cmd==='ZRANGE')return [...(groups.get(a[0])||new Map()).keys()];
  if(cmd==='MGET')return a.map(k=>db.get(k)??null);
  if(cmd==='ZREM'){let n=0;const g=groups.get(a[0])||new Map();for(const id of a.slice(1))n+=Number(g.delete(id));return n;}
  if(cmd==='EVAL'){
   const [script,,msg,index,body,,,req]=a;
   if(!script.includes('ZADD'))throw new Error('unexpected EVAL');
   if(db.has(msg))return 0;
   const group=groups.get(index)||new Map();if(group.size>=250)return -1;
   db.set(msg,body);group.set(req,Date.now());groups.set(index,group);return 1;
  }
  throw new Error('Unsupported fake Redis '+cmd);
 };
 return {redis,db};
}
// V46.0 tests run without actual Redis, tokens, browsers, or publication.
test('shop-only site pairs using same SITE ID without a fake Booking service',async()=>{
 const {redis}=fakeRedis(),q=createBookingQueue(redis),cq=createCommerceQueue(q);
 const issued=await q.issue(onlyShop),claimed=await q.claim(issued.pairingCode);
 assert.equal(claimed.siteId,issued.siteId);assert.deepEqual(claimed.profile.services,[]);
 assert.equal(claimed.profile.commerce.enabled,true);
 const receipt=await cq.submit(issued.siteId,order);
 assert.equal(receipt.duplicate,false);assert.match(receipt.orderCode,/^[A-HJ-NP-Z2-9]{8}$/);
 const inbox=await cq.pending(issued.siteId,claimed.accessToken);
 assert.equal(inbox.length,1);assert.equal(inbox[0].items[0].unitPrice,1200);
 assert.equal(inbox[0].total,2400);assert.equal(inbox[0].pricing,'indicative');
 await cq.acknowledge(issued.siteId,claimed.accessToken,order.requestId);
 assert.deepEqual(await cq.pending(issued.siteId,claimed.accessToken),[]);
 assert.deepEqual(await cq.submit(issued.siteId,order),{...receipt,duplicate:true});
});
test('hybrid sends Booking and Commerce to same owner token but distinct inboxes',async()=>{
 const {redis}=fakeRedis(),q=createBookingQueue(redis),cq=createCommerceQueue(q);
 const {siteId,pairingCode}=await q.issue(hybrid),{accessToken}=await q.claim(pairingCode);
 await q.submit(siteId,booking);await cq.submit(siteId,order);
 assert.equal((await q.pending(siteId,accessToken)).length,1);
 assert.equal((await cq.pending(siteId,accessToken)).length,1);
 await cq.acknowledge(siteId,accessToken,order.requestId);
 assert.equal((await q.pending(siteId,accessToken)).length,1);
});
test('foreign bearer and unpaired site cannot read or send orders',async()=>{
 const {redis}=fakeRedis(),q=createBookingQueue(redis),cq=createCommerceQueue(q);
 const a=await q.issue(onlyShop),b=await q.issue(onlyShop);
 const ca=await q.claim(a.pairingCode),cb=await q.claim(b.pairingCode);
 await assert.rejects(()=>cq.pending(a.siteId,cb.accessToken),/nije dozvoljen/);
 await assert.rejects(()=>cq.submit('123',order),/SITE ID/);
 await assert.rejects(()=>cq.submit('x'.repeat(24),order),/nije povezan/);
 await cq.submit(a.siteId,order);
 assert.equal((await cq.pending(b.siteId,cb.accessToken)).length,0);
 assert.equal((await cq.pending(a.siteId,ca.accessToken)).length,1);
});
test('never trusts visitor price/product/unit/quantity/preparation',async()=>{
 const {redis}=fakeRedis(),q=createBookingQueue(redis),cq=createCommerceQueue(q);
 const a=await q.issue(onlyShop);await q.claim(a.pairingCode);
 const variants=[
  {items:[{productId:'wine-1',quantity:2,unitPrice:.01}]},
  {items:[{productId:'unknown',quantity:1}]},
  {items:[{productId:'wine-1',quantity:1.1}]},
  {items:[{productId:'wine-1',quantity:1,preparation:'Grilovano'}]},
  {items:[{productId:'wine-1',quantity:1,variant:'I can inject'}]},
  {items:[]},
  {fulfillment:'DELIVERY'},
  {clientName:'a'}
 ];
 for(let n=0;n<variants.length;n++)await assert.rejects(()=>cq.submit(a.siteId,{...order,requestId:`bb716e15-3a44-4d11-8077-${String(n).padStart(12,'0')}`,...variants[n]}),{status:400});
 const meat={...order,requestId:'ab716e15-3a44-4d11-8077-a34d576ceff2',items:[{productId:'butcher-1',quantity:1.5,preparation:'Grilovano',variant:'Bez soli'}]};
 await cq.submit(a.siteId,meat);
 const pending=await cq.pending(a.siteId,(await q.claim((await q.issue(onlyShop,{siteId:a.siteId})).pairingCode)).accessToken);
 assert.equal(pending[0].items[0].lineTotal,1500);
});
test('a new Booking-only pairing revokes an old Commerce snapshot',async()=>{
 const {redis}=fakeRedis(),q=createBookingQueue(redis),cq=createCommerceQueue(q);
 const a=await q.issue(hybrid);await q.claim(a.pairingCode);
 const renewed=await q.issue({version:1,business:{name:'Vinoteka TEST'},services:[{id:'tasting-1',name:'Degustacija'}]},{siteId:a.siteId});await q.claim(renewed.pairingCode);
 await assert.rejects(()=>cq.submit(a.siteId,order),/nije aktiviran/);
});
test('real Advisor/QA profiles preserve independent commerce and booking capabilities',()=>{
 for(const scenario of scenarios){
  const {siteConfig}=buildQaPayload(scenario);
  if(scenario.expect.commerce){
   assert.ok(siteConfig.siteProfile?.commerce?.products?.length,scenario.slug);
   assert.equal(siteConfig.siteProfile.commerce.currency,'RSD');
   assert.equal(siteConfig.siteProfile.services.length,siteConfig.bookingProfile?.services?.length||0);
  }else assert.equal(siteConfig.siteProfile,undefined,scenario.slug);
  if(scenario.expect.booking)assert.ok(siteConfig.bookingProfile?.services?.length,scenario.slug);
 }
 const pharmacy=buildSitePayload({businessId:'pharmacy',businessName:'Apoteka Test',style:'modern',goal:'visit',
  answers:{businessMode:PHARMACY_ORDERS,pharmacyConsultations:true,contactPhone:'060123456'}});
 assert.equal(pharmacy.siteConfig.siteProfile.services.length,0);
 assert.equal(pharmacy.siteConfig.siteProfile.commerce.products.length,3);
 assert.equal(pharmacy.siteConfig.capabilities.pharmacyConsultations,true);
});

test('production namespace isolates Booking and Commerce keys in a shared Redis database',async()=>{
 const {redis,db}=fakeRedis(),q=createBookingQueue(redis,{namespace:'prod'}),cq=createCommerceQueue(q);
 const issued=await q.issue(onlyShop),claimed=await q.claim(issued.pairingCode);
 await q.submit(issued.siteId,booking);await cq.submit(issued.siteId,order);
 const keys=[...db.keys()];
 assert.ok(keys.some(key=>key.startsWith('rmc:booking:prod:v1:')));
 assert.ok(keys.some(key=>key.startsWith('rmc:commerce:prod:v1:')));
 assert.equal(keys.some(key=>key.startsWith('rmc:booking:v1:')||key.startsWith('rmc:commerce:v1:')),false);
 assert.equal((await q.pending(issued.siteId,claimed.accessToken)).length,1);
 assert.equal((await cq.pending(issued.siteId,claimed.accessToken)).length,1);
});
