import test from 'node:test';
import assert from 'node:assert/strict';
import {claimPairing,pullInbox,validApiOrigin,validPairingCode} from '../queue-client.mjs';
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
