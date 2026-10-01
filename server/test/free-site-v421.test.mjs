import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateRawSync} from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildSitePayload} from '../src/site.js';
import {renderHtml} from '../src/render-site.js';
import {exportSiteZip} from '../src/exporter.js';
import {listBusinesses,getAdvisorDefinition} from '../src/advisor.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
function build(id='butcher-shop',data={locationMode:'physical',city:'Beograd',address:'Ulica 12'}){
 const d=getAdvisorDefinition(id);const a={businessMode:d.operation.options[0],emphasis:d.emphasis.options[0],hybridChoice:'none'};
 for(const q of (d.specials||[]))a[q.id]=q.id==='butcherGrillService'?'raw':false;
 return buildSitePayload({businessId:id,businessName:'Test firma',style:'modern',goal:'visit',answers:a,businessData:data});
}
function textVisible(html){return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();}
function unpack(buf){const out={};let p=0;while(p+30<=buf.length&&buf.readUInt32LE(p)===0x04034b50){
 const mode=buf.readUInt16LE(p+8),size=buf.readUInt32LE(p+18),n=buf.readUInt16LE(p+26),ext=buf.readUInt16LE(p+28);
 const name=buf.subarray(p+30,p+30+n).toString('utf8'),data=buf.subarray(p+30+n+ext,p+30+n+ext+size);
 out[name]=(mode===8?inflateRawSync(data):data).toString('utf8');p+=30+n+ext+size;
 }return out;}
const main={locationMode:'physical',city:'Novi Sad',address:'Dunavska 1',phone:'+381601234567'};
test('V42.1: one real address is required for physical free sites; no dummy location',()=>{
 for(const bad of [{locationMode:'physical'}, {locationMode:'physical',city:'Novi Sad'},{locationMode:'physical',address:'Dunavska 1'}])assert.throws(()=>build('butcher-shop',bad),/grad|ulicu/i);
 assert.equal(build('butcher-shop',main).siteConfig.businessData.locations.length,1);
});
test('Online and service-area paths are deliberate and never invent a street or embed a map',()=>{
 assert.throws(()=>build('plumber',{locationMode:'service-area'}),/grad/);
 const area=renderHtml(build('plumber',{locationMode:'service-area',city:'Beograd'}));
 assert.match(area,/Područje rada/);assert.doesNotMatch(area,/Prikaži oblast na mapi|ws-directions/);assert.doesNotMatch(area,/data-ws-map=/);
 const remote=renderHtml(build('consultant',{locationMode:'online',phone:'+381601234567'}));
 assert.doesNotMatch(remote,/id="lokacije"/);assert.doesNotMatch(remote,/data-ws-map=/);
 assert.throws(()=>build('consultant',{locationMode:'online',locations:[{city:'Niš',address:'Test 2'}]}),/bez javne/);
});
test('One free location and optional extra locations remain supported, but not more than 5 total',()=>{
 const data={...main,locations:[{city:'Niš',address:'Test 2'}]};
 assert.equal(build('butcher-shop',data).siteConfig.businessData.locations.length,2);
 assert.throws(()=>build('butcher-shop',{...main,locations:Array.from({length:5},(_,i)=>({city:'Niš',address:'Test '+i}))}),/četiri/);
});
test('No user-facing DEMO in actual output across ALL 72 render families',()=>{
 const all=listBusinesses().filter(x=>x.pilot);assert.equal(all.length,80);
 for(const b of all){
  const html=renderHtml(build(b.id,main));const visible=textVisible(html);
  assert.doesNotMatch(visible,/\bDEMO\b/i,b.id);
  assert.match(visible,/Kreirano uz RMC Web Solutions AI Builder/);
  assert.equal((html.match(/data-system="demoBadge"/g)||[]).length,1,b.id);
 }
});
test('Brand is white label and click tracking remains; free mode stays server-controlled',()=>{
 const p=build('wine-shop',main);p.siteConfig.demoBrand={name:'Partner',label:'Partner Brand',url:'https://partner.example/builder'};
 const html=renderHtml(p);
 assert.match(html,/Kreirano uz.*Partner Brand/);
 assert.match(html,/source=demo-site&amp;business=wine-shop/);
 p.siteConfig.siteMode='production';
 const prod=renderHtml(p);
 assert.doesNotMatch(prod,/data-system="demoBadge"/);
 assert.doesNotMatch(textVisible(prod),/Kreirano uz Partner Brand/);
});
test('Preview and exported ZIP contain identical free-site HTML and lazy map runtime',()=>{
 const p=build('butcher-shop',main),html=renderHtml(p),zip=exportSiteZip(p);
 assert.equal(unpack(zip)['index.html'],html);
 const siteSys=readFileSync(path.join(root,'client/public/site-system.js'),'utf8');
 assert.match(siteSys,/button\.addEventListener\('click'/);
 assert.match(siteSys,/MutationObserver/);
 assert.doesNotMatch(html,/<iframe\s/);
});
test('Mobile badge is viewport-wide, wraps at words and never sits above sticky cart',()=>{
 const css=readFileSync(path.join(root,'client/public/site-system.css'),'utf8');
 assert.match(css,/width:calc\(100% - 24px\)/);
 assert.match(css,/word-break:normal/);
 assert.match(css,/position:sticky/);
 assert.match(css,/rgba\(255,255,255,\.97\)/);
});
test('React Advisor provides required physical address and 0 RSD copy, no visible DEMO label',()=>{
 const js=readFileSync(path.join(root,'client/src/main.jsx'),'utf8');
 assert.match(js,/locationMode==='physical'/);
 assert.match(js,/Ulica i broj \(obavezno\)/);
 assert.match(js,/jedna|Jedna/);
 assert.doesNotMatch(js,/Preuzmi funkcionalan demo ZIP/);
});
