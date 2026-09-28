import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {getAdvisorDefinition,listBusinesses} from '../src/advisor.js';
import {resolvePharmacySiteConfig,pharmacyOperations} from '../src/pharmacy-engine.js';
import {buildAdvisorDraft} from '../../client/src/advisor-flow.js';

// V45.4: client questionnaire and server rendering contracts must agree.
// These tests deliberately preserve separate product and consultation decisions.
test('pharmacy asks product operation and consultation separately',()=>{
  const def=getAdvisorDefinition('pharmacy');
  assert.deepEqual(def.operation.options,pharmacyOperations);
  assert.deepEqual(def.specials.map(s=>s.id),['pharmacyConsultations']);
  const empty=buildAdvisorDraft(def,{});
  assert.deepEqual(empty.steps,['operation','special:pharmacyConsultations','company']);
  assert.equal(empty.answers.businessMode,undefined);
  assert.equal(empty.answers.pharmacyConsultations,undefined);
  for(const mode of pharmacyOperations){
    const known=buildAdvisorDraft(def,{businessMode:mode});
    assert.deepEqual(known.steps,['special:pharmacyConsultations','company']);
    assert.equal(known.answers.businessMode,mode);
    for(const consult of [true,false]){
      const complete=buildAdvisorDraft(def,{businessMode:mode,pharmacyConsultations:consult});
      assert.deepEqual(complete.steps,['company']);
      assert.equal(complete.answers.pharmacyConsultations,consult);
    }
  }
  assert.deepEqual(buildAdvisorDraft(def,{businessMode:'unknown',pharmacyConsultations:true}).steps,['operation','company']);
});

test('pharmacy product orders and optional consultation are independent across all 5 styles and 3 goals',()=>{
  for(const style of ['traditional','modern','warm','tech','premium'])
  for(const goal of ['purchase','visit','catalog'])
  for(const businessMode of pharmacyOperations)
  for(const consult of [true,false]){
    const {siteConfig:site}=resolvePharmacySiteConfig({businessId:'pharmacy',businessName:'Apoteka test',
      description:'Apoteka',style,goal,answers:{businessMode,pharmacyConsultations:consult}});
    const orders=businessMode===pharmacyOperations[0];
    assert.equal(site.capabilities.commerce,orders);
    assert.equal(site.capabilities.pharmacyConsultations,consult);
    assert.equal(site.modules.includes('cart'),orders);
    assert.equal(site.modules.includes('pharmacy-consultation'),consult);
    assert.equal(site.input.mode,businessMode);
  }
});

test('72 business questionnaires do not skip compulsory known server decisions',()=>{
  const businesses=listBusinesses();assert.equal(businesses.length,72);
  for(const {id} of businesses){
    const def=getAdvisorDefinition(id);
    const plan=buildAdvisorDraft(def,{});
    for(const q of def.specials) assert.ok(plan.steps.includes('special:'+q.id),id+': missing '+q.id);
    assert.equal(plan.steps.at(-1),'company',id);
    const requiresOperation=['pharmacy','hotel','apartments'].includes(id);
    assert.equal(plan.steps.includes('operation'),requiresOperation,id+': operation drift');
    if(requiresOperation){
      const ready=buildAdvisorDraft(def,{businessMode:def.operation.options[0]});
      assert.ok(!ready.steps.includes('operation'),id+': repeats known operation');
    }
  }
  const ui=readFileSync(new URL('../../client/src/main.jsx',import.meta.url),'utf8');
  assert.match(ui,/buildAdvisorDraft\(definition,advisorSignals\)/);
  assert.match(ui,/current==='operation'/);
});
