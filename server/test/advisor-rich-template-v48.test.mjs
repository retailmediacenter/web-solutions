import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAdvisorDraft} from '../../client/src/advisor-flow.js';
import {getAdvisorDefinition} from '../src/advisor.js';

test('Advisor asks for one explicit content priority before company details',()=>{
 const definition=getAdvisorDefinition('construction');
 const draft=buildAdvisorDraft(definition,{verticalEnabled:true});
 assert.ok(draft.steps.includes('emphasis'));
 assert.equal(draft.steps.at(-1),'company');
 const chosen=buildAdvisorDraft(definition,{verticalEnabled:true,emphasis:definition.emphasis.options[1]});
 assert.ok(!chosen.steps.includes('emphasis'));
});
