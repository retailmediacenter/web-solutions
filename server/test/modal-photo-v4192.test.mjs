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
function zipEntry(zip,wanted){let i=0;while(i<zip.length-30){if(zip.readUInt32LE(i)!==0x04034b50)break;const method=zip.readUInt16LE(i+8),size=zip.readUInt32LE(i+18),nameSize=zip.readUInt16LE(i+26),extra=zip.readUInt16LE(i+28);const name=zip.subarray(i+30,i+30+nameSize).toString();const start=i+30+nameSize+extra,buf=zip.subarray(start,start+size);if(name===wanted)return method===8?inflateRawSync(buf):buf;i=start+size;}throw new Error('No ZIP entry: '+wanted)}
test('V41.9.2: modal photograph occupies full-width media region without touching business logic',()=>{
 assert.ok(css.includes('V41.9.2 PHOTO PATCH'));
 assert.ok(css.includes('width:100%;max-height:310px;height:clamp(230px,35dvh,310px)'));
 assert.ok(css.includes('max-height:258px;height:clamp(195px,42dvh,258px)'));
 assert.ok(css.includes('img[src*="/retail/butcher-shop/"]{object-fit:cover}'));
 assert.ok(css.includes('object-fit:contain'));
 assert.ok(!css.includes('html[data-style='),'modal system stays independent of five visual styles');
 assert.ok(css.includes('.modal-footer{flex:0 0 auto'),'footer must not move');
});
test('V41.9.2: unchanged site template and ZIP share the SAME patched modal style',()=>{
 const p=buildSitePayload({businessId:'butcher-shop',businessName:'QA Bucko',style:'modern',goal:'visit',answers:{ordersEnabled:true,butcherGrillService:'grilled'}});
 const html=renderHtml(p);
 assert.ok(html.includes('global-modal.css')&&html.includes('id="productDialog"')&&html.includes('id="addToCart"'));
 assert.ok(p.siteConfig.modules.includes('cart'));
 const zip=exportSiteZip(p);const zippedCss=zipEntry(zip,'global-modal.css').toString('utf8');
 assert.equal(zippedCss,css);
 assert.ok(zippedCss.includes('V41.9.2 PHOTO PATCH'));
});
