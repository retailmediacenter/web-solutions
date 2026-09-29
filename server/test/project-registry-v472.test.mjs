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

test('internal editor keeps the Project ID and synchronizes saved service content into an activated export',async()=>{
 const queue=createBookingQueue(mockRedis()),projects=createProjectRegistry(queue,{now:()=> '2026-09-29T11:00:00.000Z'});
 const payload={siteConfig:structuredClone(bookable),catalog:{hero:'assets/images/curated/salon/hero.jpg',headline:'Stari naslov',subtitle:'Stari opis',offerTitle:'Usluge',services:[{id:'hair-cut',title:'Šišanje',description:'Opis',image:'assets/images/curated/salon/cut.jpg'}]}};
 const created=await projects.register(payload);
 const saved=await projects.updateContent(created.siteId,{businessName:'Novi salon',phone:'+381 60 999 000',headline:'Novi naslov',subtitle:'Novi opis',offerTitle:'Nova ponuda',hero:'assets/images/curated/salon/new-hero.jpg',items:[{id:'hair-cut',title:'Kratko šišanje',description:'Novi opis usluge',image:'assets/images/curated/salon/new-cut.jpg'},{id:'editor-new-service',title:'Nova usluga',description:'Dodata kroz Editor',image:''}]});
 assert.equal(saved.siteId,created.siteId);
 assert.equal(saved.business.name,'Novi salon');
 assert.equal(saved.content.catalog.headline,'Novi naslov');
 assert.equal(saved.content.catalog.services[0].title,'Kratko šišanje');
 assert.equal(saved.content.catalog.services[1].title,'Nova usluga');
 const activated=await projects.activateExport(created.siteId,'booking','https://api.example.test');
 assert.equal(activated.payload.siteConfig.bookingProfile.business.name,'Novi salon');
 assert.equal(activated.payload.siteConfig.bookingProfile.services[0].name,'Kratko šišanje');
 assert.equal(activated.payload.siteConfig.bookingProfile.services[1].name,'Nova usluga');
 assert.equal(activated.payload.catalog.hero,'assets/images/curated/salon/new-hero.jpg');
});

test('Publish ZIP source carries edited content but never mints a pairing code',async()=>{
 const queue=createBookingQueue(mockRedis()),projects=createProjectRegistry(queue);
 const payload={siteConfig:structuredClone(bookable),catalog:{hero:'assets/images/curated/salon/hero.jpg',headline:'Naslov',subtitle:'Opis',offerTitle:'Usluge',services:[{id:'hair-cut',title:'Šišanje',description:'Opis',image:'assets/images/curated/salon/cut.jpg'}]}};
 const created=await projects.register(payload),result=await projects.exportProject(created.siteId);
 assert.equal(result.siteId,created.siteId);
 assert.equal(result.payload.siteConfig.projectId,created.siteId);
 assert.equal(result.pairingCode,undefined);
 assert.equal(result.payload.siteConfig.bookingTransport,undefined);
});

test('a project without a Portal capability is never registered for activation',async()=>{
 const queue=createBookingQueue(mockRedis()),projects=createProjectRegistry(queue);
 assert.equal(await projects.register({capabilities:{booking:{enabled:false},commerce:false}}),null);
});
