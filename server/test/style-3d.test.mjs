import test from 'node:test';
import assert from 'node:assert/strict';
import {STYLES,getAdvisorDefinition,understandAdvisorDescription} from '../src/advisor.js';
import {buildSitePayload} from '../src/site.js';
import {renderHtml} from '../src/render-site.js';

const phoneRequest=style=>({
  businessId:'phone-store',
  businessName:'RMC Style Test',
  description:'Prodavnica mobilnih telefona',
  goal:'catalog',
  style,
  answers:{ordersEnabled:false,contactPhone:'+381603444827'}
});

test('public style registry retires Tech and exposes 3D while staying at five choices',()=>{
  assert.equal(STYLES.length,5);
  assert.deepEqual(STYLES.map(x=>x.id),['traditional','modern','warm','premium','3d']);
  assert.ok(!STYLES.some(x=>x.id==='tech'));
  assert.ok(getAdvisorDefinition('phone-store').styles.some(x=>x.id==='3d'));
});

test('legacy tech payloads reopen as Modern instead of colliding with 3D',()=>{
  const payload=buildSitePayload(phoneRequest('tech'));
  assert.equal(payload.siteConfig.style,'modern');
  const html=renderHtml(payload);
  assert.match(html,/data-style="modern"/);
  assert.doesNotMatch(html,/ws-hero-3d/);
});

test('3D is a real shared Hero presentation slot',()=>{
  const payload=buildSitePayload(phoneRequest('3d'));
  assert.equal(payload.siteConfig.style,'3d');
  const html=renderHtml(payload);
  assert.match(html,/data-style="3d"/);
  assert.match(html,/ws-hero-3d/);
  assert.match(html,/ws-hero-3d-css/);
});

test('Advisor language understands 3D and folds retired technological wording into Modern',()=>{
  assert.equal(understandAdvisorDescription('Prodajem telefone i želim 3D izgled',{businessId:'phone-store'}).signals.style,'3d');
  assert.equal(understandAdvisorDescription('Prodajem telefone i želim tehnološki izgled',{businessId:'phone-store'}).signals.style,'modern');
});
