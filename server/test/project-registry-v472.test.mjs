import test from 'node:test';
import assert from 'node:assert/strict';
import {createBookingQueue} from '../src/booking-queue.js';
import {createProjectRegistry} from '../src/project-registry.js';

function mockRedis(){
 const values=new Map();
 return async(command,...args)=>{
  if(command==='SET'){if(args.includes('NX')&&values.has(args[0]))return null;values.set(args[0],args[1]);return 'OK';}
  if(command==='GET')return values.get(args[0])||null;
  if(command==='GETDEL'){const value=values.get(args[0])||null;values.delete(args[0]);return value;}
  throw new Error('Unsupported Redis command '+command);
 };
}
const profile={version:1,business:{name:'Primer salon',phone:'+381601234567',email:'',city:'Beograd',address:'Primer 1',hours:''},services:[{id:'hair-cut',name:'Šišanje'}]};
const bookable={capabilities:{booking:{enabled:true},commerce:false},bookingProfile:profile,siteProfile:profile};

test('public project registration stores a stable non-secret Project ID without issuing a pairing code',async()=>{
 const queue=createBookingQueue(mockRedis()),projects=createProjectRegistry(queue,{now:()=> '2026-09-29T10:00:00.000Z'});
 const created=await projects.register(bookable);
 assert.match(created.siteId,/^[A-Za-z0-9_-]{24}$/);
 assert.equal(created.pairingCode,undefined);
 const summary=await projects.summary(created.siteId);
 assert.deepEqual(summary.business,{name:'Primer salon'});
 assert.deepEqual(summary.capabilities,{booking:true,commerce:false});
});

test('only activation issues a one-time code and it claims the stored profile',async()=>{
 const queue=createBookingQueue(mockRedis()),projects=createProjectRegistry(queue);
 const created=await projects.register(bookable),issued=await projects.activate(created.siteId,'booking');
 assert.equal(issued.siteId,created.siteId);
 assert.match(issued.pairingCode,/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{2}$/);
 const claimed=await queue.claim(issued.pairingCode);
 assert.equal(claimed.siteId,created.siteId);
 assert.deepEqual(claimed.profile,profile);
 await assert.rejects(()=>queue.claim(issued.pairingCode),/iskorišćen/);
});

test('activated export adds only the selected Portal transport to the stored source payload',async()=>{
 const queue=createBookingQueue(mockRedis()),projects=createProjectRegistry(queue);
 const payload={siteConfig:structuredClone(bookable),catalog:{hero:'assets/images/curated/salon/hero.jpg',services:[]}};
 const created=await projects.register(payload);
 const activated=await projects.activateExport(created.siteId,'booking','https://api.example.test');
 assert.equal(activated.payload.siteConfig.projectId,created.siteId);
 assert.deepEqual(activated.payload.siteConfig.bookingTransport,{siteId:created.siteId,apiBaseUrl:'https://api.example.test'});
 assert.equal(activated.payload.siteConfig.commerceTransport,undefined);
 assert.match(activated.pairingCode,/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{2}$/);
});

test('a project without a Portal capability is never registered for activation',async()=>{
 const queue=createBookingQueue(mockRedis()),projects=createProjectRegistry(queue);
 assert.equal(await projects.register({capabilities:{booking:{enabled:false},commerce:false}}),null);
});
