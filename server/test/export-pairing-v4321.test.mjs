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
test('public ZIP NEVER contains a one-time owner pairing code, even when supplied',()=>{
 const payload=buildSitePayload({businessId:'hair-salon',businessName:'Test salon',answers:{acceptsTimeRequests:true}});
 payload.catalog.hero='';payload.catalog.services=[];
 payload.siteConfig.bookingTransport={siteId,apiBaseUrl:'https://api.example.org'};
 const secret='ABCD-EFGH-23';
 const zip=exportSiteZip(payload,{pairingCode:secret,expiresIn:1800});
 const entries=new Map();let offset=0;
 while(offset<zip.length&&zip.readUInt32LE(offset)===0x04034b50){
  const len=zip.readUInt32LE(offset+18),method=zip.readUInt16LE(offset+8),nameLen=zip.readUInt16LE(offset+26),extra=zip.readUInt16LE(offset+28);
  const name=zip.subarray(offset+30,offset+30+nameLen).toString();
  const from=offset+30+nameLen+extra,body=zip.subarray(from,from+len);
  entries.set(name,method===8?inflateRawSync(body).toString():body.toString());offset=from+len;
 }
 assert.ok(!entries.has('BOOKING_UPARIVANJE.txt'));
 assert.ok(entries.has('booking-submit.js'));
 for(const [name,content] of entries){
  if(/\.(html|txt|json|js)$/.test(name))assert.ok(!content.includes(secret),`Owner code was leaked in ${name}`);
 }
 assert.match(entries.get('index.html'),new RegExp(siteId));
});
