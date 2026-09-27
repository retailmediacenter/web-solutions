import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {understandAdvisorDescription,getAdvisorDefinition,listBusinesses} from '../src/advisor.js';
import {buildAdvisorDraft} from '../../client/src/advisor-flow.js';
const u=understandAdvisorDescription;
const draft=s=>{const a=u(s);return {u:a,d: a.businessId?buildAdvisorDraft(getAdvisorDefinition(a.businessId),a.signals):null};};

test('V45 extracts explicit retail facts and preserves negations',()=>{
 const no=draft('Imam prodavnicu obuće u Čačku; ne prodajemo online; samo katalog, premium stil');
 assert.equal(no.u.businessId,'shoe-shop');assert.equal(no.u.signals.ordersEnabled,false);
 assert.equal(no.d.answers.ordersEnabled,false);assert.equal(no.d.style,'premium');assert.equal(no.d.goal,'catalog');
 assert.deepEqual(no.d.steps,['company']);
 const yes=draft('Prodavnica obuće. Kupci mogu da naruče preko sajta, želim moderan izgled');
 assert.equal(yes.u.signals.ordersEnabled,true);assert.equal(yes.u.signals.bookingEnabled,undefined);
 assert.deepEqual(yes.d.steps,['company']);
 const unclear=draft('Imam prodavnicu obuće, predstavite ponudu i kategorije');
 assert.deepEqual(unclear.d.steps,['special:ordersEnabled','company']);
 const payment=u('Prodavnica obuće, želim online poručivanje ali bez online plaćanja');
 assert.equal(payment.signals.ordersEnabled,true,'no online payment is not no orders');
});

test('V45 wine keeps catalog, orders and ONLINE tasting reservations independent',()=>{
 const basics=draft('Imam vinoteku. Prodajem vino i organizujem degustacije petkom. Moderno.');
 assert.equal(basics.u.businessId,'wine-shop');assert.equal(basics.d.style,'modern');
 assert.equal(basics.u.signals.wineTastings,undefined,'organizing does not prove online booking');
 assert.deepEqual(basics.d.steps,['special:wineTastings','special:ordersEnabled','company']);
 const yes=draft('Vinoteka. Kupci mogu da naruče preko sajta i da zakazuju degustacije preko sajta.');
 assert.equal(yes.u.signals.ordersEnabled,true);assert.equal(yes.u.signals.wineTastings,true);
 assert.deepEqual(yes.d.steps,['company']);
 const no=u('Vinoteka. Ne organizujemo degustacije, ali primamo porudžbine putem sajta.');
 assert.equal(no.signals.wineTastings,false);assert.equal(no.signals.ordersEnabled,true);
});

test('V45 Booking requires explicit yes/no and never infers it from profession',()=>{
 const y=draft('Frizerski salon. Želim online zakazivanje termina.');
 assert.equal(y.u.signals.acceptsTimeRequests,true);assert.deepEqual(y.d.steps,['company']);
 const no=draft('Frizerski salon, bez online zakazivanja.');
 assert.equal(no.u.signals.acceptsTimeRequests,false);assert.deepEqual(no.d.steps,['company']);
 const unknown=draft('Frizerski salon, moderan izgled.');
 assert.equal(unknown.u.signals.acceptsTimeRequests,undefined);
 assert.deepEqual(unknown.d.steps,['special:acceptsTimeRequests','company']);
 const plumber=draft('Vodoinstalater, zakazivanje termina preko sajta');
 assert.equal(plumber.u.signals.acceptsTimeRequests,true);
 assert.deepEqual(plumber.d.steps,['company']);
});

test('V45 hybrids only select existing authorized combination',()=>{
 const x=draft('Prodajemo auto-delove i radimo auto-servis, želimo porudžbine preko sajta');
 assert.equal(x.u.businessId,'auto-parts');assert.equal(x.d.answers.hybridChoice,'auto-service');
 assert.equal(x.d.answers.ordersEnabled,true);assert.deepEqual(x.d.steps,['company']);
 const furniture=draft('Imam salon nameštaja. Radimo i montažu.');
 assert.equal(furniture.u.businessId,'furniture-store');assert.equal(furniture.d.answers.hybridChoice,'carpenter');
 assert.deepEqual(furniture.d.steps,['special:ordersEnabled','company']);
 const unsupported=u('Prodajem klima uređaje i radim montažu.');
 assert.equal(unsupported.businessId,'hvac');assert.equal(unsupported.signals.hybridChoice,undefined);
 assert.ok(unsupported.warnings.some(w=>/nije.*hibrid/.test(w)));
});

test('V45 does not promise capabilities missing from the selected business',()=>{
 const extra=u('Auto servis i prodaja vozila, želim da ljudi kupuju preko sajta.');
 assert.equal(extra.businessId,'auto-service');
 assert.equal(extra.signals.hybridChoice,'vehicle-sales');
 assert.equal(extra.signals.ordersEnabled,undefined);
 assert.ok(extra.warnings.some(w=>/poručivanje/.test(w)));
 const noInvent=u('Prodajem i montiram klima uređaje.');
 assert.equal(noInvent.businessId,'hvac');assert.equal(noInvent.signals.hybridChoice,undefined);
 assert.ok(noInvent.warnings.length>0);
});

test('V45 essential non-guessing invariants',()=>{
 for(const {id} of listBusinesses()){
  const d=getAdvisorDefinition(id);
  const plan=buildAdvisorDraft(d,{});
  for(const special of d.specials)assert.ok(plan.steps.includes('special:'+special.id),`${id}: missing capability question`);
  for(const key of ['ordersEnabled','acceptsTimeRequests','wineTastings','verticalEnabled'])assert.equal(plan.answers[key],undefined,`${id}: fabricated ${key}`);
  assert.equal(plan.steps.at(-1),'company',id);
  if(d.hybrid)assert.equal(plan.answers.hybridChoice,'none',id);
 }
 assert.equal(listBusinesses().length,72);
 const runtime=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(runtime,/understandAdvisorDescription/);
 assert.match(runtime,/app\.get\('\/api\/advisor\/recognize'/);
 const react=readFileSync(new URL('../../client/src/main.jsx',import.meta.url),'utf8');
 assert.match(react,/buildAdvisorDraft/);assert.match(react,/setAdvisorSignals/);
 assert.match(react,/advisorAcknowledgement/);
 assert.ok(!react.includes('showWelcome:true'));
});
