import test from 'node:test';
import assert from 'node:assert/strict';
import {recognizeBusiness} from '../src/advisor.js';
import {buildSitePayload} from '../src/site.js';

test('construction language is recognized without a clarification loop',()=>{
 for(const description of ['Gradim zgrade','Izgradnja stanova','Građevinska kompanija'])assert.equal(recognizeBusiness(description),'construction');
});

test('every generated site records the V31–V42 module library and its selected plan',()=>{
 const service=buildSitePayload({businessId:'hair-salon',businessName:'Salon',answers:{acceptsTimeRequests:true}}).siteConfig;
 const construction=buildSitePayload({businessId:'construction',businessName:'Gradnja',answers:{verticalEnabled:true}}).siteConfig;
 for(const site of [service,construction]){
  assert.equal(site.modulePlan.library.length,12);
  assert.deepEqual(site.modulePlan.library.map(x=>x.version),['V31','V32','V33','V34','V35','V36','V37','V38','V39','V40','V41','V42']);
  assert.ok(site.modulePlan.active.includes('hero'));
  assert.ok(site.modulePlan.active.includes('contact'));
 }
 assert.ok(service.modulePlan.active.includes('booking'));
 assert.ok(!construction.modulePlan.active.includes('booking'));
});
