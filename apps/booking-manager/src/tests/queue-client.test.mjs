import test from 'node:test';
import assert from 'node:assert/strict';
import {applySiteProfile,claimPairing,getPushPublicKey,pullInbox,subscribePush,validApiOrigin,validPairingCode} from '../queue-client.mjs';
const conn={apiOrigin:'https://api.example.test',siteId:'A'.repeat(24),accessToken:'a'.repeat(43)};
const req={requestId:'e4d7c38d-52ba-409a-944d-3881e679ebf1',clientName:'Test Primer',phone:'+381600000000',serviceName:'Usluga',date:'2026-09-28',time:'10:00',duration:30,note:'Proba'};
const response=(body,ok=true)=>({ok,status:ok?200:400,json:async()=>body});
test('validacija API origin i koda',()=>{
 assert.equal(validApiOrigin('https://api.example.test/'),'https://api.example.test');
 assert.equal(validPairingCode('ABCD-2345-EF'),true);
 assert.equal(validPairingCode('ABC-2345-EF'),false);
 assert.throws(()=>validApiOrigin('http://example.test'));
 assert.throws(()=>validApiOrigin('https://x.example/test'));
});
test('uparivanje bez prosleđivanja poverljivih podataka sajtu',async()=>{
 let called;
 const out=await claimPairing(conn.apiOrigin,'ABCD-2345-EF',{fetcher:async(url,opts)=>{called=[url,opts];return response({siteId:conn.siteId,accessToken:conn.accessToken});}});
 assert.equal(out.siteId,conn.siteId);
 assert.equal(called[0],'https://api.example.test/api/booking/pairings/claim');
 assert.equal(JSON.parse(called[1].body).pairingCode,'ABCD-2345-EF');
});
test('Push API calls stay authenticated and Manager never receives a private VAPID key',async()=>{
 const calls=[],fetcher=async(url,options)=>{calls.push([url,options]);return response(url.includes('public-key')?{publicKey:'A'.repeat(87)}:{ok:true});};
 assert.equal(await getPushPublicKey(conn,{fetcher}),'A'.repeat(87));await subscribePush(conn,{endpoint:'https://push.example.test/x',keys:{p256dh:'x',auth:'y'}},{fetcher});
 assert.match(calls[0][0],/push\/public-key/);assert.equal(calls[0][1].headers.Authorization,`Bearer ${conn.accessToken}`);assert.match(calls[1][0],/push\/subscriptions/);assert.equal(JSON.parse(calls[1][1].body).subscription.endpoint,'https://push.example.test/x');
});
test('profil sa sajta inicijalizuje usluge bez menjanja lokalnih pravila ili dupliranja',()=>{
 const profile={id:'local',name:'Stari naziv',capacity:3,slotStep:15,buffer:10,hours:[{enabled:true,start:'08:00',end:'16:00'}],breaks:{enabled:true,start:'12:00',end:'12:30'},closedDates:['2026-12-31'],services:[{id:'local-cut',name:'Šišanje',duration:30,units:1},{id:'legacy',name:'Stara lokalna usluga',duration:45,units:1}]};
 const source={version:1,business:{name:'Coka frizerka',phone:'+381601234567',city:'Beograd'},services:[{id:'hairsalon-1',name:'Šišanje'},{id:'hairsalon-2',name:'Farbanje'}]};
 applySiteProfile(profile,source);applySiteProfile(profile,source);
 assert.equal(profile.name,'Coka frizerka');assert.equal(profile.capacity,3);assert.equal(profile.buffer,10);assert.equal(profile.hours[0].start,'08:00');
 assert.equal(profile.services.length,3);assert.equal(profile.services[0].id,'local-cut');assert.equal(profile.services[0].siteServiceId,'hairsalon-1');assert.equal(profile.services[0].duration,30);
 assert.equal(profile.services.find(service=>service.siteServiceId==='hairsalon-2')?.name,'Farbanje');
 assert.equal(profile.services.find(service=>service.id==='legacy')?.duration,45);assert.equal(profile.siteProfile.business.phone,'+381601234567');
});
test('stable source service ID wins when a service label changes',async()=>{
 const stable={...req,serviceId:'hairsalon-1',serviceName:'Novo ime'};
 const bookings=[];let selected='';
 await pullInbox({connection:conn,profile:{name:'Firma',services:[{id:'local',siteServiceId:'hairsalon-1',name:'Šišanje',units:1}]},bookings,
   save:async()=>{},normalize:input=>{selected=input.serviceId;return {id:'stable'};},fetcher:async(url)=>response(url.endsWith('/ack')?{ok:true}:{requests:[stable]})});
 assert.equal(selected,'local');
});
test('ACK isključivo posle završenog upisa',async()=>{
 let persisted=false;const calls=[];const bookings=[];
 const fetcher=async(url,opts)=>{calls.push(url);if(url.endsWith('/ack'))assert.equal(persisted,true);return response(url.endsWith('/ack')?{ok:true}:{requests:[req]});};
 const profile={name:'Firma',services:[{id:'s',name:'Usluga',units:1}]};
 const normalize=()=>({id:'1',profileId:'x'});
 assert.equal(await pullInbox({connection:conn,profile,bookings,save:async()=>{persisted=true},normalize,fetcher}),1);
 assert.equal(calls.length,2);
 assert.equal(await pullInbox({connection:conn,profile,bookings,save:async()=>{},normalize,fetcher}),0);
 assert.equal(bookings.length,1);
});
test('ne šalje ACK ako IndexedDB upis ne uspe',async()=>{
 const calls=[];const bookings=[];
 const fetcher=async url=>{calls.push(url);return response({requests:[req]});};
 await assert.rejects(pullInbox({connection:conn,profile:{services:[{id:'s',name:'Usluga',units:1}]},bookings,
    save:async()=>{throw Error('DB full')},normalize:()=>({id:'1'}),fetcher}),/DB full/);
 assert.equal(calls.length,1);assert.equal(bookings.length,0);
});
test('nepoznata usluga ne briše server zahtev',async()=>{
 const calls=[];const fetcher=async url=>{calls.push(url);return response({requests:[req]});};
 await assert.rejects(pullInbox({connection:conn,profile:{name:'Firma',services:[]},bookings:[],save:async()=>{},normalize:()=>{},fetcher}),/nije podešena/);
 assert.equal(calls.length,1);
});
