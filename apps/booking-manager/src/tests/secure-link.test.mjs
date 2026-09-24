import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
import {createPairing,makeEncryptedLink,openEncryptedLink,decodePairing,extractEnvelope} from '../secure-link.mjs';
const crypto=globalThis.crypto||webcrypto;
const browserCode=readFileSync(new URL('./booking-link-fixture.js', import.meta.url),'utf8');
function siteLink(){const sandbox={window:{},crypto,isSecureContext:true,TextEncoder,TextDecoder,URL,atob,btoa};runInNewContext(browserCode,sandbox);return sandbox.window.RMCBookingLink.create;}
const request={v:1,requestId:'abcd1234-1234-1234-1234-123456789abc',serviceName:'Muško šišanje',clientName:'Test korisnik',phone:'+381600000000',date:'2026-10-15',time:'10:30',units:1,notes:'Test'};
test('valid public pairing token + manager decrypts generator browser link',async()=>{
 const pair=await createPairing('salon-test');assert.equal(decodePairing(pair.publicToken).p,'salon-test');
 const link=await siteLink()(request,pair.publicToken,'https://rmc-booking-manager.onrender.com/');
 assert.match(link,/^https:\/\/rmc-booking-manager\.onrender\.com\/#rmb=B1\./);
 assert.equal(link.includes('Test%20korisnik'),false);assert.equal(link.includes('+38160'),false);
 const r=await openEncryptedLink(link,[{id:'salon-test',pairing:pair}]);assert.deepEqual(r.payload,request);assert.equal(r.profile.id,'salon-test');
});
test('other profile cannot decrypt private booking data',async()=>{
 const pair=await createPairing('salon-test');const bad=await createPairing('other');
 const link=await makeEncryptedLink(request,pair.publicToken);
 await assert.rejects(openEncryptedLink(link,[{id:'salon-test',pairing:bad}]),/dešifrovati/);
 await assert.rejects(openEncryptedLink(link,[{id:'other',pairing:bad}]),/nema ključ/);
});
test('invalid/empty code rejected; plaintext remains encrypted',async()=>{
 assert.throws(()=>decodePairing('invalid'));
 assert.throws(()=>extractEnvelope('https://example.com/'),/ne sadrži/);
 const pair=await createPairing('salon-test');const link=await makeEncryptedLink(request,pair.publicToken);
 assert.ok(!decodeURIComponent(link).includes(request.clientName));
});
