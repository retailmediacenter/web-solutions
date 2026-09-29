import test from 'node:test';
import assert from 'node:assert/strict';
import {activatePortalProfile,activePortalProfileId,portalModules} from '../portal-modules.mjs';

test('Commerce-ready Portal profile does not require a booking calendar',()=>{
  assert.deepEqual(portalModules({name:'Prodavnica'}),{booking:false,orders:false});
  assert.deepEqual(portalModules({services:[]}),{booking:false,orders:false});
  assert.deepEqual(portalModules({services:[{id:'cut'}]}),{booking:true,orders:false});
});

test('existing unpaired local data never becomes the active public Portal profile',()=>{
 const profiles=[{id:'old'},{id:'connected',queueConnection:{siteId:'site'}},{id:'active'}];
 assert.equal(activePortalProfileId(profiles,'active'),'connected');
 assert.equal(activePortalProfileId(profiles,'missing'),'connected');
 assert.equal(activePortalProfileId([{id:'legacy'}],'legacy'),null);
 assert.equal(activePortalProfileId([],''),null);
});

test('first pairing activates the received profile and preserves existing local data',()=>{
 const legacy={id:'legacy'},received={id:'frizer-nesa',queueConnection:{siteId:'site'}};
 const before={schema:1,activeProfileId:null,profiles:[legacy],bookings:[{id:'saved',profileId:'legacy'}]};
 const after=activatePortalProfile(before,received);
 assert.equal(after.activeProfileId,'frizer-nesa');
 assert.deepEqual(after.profiles,[legacy,received]);
 assert.deepEqual(after.bookings,before.bookings);
});
