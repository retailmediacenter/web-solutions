import test from 'node:test';
import assert from 'node:assert/strict';
import {makeProfile,validateImport} from '../booking-core.mjs';
import {normalizeIncomingOrder,orderSelection,acceptOrderWithAmendment,nextOrderStatus,ORDER_STATUS,orderReplyText,validateOrderAmendment} from '../order-core.mjs';
const p=makeProfile('Market Gagi');
const incoming={requestId:'cb716e15-3a44-4d11-8077-a34d576ceff2',orderCode:'ABCDEFGH',type:'ORDER',clientName:'Kupac',phone:'060123456',note:'',fulfillment:'PICKUP',items:[{productId:'cokolada',name:'Čokolada',unit:'kom',quantity:1,unitPrice:189,lineTotal:189},{productId:'kafa',name:'Kafa',unit:'kom',quantity:2,unitPrice:849,lineTotal:1698}],total:1887,currency:'RSD',pricing:'indicative',receivedAt:'2026-09-28T10:00:00.000Z'};
const original=()=>normalizeIncomingOrder(incoming,p.id,'Q'.repeat(24));
const snapshot=o=>({schema:1,activeProfileId:p.id,profiles:[p],bookings:[],orders:[o]});
test('one missing product: accept reduced amount without buyer approval, originals untouched',()=>{
 const o=original();const amended=acceptOrderWithAmendment(o,[0]);
 assert.equal(o.status,'new');assert.equal(o.items.length,2);assert.equal(o.total,1887);assert.equal(o.amendment,undefined);
 assert.equal(amended.status,'accepted');assert.equal(amended.items.length,2);
 assert.deepEqual(amended.amendment.excludedIndexes,[0]);assert.equal(amended.amendment.originalTotal,1887);assert.equal(amended.amendment.revisedTotal,1698);
 assert.equal(validateImport(snapshot(amended)).orders[0].amendment.revisedTotal,1698);
 assert.match(orderReplyText(amended,amended.status),/Čokolada/);
 assert.match(orderReplyText(amended,amended.status),/Kafa/);
 assert.match(orderReplyText(amended,amended.status),/1[.,\s]?698/);
 assert.doesNotMatch(orderReplyText(amended,amended.status),/molimo da potvrdite|saglasnost kupca/i);
});
test('never accept all-removed, no-removed, invalid index or accepted order',()=>{
 const o=original();
 for(const exclude of [[],[0,1],[2],[-1],[0,0],[.5]])assert.throws(()=>acceptOrderWithAmendment(o,exclude));
 assert.throws(()=>acceptOrderWithAmendment(nextOrderStatus(o,'accepted'),[0]));
});
test('progress to preparing and ready preserves original and revised total',()=>{
 const o=original();const amended=acceptOrderWithAmendment(o,[1]);
 const next=nextOrderStatus(nextOrderStatus(amended,'preparing'),'ready');
 assert.equal(next.total,1887);assert.equal(next.amendment.revisedTotal,189);assert.equal(next.items.length,2);
 assert.equal(validateOrderAmendment(next),true);
 assert.match(orderReplyText(next,next.status),/sa izmenom/);
});
test('backup rejects forged revision and indexes, accepts old orders without amendment',()=>{
 const originalOrder=original(); assert.equal(validateImport(snapshot(originalOrder)).orders.length,1);
 const valid=acceptOrderWithAmendment(originalOrder,[0]);
 for(const mod of [{...valid.amendment,revisedTotal:99999},{...valid.amendment,excludedIndexes:[5]},{...valid.amendment,excludedIndexes:[0,0]},{...valid.amendment,excludedIndexes:[0,1]}]){
  assert.throws(()=>validateImport(snapshot({...valid,amendment:mod})),/izmen/i);
 }
});
test('inquiries retain their own status path, no partial ORDER acceptance',()=>{
 const o={...original(),type:'INQUIRY'};
 assert.throws(()=>acceptOrderWithAmendment(o,[0]));
 assert.equal(nextOrderStatus(o,'answered').status,'answered');
});
