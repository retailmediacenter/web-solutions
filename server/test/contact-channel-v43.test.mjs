import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolveBusinessData} from '../src/site-system.js';
import {renderSystemLayer} from '../src/render-system.js';
const source=readFileSync(fileURLToPath(new URL('../src/render-system.js',import.meta.url)),'utf8');
const base='<html><head></head><body><header></header><main></main></body></html>';
const site={business:{id:'butcher-shop',name:'Test mesara'},siteMode:'demo',businessData:{phone:'+381601234567',email:'info@example.rs',website:'',whatsapp:'+381601234567',viber:'+381601234567',locations:[{id:'lokacija-1',city:'Beograd',address:'Primer 12',hours:'Pon–Pet 09–18'}]}};
test('Map/contact block excludes Viber and WhatsApp direct shortcuts',()=>{
 const html=renderSystemLayer(base,site);
 assert.match(html,/>Prikaži mapu<\/button>/);
 assert.match(html,/data-ws-map=/);
 assert.doesNotMatch(html,/<iframe|ws-directions|google\.com\/maps\/search/);
 assert.match(html,/tel:\+381601234567/);
 assert.match(html,/info@example.rs/);
 assert.doesNotMatch(html,/WhatsApp kontakt|Viber kontakt|wa\.me|viber:\/\/chat/);
});
test('Dedicated channel numbers remain in shared data for future form routing',()=>{
 const data=resolveBusinessData({businessData:{locationMode:'physical',phone:'+381601234567',whatsapp:'+381611111111',viber:'+381622222222',city:'Beograd',address:'Primer 12'}},{business:{name:'Test mesara'}});
 assert.equal(data.whatsapp,'+381611111111');assert.equal(data.viber,'+381622222222');
 assert.equal(data.locations.length,1);
});
test('Legacy direct messaging link is not accidentally re-added to the location renderer',()=>{
 assert.doesNotMatch(source,/WhatsApp kontakt|Viber kontakt/);
});
