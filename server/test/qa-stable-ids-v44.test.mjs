import test from 'node:test';
import assert from 'node:assert/strict';
import {scenarios,buildQaPayload} from '../../scripts/publication/scenarios.mjs';
import {createBookingQueue} from '../src/booking-queue.js';
const ids=scenarios.map(s=>s.siteId);
test('9 permanent public QA identifiers are unique and valid; no owner code or token in fixture',()=>{
 assert.equal(scenarios.length,9);assert.equal(new Set(ids).size,9);
 for(const s of scenarios){
  assert.match(s.siteId,/^[A-Za-z0-9_-]{24}$/);
  assert.equal(s.pairingCode,undefined);assert.equal(s.accessToken,undefined);
  const p=buildQaPayload(s);
  assert.equal(p.siteConfig.bookingTransport,undefined);
  if(s.expect.booking)assert.ok(p.siteConfig.bookingProfile?.services.length);
 }
});
test('a fresh short code can be privately issued twice for the SAME public QA siteId',async()=>{
 const data=new Map();const redis=async(cmd,...args)=>{
  if(cmd==='SET'){if(args.includes('NX')&&data.has(args[0]))return null;data.set(args[0],args[1]);return 'OK';}
  if(cmd==='GET'){return data.get(args[0])||null;}
  if(cmd==='GETDEL'){const x=data.get(args[0]);data.delete(args[0]);return x||null;}
  throw Error('Unexpected command '+cmd);
 };
 const q=createBookingQueue(redis);const s=scenarios.find(x=>x.slug==='frizer');
 const profile=buildQaPayload(s).siteConfig.bookingProfile;
 const first=await q.issue(profile,{siteId:s.siteId});
 assert.equal(first.siteId,s.siteId);assert.equal(first.accessToken,undefined);
 const second=await q.issue(profile,{siteId:s.siteId});
 assert.equal(second.siteId,first.siteId);assert.notEqual(second.pairingCode,first.pairingCode);
 assert.match(second.pairingCode,/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{2}$/);
 const owner1=await q.claim(first.pairingCode);
 const owner2=await q.claim(second.pairingCode);
 assert.equal(owner1.siteId,owner2.siteId);
 await assert.rejects(()=>q.authenticate(s.siteId,owner1.accessToken),/nije dozvoljen/);
 await q.authenticate(s.siteId,owner2.accessToken);
 await assert.rejects(()=>q.issue(profile,{siteId:'not-an-id'}),/identifikator/);
});
