import test from 'node:test';
import assert from 'node:assert/strict';
import {filterAdvisorSignals,mergeAdvisorSignals,changedAdvisorSignals,safeAdvisorAcknowledgement,interpretShortAnswer} from '../src/advisor-dialog.js';
import {answerApprovedAdvisorQuestion,phraseVerifiedTurn} from '../src/advisor-dialog-ai.js';
const def={operation:{options:['Radnja','Online']},emphasis:{options:['Proizvodi','Ponuda']},
  hybrid:{options:[{id:'none'},{id:'auto-service'}]},
  specials:[{id:'ordersEnabled',options:[{id:'yes'},{id:'no'}]},
    {id:'butcherGrillService',options:[{id:'raw'},{id:'grilled'}]},
    {id:'wineTastings',options:[{id:'yes'},{id:'no'}]}]};
test('V45.3 accepts only registered questions, styles, goals and compatible hybrids',()=>{
 assert.deepEqual(filterAdvisorSignals(def,{goal:'visit',style:'premium',ordersEnabled:false,
   bogus:true,bookingEnabled:true,hybridChoice:'invalid',emphasis:'Proizvodi'}),
   {goal:'visit',style:'premium',emphasis:'Proizvodi',ordersEnabled:false});
});
test('V45.3 latest explicit NO overrides earlier YES and leaves unspecified facts alone',()=>{
 assert.deepEqual(mergeAdvisorSignals(def,{ordersEnabled:true,style:'warm',wineTastings:true},{ordersEnabled:false}),
 {style:'warm',ordersEnabled:false,wineTastings:true});
 assert.deepEqual(changedAdvisorSignals(def,{ordersEnabled:true,style:'warm'},{ordersEnabled:false}),{ordersEnabled:false});
 assert.match(safeAdvisorAcknowledgement(def,{ordersEnabled:false}),/Nećemo uključiti/);
});
test('V45.3 does not infer unknown commerce, booking or unsupported option',()=>{
 assert.deepEqual(mergeAdvisorSignals(def,{},{bogus:true,ordersEnabled:'unknown',wineTastings:'perhaps'}),{});
 assert.deepEqual(changedAdvisorSignals(def,{style:'modern'},{style:'modern'}),{});
});
test('V45.3 boolean yes/no normalization and concrete option preservation',()=>{
 assert.deepEqual(filterAdvisorSignals(def,{ordersEnabled:'yes',wineTastings:'no',butcherGrillService:'grilled'}),
 {ordersEnabled:true,butcherGrillService:'grilled',wineTastings:false});
});

test('V45.3 handles short natural answers only to existing yes/no question',()=>{
 assert.deepEqual(interpretShortAnswer(def,'special:ordersEnabled','Da!'),{ordersEnabled:true});
 assert.deepEqual(interpretShortAnswer(def,'special:ordersEnabled','Ne želim'),{ordersEnabled:false});
 assert.deepEqual(interpretShortAnswer(def,'special:butcherGrillService','Da'),{});
 assert.deepEqual(interpretShortAnswer(def,'special:unknown','Da'),{});
});

test('V45.3 narrow AI FAQ answers cannot rewrite capabilities',async()=>{
 const fake=async(_url,opts)=>{
   const req=JSON.parse(opts.body);
   assert.equal(req.store,false);
   assert.ok(req.messages[1].content.includes('Booking'));
   return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({answer:'Booking je samo zahtev; vlasnik potvrđuje termin.'})}}]})};
 };
 const reply=await answerApprovedAdvisorQuestion({message:'Da li Booking odmah potvrđuje termin?',apiKey:'FAKE_TEST',fetchImpl:fake});
 assert.match(reply,/vlasnik potvrđuje/);
 const no=await answerApprovedAdvisorQuestion({message:'Prodajem meso',apiKey:'FAKE_TEST',fetchImpl:fake});
 assert.equal(no,null);
});
test('V45.3 FAQ refuses invented monetary prices',async()=>{
 const fake=async()=>({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({answer:'Paket košta 777 EUR.'})}}]})});
 assert.equal(await answerApprovedAdvisorQuestion({message:'Koliko košta?',apiKey:'FAKE_TEST',fetchImpl:fake}),null);
});
