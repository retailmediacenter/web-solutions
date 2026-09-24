import test from 'node:test';
import assert from 'node:assert/strict';
import {getRegistryCount, getBusinessFacts} from '../src/registry.js';
import {resolvePilotSiteConfig} from '../src/advisor.js';
const input=(businessId,answers)=>({businessId,businessName:'Test firma',answers});
test('V39.5 registry preserved: exactly 72 business facts',()=>{
  assert.equal(getRegistryCount(),72);
  for(const id of ['butcher-shop','wine-shop','shoe-shop']) assert.ok(getBusinessFacts(id));
  assert.equal(getBusinessFacts('butcher-shop').productAttributes.includes('preparation'),true);
});
test('Butcher: raw vs grilled are explicit and retained',()=>{
  const raw=resolvePilotSiteConfig(input('butcher-shop',{butcherGrillService:'raw'}));
  const grill=resolvePilotSiteConfig(input('butcher-shop',{butcherGrillService:'grilled'}));
  assert.equal(raw.capabilities.butcherGrillService,false);
  assert.equal(grill.capabilities.butcherGrillService,true);
});
test('Butcher: question cannot be silently skipped',()=>{
  assert.throws(()=>resolvePilotSiteConfig(input('butcher-shop',{})),/Nedostaje/);
});
test('Wine tasting: booking only if explicitly enabled',()=>{
  const no=resolvePilotSiteConfig(input('wine-shop',{wineTastings:false}));
  const yes=resolvePilotSiteConfig(input('wine-shop',{wineTastings:true}));
  assert.equal(no.modules.includes('wine-tasting'),false);
  assert.equal(yes.modules.includes('wine-tasting'),true);
});
test('Shoe retail is simple pilot commerce case',()=>{
  const site=resolvePilotSiteConfig(input('shoe-shop',{}));
  assert.equal(site.modules.includes('catalog'),true);
  assert.deepEqual(site.capabilities,{});
});
