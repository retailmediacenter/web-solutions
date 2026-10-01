import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateRawSync} from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildSitePayload} from '../src/site.js';
import {renderHtml} from '../src/render-site.js';
import {exportSiteZip} from '../src/exporter.js';
import {getAdvisorDefinition,listBusinesses} from '../src/advisor.js';
import {demoBrandFromEnvironment} from '../src/site-system.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
function req(id,additional={}){
 const d=getAdvisorDefinition(id),answers={businessMode:d.operation.options[0],emphasis:d.emphasis.options[0],hybridChoice:'none'};
 for(const q of d.specials){answers[q.id]=q.id==='butcherGrillService'?'raw':false;}
 return {businessId:id,businessName:'Firma '+id,style:'modern',goal:'visit',answers,...additional};
}
function unzip(buf){const out={};let p=0;
 while(p+30<=buf.length&&buf.readUInt32LE(p)===0x04034b50){
  const compression=buf.readUInt16LE(p+8),n=buf.readUInt16LE(p+26),e=buf.readUInt16LE(p+28),z=buf.readUInt32LE(p+18);
  const name=buf.subarray(p+30,p+30+n).toString('utf8'),src=buf.subarray(p+30+n+e,p+30+n+e+z);
  out[name]=compression===8?inflateRawSync(src):src;p+=30+n+e+z;
 }return out;
}
const locationData={phone:'+381 60 123 4567',email:'kontakt@primer.rs',city:'Beograd',address:'Knez Mihailova 12',hours:'Pon–Pet 09–18',
 website:'https://primer.rs',whatsapp:'+381601234567',viber:'+381601234567',
 locations:[{label:'Druga radnja',city:'Novi Sad',address:'Zmaj Jovina 10',hours:'Sub 10–14'}]};
test('Global data single source and phone/mobile CTA across commerce, booking, vertical and pharmacy',()=>{
 for(const id of ['butcher-shop','auto-parts','hair-salon','hotel','pharmacy']){
  const p=buildSitePayload(req(id,{businessData:locationData})),cfg=p.siteConfig;
  assert.equal(cfg.businessData.businessName,'Firma '+id);
  assert.equal(cfg.businessData.phone,locationData.phone);
  assert.equal(cfg.contact.phone,cfg.businessData.phone);
  assert.equal(cfg.businessData.locations.length,2);
  assert.equal(cfg.siteMode,'demo');
  const html=renderHtml(p);
  assert.match(html,/href="tel:\+381601234567"/);
  assert.match(html,/id="lokacije"/);
  assert.doesNotMatch(html,/google\.com\/maps\/search/); // V45.4: no external navigation link
  assert.match(html,/data-ws-map="Knez Mihailova 12, Beograd"/);
  assert.match(html,/data-system="demoBadge"/);
  assert.match(html,/source=demo-site&amp;business=/);
  // V43: channel numbers are retained in businessData for form routing, not shown beside the map.
  assert.equal(cfg.businessData.whatsapp,locationData.whatsapp);
  assert.equal(cfg.businessData.viber,locationData.viber);
  assert.doesNotMatch(html,/WhatsApp kontakt|Viber kontakt/);
 }
});
test('Phone labels are business-specific, no same generic contact CTA for every industry',()=>{
 const plumber=renderHtml(buildSitePayload(req('plumber',{businessData:{phone:'+381601234567'}})));
 const salon=renderHtml(buildSitePayload(req('hair-salon',{businessData:{phone:'+381601234567'}})));
 const parts=renderHtml(buildSitePayload(req('auto-parts',{businessData:{phone:'+381601234567'}})));
 assert.match(plumber,/Pozovite majstora/);assert.match(salon,/Pozovite salon/);assert.match(parts,/Pozovite za dostupnost/);
});
test('No imaginary phone, map or directions when no business data exists',()=>{
 const html=renderHtml(buildSitePayload(req('butcher-shop')));
 assert.doesNotMatch(html,/href="tel:/);assert.doesNotMatch(html,/id="lokacije"/);
 assert.doesNotMatch(html,/Učitaj mapu/);
 assert.match(html,/data-system="demoBadge"/);
});
test('City-only shows an area, NOT an exact address or pin, and no embed request is made by HTML',()=>{
 const html=renderHtml(buildSitePayload(req('hotel',{businessData:{city:'Niš'}})));
 assert.match(html,/Područje rada/);assert.doesNotMatch(html,/ws-directions/);
 assert.doesNotMatch(html,/data-ws-map=/);
 assert.doesNotMatch(html,/<iframe/);
});
test('Validation rejects spoofed links, incomplete addresses and improbable/dummy phone input',()=>{
 for(const businessData of [{phone:'123'},{phone:'abc123456'},{address:'Knez Mihailova 1'},
  {website:'javascript:alert(1)'},{website:'http://other.com'},{email:'not-email'},
  {whatsapp:'061234567'},{locations:Array.from({length:6},()=>({city:'Beograd',address:'A1'}))}]){
   assert.throws(()=>buildSitePayload(req('butcher-shop',{businessData})),undefined,JSON.stringify(businessData));
  }
});
test('Text escapes HTML injection; map query is URL-encoded and not a raw query parameter',()=>{
 const bad='Beograd <img src=x onerror=alert(1)>';
 const data={city:bad,address:'Glavna 8',email:'office@firma.rs'};
 const html=renderHtml(buildSitePayload(req('butcher-shop',{businessData:data})));
 assert.doesNotMatch(html,/<img src=x onerror=/);
 assert.match(html,/Beograd &lt;img/);
});
test('Brand is server-controlled, white-label-ready and query parameters preserve existing branding URL',()=>{
 const brand=demoBrandFromEnvironment({DEMO_BRAND_NAME:'Partner',DEMO_BRAND_LABEL:'Partner Business',DEMO_BRAND_URL:'https://partner.example/builder/?campaign=pilot'});
 const p=buildSitePayload(req('wine-shop'));
 p.siteConfig.demoBrand=brand;
 const html=renderHtml(p);
 assert.match(html,/Partner Business/);assert.match(html,/campaign=pilot&amp;source=demo-site&amp;business=wine-shop/);
});
test('Untrusted generation may not select production or change system branding',()=>{
 assert.throws(()=>buildSitePayload(req('butcher-shop',{siteMode:'production'})),/odobren/);
 const html=renderHtml(buildSitePayload(req('butcher-shop',{demoBrand:{label:'Fraud',url:'https://other.example'}})));
 assert.doesNotMatch(html,/Fraud/);
});
test('Trusted production rendering fully omits demo badge, not a CSS hide; footer not labeled DEMO',()=>{
 const p=buildSitePayload(req('butcher-shop'));
 p.siteConfig.siteMode='production'; // trusted publishing path only, never from public API
 const html=renderHtml(p);
 assert.doesNotMatch(html,/data-system="demoBadge"/);
 assert.doesNotMatch(html,/<span>Demo sajt ·/);
 assert.doesNotMatch(html,/<span>DEMO · RMC/);
 assert.match(html,/site-system\.css/);
});
test('Preview and ZIP have the same system layers, on-demand map and own runtime assets',()=>{
 const p=buildSitePayload(req('butcher-shop',{businessData:locationData}));
 const html=renderHtml(p),files=unzip(exportSiteZip(p));
 assert.equal(files['index.html'].toString('utf8'),html);
 for(const f of ['site-system.css','site-system.js','visual-system.css','global-modal.css'])assert.ok(files[f].length>100,f);
 assert.match(files['site-system.js'].toString('utf8'),/data-ws-map/);
});
test('All 72 supported scenario families can render global badge without contact duplication',()=>{
 const all=listBusinesses().filter(x=>x.pilot);assert.equal(all.length,80);
 for(const {id} of all){
  const payload=buildSitePayload(req(id,{businessData:{phone:'+381601234567'}}));
  const html=renderHtml(payload);
  assert.equal((html.match(/data-system="demoBadge"/g)||[]).length,1,`${id}: badge`);
  assert.equal((html.match(/class="ws-header-call"/g)||[]).length,1,`${id}: phone CTA`);
 }
});
test('V42 code keeps system modal unchanged and does not send forms automatically',()=>{
 assert.match(readFileSync(path.join(root,'client/public/site-system.js'),'utf8'),/button\.addEventListener\('click'/);
 const code=readFileSync(path.join(root,'client/src/main.jsx'),'utf8');
 assert.match(code,/businessData:/);assert.match(code,/site-system\.css/);
 assert.doesNotMatch(readFileSync(path.join(root,'client/public/site-system.css'),'utf8'),/#productDialog/);
});
