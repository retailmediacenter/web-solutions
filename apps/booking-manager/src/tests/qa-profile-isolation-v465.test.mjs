import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {boundSiteId,isCanonicalQaSite,selectProfileForSite,profileDataCounts,clearOnlyCurrentQaData} from '../profile-isolation.mjs';
const first='X2NQfB8OQ-16VZ0FVjfbahha';
const second='-l0TtTRUAW1cilRuxl4Ib--a';
const mk=name=>({id:'new-'+name,name,services:[{name:'Sisanje'}]});
const sample=()=>({schema:1,activeProfileId:'old',profiles:[{id:'old',name:'Frizer',services:[{name:'Sisanje'}],boundSiteId:first,queueConnection:{siteId:first,accessToken:'secret'}}],bookings:[{id:'b1',profileId:'old',serviceName:'Sisanje'}],orders:[{id:'o1',profileId:'old'}]});
test('QA SITE IDs are allowlisted and arbitrary production IDs cannot be erased',()=>{
 assert.equal(isCanonicalQaSite(first),true);assert.equal(isCanonicalQaSite(second),true);
 assert.equal(isCanonicalQaSite('abcdefghijklmnopqrstuvwx'),false);
});
test('Connecting another SITE ID creates an independent local profile without moving old bookings',()=>{
 const state=sample(); const oldSnapshot=structuredClone(state.profiles[0]);
 const p=selectProfileForSite(state,second,'Vodoinstalater',mk);
 assert.equal(p.boundSiteId,second);assert.equal(p.services.length,0);
 assert.notEqual(p.id,'old');assert.equal(state.activeProfileId,p.id);
 assert.deepEqual(state.profiles[0],oldSnapshot);
 assert.equal(state.bookings[0].profileId,'old');
});
test('Re-pairing the SAME SITE ID reuses its profile and preserves calendar',()=>{
 const state=sample();const p=selectProfileForSite(state,first,'Frizer',mk);
 assert.equal(p.id,'old');assert.equal(state.profiles.length,1);assert.equal(state.bookings.length,1);
});
test('Disconnected legacy profile without owner ID cannot be overwritten by a different site',()=>{
 const state=sample();delete state.profiles[0].queueConnection;delete state.profiles[0].boundSiteId;
 const p=selectProfileForSite(state,second,'Vodoinstalater',mk);
 assert.notEqual(p.id,'old');assert.equal(state.bookings[0].serviceName,'Sisanje');
});
test('Reset removes ONLY the selected QA profile entries and leaves connections intact',()=>{
 const state=sample();const plumber=selectProfileForSite(state,second,'Vodoinstalater',mk);
 plumber.queueConnection={siteId:second,accessToken:'plumberSecret'};
 plumber.siteProfile={services:[{id:'plumbing-1',name:'Vodoinstalaterska usluga'}]};
 plumber.services=[{id:'s-hair',name:'Sisanje'},{id:'s-pipe',siteServiceId:'plumbing-1',name:'Plumber old name',duration:30}];
 state.bookings.push({id:'b2',profileId:plumber.id,serviceName:'Popravka'});
 state.orders.push({id:'o2',profileId:plumber.id});
 assert.deepEqual(profileDataCounts(state,plumber.id),{bookings:1,orders:1});
 const clear=clearOnlyCurrentQaData(state,plumber.id);
 assert.deepEqual(clear.bookings.map(x=>x.id),['b1']);
 assert.deepEqual(clear.orders.map(x=>x.id),['o1']);
 assert.equal(clear.profiles.length,2);
 assert.equal(clear.profiles[1].queueConnection.accessToken,'plumberSecret');
 assert.deepEqual(clear.profiles[1].services,[{id:'s-pipe',siteServiceId:'plumbing-1',name:'Vodoinstalaterska usluga',duration:30}]);
 assert.equal(clear.activeProfileId,plumber.id);
 assert.deepEqual(state.bookings.map(x=>x.id),['b1','b2']);
});
test('Production profile is not eligible for local reset',()=>{
 const state=sample();state.profiles[0].boundSiteId='abcdefghijklmnopqrstuvwx';
 assert.throws(()=>clearOnlyCurrentQaData(state,'old'),/devet QA/);
});
test('Integration wires safe pre-claim guard, backup, confirmations, and strict IndexedDB write',()=>{
 const file=resolve(dirname(fileURLToPath(import.meta.url)),'../app.mjs');const src=readFileSync(file,'utf8');
 assert.match(src,/if\(p\?\.queueConnection\)throw new Error/);
 assert.match(src,/selectProfileForSite\(state,connected\.siteId/);
 assert.match(src,/p\.boundSiteId=conn\.siteId/);
 assert.match(src,/data-action="qa-data-reset"/);
 assert.match(src,/exportState\(\);[\s\S]*?window\.confirm\([\s\S]*?window\.prompt/);
 assert.match(src,/state=clearOnlyCurrentQaData\(state,p\.id\);[\s\S]*?await persistStrict\(\)/);
});
