import test from 'node:test';
import assert from 'node:assert/strict';
import {validSiteProfile,applySiteProfile,pullOrderInbox} from '../queue-client.mjs';
import {portalModules} from '../portal-modules.mjs';
import {normalizeIncomingOrder,nextOrderStatus,ORDER_STATUS} from '../order-core.mjs';
const commerce={enabled:true,currency:'RSD',products:[{id:'wine-1',name:'Vino',unit:'kom',price:1000}]};
const shop={version:2,business:{name:'Prodavnica'},services:[],commerce};
const hybrid={...shop,services:[{id:'tasting-1',name:'Degustacija'}]};
const siteId='x'.repeat(24),token='a'.repeat(43),requestId='cb716e15-3a44-4d11-8077-a34d576ceff2';
const incoming={requestId,orderCode:'ABCDEFGH',type:'ORDER',clientName:'Milica',phone:'060123456',note:'Test',fulfillment:'PICKUP',items:[{productId:'wine-1',name:'Vino',unit:'kom',quantity:2,unitPrice:1000,lineTotal:2000}],total:2000,currency:'RSD',pricing:'indicative',receivedAt:'2026-09-28T10:00:00.000Z'};
const connection={siteId,accessToken:token,apiOrigin:'https://api.example.org'};
function fakeFetcher(receipt,log){return async(url,opts)=>{log.push([url,opts.method]);return {ok:true,json:async()=>url.endsWith('/ack')?{ok:true}:{orders:receipt}};};}
test('shop-only and hybrid profiles activate the correct Portal modules',()=>{
 assert.deepEqual(portalModules({siteProfile:validSiteProfile(shop),services:[]}),{booking:false,orders:true});
 assert.deepEqual(portalModules({siteProfile:validSiteProfile(hybrid),services:hybrid.services}),{booking:true,orders:true});
 assert.equal(validSiteProfile({business:{name:'Invalid'},services:[]}),null);
 const p={name:'Pre',services:[],bookings:[{id:'existing'}]};applySiteProfile(p,shop);
 assert.deepEqual(portalModules({siteProfile:validSiteProfile(shop),services:[{id:'old-booking'}]}),{booking:false,orders:true});
 assert.equal(p.name,'Prodavnica');assert.deepEqual(p.services,[]);assert.equal(p.siteProfile.commerce.products[0].name,'Vino');assert.deepEqual(p.bookings,[{id:'existing'}]);
});
test('Commerce ACK only after successful durable local write, retry is idempotent',async()=>{
 const orders=[],log=[];let saves=0;
 const pull=()=>pullOrderInbox({connection,profile:{id:'local'},orders,save:async()=>{saves++;},normalize:normalizeIncomingOrder,fetcher:fakeFetcher([incoming],log)});
 assert.equal(await pull(),1);assert.equal(saves,1);assert.equal(orders[0].orderCode,'ABCDEFGH');
 assert.deepEqual(log.map(x=>x[1]),['GET','POST']);
 log.length=0;assert.equal(await pull(),0);assert.equal(saves,1);assert.deepEqual(log.map(x=>x[1]),['GET','POST']);
});
test('failed local save rolls back and does not ACK an order',async()=>{
 const orders=[],log=[];
 await assert.rejects(()=>pullOrderInbox({connection,profile:{id:'local'},orders,save:async()=>{throw new Error('IndexedDB failure');},normalize:normalizeIncomingOrder,fetcher:fakeFetcher([incoming],log)}),/IndexedDB failure/);
 assert.deepEqual(orders,[]);assert.deepEqual(log.map(x=>x[1]),['GET']);
});
test('Commerce status transitions preserve the original captured order',()=>{
 const o=normalizeIncomingOrder(incoming,'local',siteId),accepted=nextOrderStatus(o,ORDER_STATUS.ACCEPTED);
 assert.equal(o.status,ORDER_STATUS.NEW);assert.equal(accepted.status,ORDER_STATUS.ACCEPTED);
 assert.equal(nextOrderStatus(nextOrderStatus(accepted,ORDER_STATUS.PREPARING),ORDER_STATUS.READY).status,ORDER_STATUS.READY);
 assert.throws(()=>nextOrderStatus(o,ORDER_STATUS.COMPLETED),/Nedozvoljena/);
 assert.throws(()=>nextOrderStatus({...o,type:'INQUIRY'},ORDER_STATUS.PREPARING),/Nedozvoljena/);
});
