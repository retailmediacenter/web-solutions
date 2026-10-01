import test from 'node:test';
import assert from 'node:assert/strict';
import {agentContext,createAgentService} from '../src/agent-service.js';

const project={siteId:'AbCdEfGhIjKlMnOpQrStUvWx',createdAt:'2026-09-30T10:00:00.000Z',business:{name:'Booka'},capabilities:{booking:false,commerce:false},siteConfig:{business:{name:'Booka'},contact:{phone:'6544565445'},advisorContext:{businessId:'bookshop',description:'Knjižara',goal:'catalog',style:'modern'},modulePlan:{active:['header','hero','featured','contact']}},sourcePayload:{catalog:{headline:'Knjige koje ostaju',subtitle:'Knjižara',cards:[]}},agentDesk:{notes:'Bez agresivnog tona',materials:[]}};

test('Agent context uses existing Project Record instead of a second brief',()=>{
 const context=agentContext(project);
 assert.equal(context.siteId,project.siteId);
 assert.equal(context.business.name,'Booka');
 assert.equal(context.advisor.businessId,'bookshop');
 assert.deepEqual(context.modulePlan,['header','hero','featured','contact']);
 assert.equal(context.rmcNotes,'Bez agresivnog tona');
});

test('Agent returns a safe structured waiting state without a configured key',async()=>{
 const result=await createAgentService({apiKey:''}).assess(project);
 assert.equal(result.status,'WAITING_MATERIAL');
 assert.equal(result.buildReady,false);
 assert.ok(result.missing.some(item=>item.includes('fotografije')));
});

test('explicit RMC permission for generic photography makes the baseline ready',async()=>{
 const result=await createAgentService({apiKey:''}).assess({...project,agentDesk:{notes:'Koristite generičke fotografije dok ne stignu lokalne.',materials:[]}});
 assert.equal(result.status,'READY_TO_BUILD');
 assert.equal(result.buildReady,true);
 assert.equal(result.missing.some(item=>item.includes('fotografije')),false);
});

test('Agent reads the Responses API output text and validates it before it becomes application state',async()=>{
 const answer=JSON.stringify({status:'READY_TO_BUILD',summary:'Sve je spremno.',missing:[],clientMessage:'Dragan, kreni sa izradom.',recommendations:['Zadrži stil.'],buildReady:true});
 const fetchImpl=async()=>new Response(JSON.stringify({output:[{content:[{type:'output_text',text:answer}]}]}),{status:200});
 const result=await createAgentService({apiKey:'test',fetchImpl}).assess({...project,agentDesk:{...project.agentDesk,materials:[{name:'IMG_1.jpg'}]}});
 assert.equal(result.status,'READY_TO_BUILD');
 assert.equal(result.buildReady,true);
 assert.equal(result.clientMessage,'Dragan, kreni sa izradom.');
});
