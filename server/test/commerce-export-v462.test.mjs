import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {attachPublicSiteTransport} from '../src/site-export-transport.js';
import {buildSitePayload} from '../src/site.js';
import {renderHtml} from '../src/render-site.js';
import {injectCommerceSender} from '../src/exporter.js';
import {makeLocalPhonePreview} from '../src/offline-preview.js';
import {scenarios,buildQaPayload} from '../../scripts/publication/scenarios.mjs';
import {PHARMACY_ORDERS} from '../src/pharmacy-engine.js';

const API='https://rmc-web-solutions-api-staging.onrender.com';
const fixedId='A'.repeat(24);
const queue={issue:async profile=>({siteId:fixedId,pairingCode:'FAKE-TEST-AB',expiresIn:1800,profile})};
const attach=p=>attachPublicSiteTransport(p,queue,{apiBaseUrl:API});

test('commerce-only minimarket exports ONE public transport + one private pairing, no fake Booking',async()=>{
 const p=buildQaPayload(scenarios.find(s=>s.slug==='minimarket'));
 const issued=await attach(p);
 assert.equal(issued.siteId,fixedId);
 assert.equal(p.siteConfig.commerceTransport.siteId,fixedId);
 assert.equal(p.siteConfig.bookingTransport,undefined);
 assert.deepEqual(issued.profile.services,[]);
 assert.ok(issued.profile.commerce.products.length);
 const html=renderHtml(p);
 assert.match(html,/"commerceTransport":\{"siteId":"A{24}"/);
 assert.doesNotMatch(html,/FAKE-TEST-AB|accessToken|adminKey/i);
});

test('vinoteka hybrid uses SAME site ID and one pairing for both independent operations',async()=>{
 const p=buildQaPayload(scenarios.find(s=>s.slug==='vinoteka'));
 let calls=0;
 const issued=await attachPublicSiteTransport(p,{issue:async profile=>{calls++;assert.ok(profile.services.length);assert.ok(profile.commerce.products.length);return {siteId:fixedId,pairingCode:'PRIVATE',expiresIn:1800};}},{apiBaseUrl:API});
 assert.equal(calls,1);assert.equal(issued.siteId,fixedId);
 assert.deepEqual(p.siteConfig.bookingTransport,p.siteConfig.commerceTransport);
 const html=renderHtml(p);
 assert.match(html,/"bookingTransport":\{"siteId":"A{24}"/);
 assert.match(html,/"commerceTransport":\{"siteId":"A{24}"/);
 assert.doesNotMatch(html,/PRIVATE/);
});

test('pharmacy orders and consultations are independent; commerce profile requires no fake service',async()=>{
 const p=buildSitePayload({businessId:'pharmacy',businessName:'Apoteka TEST',style:'modern',goal:'visit',
  answers:{businessMode:PHARMACY_ORDERS,pharmacyConsultations:true,contactPhone:'060123456'}});
 const issued=await attach(p);
 assert.ok(issued);assert.deepEqual(issued.profile.services,[]);
 assert.equal(p.siteConfig.capabilities.pharmacyConsultations,true);
 assert.equal(p.siteConfig.bookingTransport,undefined);
 assert.equal(p.siteConfig.commerceTransport.siteId,fixedId);
});

test('preview stays offline, unsupported sites do not receive a transport',async()=>{
 const p=buildQaPayload(scenarios.find(s=>s.slug==='vodoinstalater'));
 assert.equal(renderHtml(p).includes('"commerceTransport":{"siteId"'),false);
 await attach(p);
 assert.equal(p.siteConfig.commerceTransport,undefined);
 assert.ok(p.siteConfig.bookingTransport);
});

test('no staging secrets, pairing on every export only after validated public API',async()=>{
 const p=buildQaPayload(scenarios.find(s=>s.slug==='minimarket'));
 let calls=0;
 await assert.rejects(()=>attachPublicSiteTransport(p,{issue:async()=>{calls++;}},{apiBaseUrl:'https://example.com/admin'}),{status:503});
 assert.equal(calls,0);
 p.siteConfig.bookingPairing={token:'old-token'};
 await assert.rejects(()=>attachPublicSiteTransport(p,{issue:async()=>{calls++;}},{apiBaseUrl:API}),{status:400});
 assert.equal(calls,0);
});

test('public Commerce sender never transmits prices, deduplicates retry request ID',async()=>{
 const src=readFileSync(new URL('../../client/public/commerce-submit.js',import.meta.url),'utf8');
 let body;
 const ctx={window:{},URL,AbortSignal,crypto:{randomUUID:()=> 'a514e785-cc23-4adf-8c1b-e9455ca131b5'},
  fetch:async(_url,opts)=>{body=JSON.parse(opts.body);return {ok:true,json:async()=>({requestId:body.order.requestId,orderCode:'ABCD2345'})};}};
 runInNewContext(src,ctx);
 const result=await ctx.window.RMCCommerceSubmit.send({siteId:fixedId,apiBaseUrl:API},{
  requestId:'b514e785-cc23-4adf-8c1b-e9455ca131b5',type:'ORDER',clientName:'Mira',phone:'060123456',fulfillment:'PICKUP',
  items:[{productId:'sku1',quantity:2,price:.01,unit:'kg',image:'fake.jpg',variant:'M'}]});
 assert.equal(result.orderCode,'ABCD2345');
 assert.equal(body.order.requestId,'b514e785-cc23-4adf-8c1b-e9455ca131b5');
 assert.equal(body.order.items[0].price,undefined);
 assert.equal(body.order.items[0].unit,undefined);
 assert.equal(body.order.items[0].image,undefined);
 assert.deepEqual(Object.keys(body.order.items[0]),['productId','quantity','size','preparation','variant']);
});

test('ZIP HTML injects public sender before storefront runtime and offline phone HTML preserves order',async()=>{
 const p=buildQaPayload(scenarios.find(s=>s.slug==='vinoteka'));
 await attach(p);
 const preview=renderHtml(p);
 assert.equal(preview.includes('src="commerce-submit.js"'),false);
 const hosted=injectCommerceSender(preview,p.siteConfig);
 const commerce=hosted.indexOf('src="commerce-submit.js"');
 const runtime=hosted.indexOf('src="export-runtime.js"');
 assert.ok(commerce>=0&&runtime>commerce);
 const local=makeLocalPhonePreview([
  {name:'index.html',data:'<!doctype html><html><body><script src="commerce-submit.js" defer></script><script src="export-runtime.js" defer></script></body></html>'},
  {name:'commerce-submit.js',data:'window.RMCCommerceSubmit={send(){}};'},
  {name:'export-runtime.js',data:'window.__sample=1;'}
 ]);
 assert.ok(local.indexOf('data-rmc-original="commerce-submit.js"')<local.indexOf('data-rmc-original="export-runtime.js"'));
 assert.match(local,/window\.RMCCommerceSubmit/);
 assert.doesNotMatch(local,/PRIVATE|pairingCode|accessToken/);
});
