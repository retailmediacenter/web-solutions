import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSitePayload} from '../src/site.js';
import {renderHtml} from '../src/render-site.js';
import {exportSiteZip} from '../src/exporter.js';
import {controllerAssets,renderCommerceController} from '../src/commerce-controller.js';

const profiles=Object.freeze([
  'auto-parts','butcher-shop','electrical-supplies','furniture-store',
  'phone-store','plumbing-supplies','wine-shop'
]);

function payloadFor(businessId){
  return buildSitePayload({
    businessId,businessName:`Test ${businessId}`,style:'modern',goal:'purchase',
    answers:{ordersEnabled:true,butcherGrillService:'raw',wineTastings:true,contactPhone:'060123456'}
  });
}

test('V39.5 commerce controllers are restored for every supported retail profile',()=>{
  for(const businessId of profiles){
    const assets=controllerAssets(businessId);
    assert.ok(assets.length>=4,`${businessId} needs its visual controller assets`);
    const controller=renderCommerceController(businessId);
    assert.match(controller,/data-controller-select/,`${businessId} needs selectable controller cards`);
    const html=renderHtml(payloadFor(businessId));
    assert.ok(html.indexOf('id="izbor"')<html.indexOf('id="ponuda"'),`${businessId} controller precedes catalog`);
    assert.match(html,/data-controller-select/);
  }
});

test('every controller profile includes its visual assets in the publish ZIP',()=>{
  for(const businessId of profiles){
    const zip=exportSiteZip(payloadFor(businessId));
    assert.ok(zip.length>1_000_000,`${businessId} ZIP includes its visual assets`);
  }
});
