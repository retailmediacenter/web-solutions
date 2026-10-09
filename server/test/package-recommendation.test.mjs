import test from 'node:test';
import assert from 'node:assert/strict';
import {recommendPackage} from '../src/package-recommendation.js';

test('brief with 20 catalog items and pick & collect recommends Commerce',()=>{
 const result=recommendPackage({notes:'Klijent hoće 20 artikala i pick & collect narudžbine.',modulePlan:['header','hero','contact']});
 assert.equal(result.recommendedPlan,'commerce');
 assert.deepEqual(result.proposedModules,['header','hero','featured','location','contact','commerce-controller','catalog']);
 assert.deepEqual(result.addedModules,['featured','location','commerce-controller','catalog']);
});

test('booking brief recommends Business and does not imply Commerce',()=>{
 const result=recommendPackage({notes:'Želimo rezervacije termina putem forme.',modulePlan:['header','hero']});
 assert.equal(result.recommendedPlan,'business');
 assert.ok(result.proposedModules.includes('booking'));
 assert.ok(!result.proposedModules.includes('catalog'));
});
