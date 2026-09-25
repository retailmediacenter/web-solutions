import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {exportSiteZip} from '../src/exporter.js';
import {buildSitePayload} from '../src/site.js';
const read=n=>readFileSync(new URL('../../client/public/'+n,import.meta.url),'utf8');
test('public sender uses site ID only, never manager access token',async()=>{
 const window={};let called=null;
 const fakeCrypto={randomUUID:()=> '12345678-1234-4234-8234-123456789012'};
 runInNewContext(read('booking-submit.js'),{window,URL,crypto:fakeCrypto,AbortSignal,
 fetch:async(url,options)=>{called={url,options};return {ok:true,json:async()=>({requestId:fakeCrypto.randomUUID()})};}});
 await window.RMCBookingSubmit.send({siteId:'AbCdEfGhIjKlMnOpQrStUvWx',apiBaseUrl:'https://api.example.org'},
 {clientName:'Test',phone:'060123',serviceName:'Šišanje',date:'2026-10-01',time:'12:30',note:''});
 assert.equal(called.url,'https://api.example.org/api/booking/requests');
 assert.equal(called.options.headers.Authorization,undefined);
 assert.equal(JSON.parse(called.options.body).booking.duration,60);
});
test('ZIP has booking sender once and script before service runtime',()=>{
 const p=buildSitePayload({businessId:'hair-salon',businessName:'Test',answers:{acceptsTimeRequests:true}});
 p.catalog.hero='';p.catalog.services=[];
 p.siteConfig.bookingTransport={siteId:'AbCdEfGhIjKlMnOpQrStUvWx',apiBaseUrl:'https://api.example.org'};
 const zip=exportSiteZip(p);
 assert.ok(zip.includes(Buffer.from('booking-submit.js')));
 assert.ok(zip.includes(Buffer.from('booking-runtime.js')));
});
test('no sender for unpaired static ZIP',()=>{
 const p=buildSitePayload({businessId:'hair-salon',businessName:'Test',answers:{acceptsTimeRequests:true}});
 p.catalog.hero='';p.catalog.services=[];
 const zip=exportSiteZip(p);
 assert.equal(zip.includes(Buffer.from('booking-submit.js')),false);
});

test('public booking CORS does not unlock private inbox',async()=>{
 const {app}=await import('../src/app.js');
 const server=await new Promise(resolve=>{const instance=app.listen(0,'127.0.0.1',()=>resolve(instance));});
 try{
  const port=server.address().port;
  const origin='https://nekifirmasajt.rs';
  const pub=await fetch(`http://127.0.0.1:${port}/api/booking/requests`,{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'}});
  assert.equal(pub.status,204);assert.equal(pub.headers.get('access-control-allow-origin'),origin);
  const priv=await fetch(`http://127.0.0.1:${port}/api/booking/requests/AbCdEfGhIjKlMnOpQrStUvWx`,{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'authorization'}});
  assert.equal(priv.status,403);
 } finally {await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
});
