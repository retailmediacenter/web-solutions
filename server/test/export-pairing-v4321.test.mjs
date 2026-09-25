import test from 'node:test';
import assert from 'node:assert/strict';
import {inflateRawSync} from 'node:zlib';
import {buildSitePayload} from '../src/site.js';
import {renderHtml} from '../src/render-site.js';
import {exportSiteZip} from '../src/exporter.js';
const siteId='AbCdEfGhIjKlMnOpQrStUvWx';
test('service pairing identifier is public but secret never enters standalone HTML',()=>{
 const payload=buildSitePayload({businessId:'hair-salon',businessName:'Test salon',answers:{acceptsTimeRequests:true}});
 payload.siteConfig.bookingTransport={siteId,apiBaseUrl:'https://api.example.org'};
 const html=renderHtml(payload);
 assert.match(html,/bookingTransport/);assert.ok(html.includes(siteId));
 assert.ok(!html.includes('accessToken'));
});
test('standalone ZIP includes one-time code notice only when paired',()=>{
 const payload=buildSitePayload({businessId:'hair-salon',businessName:'Test salon',answers:{acceptsTimeRequests:true}});
 payload.catalog.hero='';payload.catalog.services=[]; // No curated fixture images required for ZIP structure test.
 const zip=exportSiteZip(payload,{pairingCode:'ABCD-EFGH-23',expiresIn:1800});
 assert.ok(zip.includes(Buffer.from('BOOKING_UPARIVANJE.txt')));
 assert.equal(zip.toString('latin1').split('BOOKING_UPARIVANJE.txt').length-1,2, 'one local and one central ZIP directory entry');
 const pos=zip.indexOf(Buffer.from('BOOKING_UPARIVANJE.txt'));
 const head=pos-30,length=zip.readUInt32LE(head+18),method=zip.readUInt16LE(head+8);
 const packed=zip.subarray(pos+Buffer.byteLength('BOOKING_UPARIVANJE.txt'),pos+Buffer.byteLength('BOOKING_UPARIVANJE.txt')+length);
 const notice=method===8?inflateRawSync(packed).toString():packed.toString();
 assert.match(notice,/ABCD-EFGH-23/);
 const plain=exportSiteZip(payload);
 assert.ok(!plain.includes(Buffer.from('BOOKING_UPARIVANJE.txt')));
});
