import test from 'node:test';
import assert from 'node:assert/strict';
import {createBookingQueue} from '../src/booking-queue.js';
function mockRedis(){
 const m=new Map(),z=new Map();
 return async(cmd,...a)=>{
  if(cmd==='SET'){if(a.includes('NX')&&m.has(a[0]))return null;m.set(a[0],a[1]);return 'OK';}
  if(cmd==='GETDEL'){const v=m.get(a[0])||null;m.delete(a[0]);return v;}
  if(cmd==='GET')return m.get(a[0])||null;
  if(cmd==='EXISTS')return Number(m.has(a[0]));
  if(cmd==='DEL')return Number(m.delete(a[0]));
  if(cmd==='ZREM'){const set=z.get(a[0])||new Map();let n=0;for(const id of a.slice(1))n+=Number(set.delete(id));return n;}
  if(cmd==='ZRANGE')return [...(z.get(a[0])||new Map()).keys()];
  if(cmd==='MGET')return a.map(k=>m.get(k)||null);
  if(cmd==='EVAL'){
   const [, ,item,index,body,, ,bid]=a;
   if(m.has(item))return 0;
   const set=z.get(index)||new Map();if(set.size>=250)return -1;
   m.set(item,body);set.set(bid,Date.now());z.set(index,set);return 1;
  }
  throw Error('Mock unknown command '+cmd);
 };
}
const booking={requestId:'fb716e15-3a44-4d11-8077-a34d576ceff2',clientName:'Mira',phone:'060123456',serviceName:'Šišanje',date:'2026-11-15',time:'11:30',duration:30,note:'Test'};
test('pairing is short, single-use and private token never leaves manager claim',async()=>{
 const q=createBookingQueue(mockRedis());const issued=await q.issue();
 assert.match(issued.pairingCode,/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{2}$/);
 assert.equal(issued.pairingCode.length,12);assert.equal(issued.accessToken,undefined);
 const claimed=await q.claim(issued.pairingCode);
 assert.equal(claimed.siteId,issued.siteId);assert.equal(claimed.accessToken.length,43);
 await assert.rejects(()=>q.claim(issued.pairingCode),/iskorišćen/);
 await assert.rejects(()=>q.pending(issued.siteId,'a'.repeat(43)),/nije dozvoljen/);
 assert.deepEqual(await q.pending(issued.siteId,claimed.accessToken),[]);
});
test('booking arrives once, persists until acknowledged, and foreign manager cannot read it',async()=>{
 const q=createBookingQueue(mockRedis());const a=await q.issue();const b=await q.issue();
 const ca=await q.claim(a.pairingCode),cb=await q.claim(b.pairingCode);
 assert.deepEqual(await q.submit(a.siteId,booking),{requestId:booking.requestId,duplicate:false});
 assert.deepEqual(await q.submit(a.siteId,booking),{requestId:booking.requestId,duplicate:true});
 await assert.rejects(()=>q.pending(a.siteId,cb.accessToken),/nije dozvoljen/);
 assert.equal((await q.pending(a.siteId,ca.accessToken)).length,1);
 await q.acknowledge(a.siteId,ca.accessToken,booking.requestId);
 assert.equal((await q.pending(a.siteId,ca.accessToken)).length,0);
 await assert.rejects(()=>q.submit('bad',booking),/identifikator/);
 await assert.rejects(()=>q.submit(b.siteId,{...booking,note:'x'.repeat(400)}),/napomenu/);
});
