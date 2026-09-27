import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createBookingQueue} from '../src/booking-queue.js';

const prefix='rmc:booking:v1:';
function redisFake(){
 const db=new Map(),groups=new Map();
 const redis=async(cmd,...args)=>{
  if(cmd==='SET'){if(args.includes('NX')&&db.has(args[0]))return null;db.set(args[0],args[1]);return 'OK';}
  if(cmd==='GET')return db.get(args[0])||null;
  if(cmd==='GETDEL'){const v=db.get(args[0])||null;db.delete(args[0]);return v;}
  if(cmd==='EXISTS')return Number(db.has(args[0]));
  if(cmd==='DEL')return Number(db.delete(args[0]));
  if(cmd==='SADD'){const group=groups.get(args[0])||new Set();group.add(args[1]);groups.set(args[0],group);return 1;}
  if(cmd==='SMEMBERS')return [...(groups.get(args[0])||[])];
  if(cmd==='ZRANGE')return [...(groups.get(args[0])||[])];
  if(cmd==='ZREM'){const group=groups.get(args[0])||new Set();let n=0;for(const value of args.slice(1))n+=Number(group.delete(value));return n;}
  if(cmd==='MGET')return args.map(k=>db.get(k)||null);
  if(cmd==='EVAL'){
   if(args[0].includes('SMEMBERS')){
    const [, ,ownerKey,indexKey,ownerHash,allowedPrefix]=args;
    if(db.get(ownerKey)!==ownerHash)return 0;
    for(const entry of groups.get(indexKey)||[])if(entry.startsWith(allowedPrefix))db.delete(entry);
    groups.delete(indexKey);db.delete(ownerKey);return 1;
   }
   // Existing atomic submission path: don't replace it with a new implementation.
   const [,,msgKey,indexKey,record,, ,requestId]=args;
   if(db.has(msgKey))return 0;
   const group=groups.get(indexKey)||new Set();group.add(requestId);groups.set(indexKey,group);db.set(msgKey,record);return 1;
  }
  throw Error('Unexpected fake Redis command: '+cmd);
 };
 return {redis,db,groups};
}
const profile={version:1,business:{name:'Vodoinstalater TEST'},services:[{id:'pipe-service',name:'Intervencija'}]};
const booking={requestId:'bb716e15-3a44-4d11-8077-a34d576ceff2',clientName:'Probni klijent',phone:'060111111',serviceId:'pipe-service',serviceName:'Intervencija',date:'2026-10-02',time:'',timingMode:'DAY_PART',dayPart:'MORNING',duration:60,note:'Proba'};

test('disconnect is token-bound, atomic, preserves queued requests for same siteId re-pair, revokes push',async()=>{
 const {redis,db,groups}=redisFake();const q=createBookingQueue(redis);
 const issued=await q.issue(profile),claimed=await q.claim(issued.pairingCode);
 const second=await q.issue(profile),secondOwner=await q.claim(second.pairingCode);
 assert.equal((await q.submit(issued.siteId,booking)).duplicate,false);
 const subKey=`${prefix}push:${issued.siteId}:old-sub`;
 const indexKey=`${prefix}push-index:${issued.siteId}`;
 db.set(subKey,'stale-subscription');groups.set(indexKey,new Set([subKey]));
 await assert.rejects(()=>q.disconnect(issued.siteId,secondOwner.accessToken),/nije dozvoljen/);
 assert.equal(db.get(subKey),'stale-subscription');
 assert.equal((await q.pending(issued.siteId,claimed.accessToken)).length,1);
 assert.deepEqual(await q.disconnect(issued.siteId,claimed.accessToken),{ok:true});
 assert.equal(db.has(subKey),false);assert.equal(groups.has(indexKey),false);
 await assert.rejects(()=>q.pending(issued.siteId,claimed.accessToken),/nije dozvoljen/);
 await assert.rejects(()=>q.submit(issued.siteId,{...booking,requestId:'cb716e15-3a44-4d11-8077-a34d576ceff2'}),/nije povezan/);
 assert.deepEqual(await q.pending(second.siteId,secondOwner.accessToken),[]);
 const again=await q.issue(profile,{siteId:issued.siteId}),owner2=await q.claim(again.pairingCode);
 assert.equal(owner2.siteId,issued.siteId);assert.equal((await q.pending(issued.siteId,owner2.accessToken)).length,1);
 await assert.rejects(()=>q.disconnect(issued.siteId,claimed.accessToken),/nije dozvoljen/);
});

test('disconnect endpoint is private and CORS remains allow-list based',()=>{
 const routes=readFileSync(new URL('../src/booking-routes.js',import.meta.url),'utf8');
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(routes,/router\.delete\('\/connections\/:siteId'/);
 assert.match(routes,/queue\.disconnect\(req\.params\.siteId,auth\(req\)\)/);
 assert.match(app,/Access-Control-Allow-Methods.*GET,POST,DELETE,OPTIONS/);
 assert.match(app,/origins\.includes\(origin\)/);
});
