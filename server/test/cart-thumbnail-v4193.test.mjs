import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inflateRawSync} from 'node:zlib';
import {buildSitePayload} from '../src/site.js';
import {renderHtml} from '../src/render-site.js';
import {exportSiteZip} from '../src/exporter.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../');
const css=readFileSync(path.join(root,'client/public/global-modal.css'),'utf8');
const runtime=readFileSync(path.join(root,'client/public/export-runtime.js'),'utf8');
function zipEntry(zip,wanted){let i=0;while(i<zip.length-30){if(zip.readUInt32LE(i)!==0x04034b50)break;const method=zip.readUInt16LE(i+8),size=zip.readUInt32LE(i+18),nameSize=zip.readUInt16LE(i+26),extra=zip.readUInt16LE(i+28);const name=zip.subarray(i+30,i+30+nameSize).toString();const start=i+30+nameSize+extra,buf=zip.subarray(start,start+size);if(name===wanted)return method===8?inflateRawSync(buf):buf;i=start+size;}throw new Error('ZIP entry missing: '+wanted)}
test('V41.9.3: cart images are 88px desktop, 68px mobile, 60px narrow; keep actions and modal shell untouched',()=>{
 assert.ok(css.includes('V41.9.3 CART THUMBNAIL'));
 assert.match(css,/grid-template-columns:88px minmax\(0,1fr\) auto/);
 assert.match(css,/grid-template-columns:68px minmax\(0,1fr\) auto/);
 assert.match(css,/grid-template-columns:60px minmax\(0,1fr\) auto/);
 assert.match(css,/\.cart-line>img\{[\s\S]*?width:88px;[\s\S]*?height:78px;/);
 assert.ok(css.includes('img[src*="/retail/butcher-shop/"]'));
 assert.ok(!css.includes('html[data-style='));
 assert.ok(css.includes('.modal-footer{flex:0 0 auto'));
 assert.ok(runtime.includes('class="cart-line"')&&runtime.includes('class="cart-quantity"')&&runtime.includes('data-cart-remove'));
});
test('V41.9.3: generated PREVIEW and ZIP share identical updated CSS for the butcher cart',()=>{
 const payload=buildSitePayload({businessId:'butcher-shop',businessName:'QA mesara',style:'traditional',goal:'visit',answers:{ordersEnabled:true,butcherGrillService:"grilled"}});
 assert.ok(payload.siteConfig.modules.includes('cart'));
 const html=renderHtml(payload);assert.match(html,/id="cartDialog"/);assert.match(html,/global-modal\.css/);
 const zipped=zipEntry(exportSiteZip(payload),'global-modal.css').toString('utf8');
 assert.equal(zipped,css);
 assert.ok(zipped.includes('V41.9.2 PHOTO PATCH'));
 assert.ok(zipped.includes('V41.9.3 CART THUMBNAIL'));
});
