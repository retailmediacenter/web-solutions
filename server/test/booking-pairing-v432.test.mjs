import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {resolveBookingPairing} from '../src/booking-pairing.js';
import {buildSitePayload} from '../src/site.js';
import {renderHtml} from '../src/render-site.js';
import {exportSiteZip} from '../src/exporter.js';
const {publicKey}=generateKeyPairSync('rsa',{modulusLength:2048,publicExponent:65537});
const k=publicKey.export({format:'der',type:'spki'}).toString('base64url');
const token='RMCB1.'+Buffer.from(JSON.stringify({v:1,p:'test-salon',k})).toString('base64url');
const payload=addition=>buildSitePayload({businessId:'hair-salon',businessName:'Test salon',style:'modern',goal:'visit',answers:{acceptsTimeRequests:true},bookingPairing:token,...addition});
test('public pairing token is validated and site contains no private key',()=>{
 const pairing=resolveBookingPairing(token);assert.equal(pairing.url,'https://rmc-booking-manager.onrender.com/');
 const data=payload();const html=renderHtml(data);
 assert.equal(data.siteConfig.bookingPairing.token,token);assert.match(html,/booking-link\.js/);assert.match(html,/RMCB1\./);
 assert.ok(!html.includes('privateJwk'));assert.ok(!html.includes('BEGIN PRIVATE KEY'));
 assert.ok(exportSiteZip(data).length>10000);
});
test('missing pairing keeps existing forms; invalid pairing rejected',()=>{
 const a=buildSitePayload({businessId:'hair-salon',businessName:'Test salon',style:'modern',goal:'visit',answers:{acceptsTimeRequests:true}});
 assert.equal(a.siteConfig.bookingPairing,null);
 assert.throws(()=>payload({bookingPairing:'not-valid'}),/ispravan JAVNI kod/);
 assert.throws(()=>payload({bookingPairing:'RMCB1.'+Buffer.from(JSON.stringify({v:1,p:'test-salon',k,d:'private'})).toString('base64url')}),/Neispravan javni/);
});
test('encrypted link service module remains optional for services without booking',()=>{
 const p=buildSitePayload({businessId:'hair-salon',businessName:'Test salon',style:'modern',goal:'visit',answers:{acceptsTimeRequests:false}});
 assert.ok(!p.siteConfig.bookingPairing);assert.match(renderHtml(p),/Kontakt/);
});
