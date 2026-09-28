import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {isDemoLocation,buildPublicDemoState} from '../demo-mode.mjs';
import {portalModules} from '../portal-modules.mjs';
const here=dirname(fileURLToPath(import.meta.url));
const app=readFileSync(resolve(here,'../app.mjs'),'utf8');
const css=readFileSync(resolve(here,'../style.css'),'utf8');
test('demo URL activates only on explicit ?demo=1',()=>{
 assert.equal(isDemoLocation(''),false);assert.equal(isDemoLocation('?demo=0'),false);
 assert.equal(isDemoLocation('?demo=1'),true);
});
test('demo profile has both real Portal tabs and no owner credentials',()=>{
 const demo=buildPublicDemoState(new Date('2026-09-28T11:00:00Z'));
 assert.equal(demo.profiles.length,1);
 assert.deepEqual(portalModules(demo.profiles[0]),{booking:true,orders:true});
 assert.equal(demo.bookings.length,2);assert.equal(demo.orders.length,2);
 assert.equal(demo.orders[0].total,demo.orders[0].items.reduce((s,item)=>s+item.lineTotal,0));
 assert.equal(demo.savedAt,null);
 assert.equal(demo.profiles[0].queueConnection,undefined);
 assert.equal(demo.bookings.every(b=>b.profileId===demo.activeProfileId&&b.phone===''),true);
 assert.equal(demo.orders.every(o=>o.profileId===demo.activeProfileId&&o.phone===''),true);
 assert.equal(JSON.stringify(demo).includes('accessToken'),false);
});
test('app routes demo state entirely through in-memory model; no DB, sync, Push or external messaging',()=>{
 assert.match(app,/state=demoMode\?buildPublicDemoState\(\):/);
 assert.match(app,/async function persist\(\)\{\s*\/\/[^\n]*\n\s*if\(demoMode\)return;/);
 assert.match(app,/async function persistStrict\(\)\{\s*if\(demoMode\)return;/);
 assert.match(app,/async function syncQueuedRequests[\s\S]{0,110}if\(demoMode\)return/);
 assert.match(app,/function shareOrder\(channelName\)\{\s*if\(demoMode\)/);
 assert.match(app,/function openChannel\(b,channelName\)\{\s*if\(demoMode\)/);
 assert.match(app,/if\(!demoMode&&import\.meta\.env\.PROD/);
 assert.match(app,/if\(!demoMode\)pollTimer=setInterval/);
 assert.match(app,/if\(demoMode&&\['export','import'/);
 assert.match(app,/if\(!demoMode&&'BroadcastChannel' in window\)/);
 assert.match(css,/V47\.1 PUBLIC DEMO/);
});
