import test from 'node:test';
import assert from 'node:assert/strict';
import {genericFood,sanitizeAiSuggestion,proposeBusinessWithAi} from '../src/advisor-ai.js';
const businesses=[{id:'grocery-store',label:'Minimarket'},{id:'bakery',label:'Pekara'},{id:'pastry',label:'Poslastičarnica'}];
test('generic food is ambiguous, explicit butcher or mini-market is not',()=>{
 assert.equal(genericFood('Prodajem prehrambene proizvode'),true);
 assert.equal(genericFood('Imam minimarket, prodajem prehrambene proizvode'),false);
 assert.equal(genericFood('Imam mesaru i prodajem meso'),false);
});
test('invalid suggestions and invented business IDs never pass allowlist',()=>{
 const r=sanitizeAiSuggestion({businessId:'other-store',needsClarification:true,question:'Koja radnja?',choices:['bakery','invented','bakery','pastry','grocery-store','fake']},businesses);
 assert.equal(r.businessId,null);assert.deepEqual(r.choices,['bakery','pastry','grocery-store']);
});
test('no API key means no AI network request',async()=>{
 const r=await proposeBusinessWithAi('Prodajem hranu',businesses,{apiKey:'',fetchImpl:()=>{throw new Error('NETWORK CALLED')}});
 assert.equal(r,null);
});
test('mocked structured AI result gets validated',async()=>{
 const r=await proposeBusinessWithAi('Imam pekaru',businesses,{apiKey:'test-not-real',fetchImpl:async(_url,options)=>{
  const req=JSON.parse(options.body);assert.equal(req.store,false);
  return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({businessId:'bakery',needsClarification:false,question:'',choices:[]})}}]})};
 }});
 assert.equal(r.businessId,'bakery');
});
