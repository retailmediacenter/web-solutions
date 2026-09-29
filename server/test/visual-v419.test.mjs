import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildSitePayload} from '../src/site.js';
import {renderHtml} from '../src/render-site.js';
import {exportSiteZip} from '../src/exporter.js';
import {inflateRawSync} from 'node:zlib';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../client/public');
const visual=readFileSync(path.join(root,'visual-system.css'),'utf8');
const modal=readFileSync(path.join(root,'global-modal.css'),'utf8');
const behavior=readFileSync(path.join(root,'global-modal.js'),'utf8');
const cafe=(style)=>buildSitePayload({businessId:'butcher-shop',businessName:'Test mesara',goal:'purchase',style,answers:{butcherGrillService:'grilled'}});
const service=()=>buildSitePayload({businessId:'hair-salon',businessName:'Test frizer',goal:'visit',style:'warm',answers:{acceptsTimeRequests:true}});
const vertical=()=>buildSitePayload({businessId:'real-estate',businessName:'Test nekretnine',goal:'visit',style:'tech',answers:{verticalEnabled:true}});
test('V41.9 five styles use approved tokens but neutral modal is NOT style-dependent',()=>{
  for(const style of ['traditional','modern','warm','tech','premium']){
    assert.ok(visual.includes(`html[data-style="${style}"]`));
    const h=renderHtml(cafe(style));assert.ok(h.includes(`data-style="${style}"`));
    assert.ok(h.includes('visual-system.css')&&h.includes('global-modal.css')&&h.includes('global-modal.js'));
    const z=exportSiteZip(cafe(style));
    for(const name of ['visual-system.css','global-modal.css','global-modal.js','index.html'])assert.ok(z.includes(Buffer.from(name)),`${style}/${name}`);
  }
  assert.ok(!modal.includes('html[data-style='),'modal design must not vary by website style');
  assert.ok(modal.includes('.modal-header')&&modal.includes('.modal-body')&&modal.includes('.modal-footer'));
});
test('Preview and ZIP: all rendering families get same visual/modal layer',()=>{
 for(const [name,p] of [['commerce',cafe('modern')],['service',service()],['vertical',vertical()]]){
  const h=renderHtml(p),z=exportSiteZip(p);
  assert.equal((h.match(/href="visual-system\.css"/g)||[]).length,1,name);
  assert.equal((h.match(/src="global-modal\.js"/g)||[]).length,1,name);
  for(const file of ['visual-system.css','global-modal.css','global-modal.js'])assert.ok(z.includes(Buffer.from(file)),name+'/'+file);
 }
});
test('Product/Cart/order/booking/hybrid share native dialog and stable element targets',()=>{
 const h=renderHtml(cafe('modern'));
 for(const id of ['productDialog','cartDialog','orderDialog'])assert.ok(h.includes(`id="${id}"`));
 assert.ok(behavior.includes("submit.setAttribute('form','orderForm')"));
 assert.ok(behavior.includes('sharePanel')&&behavior.includes('vehicleDetailDialog'));
 assert.ok(behavior.includes('dialog.dataset.modalSystem=D'));
 assert.ok(renderHtml(service()).includes('id="requestDialog"'));
 assert.ok(renderHtml(vertical()).includes('id="verticalDialog"'));
});
test('Text wrap and motion accessibility are shared and traditional has no reveal effects',()=>{
 assert.ok(visual.includes('.vertical-inquiry .section-heading{display:block'));
 assert.ok(visual.includes('prefers-reduced-motion'));
 assert.ok(visual.includes('html[data-style="traditional"] .site-section[data-reveal]'));
 assert.ok(behavior.includes('IntersectionObserver'));
 assert.ok(behavior.includes("dataset.style!=='traditional'"));
});

test('Optional Welcome is explicitly owned by Advisor and uses a real V33 featured item, never the hero',()=>{
 const input={businessId:'butcher-shop',businessName:'Dobro došli',style:'modern',goal:'purchase',answers:{butcherGrillService:'grilled'}};
 const off=renderHtml(buildSitePayload(input));
 const payload=buildSitePayload({...input,answers:{...input.answers,showWelcome:true}});
 const on=renderHtml(payload);
 assert.ok(!off.includes('id="welcomeDialog"'));
  assert.ok(on.includes('id="welcomeDialog"'));
  assert.ok(on.includes('id="welcomeContinue"'));
  assert.ok(on.includes('IZDVAJAMO'));
  assert.ok(on.includes(payload.catalog.products[0].image));
  assert.equal((on.match(/data-welcome-index=/g)||[]).length,3,'Welcome exposes three V33 items as a slider');
  assert.ok(!on.includes(`class="welcome-photo" src="${payload.catalog.hero}"`));
  const vertical=buildSitePayload({businessId:'construction',businessName:'Gradnja',style:'modern',goal:'visit',answers:{verticalEnabled:true,showWelcome:true}});
  assert.ok(vertical.siteConfig.modulePlan.active.includes('featured'),'Welcome activates V33 when a vertical site did not otherwise need it');
  assert.ok(renderHtml(vertical).includes('id="welcomeDialog"'),'the newly active V33 renders its real offer cards in Welcome');
 const zip=exportSiteZip(payload);
 const firstNameSize=zip.readUInt16LE(26),compSize=zip.readUInt32LE(18),method=zip.readUInt16LE(8);
 const zippedBody=zip.subarray(30+firstNameSize,30+firstNameSize+compSize);
 const exportedHtml=(method===8?inflateRawSync(zippedBody):zippedBody).toString('utf8');
 assert.ok(exportedHtml.includes('id="welcomeDialog"'));
 assert.equal(exportedHtml,on);
});
